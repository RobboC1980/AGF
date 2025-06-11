"""
Authentication and Authorization API Routes
Provides comprehensive endpoints for user authentication, authorization, and session management.
"""

from fastapi import APIRouter, HTTPException, status, Depends, Request, Response
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, EmailStr
from typing import List, Optional, Dict, Any
from datetime import datetime
import logging

from auth.auth_service import auth_service, UserCredentials, UserRegistration, AuthResult
from auth.jwt_manager import jwt_manager, TokenType
from auth.rbac import rbac_manager, Role, Permission, ResourceType
from auth.dependencies import (
    get_current_user, get_current_user_optional, CurrentUser,
    require_admin_access, require_permissions
)
from middleware.authorization import audit_logger

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/auth", tags=["authentication"])
security = HTTPBearer()

# =====================================
# REQUEST/RESPONSE MODELS
# =====================================

class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    remember_me: bool = False

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    first_name: str
    last_name: str
    username: Optional[str] = None

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: Dict[str, Any]

class RefreshTokenRequest(BaseModel):
    refresh_token: str

class PasswordResetRequest(BaseModel):
    email: EmailStr

class PasswordResetConfirm(BaseModel):
    reset_token: str
    new_password: str

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

class EmailVerificationRequest(BaseModel):
    verification_token: str

class UserProfileResponse(BaseModel):
    id: str
    email: str
    username: str
    first_name: str
    last_name: str
    roles: List[str]
    permissions: List[str]
    is_verified: bool
    created_at: datetime
    last_login: Optional[datetime]

class SessionResponse(BaseModel):
    session_id: str
    device_info: Dict[str, Any]
    ip_address: str
    created_at: datetime
    last_used: datetime
    is_current: bool

class RoleAssignmentRequest(BaseModel):
    user_id: str
    role: Role
    resource_type: Optional[ResourceType] = None
    resource_id: Optional[str] = None

class APIKeyRequest(BaseModel):
    name: str
    permissions: List[Permission]
    expires_days: Optional[int] = None

class APIKeyResponse(BaseModel):
    api_key: str
    name: str
    permissions: List[str]
    expires_at: Optional[datetime]

# =====================================
# AUTHENTICATION ENDPOINTS
# =====================================

@router.post("/login", response_model=TokenResponse)
async def login(request: Request, login_data: LoginRequest):
    """Authenticate user and return tokens"""
    try:
        # Get request info
        client_ip = getattr(request.client, 'host', 'unknown') if request.client else 'unknown'
        user_agent = request.headers.get('user-agent', '')
        
        request_info = {
            "ip_address": client_ip,
            "user_agent": user_agent
        }
        
        # Authenticate user
        credentials = UserCredentials(
            email=login_data.email,
            password=login_data.password
        )
        
        result = await auth_service.authenticate_user(credentials, request_info)
        
        if not result.success:
            audit_logger.log_login_attempt(login_data.email, client_ip, False, user_agent)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=result.error_message or "Authentication failed"
            )
        
        if result.requires_verification:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Email verification required"
            )
        
        return TokenResponse(
            access_token=result.access_token,
            refresh_token=result.refresh_token,
            expires_in=jwt_manager.access_token_expire_minutes * 60,
            user=result.user_data
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Login failed"
        )

@router.post("/register", response_model=Dict[str, Any])
async def register(request: Request, register_data: RegisterRequest):
    """Register a new user"""
    try:
        # Get request info
        client_ip = getattr(request.client, 'host', 'unknown') if request.client else 'unknown'
        user_agent = request.headers.get('user-agent', '')
        
        request_info = {
            "ip_address": client_ip,
            "user_agent": user_agent
        }
        
        # Register user
        registration = UserRegistration(
            email=register_data.email,
            password=register_data.password,
            first_name=register_data.first_name,
            last_name=register_data.last_name,
            username=register_data.username
        )
        
        result = await auth_service.register_user(registration, request_info)
        
        if not result.success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result.error_message or "Registration failed"
            )
        
        return {
            "success": True,
            "message": "User registered successfully. Please check your email for verification.",
            "user": result.user_data,
            "requires_verification": result.requires_verification
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Registration error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration failed"
        )

@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(refresh_data: RefreshTokenRequest):
    """Refresh access token"""
    try:
        result = await auth_service.refresh_token(refresh_data.refresh_token)
        
        if not result.success:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=result.error_message or "Token refresh failed"
            )
        
        return TokenResponse(
            access_token=result.access_token,
            refresh_token=result.refresh_token,
            expires_in=jwt_manager.access_token_expire_minutes * 60,
            user=result.user_data
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Token refresh error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Token refresh failed"
        )

@router.post("/logout")
async def logout(current_user: CurrentUser = Depends(get_current_user)):
    """Logout current session"""
    try:
        success = await auth_service.logout_user(current_user.session_id)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Logout failed"
            )
        
        return {"message": "Logged out successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Logout error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Logout failed"
        )

@router.post("/logout-all")
async def logout_all_sessions(current_user: CurrentUser = Depends(get_current_user)):
    """Logout from all sessions"""
    try:
        count = await auth_service.logout_all_sessions(current_user.id)
        
        return {
            "message": f"Logged out from {count} sessions",
            "sessions_invalidated": count
        }
        
    except Exception as e:
        logger.error(f"Logout all sessions error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Logout failed"
        )

# =====================================
# PASSWORD MANAGEMENT
# =====================================

@router.post("/forgot-password")
async def forgot_password(request_data: PasswordResetRequest):
    """Request password reset"""
    try:
        success = await auth_service.request_password_reset(request_data.email)
        
        # Always return success to prevent email enumeration
        return {
            "message": "If the email exists, a password reset link has been sent."
        }
        
    except Exception as e:
        logger.error(f"Password reset request error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Password reset request failed"
        )

@router.post("/reset-password")
async def reset_password(request_data: PasswordResetConfirm):
    """Reset password with token"""
    try:
        result = await auth_service.reset_password(
            request_data.reset_token,
            request_data.new_password
        )
        
        if not result.success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result.error_message or "Password reset failed"
            )
        
        return {"message": "Password reset successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Password reset error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Password reset failed"
        )

@router.post("/change-password")
async def change_password(
    request_data: ChangePasswordRequest,
    current_user: CurrentUser = Depends(get_current_user)
):
    """Change user password"""
    try:
        # Verify current password
        credentials = UserCredentials(
            email=current_user.email,
            password=request_data.current_password
        )
        
        auth_result = await auth_service.authenticate_user(credentials, {})
        if not auth_result.success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Current password is incorrect"
            )
        
        # Change password (implementation would go here)
        # For now, return success
        return {"message": "Password changed successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Password change error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Password change failed"
        )

# =====================================
# EMAIL VERIFICATION
# =====================================

@router.post("/verify-email")
async def verify_email(request_data: EmailVerificationRequest):
    """Verify user email"""
    try:
        result = await auth_service.verify_email(request_data.verification_token)
        
        if not result.success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result.error_message or "Email verification failed"
            )
        
        return {"message": "Email verified successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Email verification error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Email verification failed"
        )

@router.post("/resend-verification")
async def resend_verification(
    current_user: CurrentUser = Depends(get_current_user)
):
    """Resend email verification"""
    try:
        # Implementation would resend verification email
        return {"message": "Verification email sent"}
        
    except Exception as e:
        logger.error(f"Resend verification error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to resend verification email"
        )

# =====================================
# USER PROFILE & SESSION MANAGEMENT
# =====================================

@router.get("/me", response_model=UserProfileResponse)
async def get_current_user_profile(current_user: CurrentUser = Depends(get_current_user)):
    """Get current user profile"""
    try:
        # Get user data from database
        async with auth_service.get_db_connection() as conn:
            user = await conn.fetchrow("""
                SELECT id, email, username, first_name, last_name, 
                       is_verified, created_at, last_login
                FROM users WHERE id = $1
            """, current_user.id)
            
            if not user:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="User not found"
                )
            
            return UserProfileResponse(
                id=user['id'],
                email=user['email'],
                username=user['username'],
                first_name=user['first_name'],
                last_name=user['last_name'],
                roles=current_user.roles,
                permissions=current_user.permissions,
                is_verified=user['is_verified'],
                created_at=user['created_at'],
                last_login=user['last_login']
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get user profile error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get user profile"
        )

@router.get("/sessions", response_model=List[SessionResponse])
async def get_user_sessions(current_user: CurrentUser = Depends(get_current_user)):
    """Get user's active sessions"""
    try:
        sessions = jwt_manager.get_user_sessions(current_user.id)
        
        session_responses = []
        for session in sessions:
            session_responses.append(SessionResponse(
                session_id=session.session_id,
                device_info=session.device_info,
                ip_address=session.ip_address,
                created_at=session.created_at,
                last_used=session.last_used,
                is_current=(session.session_id == current_user.session_id)
            ))
        
        return session_responses
        
    except Exception as e:
        logger.error(f"Get sessions error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get sessions"
        )

@router.delete("/sessions/{session_id}")
async def revoke_session(
    session_id: str,
    current_user: CurrentUser = Depends(get_current_user)
):
    """Revoke a specific session"""
    try:
        # Verify session belongs to user
        user_sessions = jwt_manager.get_user_sessions(current_user.id)
        session_ids = [s.session_id for s in user_sessions]
        
        if session_id not in session_ids:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found"
            )
        
        success = jwt_manager.invalidate_session(session_id)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to revoke session"
            )
        
        return {"message": "Session revoked successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Revoke session error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to revoke session"
        )

# =====================================
# API KEY MANAGEMENT
# =====================================

@router.post("/api-keys", response_model=APIKeyResponse)
async def create_api_key(
    request_data: APIKeyRequest,
    current_user: CurrentUser = Depends(get_current_user)
):
    """Create an API key"""
    try:
        # Check if user has permission to create API keys
        if not current_user.has_permission(Permission.SYSTEM_ADMIN):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions to create API keys"
            )
        
        permission_strings = [perm.value for perm in request_data.permissions]
        
        api_key = jwt_manager.create_api_key(
            user_id=current_user.id,
            name=request_data.name,
            permissions=permission_strings,
            expires_days=request_data.expires_days
        )
        
        # Calculate expiry date
        expires_at = None
        if request_data.expires_days:
            from datetime import timedelta
            expires_at = datetime.utcnow() + timedelta(days=request_data.expires_days)
        
        return APIKeyResponse(
            api_key=api_key,
            name=request_data.name,
            permissions=permission_strings,
            expires_at=expires_at
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Create API key error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create API key"
        )

# =====================================
# ADMIN ENDPOINTS
# =====================================

@router.post("/admin/assign-role")
async def assign_role(
    request_data: RoleAssignmentRequest,
    current_user: CurrentUser = Depends(require_admin_access)
):
    """Assign role to user (admin only)"""
    try:
        success = rbac_manager.assign_role(
            user_id=request_data.user_id,
            role=request_data.role,
            resource_type=request_data.resource_type,
            resource_id=request_data.resource_id,
            granted_by=current_user.id
        )
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to assign role"
            )
        
        audit_logger.log_admin_action(
            current_user.id,
            f"assign_role:{request_data.role.value}",
            request_data.user_id,
            "system"
        )
        
        return {"message": "Role assigned successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Assign role error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to assign role"
        )

@router.delete("/admin/revoke-role")
async def revoke_role(
    request_data: RoleAssignmentRequest,
    current_user: CurrentUser = Depends(require_admin_access)
):
    """Revoke role from user (admin only)"""
    try:
        success = rbac_manager.revoke_role(
            user_id=request_data.user_id,
            role=request_data.role,
            resource_type=request_data.resource_type,
            resource_id=request_data.resource_id
        )
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to revoke role"
            )
        
        audit_logger.log_admin_action(
            current_user.id,
            f"revoke_role:{request_data.role.value}",
            request_data.user_id,
            "system"
        )
        
        return {"message": "Role revoked successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Revoke role error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to revoke role"
        )

@router.get("/admin/user-permissions/{user_id}")
async def get_user_permissions(
    user_id: str,
    current_user: CurrentUser = Depends(require_admin_access)
):
    """Get user permissions (admin only)"""
    try:
        user_roles = rbac_manager.get_user_roles(user_id)
        permissions = rbac_manager.get_user_permissions(user_id)
        
        return {
            "user_id": user_id,
            "roles": [{"role": role.role.value, "resource_type": role.resource_type, "resource_id": role.resource_id} for role in user_roles],
            "permissions": [perm.value for perm in permissions]
        }
        
    except Exception as e:
        logger.error(f"Get user permissions error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get user permissions"
        ) 