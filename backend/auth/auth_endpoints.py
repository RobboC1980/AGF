"""
Authentication Endpoints for AgileForge
Complete set of authentication and user management endpoints
"""

from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel

from .enhanced_auth import (
    EnhancedAuthManager, UserInDB, LoginRequest, RegisterRequest, 
    PasswordChangeRequest, RoleAssignmentRequest, UserRole, Permission,
    get_current_user, get_current_active_user, require_admin, require_manager,
    get_auth_manager
)

# Response models
class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    avatar_url: Optional[str] = None
    roles: List[str]
    permissions: List[str]
    is_active: bool
    is_verified: bool
    created_at: datetime
    last_login: Optional[datetime] = None
    team_id: Optional[str] = None

class UserListResponse(BaseModel):
    users: List[UserResponse]
    total: int
    page: int
    per_page: int

class MessageResponse(BaseModel):
    message: str
    success: bool = True

# Create router
auth_router = APIRouter(prefix="/auth", tags=["Authentication"])

@auth_router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register_user(
    user_data: RegisterRequest,
    background_tasks: BackgroundTasks
) -> UserResponse:
    """Register a new user"""
    auth_mgr = get_auth_manager()
    
    try:
        # Create user
        new_user = await auth_mgr.create_user(user_data)
        
        # Add background task for welcome email (if email service is configured)
        background_tasks.add_task(send_welcome_email, new_user.email, new_user.name)
        
        return UserResponse(**new_user.dict())
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to register user"
        )

@auth_router.post("/login", response_model=TokenResponse)
async def login_user(login_data: LoginRequest) -> TokenResponse:
    """Login user and return access token"""
    auth_mgr = get_auth_manager()
    
    # Authenticate user
    user = await auth_mgr.authenticate_user(login_data.email, login_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user account"
        )
    
    # Create tokens
    token_data = {
        "sub": user.id,
        "email": user.email,
        "roles": user.roles,
        "permissions": user.permissions
    }
    
    access_token = auth_mgr.create_access_token(token_data)
    refresh_token = auth_mgr.create_refresh_token({"sub": user.id})
    
    # Update last login
    try:
        auth_mgr.supabase.table("users").update({
            "last_login": datetime.utcnow().isoformat()
        }).eq("id", user.id).execute()
    except Exception as e:
        # Log but don't fail login for this
        pass
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=30 * 60  # 30 minutes
    )

@auth_router.post("/login/form", response_model=TokenResponse)
async def login_form(form_data: OAuth2PasswordRequestForm = Depends()) -> TokenResponse:
    """Login using OAuth2 password form (for Swagger UI)"""
    login_data = LoginRequest(email=form_data.username, password=form_data.password)
    return await login_user(login_data)

@auth_router.post("/refresh", response_model=TokenResponse)
async def refresh_token(refresh_token: str) -> TokenResponse:
    """Refresh access token using refresh token"""
    auth_mgr = get_auth_manager()
    
    # Verify refresh token
    token_data = auth_mgr.verify_token(refresh_token)
    if not token_data or token_data.user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )
    
    # Get user
    user = await auth_mgr.get_user_by_id(token_data.user_id)
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive"
        )
    
    # Create new tokens
    new_token_data = {
        "sub": user.id,
        "email": user.email,
        "roles": user.roles,
        "permissions": user.permissions
    }
    
    access_token = auth_mgr.create_access_token(new_token_data)
    new_refresh_token = auth_mgr.create_refresh_token({"sub": user.id})
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=new_refresh_token,
        expires_in=30 * 60
    )

@auth_router.get("/me", response_model=UserResponse)
async def get_current_user_profile(
    current_user: UserInDB = Depends(get_current_active_user)
) -> UserResponse:
    """Get current user profile"""
    return UserResponse(**current_user.dict())

@auth_router.put("/me", response_model=UserResponse)
async def update_current_user_profile(
    update_data: dict,
    current_user: UserInDB = Depends(get_current_active_user)
) -> UserResponse:
    """Update current user profile"""
    auth_mgr = get_auth_manager()
    
    # Only allow updating certain fields
    allowed_fields = {"name", "avatar_url"}
    filtered_data = {k: v for k, v in update_data.items() if k in allowed_fields}
    
    if not filtered_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No valid fields to update"
        )
    
    try:
        result = auth_mgr.supabase.table("users").update(filtered_data).eq("id", current_user.id).execute()
        if result.data:
            updated_user = UserInDB(**result.data[0])
            return UserResponse(**updated_user.dict())
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update user profile"
        )

@auth_router.post("/change-password", response_model=MessageResponse)
async def change_password(
    password_data: PasswordChangeRequest,
    current_user: UserInDB = Depends(get_current_active_user)
) -> MessageResponse:
    """Change user password"""
    auth_mgr = get_auth_manager()
    
    success = await auth_mgr.change_password(
        current_user.id,
        password_data.current_password,
        password_data.new_password
    )
    
    if success:
        return MessageResponse(message="Password changed successfully")
    else:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to change password"
        )

# Admin endpoints
@auth_router.get("/users", response_model=UserListResponse)
async def list_users(
    page: int = 1,
    per_page: int = 20,
    role: Optional[str] = None,
    search: Optional[str] = None,
    current_user: UserInDB = Depends(require_admin)
) -> UserListResponse:
    """List all users (admin only)"""
    auth_mgr = get_auth_manager()
    
    try:
        # Build query
        query = auth_mgr.supabase.table("users").select("*")
        
        # Apply filters
        if role:
            query = query.contains("roles", [role])
        
        if search:
            query = query.or_(f"name.ilike.%{search}%,email.ilike.%{search}%")
        
        # Apply pagination
        offset = (page - 1) * per_page
        query = query.range(offset, offset + per_page - 1)
        
        result = query.execute()
        
        # Get total count
        count_result = auth_mgr.supabase.table("users").select("count").execute()
        total = len(count_result.data) if count_result.data else 0
        
        users = [UserResponse(**user) for user in result.data]
        
        return UserListResponse(
            users=users,
            total=total,
            page=page,
            per_page=per_page
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch users"
        )

@auth_router.get("/users/{user_id}", response_model=UserResponse)
async def get_user_by_id(
    user_id: str,
    current_user: UserInDB = Depends(require_admin)
) -> UserResponse:
    """Get user by ID (admin only)"""
    auth_mgr = get_auth_manager()
    
    user = await auth_mgr.get_user_by_id(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return UserResponse(**user.dict())

@auth_router.put("/users/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: str,
    update_data: dict,
    current_user: UserInDB = Depends(require_admin)
) -> UserResponse:
    """Update user by ID (admin only)"""
    auth_mgr = get_auth_manager()
    
    # Don't allow updating sensitive fields through this endpoint
    forbidden_fields = {"hashed_password", "id", "created_at"}
    filtered_data = {k: v for k, v in update_data.items() if k not in forbidden_fields}
    
    if not filtered_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No valid fields to update"
        )
    
    try:
        result = auth_mgr.supabase.table("users").update(filtered_data).eq("id", user_id).execute()
        if result.data:
            updated_user = UserInDB(**result.data[0])
            return UserResponse(**updated_user.dict())
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update user"
        )

@auth_router.post("/users/{user_id}/assign-roles", response_model=UserResponse)
async def assign_user_roles(
    user_id: str,
    role_data: RoleAssignmentRequest,
    current_user: UserInDB = Depends(require_admin)
) -> UserResponse:
    """Assign roles to user (admin only)"""
    auth_mgr = get_auth_manager()
    
    updated_user = await auth_mgr.update_user_roles(user_id, role_data.roles)
    return UserResponse(**updated_user.dict())

@auth_router.post("/users/{user_id}/activate", response_model=MessageResponse)
async def activate_user(
    user_id: str,
    current_user: UserInDB = Depends(require_admin)
) -> MessageResponse:
    """Activate user account (admin only)"""
    auth_mgr = get_auth_manager()
    
    try:
        result = auth_mgr.supabase.table("users").update({
            "is_active": True
        }).eq("id", user_id).execute()
        
        if result.data:
            return MessageResponse(message="User activated successfully")
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to activate user"
        )

@auth_router.post("/users/{user_id}/deactivate", response_model=MessageResponse)
async def deactivate_user(
    user_id: str,
    current_user: UserInDB = Depends(require_admin)
) -> MessageResponse:
    """Deactivate user account (admin only)"""
    auth_mgr = get_auth_manager()
    
    # Prevent deactivating yourself
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot deactivate your own account"
        )
    
    try:
        result = auth_mgr.supabase.table("users").update({
            "is_active": False
        }).eq("id", user_id).execute()
        
        if result.data:
            return MessageResponse(message="User deactivated successfully")
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to deactivate user"
        )

@auth_router.delete("/users/{user_id}", response_model=MessageResponse)
async def delete_user(
    user_id: str,
    current_user: UserInDB = Depends(require_admin)
) -> MessageResponse:
    """Delete user account (admin only)"""
    auth_mgr = get_auth_manager()
    
    # Prevent deleting yourself
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own account"
        )
    
    try:
        result = auth_mgr.supabase.table("users").delete().eq("id", user_id).execute()
        
        if result.data:
            return MessageResponse(message="User deleted successfully")
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete user"
        )

# Role and permission management
@auth_router.get("/roles", response_model=List[Dict[str, Any]])
async def list_roles(
    current_user: UserInDB = Depends(require_manager)
) -> List[Dict[str, Any]]:
    """List all available roles"""
    roles = []
    for role in UserRole:
        permissions = [p.value for p in ROLE_PERMISSIONS.get(role, [])]
        roles.append({
            "name": role.value,
            "display_name": role.value.replace("_", " ").title(),
            "permissions": permissions
        })
    
    return roles

@auth_router.get("/permissions", response_model=List[Dict[str, str]])
async def list_permissions(
    current_user: UserInDB = Depends(require_manager)
) -> List[Dict[str, str]]:
    """List all available permissions"""
    permissions = []
    for permission in Permission:
        permissions.append({
            "name": permission.value,
            "display_name": permission.value.replace("_", " ").title()
        })
    
    return permissions

# Team management endpoints
@auth_router.get("/team/{team_id}/members", response_model=List[UserResponse])
async def get_team_members(
    team_id: str,
    current_user: UserInDB = Depends(get_current_active_user)
) -> List[UserResponse]:
    """Get team members"""
    auth_mgr = get_auth_manager()
    
    try:
        result = auth_mgr.supabase.table("users").select("*").eq("team_id", team_id).execute()
        members = [UserResponse(**user) for user in result.data]
        return members
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch team members"
        )

@auth_router.post("/team/{team_id}/invite", response_model=MessageResponse)
async def invite_user_to_team(
    team_id: str,
    user_email: str,
    role: UserRole,
    current_user: UserInDB = Depends(require_manager)
) -> MessageResponse:
    """Invite user to team"""
    auth_mgr = get_auth_manager()
    
    # Check if user has permission to manage this team
    if not auth_mgr.has_permission(current_user, Permission.INVITE_USERS):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission to invite users required"
        )
    
    try:
        # Check if user exists
        user = await auth_mgr.get_user_by_email(user_email)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Update user's team
        result = auth_mgr.supabase.table("users").update({
            "team_id": team_id
        }).eq("id", user.id).execute()
        
        if result.data:
            return MessageResponse(message=f"User {user_email} invited to team successfully")
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to invite user to team"
            )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to invite user to team"
        )

# Utility functions
async def send_welcome_email(email: str, name: str):
    """Send welcome email to new user (background task)"""
    # Implement email sending logic here
    # This could use SendGrid, AWS SES, or another email service
    pass

# Health check for auth system
@auth_router.get("/health", response_model=Dict[str, Any])
async def auth_health_check() -> Dict[str, Any]:
    """Check authentication system health"""
    try:
        auth_mgr = get_auth_manager()
        
        # Test database connection
        result = auth_mgr.supabase.table("users").select("count").limit(1).execute()
        
        return {
            "status": "healthy",
            "database": "connected",
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat()
        } 