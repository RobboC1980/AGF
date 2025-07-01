"""
Project Assignment API Endpoints for RBAC System

Provides endpoints for managing project access assignments with proper authorization:
- List project assignments
- Assign users to projects (admin only)
- Remove users from projects (admin only)
- Get available users for assignment
"""

from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
import logging
import jwt
import json

try:
    from ..database.supabase_client import get_supabase
    from ..auth.dependencies import get_current_user
except ImportError:
    from database.supabase_client import get_supabase
    from auth.dependencies import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/projects", tags=["Project Assignments"])

# Pydantic models for request/response
class ProjectAssignmentRequest(BaseModel):
    userId: str
    role: str

class UserAssignmentResponse(BaseModel):
    id: str
    userId: str
    userName: str
    userEmail: str
    role: str
    assignedAt: datetime
    assignedBy: str

class AvailableUserResponse(BaseModel):
    id: str
    name: str
    email: str
    image_url: Optional[str] = None

# Helper function to check if user is admin
async def require_admin_access(current_user: dict = Depends(get_current_user)):
    """Ensure the current user has admin privileges"""
    # Get user details from database to check role
    supabase = get_supabase()
    try:
        user_result = supabase.table("users").select("role").eq("id", current_user["user_id"]).execute()
        
        if not user_result.data or user_result.data[0].get("role") != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only administrators can manage project assignments"
            )
        
        return current_user
    except Exception as e:
        logger.error(f"Error checking admin access: {e}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )

# Helper function to check project access
async def check_project_access(project_id: str, current_user: dict = Depends(get_current_user)):
    """Check if user can access the project"""
    supabase = get_supabase()
    user_id = current_user["user_id"]
    
    try:
        # Check if user is admin, project owner, or has explicit access
        user_result = supabase.table("users").select("role").eq("id", user_id).execute()
        is_admin = user_result.data and user_result.data[0].get("role") == "admin"
        
        if is_admin:
            return current_user
        
        # Check if user owns the project
        project_result = supabase.table("projects").select("created_by").eq("id", project_id).execute()
        if project_result.data and project_result.data[0]["created_by"] == user_id:
            return current_user
        
        # Check if user has explicit project access
        access_result = supabase.table("project_access").select("*").eq("project_id", project_id).eq("user_id", user_id).eq("is_active", True).execute()
        if access_result.data:
            return current_user
        
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this project"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error checking project access: {e}")
        raise HTTPException(status_code=500, detail="Failed to verify project access")

@router.get("/{project_id}/assignments")
async def get_project_assignments(
    project_id: str,
    current_user: dict = Depends(check_project_access)
):
    """Get all user assignments for a project"""
    try:
        supabase = get_supabase()
        
        # Get project assignments with user details
        result = supabase.table("project_access").select("""
            id,
            user_id,
            role,
            assigned_at,
            assigned_by,
            users:user_id (
                email,
                first_name,
                last_name,
                full_name
            ),
            assigners:assigned_by (
                email,
                full_name
            )
        """).eq("project_id", project_id).eq("is_active", True).execute()
        
        assignments = []
        for assignment in result.data:
            user = assignment.get("users", {})
            assigner = assignment.get("assigners", {})
            
            assignments.append({
                "id": assignment["id"],
                "userId": assignment["user_id"],
                "userName": user.get("full_name") or f"{user.get('first_name', '')} {user.get('last_name', '')}".strip() or "Unknown User",
                "userEmail": user.get("email", ""),
                "role": assignment["role"],
                "assignedAt": assignment["assigned_at"],
                "assignedBy": assignment["assigned_by"]
            })
        
        return assignments
        
    except Exception as e:
        logger.error(f"Error fetching project assignments for {project_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch project assignments")

@router.post("/{project_id}/assignments")
async def assign_user_to_project(
    project_id: str,
    assignment: ProjectAssignmentRequest,
    admin_user: dict = Depends(require_admin_access)
):
    """Assign a user to a project (admin only)"""
    try:
        supabase = get_supabase()
        
        # Validate project exists
        project_result = supabase.table("projects").select("id, name").eq("id", project_id).execute()
        if not project_result.data:
            raise HTTPException(status_code=404, detail="Project not found")
        
        # Validate user exists
        user_result = supabase.table("users").select("id, email, full_name").eq("id", assignment.userId).eq("is_active", True).execute()
        if not user_result.data:
            raise HTTPException(status_code=404, detail="User not found or inactive")
        
        # Validate role
        valid_roles = ["admin", "manager", "member", "viewer"]
        if assignment.role not in valid_roles:
            raise HTTPException(status_code=400, detail=f"Invalid role. Must be one of: {valid_roles}")
        
        # Use database function for assignment (with security checks)
        assignment_data = {
            "project_id": project_id,
            "user_id": assignment.userId,
            "role": assignment.role,
            "assigned_by": admin_user["user_id"]
        }
        
        result = supabase.table("project_access").upsert(assignment_data, on_conflict="project_id,user_id").execute()
        
        if result.data:
            return {
                "success": True,
                "message": f"User {user_result.data[0]['email']} assigned to project as {assignment.role}"
            }
        else:
            raise HTTPException(status_code=400, detail="Failed to assign user to project")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error assigning user to project {project_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to assign user to project")

@router.delete("/{project_id}/assignments/{assignment_id}")
async def remove_user_from_project(
    project_id: str,
    assignment_id: str,
    admin_user: dict = Depends(require_admin_access)
):
    """Remove a user from a project (admin only)"""
    try:
        supabase = get_supabase()
        
        # Verify assignment exists and belongs to project
        assignment_result = supabase.table("project_access").select("*").eq("id", assignment_id).eq("project_id", project_id).execute()
        if not assignment_result.data:
            raise HTTPException(status_code=404, detail="Assignment not found")
        
        # Deactivate the assignment (soft delete)
        result = supabase.table("project_access").update({"is_active": False}).eq("id", assignment_id).execute()
        
        if result.data:
            return {"success": True, "message": "User removed from project successfully"}
        else:
            raise HTTPException(status_code=400, detail="Failed to remove user from project")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error removing user from project {project_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to remove user from project")

@router.get("/users/available")
async def get_available_users(
    exclude_project: Optional[str] = None,
    search: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get users available for project assignment"""
    try:
        supabase = get_supabase()
        
        # Build query to get active users
        query = supabase.table("users").select("id, email, full_name, first_name, last_name, image_url").eq("is_active", True)
        
        # Apply search filter if provided
        if search:
            search_term = f"%{search}%"
            query = query.or_(f"full_name.ilike.{search_term},email.ilike.{search_term}")
        
        users_result = query.execute()
        
        available_users = []
        for user in users_result.data:
            # Skip if user is already assigned to the excluded project
            if exclude_project:
                existing_assignment = supabase.table("project_access").select("id").eq("project_id", exclude_project).eq("user_id", user["id"]).eq("is_active", True).execute()
                if existing_assignment.data:
                    continue
            
            available_users.append({
                "id": user["id"],
                "name": user.get("full_name") or f"{user.get('first_name', '')} {user.get('last_name', '')}".strip() or "Unknown User",
                "email": user["email"],
                "image_url": user.get("image_url")
            })
        
        # Sort by name
        available_users.sort(key=lambda x: x["name"].lower())
        
        return available_users
        
    except Exception as e:
        logger.error(f"Error fetching available users: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch available users")

@router.get("/{project_id}/user-permissions")
async def get_user_project_permissions(
    project_id: str,
    current_user: dict = Depends(check_project_access)
):
    """Get current user's permissions for a specific project"""
    try:
        supabase = get_supabase()
        user_id = current_user["user_id"]
        
        # Check user's global role
        user_result = supabase.table("users").select("role").eq("id", user_id).execute()
        global_role = user_result.data[0]["role"] if user_result.data else "member"
        
        # Check project-specific access
        project_access = supabase.table("project_access").select("role").eq("project_id", project_id).eq("user_id", user_id).eq("is_active", True).execute()
        project_role = project_access.data[0]["role"] if project_access.data else None
        
        # Check if user owns the project
        project_result = supabase.table("projects").select("created_by").eq("id", project_id).execute()
        is_owner = project_result.data and project_result.data[0]["created_by"] == user_id
        
        # Determine effective permissions
        effective_role = global_role
        if project_role:
            effective_role = project_role
        elif is_owner:
            effective_role = "admin"
        
        # Define permissions based on role
        permissions = {
            "admin": [
                "read_project", "update_project", "delete_project",
                "create_epic", "update_epic", "delete_epic",
                "create_story", "update_story", "delete_story",
                "create_task", "update_task", "delete_task",
                "assign_users", "manage_users", "view_analytics"
            ],
            "manager": [
                "read_project", "update_project",
                "create_epic", "update_epic", "delete_epic",
                "create_story", "update_story", "delete_story",
                "create_task", "update_task", "delete_task",
                "view_analytics"
            ],
            "member": [
                "read_project",
                "create_epic", "update_epic",
                "create_story", "update_story",
                "create_task", "update_task", "delete_task",
                "view_analytics"
            ],
            "viewer": [
                "read_project", "view_analytics"
            ]
        }
        
        return {
            "userId": user_id,
            "projectId": project_id,
            "role": effective_role,
            "isOwner": is_owner,
            "permissions": permissions.get(effective_role, [])
        }
        
    except Exception as e:
        logger.error(f"Error fetching user permissions for project {project_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch user permissions") 