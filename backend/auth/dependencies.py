"""
Production-ready Authentication Dependencies

Provides consistent authentication dependencies for all API endpoints
using Clerk JWT tokens with proper validation and user model conversion.
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel
import logging

try:
    from .clerk_auth import extract_user_from_token, verify_clerk_token
except ImportError:
    from clerk_auth import extract_user_from_token, verify_clerk_token

logger = logging.getLogger(__name__)
security = HTTPBearer()

class UserResponse(BaseModel):
    """Standardized user response model"""
    id: str
    email: str
    name: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    image_url: Optional[str] = None
    clerk_user_id: Optional[str] = None
    verified_email: bool = False
    created_at: Optional[str] = None
    is_active: bool = True

    @classmethod
    def from_clerk_payload(cls, user_data: Dict[str, Any]) -> "UserResponse":
        """Create UserResponse from Clerk token payload"""
        return cls(
            id=user_data.get("id", user_data.get("sub")),
            email=user_data.get("email", ""),
            name=user_data.get("name", "").strip() or "User",
            first_name=user_data.get("first_name"),
            last_name=user_data.get("last_name"),
            image_url=user_data.get("image_url"),
            clerk_user_id=user_data.get("clerk_user_id", user_data.get("id")),
            verified_email=user_data.get("verified_email", False),
            created_at=user_data.get("created_at"),
            is_active=True
        )

async def get_current_user_clerk(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> UserResponse:
    """
    Get the current authenticated user from Clerk JWT token
    
    This is the primary authentication dependency for all protected endpoints.
    It verifies the Clerk JWT token and returns a standardized UserResponse.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    if not credentials:
        raise credentials_exception
    
    try:
        token = credentials.credentials
        
        # Verify token and extract user information
        user_data = extract_user_from_token(token)
        
        if not user_data.get("id") and not user_data.get("sub"):
            logger.warning("Token verification succeeded but no user ID found")
            raise credentials_exception
        
        # Convert to standardized user response
        user = UserResponse.from_clerk_payload(user_data)
        
        logger.debug(f"Successfully authenticated user: {user.id}")
        return user
        
    except HTTPException:
        # Re-raise HTTP exceptions from token verification
        raise
    except Exception as e:
        logger.error(f"Authentication failed: {e}")
        raise credentials_exception

async def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False))
) -> Optional[UserResponse]:
    """
    Optional authentication dependency for endpoints that work with or without auth
    """
    if not credentials:
        return None
    
    try:
        return await get_current_user_clerk(credentials)
    except HTTPException:
        return None

async def get_current_active_user(
    current_user: UserResponse = Depends(get_current_user_clerk)
) -> UserResponse:
    """
    Get current active user (ensures user is active)
    """
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
    return current_user

# Legacy compatibility aliases
get_current_user = get_current_user_clerk
get_current_user_supabase = get_current_user_clerk  # For backward compatibility

# User class for legacy compatibility
class User:
    """Legacy user class for backward compatibility"""
    def __init__(self, id: str, email: str, name: str):
        self.id = id
        self.email = email
        self.name = name 