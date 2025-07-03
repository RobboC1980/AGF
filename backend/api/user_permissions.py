"""
User Permissions API Endpoints

Provides endpoints for fetching user permissions, project access, and team memberships
for the RBAC system with proper authentication and authorization.
"""

from fastapi import APIRouter, HTTPException, Depends, status
from typing import List
from pydantic import BaseModel
from datetime import datetime
import logging

try:
    from database.supabase_client import get_supabase
    from auth.dependencies import get_current_user
except ImportError:
    from database.supabase_client import get_supabase
    from auth.dependencies import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/users", tags=["User Permissions"])

# Response models
class ProjectAccessResponse(BaseModel):
    project_id: str
    role: str
    permissions: List[str]
    assigned_by: str
    assigned_at: datetime

class TeamMembershipResponse(BaseModel):
    team_id: str
    role: str
    joined_at: datetime

@router.get("/{user_id}/project-access")
async def get_user_project_access(
    user_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get user's project access permissions"""
    try:
        # Only allow users to see their own access or admins to see any
        if current_user["user_id"] != user_id:
            # Check if current user is admin
            supabase = get_supabase()
            user_result = supabase.table("users").select("role").eq("id", current_user["user_id"]).execute()
            if not user_result.data or user_result.data[0].get("role") != "admin":
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied"
                )
        
        supabase = get_supabase()
        
        # Get user's explicit project access
        project_access_result = supabase.table("project_access").select("""
            project_id,
            role,
            permissions,
            assigned_by,
            assigned_at
        """).eq("user_id", user_id).eq("is_active", True).execute()
        
        access_list = []
        for access in project_access_result.data:
            access_list.append({
                "project_id": access["project_id"],
                "role": access["role"],
                "permissions": access["permissions"] or [],
                "assigned_by": access["assigned_by"],
                "assigned_at": access["assigned_at"]
            })
        
        return access_list
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching project access for user {user_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch project access")

@router.get("/{user_id}/team-memberships")
async def get_user_team_memberships(
    user_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get user's team memberships"""
    try:
        # Only allow users to see their own memberships or admins to see any
        if current_user["user_id"] != user_id:
            # Check if current user is admin
            supabase = get_supabase()
            user_result = supabase.table("users").select("role").eq("id", current_user["user_id"]).execute()
            if not user_result.data or user_result.data[0].get("role") != "admin":
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied"
                )
        
        supabase = get_supabase()
        
        # Get user's team memberships
        memberships_result = supabase.table("team_memberships").select("""
            team_id,
            role,
            joined_at
        """).eq("user_id", user_id).eq("is_active", True).execute()
        
        memberships = []
        for membership in memberships_result.data:
            memberships.append({
                "team_id": membership["team_id"],
                "role": membership["role"],
                "joined_at": membership["joined_at"]
            })
        
        return memberships
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching team memberships for user {user_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch team memberships")

@router.get("/{user_id}/permissions")
async def get_user_permissions(
    user_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get comprehensive user permissions including role, project access, and team memberships"""
    try:
        # Only allow users to see their own permissions or admins to see any
        if current_user["user_id"] != user_id:
            # Check if current user is admin
            supabase = get_supabase()
            user_result = supabase.table("users").select("role").eq("id", current_user["user_id"]).execute()
            if not user_result.data or user_result.data[0].get("role") != "admin":
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied"
                )
        
        supabase = get_supabase()
        
        # Get user's global role
        user_result = supabase.table("users").select("role, is_active").eq("id", user_id).execute()
        if not user_result.data:
            raise HTTPException(status_code=404, detail="User not found")
        
        user_data = user_result.data[0]
        if not user_data["is_active"]:
            raise HTTPException(status_code=403, detail="User account is inactive")
        
        # Get project access
        project_access_result = supabase.table("project_access").select("""
            project_id,
            role,
            permissions,
            assigned_by,
            assigned_at
        """).eq("user_id", user_id).eq("is_active", True).execute()
        
        # Get team memberships
        memberships_result = supabase.table("team_memberships").select("""
            team_id,
            role,
            joined_at
        """).eq("user_id", user_id).eq("is_active", True).execute()
        
        return {
            "userId": user_id,
            "role": user_data["role"],
            "isActive": user_data["is_active"],
            "projectAccess": [
                {
                    "projectId": access["project_id"],
                    "role": access["role"],
                    "permissions": access["permissions"] or [],
                    "assignedBy": access["assigned_by"],
                    "assignedAt": access["assigned_at"]
                }
                for access in project_access_result.data
            ],
            "teamMemberships": [
                {
                    "teamId": membership["team_id"],
                    "role": membership["role"],
                    "joinedAt": membership["joined_at"]
                }
                for membership in memberships_result.data
            ]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching permissions for user {user_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch user permissions")

@router.get("/{user_id}/accessible-projects")
async def get_user_accessible_projects(
    user_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get all projects the user can access (owns, assigned to, or admin)"""
    try:
        # Only allow users to see their own accessible projects or admins to see any
        if current_user["user_id"] != user_id:
            # Check if current user is admin
            supabase = get_supabase()
            user_result = supabase.table("users").select("role").eq("id", current_user["user_id"]).execute()
            if not user_result.data or user_result.data[0].get("role") != "admin":
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied"
                )
        
        supabase = get_supabase()
        
        # Check if user is admin
        user_result = supabase.table("users").select("role").eq("id", user_id).execute()
        is_admin = user_result.data and user_result.data[0].get("role") == "admin"
        
        if is_admin:
            # Admins can access all projects
            projects_result = supabase.table("projects").select("""
                id,
                name,
                description,
                status,
                priority,
                created_by,
                created_at,
                updated_at
            """).execute()
            
            return [
                {
                    **project,
                    "access_role": "admin",
                    "is_owner": project["created_by"] == user_id
                }
                for project in projects_result.data
            ]
        else:
            # Get projects user owns
            owned_projects = supabase.table("projects").select("""
                id,
                name,
                description,
                status,
                priority,
                created_by,
                created_at,
                updated_at
            """).eq("created_by", user_id).execute()
            
            # Get projects user is assigned to
            assigned_projects = supabase.table("projects").select("""
                id,
                name,
                description,
                status,
                priority,
                created_by,
                created_at,
                updated_at,
                project_access!inner(role)
            """).eq("project_access.user_id", user_id).eq("project_access.is_active", True).execute()
            
            # Combine and format results
            accessible_projects = []
            
            # Add owned projects
            for project in owned_projects.data:
                accessible_projects.append({
                    **project,
                    "access_role": "owner",
                    "is_owner": True
                })
            
            # Add assigned projects (avoid duplicates)
            owned_ids = {p["id"] for p in owned_projects.data}
            for project in assigned_projects.data:
                if project["id"] not in owned_ids:
                    accessible_projects.append({
                        **project,
                        "access_role": project["project_access"]["role"],
                        "is_owner": False
                    })
            
            return accessible_projects
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching accessible projects for user {user_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch accessible projects") 