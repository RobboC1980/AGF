from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import List, Optional
from pydantic import BaseModel
import logging

# Handle imports for both package and direct execution
try:
    from database.supabase_client import get_supabase
except ImportError:
    from database.supabase_client import get_supabase

security = HTTPBearer()

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    avatar_url: Optional[str] = None

async def get_current_user_supabase(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    supabase = Depends(get_supabase)
):
    """Get the current authenticated user from Supabase"""
    try:
        # Verify the JWT token with Supabase
        user = supabase.auth.get_user(credentials.credentials)
        
        if not user or not user.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token"
            )
        
        # Get user details from the database
        user_data = supabase.table("users").select("*").eq("id", user.user.id).single().execute()
        
        if not user_data.data:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found"
            )
        
        return UserResponse(**user_data.data)
        
    except Exception as e:
        logger.error(f"Authentication failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials"
        )

logger = logging.getLogger(__name__)
router = APIRouter()

class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = None
    status: Optional[str] = "active"

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None

@router.get("/")
async def get_projects(current_user: UserResponse = Depends(get_current_user_supabase)):
    """Get all projects accessible to the current user (RBAC filtered)"""
    try:
        supabase = get_supabase()
        
        # Check user's role
        user_result = supabase.table("users").select("role").eq("id", current_user.id).execute()
        user_role = user_result.data[0]["role"] if user_result.data else "member"
        
        if user_role == "admin":
            # Admins can see all projects
            result = supabase.table("projects").select("*").execute()
        else:
            # Get projects user owns
            owned_projects = supabase.table("projects").select("*").eq("created_by", current_user.id).execute()
            
            # Get projects user is assigned to
            assigned_projects = supabase.table("projects").select("""
                *,
                project_members!inner(role, created_at)
            """).eq("project_members.user_id", current_user.id).execute()
            
            # Combine projects (remove duplicates)
            all_projects = owned_projects.data[:]
            owned_ids = {p["id"] for p in owned_projects.data}
            
            for project in assigned_projects.data:
                if project["id"] not in owned_ids:
                    all_projects.append(project)
            
            result = type('Result', (), {'data': all_projects})()
        
        projects = []
        for project in result.data:
            projects.append({
                "id": project["id"],
                "name": project["name"],
                "description": project.get("description"),
                "status": project["status"],
                "key": project.get("key") or project["name"][:10].upper().replace(" ", "_"),
                "priority": project.get("priority", "medium"),
                "progress": project.get("progress", 0),
                "created_by": project["created_by"],
                "created_at": project["created_at"],
                "updated_at": project.get("updated_at")
            })
        
        return {"success": True, "data": {"projects": projects}}
    except Exception as e:
        logger.error(f"Error fetching projects: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch projects")

@router.post("/")
async def create_project(project_data: ProjectCreate, current_user: UserResponse = Depends(get_current_user_supabase)):
    """Create a new project"""
    try:
        supabase = get_supabase()
        
        project = {
            "name": project_data.name,
            "description": project_data.description,
            "status": project_data.status,
            "created_by": current_user.id
        }
        
        result = supabase.table("projects").insert(project).execute()
        
        if result.data:
            created_project = result.data[0]
            return {
                "success": True, 
                "data": {
                    "id": created_project["id"],
                    "name": created_project["name"],
                    "description": created_project.get("description"),
                    "status": created_project["status"],
                    "key": created_project["name"][:10].upper().replace(" ", "_"),
                    "priority": "medium",
                    "progress": 0,
                    "created_by": created_project["created_by"],
                    "created_at": created_project["created_at"],
                    "updated_at": created_project.get("updated_at")
                }
            }
        else:
            raise HTTPException(status_code=400, detail="Failed to create project")
            
    except Exception as e:
        logger.error(f"Error creating project: {e}")
        if "duplicate key" in str(e).lower():
            raise HTTPException(status_code=400, detail="Project with this name or key already exists")
        raise HTTPException(status_code=500, detail="Failed to create project")

@router.get("/{project_id}")
async def get_project(project_id: str, current_user: UserResponse = Depends(get_current_user_supabase)):
    """Get a specific project (RBAC checked)"""
    try:
        supabase = get_supabase()
        
        # Check if user can access this project
        user_result = supabase.table("users").select("role").eq("id", current_user.id).execute()
        user_role = user_result.data[0]["role"] if user_result.data else "member"
        
        # First try to get the project
        project_result = supabase.table("projects").select("*").eq("id", project_id).execute()
        if not project_result.data:
            raise HTTPException(status_code=404, detail="Project not found")
        
        project = project_result.data[0]
        
        # Check access permissions
        can_access = False
        
        if user_role == "admin":
            can_access = True
        elif project["created_by"] == current_user.id:
            can_access = True
        else:
            # Check if user has explicit project access
            access_result = supabase.table("project_members").select("id").eq("project_id", project_id).eq("user_id", current_user.id).execute()
            can_access = bool(access_result.data)
        
        if not can_access:
            raise HTTPException(status_code=403, detail="Access denied to this project")
        
        return {
            "success": True,
            "data": {
                "id": project["id"],
                "name": project["name"],
                "description": project.get("description"),
                "status": project["status"],
                "key": project.get("key") or project["name"][:10].upper().replace(" ", "_"),
                "priority": project.get("priority", "medium"),
                "progress": project.get("progress", 0),
                "created_by": project["created_by"],
                "created_at": project["created_at"],
                "updated_at": project.get("updated_at")
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching project {project_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch project")

@router.put("/{project_id}")
async def update_project(project_id: str, project_data: ProjectUpdate, current_user: UserResponse = Depends(get_current_user_supabase)):
    """Update a project"""
    try:
        supabase = get_supabase()
        
        # First check if project exists and belongs to user
        existing = supabase.table("projects").select("*").eq("id", project_id).eq("created_by", current_user.id).execute()
        if not existing.data:
            raise HTTPException(status_code=404, detail="Project not found")
        
        # Prepare update data
        update_data = {}
        if project_data.name is not None:
            update_data["name"] = project_data.name
        if project_data.description is not None:
            update_data["description"] = project_data.description
        if project_data.status is not None:
            update_data["status"] = project_data.status
        
        if not update_data:
            raise HTTPException(status_code=400, detail="No fields to update")
        
        result = supabase.table("projects").update(update_data).eq("id", project_id).execute()
        
        if result.data:
            updated_project = result.data[0]
            return {
                "success": True,
                "data": {
                    "id": updated_project["id"],
                    "name": updated_project["name"],
                    "description": updated_project.get("description"),
                    "status": updated_project["status"],
                    "key": updated_project["name"][:10].upper().replace(" ", "_"),
                    "priority": "medium",
                    "progress": 0,
                    "created_by": updated_project["created_by"],
                    "created_at": updated_project["created_at"],
                    "updated_at": updated_project.get("updated_at")
                }
            }
        else:
            raise HTTPException(status_code=400, detail="Failed to update project")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating project {project_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to update project")

@router.delete("/{project_id}")
async def delete_project(project_id: str, current_user: UserResponse = Depends(get_current_user_supabase)):
    """Delete a project"""
    try:
        supabase = get_supabase()
        
        # First check if project exists and belongs to user
        existing = supabase.table("projects").select("*").eq("id", project_id).eq("created_by", current_user.id).execute()
        if not existing.data:
            raise HTTPException(status_code=404, detail="Project not found")
        
        # TODO: Check if project has epics/stories and handle cascade delete or prevent deletion
        
        result = supabase.table("projects").delete().eq("id", project_id).execute()
        
        return {"success": True, "message": "Project deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting project {project_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete project") 