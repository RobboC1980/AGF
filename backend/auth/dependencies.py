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
import os

try:
    from .clerk_auth import extract_user_from_token, verify_clerk_token
except ImportError:
    try:
        from backend.auth.clerk_auth import extract_user_from_token, verify_clerk_token
    except ImportError:
        # Fallback function for development
        def extract_user_from_token(token: str):
            raise HTTPException(status_code=401, detail="Clerk auth not available")
        def verify_clerk_token(token: str):
            raise HTTPException(status_code=401, detail="Clerk auth not available")

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
        
        # Special handling for development mode
        if os.getenv("ENVIRONMENT") == "development" and token == "dev-token":
            return UserResponse(
                id="dev-user-123",
                email="dev@example.com",
                name="Development User",
                first_name="Dev",
                last_name="User",
                clerk_user_id="dev-user-123",
                verified_email=True,
                is_active=True
            )
        
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

# MAIN AUTHENTICATION DEPENDENCY - Use this for all protected endpoints
get_current_user = get_current_user_clerk

# Legacy compatibility aliases for existing code
get_current_user_supabase = get_current_user_clerk  # For backward compatibility

# User class for legacy compatibility
class User:
    """Legacy user class for backward compatibility"""
    def __init__(self, id: str, email: str, name: str):
        self.id = id
        self.email = email
        self.name = name
        self.is_active = True

def dict_to_user_response(user_dict: Dict[str, Any]) -> UserResponse:
    """Convert dictionary to UserResponse for backward compatibility"""
    return UserResponse(
        id=user_dict.get("id", ""),
        email=user_dict.get("email", ""),
        name=user_dict.get("name", ""),
        first_name=user_dict.get("first_name"),
        last_name=user_dict.get("last_name"),
        image_url=user_dict.get("image_url"),
        clerk_user_id=user_dict.get("clerk_user_id"),
        verified_email=user_dict.get("verified_email", False),
        created_at=user_dict.get("created_at"),
        is_active=user_dict.get("is_active", True)
    )

def user_response_to_dict(user: UserResponse) -> Dict[str, Any]:
    """Convert UserResponse to dictionary for backward compatibility"""
    return {
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "image_url": user.image_url,
        "clerk_user_id": user.clerk_user_id,
        "verified_email": user.verified_email,
        "created_at": user.created_at,
        "is_active": user.is_active
    } 