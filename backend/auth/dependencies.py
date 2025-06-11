"""
Enhanced Authentication Dependencies
Integrates with the comprehensive RBAC and JWT management system.
"""

from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional, List
import logging
from datetime import datetime

from auth.jwt_manager import jwt_manager, TokenType, TokenClaims
from auth.rbac import rbac_manager, Permission, ResourceType, Role
from auth.auth_service import auth_service
from middleware.authorization import auth_manager, audit_logger

logger = logging.getLogger(__name__)

# Security scheme
security = HTTPBearer(auto_error=False)

class CurrentUser:
    """Enhanced user class with authorization context"""
    def __init__(self, claims: TokenClaims):
        self.id = claims.user_id
        self.email = claims.email
        self.roles = claims.roles
        self.permissions = claims.permissions
        self.session_id = claims.session_id
        self.token_type = claims.token_type
        self.issued_at = claims.issued_at
        self.expires_at = claims.expires_at
        
    def has_permission(self, permission: Permission, 
                      resource_type: Optional[ResourceType] = None,
                      resource_id: Optional[str] = None) -> bool:
        """Check if user has specific permission"""
        return rbac_manager.has_permission(self.id, permission, resource_type, resource_id)
    
    def has_role(self, role: Role,
                resource_type: Optional[ResourceType] = None,
                resource_id: Optional[str] = None) -> bool:
        """Check if user has specific role"""
        user_roles = rbac_manager.get_user_roles(self.id)
        for user_role in user_roles:
            if (user_role.role == role and
                user_role.resource_type == resource_type and
                user_role.resource_id == resource_id):
                return True
        return False
    
    def is_admin(self, resource_type: Optional[ResourceType] = None,
                resource_id: Optional[str] = None) -> bool:
        """Check if user has admin privileges"""
        return rbac_manager.is_admin(self.id, resource_type, resource_id)
    
    def can_access_resource(self, resource_type: ResourceType,
                           resource_id: str, permission: Permission) -> bool:
        """Check if user can access specific resource"""
        return rbac_manager.can_access_resource(self.id, resource_type, resource_id, permission)

async def get_current_user_optional(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> Optional[CurrentUser]:
    """Get current authenticated user (optional)"""
    if not credentials:
        return None
    
    try:
        token = credentials.credentials
        
        # Handle demo mode
        if token == "demo" or not token:
            # Create demo user with basic permissions
            demo_claims = TokenClaims(
                user_id="demo-user",
                email="demo@agileforge.com",
                roles=[Role.DEVELOPER.value],
                permissions=[perm.value for perm in [
                    Permission.PROJECT_READ, Permission.EPIC_READ, Permission.STORY_READ,
                    Permission.TASK_READ, Permission.COMMENT_READ, Permission.TIME_READ
                ]],
                session_id="demo-session",
                token_type=TokenType.ACCESS,
                issued_at=datetime.utcnow(),
                expires_at=datetime.utcnow(),
                issuer="agileforge",
                audience="agileforge-api"
            )
            return CurrentUser(demo_claims)
        
        # Verify JWT token
        claims = jwt_manager.verify_token(token, TokenType.ACCESS)
        if not claims:
            return None
        
        # Log successful authentication
        client_ip = getattr(request.client, 'host', 'unknown') if request.client else 'unknown'
        audit_logger.log_login_attempt(claims.user_id, client_ip, True)
        
        return CurrentUser(claims)
        
    except Exception as e:
        logger.warning(f"Authentication failed: {e}")
        return None

async def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> CurrentUser:
    """Get current authenticated user (required)"""
    try:
        token = credentials.credentials
        
        # Handle demo mode
        if token == "demo":
            demo_claims = TokenClaims(
                user_id="demo-user",
                email="demo@agileforge.com",
                roles=[Role.DEVELOPER.value],
                permissions=[perm.value for perm in [
                    Permission.PROJECT_READ, Permission.EPIC_READ, Permission.STORY_READ,
                    Permission.TASK_READ, Permission.COMMENT_READ, Permission.TIME_READ,
                    Permission.STORY_UPDATE, Permission.TASK_CREATE, Permission.TASK_UPDATE,
                    Permission.COMMENT_CREATE
                ]],
                session_id="demo-session",
                token_type=TokenType.ACCESS,
                issued_at=datetime.utcnow(),
                expires_at=datetime.utcnow(),
                issuer="agileforge",
                audience="agileforge-api"
            )
            return CurrentUser(demo_claims)
        
        # Verify JWT token
        claims = jwt_manager.verify_token(token, TokenType.ACCESS)
        if not claims:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token",
                headers={"WWW-Authenticate": "Bearer"}
            )
        
        # Log successful authentication
        client_ip = getattr(request.client, 'host', 'unknown') if request.client else 'unknown'
        audit_logger.log_login_attempt(claims.user_id, client_ip, True)
        
        return CurrentUser(claims)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Authentication error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed",
            headers={"WWW-Authenticate": "Bearer"}
        )

async def get_api_key_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> CurrentUser:
    """Get user from API key authentication"""
    try:
        api_key = credentials.credentials
        claims = jwt_manager.verify_api_key(api_key)
        
        if not claims:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid API key",
                headers={"WWW-Authenticate": "Bearer"}
            )
        
        # Log API key usage
        client_ip = getattr(request.client, 'host', 'unknown') if request.client else 'unknown'
        audit_logger.log_login_attempt(claims.user_id, client_ip, True, "API_KEY")
        
        return CurrentUser(claims)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"API key authentication error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="API key authentication failed",
            headers={"WWW-Authenticate": "Bearer"}
        )

def require_permissions(*permissions: Permission):
    """Dependency factory to require specific permissions"""
    def permission_dependency(
        current_user: CurrentUser = Depends(get_current_user),
        request: Request = None
    ) -> CurrentUser:
        # Check permissions
        missing_permissions = []
        for permission in permissions:
            if not current_user.has_permission(permission):
                missing_permissions.append(permission.value)
        
        if missing_permissions:
            client_ip = getattr(request.client, 'host', 'unknown') if request and request.client else 'unknown'
            audit_logger.log_permission_denied(
                current_user.id, 
                ', '.join(missing_permissions), 
                "global", 
                client_ip
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Missing required permissions: {', '.join(missing_permissions)}"
            )
        
        return current_user
    
    return permission_dependency

def require_roles(*roles: Role):
    """Dependency factory to require specific roles"""
    def role_dependency(
        current_user: CurrentUser = Depends(get_current_user),
        request: Request = None
    ) -> CurrentUser:
        # Check roles
        user_role_names = current_user.roles
        if not any(role.value in user_role_names for role in roles):
            client_ip = getattr(request.client, 'host', 'unknown') if request and request.client else 'unknown'
            audit_logger.log_permission_denied(
                current_user.id, 
                f"roles: {', '.join([role.value for role in roles])}", 
                "global", 
                client_ip
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Missing required roles: {', '.join([role.value for role in roles])}"
            )
        
        return current_user
    
    return role_dependency

def require_resource_access(resource_type: ResourceType, permission: Permission):
    """Dependency factory to require access to a specific resource"""
    def resource_dependency(
        resource_id: str,
        current_user: CurrentUser = Depends(get_current_user),
        request: Request = None
    ) -> CurrentUser:
        # Check resource access
        if not current_user.can_access_resource(resource_type, resource_id, permission):
            client_ip = getattr(request.client, 'host', 'unknown') if request and request.client else 'unknown'
            audit_logger.log_permission_denied(
                current_user.id, 
                permission.value, 
                f"{resource_type.value}:{resource_id}", 
                client_ip
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied to {resource_type.value}"
            )
        
        return current_user
    
    return resource_dependency

def require_admin():
    """Dependency to require admin privileges"""
    def admin_dependency(
        current_user: CurrentUser = Depends(get_current_user),
        request: Request = None
    ) -> CurrentUser:
        if not current_user.is_admin():
            client_ip = getattr(request.client, 'host', 'unknown') if request and request.client else 'unknown'
            audit_logger.log_permission_denied(
                current_user.id, 
                "admin_privileges", 
                "global", 
                client_ip
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin privileges required"
            )
        
        return current_user
    
    return admin_dependency

# Convenience dependencies for common permission checks
require_user_read = require_permissions(Permission.USER_READ)
require_user_create = require_permissions(Permission.USER_CREATE)
require_user_update = require_permissions(Permission.USER_UPDATE)
require_user_delete = require_permissions(Permission.USER_DELETE)

require_project_read = require_permissions(Permission.PROJECT_READ)
require_project_create = require_permissions(Permission.PROJECT_CREATE)
require_project_update = require_permissions(Permission.PROJECT_UPDATE)
require_project_delete = require_permissions(Permission.PROJECT_DELETE)

require_story_read = require_permissions(Permission.STORY_READ)
require_story_create = require_permissions(Permission.STORY_CREATE)
require_story_update = require_permissions(Permission.STORY_UPDATE)
require_story_delete = require_permissions(Permission.STORY_DELETE)

require_task_read = require_permissions(Permission.TASK_READ)
require_task_create = require_permissions(Permission.TASK_CREATE)
require_task_update = require_permissions(Permission.TASK_UPDATE)
require_task_delete = require_permissions(Permission.TASK_DELETE)

# Role-based dependencies
require_admin_role = require_roles(Role.SYSTEM_ADMIN, Role.ORG_ADMIN)
require_manager_role = require_roles(Role.PROJECT_MANAGER, Role.TEAM_LEAD, Role.ORG_ADMIN)
require_developer_role = require_roles(Role.DEVELOPER, Role.SENIOR_DEVELOPER, Role.TECH_LEAD)

# Admin dependency
require_admin_access = require_admin()

# Legacy compatibility
async def get_current_active_user(current_user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
    """Legacy compatibility function"""
    return current_user 