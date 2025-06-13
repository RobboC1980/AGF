"""
Enhanced Authentication System for AgileForge
Production-ready role-based access control with permissions and team management
"""

import os
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional, Union
from enum import Enum
from functools import wraps

import jwt
from fastapi import HTTPException, status, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from passlib.context import CryptContext
from supabase import Client

logger = logging.getLogger(__name__)

# Security configuration
SECRET_KEY = os.getenv("SUPABASE_JWT_SECRET", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
REFRESH_TOKEN_EXPIRE_DAYS = 7

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

# User Roles Enum
class UserRole(str, Enum):
    ADMIN = "admin"
    PROJECT_MANAGER = "project_manager"
    TEAM_LEAD = "team_lead"
    DEVELOPER = "developer"
    VIEWER = "viewer"

# Permissions Enum
class Permission(str, Enum):
    # Project permissions
    CREATE_PROJECT = "create_project"
    DELETE_PROJECT = "delete_project"
    EDIT_PROJECT = "edit_project"
    VIEW_PROJECT = "view_project"
    
    # Epic permissions
    CREATE_EPIC = "create_epic"
    DELETE_EPIC = "delete_epic"
    EDIT_EPIC = "edit_epic"
    VIEW_EPIC = "view_epic"
    
    # Story permissions
    CREATE_STORY = "create_story"
    DELETE_STORY = "delete_story"
    EDIT_STORY = "edit_story"
    VIEW_STORY = "view_story"
    ASSIGN_STORY = "assign_story"
    
    # Team management
    MANAGE_TEAM = "manage_team"
    INVITE_USERS = "invite_users"
    REMOVE_USERS = "remove_users"
    
    # Analytics and reporting
    VIEW_ANALYTICS = "view_analytics"
    EXPORT_DATA = "export_data"
    
    # AI features
    USE_AI_FEATURES = "use_ai_features"
    CONFIGURE_AI = "configure_ai"
    
    # System administration
    MANAGE_SYSTEM = "manage_system"
    VIEW_AUDIT_LOGS = "view_audit_logs"

# Role-Permission mapping
ROLE_PERMISSIONS = {
    UserRole.ADMIN: [
        # All permissions
        Permission.CREATE_PROJECT, Permission.DELETE_PROJECT, Permission.EDIT_PROJECT, Permission.VIEW_PROJECT,
        Permission.CREATE_EPIC, Permission.DELETE_EPIC, Permission.EDIT_EPIC, Permission.VIEW_EPIC,
        Permission.CREATE_STORY, Permission.DELETE_STORY, Permission.EDIT_STORY, Permission.VIEW_STORY, Permission.ASSIGN_STORY,
        Permission.MANAGE_TEAM, Permission.INVITE_USERS, Permission.REMOVE_USERS,
        Permission.VIEW_ANALYTICS, Permission.EXPORT_DATA,
        Permission.USE_AI_FEATURES, Permission.CONFIGURE_AI,
        Permission.MANAGE_SYSTEM, Permission.VIEW_AUDIT_LOGS
    ],
    UserRole.PROJECT_MANAGER: [
        Permission.CREATE_PROJECT, Permission.EDIT_PROJECT, Permission.VIEW_PROJECT,
        Permission.CREATE_EPIC, Permission.DELETE_EPIC, Permission.EDIT_EPIC, Permission.VIEW_EPIC,
        Permission.CREATE_STORY, Permission.DELETE_STORY, Permission.EDIT_STORY, Permission.VIEW_STORY, Permission.ASSIGN_STORY,
        Permission.MANAGE_TEAM, Permission.INVITE_USERS,
        Permission.VIEW_ANALYTICS, Permission.EXPORT_DATA,
        Permission.USE_AI_FEATURES
    ],
    UserRole.TEAM_LEAD: [
        Permission.VIEW_PROJECT, Permission.EDIT_PROJECT,
        Permission.CREATE_EPIC, Permission.EDIT_EPIC, Permission.VIEW_EPIC,
        Permission.CREATE_STORY, Permission.EDIT_STORY, Permission.VIEW_STORY, Permission.ASSIGN_STORY,
        Permission.INVITE_USERS,
        Permission.VIEW_ANALYTICS,
        Permission.USE_AI_FEATURES
    ],
    UserRole.DEVELOPER: [
        Permission.VIEW_PROJECT,
        Permission.VIEW_EPIC,
        Permission.CREATE_STORY, Permission.EDIT_STORY, Permission.VIEW_STORY,
        Permission.USE_AI_FEATURES
    ],
    UserRole.VIEWER: [
        Permission.VIEW_PROJECT,
        Permission.VIEW_EPIC,
        Permission.VIEW_STORY
    ]
}

# Pydantic models
class TokenData(BaseModel):
    user_id: Optional[str] = None
    email: Optional[str] = None
    roles: List[str] = []
    permissions: List[str] = []
    exp: Optional[datetime] = None

class UserInDB(BaseModel):
    id: str
    email: str
    name: str
    avatar_url: Optional[str] = None
    roles: List[str] = []
    permissions: List[str] = []
    is_active: bool = True
    is_verified: bool = False
    created_at: datetime
    last_login: Optional[datetime] = None
    team_id: Optional[str] = None

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: Optional[UserRole] = UserRole.DEVELOPER

class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str

class RoleAssignmentRequest(BaseModel):
    user_id: str
    roles: List[UserRole]

# Enhanced Authentication Manager
class EnhancedAuthManager:
    """Production-ready authentication manager with RBAC"""
    
    def __init__(self, supabase_client: Client):
        self.supabase = supabase_client
        self.pwd_context = pwd_context
        
    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """Verify a password against its hash"""
        return self.pwd_context.verify(plain_password, hashed_password)
    
    def get_password_hash(self, password: str) -> str:
        """Hash a password"""
        return self.pwd_context.hash(password)
    
    def create_access_token(self, data: dict, expires_delta: Optional[timedelta] = None) -> str:
        """Create JWT access token"""
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
        return encoded_jwt
    
    def create_refresh_token(self, data: dict) -> str:
        """Create JWT refresh token"""
        to_encode = data.copy()
        expire = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
        to_encode.update({"exp": expire, "type": "refresh"})
        encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
        return encoded_jwt
    
    def verify_token(self, token: str) -> Optional[TokenData]:
        """Verify and decode JWT token"""
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            user_id: str = payload.get("sub")
            email: str = payload.get("email")
            roles: List[str] = payload.get("roles", [])
            permissions: List[str] = payload.get("permissions", [])
            exp = datetime.fromtimestamp(payload.get("exp", 0))
            
            if user_id is None:
                return None
                
            return TokenData(
                user_id=user_id,
                email=email,
                roles=roles,
                permissions=permissions,
                exp=exp
            )
        except jwt.PyJWTError as e:
            logger.warning(f"Token verification failed: {e}")
            return None
    
    async def get_user_by_email(self, email: str) -> Optional[UserInDB]:
        """Get user by email from database"""
        try:
            result = self.supabase.table("users").select("*").eq("email", email).execute()
            if result.data:
                user_data = result.data[0]
                return UserInDB(**user_data)
            return None
        except Exception as e:
            logger.error(f"Error fetching user by email: {e}")
            return None
    
    async def get_user_by_id(self, user_id: str) -> Optional[UserInDB]:
        """Get user by ID from database"""
        try:
            result = self.supabase.table("users").select("*").eq("id", user_id).execute()
            if result.data:
                user_data = result.data[0]
                return UserInDB(**user_data)
            return None
        except Exception as e:
            logger.error(f"Error fetching user by ID: {e}")
            return None
    
    async def authenticate_user(self, email: str, password: str) -> Optional[UserInDB]:
        """Authenticate user with email and password"""
        user = await self.get_user_by_email(email)
        if not user:
            return None
        if not self.verify_password(password, user.hashed_password):
            return None
        return user
    
    async def create_user(self, user_data: RegisterRequest) -> UserInDB:
        """Create a new user"""
        try:
            # Check if user already exists
            existing_user = await self.get_user_by_email(user_data.email)
            if existing_user:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="User with this email already exists"
                )
            
            # Hash password
            hashed_password = self.get_password_hash(user_data.password)
            
            # Get permissions for the role
            permissions = [p.value for p in ROLE_PERMISSIONS.get(user_data.role, [])]
            
            # Create user in database
            user_dict = {
                "email": user_data.email,
                "name": user_data.name,
                "hashed_password": hashed_password,
                "roles": [user_data.role.value],
                "permissions": permissions,
                "is_active": True,
                "is_verified": False,
                "created_at": datetime.utcnow().isoformat()
            }
            
            result = self.supabase.table("users").insert(user_dict).execute()
            if result.data:
                return UserInDB(**result.data[0])
            else:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to create user"
                )
        except Exception as e:
            logger.error(f"Error creating user: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create user"
            )
    
    async def update_user_roles(self, user_id: str, roles: List[UserRole]) -> UserInDB:
        """Update user roles and permissions"""
        try:
            # Calculate new permissions based on roles
            all_permissions = set()
            for role in roles:
                role_permissions = ROLE_PERMISSIONS.get(role, [])
                all_permissions.update([p.value for p in role_permissions])
            
            # Update user in database
            update_data = {
                "roles": [role.value for role in roles],
                "permissions": list(all_permissions)
            }
            
            result = self.supabase.table("users").update(update_data).eq("id", user_id).execute()
            if result.data:
                return UserInDB(**result.data[0])
            else:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="User not found"
                )
        except Exception as e:
            logger.error(f"Error updating user roles: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update user roles"
            )
    
    async def change_password(self, user_id: str, current_password: str, new_password: str) -> bool:
        """Change user password"""
        try:
            user = await self.get_user_by_id(user_id)
            if not user:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="User not found"
                )
            
            # Verify current password
            if not self.verify_password(current_password, user.hashed_password):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Current password is incorrect"
                )
            
            # Hash new password
            new_hashed_password = self.get_password_hash(new_password)
            
            # Update password in database
            result = self.supabase.table("users").update({
                "hashed_password": new_hashed_password
            }).eq("id", user_id).execute()
            
            return bool(result.data)
        except Exception as e:
            logger.error(f"Error changing password: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to change password"
            )
    
    def has_permission(self, user: UserInDB, permission: Permission) -> bool:
        """Check if user has specific permission"""
        return permission.value in user.permissions
    
    def has_role(self, user: UserInDB, role: UserRole) -> bool:
        """Check if user has specific role"""
        return role.value in user.roles
    
    def has_any_role(self, user: UserInDB, roles: List[UserRole]) -> bool:
        """Check if user has any of the specified roles"""
        return any(role.value in user.roles for role in roles)
    
    def has_all_roles(self, user: UserInDB, roles: List[UserRole]) -> bool:
        """Check if user has all of the specified roles"""
        return all(role.value in user.roles for role in roles)

# Global auth manager instance (will be initialized in main app)
auth_manager: Optional[EnhancedAuthManager] = None

def get_auth_manager() -> EnhancedAuthManager:
    """Get the global auth manager instance"""
    if auth_manager is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Authentication manager not initialized"
        )
    return auth_manager

# Authentication dependencies
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> UserInDB:
    """Get current authenticated user"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        token = credentials.credentials
        auth_mgr = get_auth_manager()
        token_data = auth_mgr.verify_token(token)
        
        if token_data is None:
            raise credentials_exception
        
        user = await auth_mgr.get_user_by_id(token_data.user_id)
        if user is None:
            raise credentials_exception
        
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Inactive user"
            )
        
        return user
    except Exception as e:
        logger.warning(f"Authentication failed: {e}")
        raise credentials_exception

async def get_current_active_user(current_user: UserInDB = Depends(get_current_user)) -> UserInDB:
    """Get current active user"""
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
    return current_user

# Permission decorators
def require_permission(permission: Permission):
    """Decorator to require specific permission"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Extract current_user from kwargs
            current_user = kwargs.get('current_user')
            if not current_user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Authentication required"
                )
            
            auth_mgr = get_auth_manager()
            if not auth_mgr.has_permission(current_user, permission):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Permission '{permission.value}' required"
                )
            
            return await func(*args, **kwargs)
        return wrapper
    return decorator

def require_role(role: Union[UserRole, List[UserRole]]):
    """Decorator to require specific role(s)"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            current_user = kwargs.get('current_user')
            if not current_user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Authentication required"
                )
            
            auth_mgr = get_auth_manager()
            
            if isinstance(role, list):
                if not auth_mgr.has_any_role(current_user, role):
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail=f"One of roles {[r.value for r in role]} required"
                    )
            else:
                if not auth_mgr.has_role(current_user, role):
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail=f"Role '{role.value}' required"
                    )
            
            return await func(*args, **kwargs)
        return wrapper
    return decorator

def admin_required():
    """Decorator to require admin role"""
    return require_role(UserRole.ADMIN)

def manager_required():
    """Decorator to require project manager or admin role"""
    return require_role([UserRole.ADMIN, UserRole.PROJECT_MANAGER])

# Permission dependency factories
def create_permission_dependency(permission: Permission):
    """Create a dependency that requires specific permission"""
    async def permission_dependency(current_user: UserInDB = Depends(get_current_active_user)) -> UserInDB:
        auth_mgr = get_auth_manager()
        if not auth_mgr.has_permission(current_user, permission):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission '{permission.value}' required"
            )
        return current_user
    return permission_dependency

def create_role_dependency(role: Union[UserRole, List[UserRole]]):
    """Create a dependency that requires specific role(s)"""
    async def role_dependency(current_user: UserInDB = Depends(get_current_active_user)) -> UserInDB:
        auth_mgr = get_auth_manager()
        
        if isinstance(role, list):
            if not auth_mgr.has_any_role(current_user, role):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"One of roles {[r.value for r in role]} required"
                )
        else:
            if not auth_mgr.has_role(current_user, role):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Role '{role.value}' required"
                )
        
        return current_user
    return role_dependency

# Common dependencies
require_admin = create_role_dependency(UserRole.ADMIN)
require_manager = create_role_dependency([UserRole.ADMIN, UserRole.PROJECT_MANAGER])
require_team_lead = create_role_dependency([UserRole.ADMIN, UserRole.PROJECT_MANAGER, UserRole.TEAM_LEAD])

# Permission dependencies
require_create_project = create_permission_dependency(Permission.CREATE_PROJECT)
require_manage_team = create_permission_dependency(Permission.MANAGE_TEAM)
require_view_analytics = create_permission_dependency(Permission.VIEW_ANALYTICS)
require_use_ai = create_permission_dependency(Permission.USE_AI_FEATURES) 