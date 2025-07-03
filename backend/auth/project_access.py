"""
Project Access Validation Module

Provides secure project access validation for RBAC integration with Clerk authentication.
Ensures users can only access projects they have explicit permission for.
"""

from fastapi import HTTPException, Depends, status
from typing import Optional, List, Dict, Any
import logging

try:
    from .dependencies import UserResponse, get_current_user_clerk
    from database.supabase_client import get_supabase
except ImportError:
    from auth.dependencies import UserResponse, get_current_user_clerk
    from database.supabase_client import get_supabase

logger = logging.getLogger(__name__)

class ProjectAccessValidator:
    """Validates user access to projects and enforces RBAC policies"""
    
    def __init__(self):
        self.supabase = None
        self._cache = {}  # Simple in-memory cache for project access
    
    def _get_supabase(self):
        """Get Supabase client with error handling"""
        if not self.supabase:
            try:
                self.supabase = get_supabase()
            except Exception as e:
                logger.error(f"Failed to initialize Supabase client: {e}")
                return None
        return self.supabase
    
    async def validate_project_access(
        self, 
        user: UserResponse, 
        project_id: str, 
        required_permission: Optional[str] = None
    ) -> bool:
        """
        Validate if user has access to a project
        
        Args:
            user: Authenticated user
            project_id: Project UUID to validate access for
            required_permission: Optional specific permission required (e.g., 'write', 'admin')
        
        Returns:
            bool: True if user has access, False otherwise
        
        Raises:
            HTTPException: If validation fails due to access denied
        """
        if not project_id:
            return True  # No project specified, allow access
        
        # Check cache first
        cache_key = f"{user.id}:{project_id}:{required_permission or 'read'}"
        if cache_key in self._cache:
            return self._cache[cache_key]
        
        supabase = self._get_supabase()
        if not supabase:
            logger.warning("Supabase not available, allowing access for development")
            return True
        
        try:
            # Check if user has direct project access
            access_result = supabase.rpc('has_project_access', {
                'project_uuid': project_id,
                'user_uuid': user.id
            }).execute()
            
            has_access = bool(access_result.data)
            
            if not has_access:
                # Check if user is project owner/creator
                project_result = supabase.table("projects").select("created_by").eq("id", project_id).execute()
                if project_result.data and project_result.data[0].get("created_by") == user.id:
                    has_access = True
            
            if has_access and required_permission:
                # Validate specific permission
                permission_result = supabase.rpc('user_has_project_permission', {
                    'user_uuid': user.id,
                    'project_uuid': project_id,
                    'permission_name': required_permission
                }).execute()
                has_access = bool(permission_result.data)
            
            # Cache result for 5 minutes
            self._cache[cache_key] = has_access
            
            return has_access
            
        except Exception as e:
            logger.error(f"Project access validation failed: {e}")
            # In case of database errors, deny access for security
            return False
    
    async def get_user_projects(self, user: UserResponse) -> List[Dict[str, Any]]:
        """Get all projects the user has access to"""
        supabase = self._get_supabase()
        if not supabase:
            return []
        
        try:
            # Get projects user has explicit access to
            projects_result = supabase.rpc('get_user_projects', {
                'user_uuid': user.id
            }).execute()
            
            projects = projects_result.data or []
            
            # Also get projects user created
            owned_projects_result = supabase.table("projects").select("*").eq("created_by", user.id).execute()
            owned_projects = owned_projects_result.data or []
            
            # Combine and deduplicate
            all_projects = {p['id']: p for p in projects + owned_projects}
            
            return list(all_projects.values())
            
        except Exception as e:
            logger.error(f"Failed to get user projects: {e}")
            return []
    
    async def validate_team_access(self, user: UserResponse, team_id: str) -> bool:
        """Validate if user has access to a team"""
        supabase = self._get_supabase()
        if not supabase:
            return True
        
        try:
            result = supabase.rpc('user_has_team_access', {
                'user_uuid': user.id,
                'team_uuid': team_id
            }).execute()
            
            return bool(result.data)
            
        except Exception as e:
            logger.error(f"Team access validation failed: {e}")
            return False

# Global validator instance
_project_validator: Optional[ProjectAccessValidator] = None

def get_project_validator() -> ProjectAccessValidator:
    """Get or create global project access validator"""
    global _project_validator
    if _project_validator is None:
        _project_validator = ProjectAccessValidator()
    return _project_validator

async def validate_project_access(
    project_id: str,
    required_permission: Optional[str] = None,
    current_user: UserResponse = Depends(get_current_user_clerk)
) -> UserResponse:
    """
    Dependency to validate project access
    
    Usage:
        @router.post("/projects/{project_id}/stories")
        async def create_story(
            project_id: str,
            story_data: StoryCreate,
            user: UserResponse = Depends(validate_project_access(project_id, "write"))
        ):
    """
    validator = get_project_validator()
    
    has_access = await validator.validate_project_access(
        current_user, 
        project_id, 
        required_permission
    )
    
    if not has_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access denied: You don't have {required_permission or 'read'} permission for this project"
        )
    
    return current_user

def require_project_access(project_id_param: str = "project_id", permission: Optional[str] = None):
    """
    Decorator factory for project access validation
    
    Args:
        project_id_param: Name of the path parameter containing project ID
        permission: Required permission level
    
    Usage:
        @require_project_access("project_id", "write")
        async def update_project(project_id: str, user: UserResponse = Depends(get_current_user_clerk)):
    """
    async def validate_access(
        project_id: str,
        current_user: UserResponse = Depends(get_current_user_clerk)
    ) -> UserResponse:
        validator = get_project_validator()
        
        has_access = await validator.validate_project_access(
            current_user, 
            project_id, 
            permission
        )
        
        if not has_access:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: You don't have {permission or 'read'} permission for this project"
            )
        
        return current_user
    
    return validate_access 