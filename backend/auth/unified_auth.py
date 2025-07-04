"""
Unified Authentication Module

This module provides a single, consistent authentication interface that supports:
- Clerk JWT tokens (primary)
- Development mode (for testing)

This resolves the 401 authentication errors by providing a unified approach that
properly handles Clerk RS256 JWT tokens.
"""

import os
import logging
from typing import Optional, Dict, Any
from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel

# Import the correct Clerk authentication functions
try:
    from .dependencies import get_current_user_clerk, UserResponse, get_current_user_optional as get_optional_auth
except ImportError:
    try:
        from backend.auth.dependencies import get_current_user_clerk, UserResponse, get_current_user_optional as get_optional_auth
    except ImportError:
        # Fallback for development
        def get_current_user_clerk(credentials):
            raise HTTPException(status_code=401, detail="Clerk auth not available")
        def get_optional_auth(credentials):
            return None
        UserResponse = None

logger = logging.getLogger(__name__)
security = HTTPBearer()

class UnifiedUser(BaseModel):
    """Unified user model that works with Clerk authentication"""
    id: str
    email: str
    name: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    image_url: Optional[str] = None
    is_active: bool = True
    auth_provider: str = "clerk"

    @classmethod
    def from_user_response(cls, user_response: UserResponse) -> "UnifiedUser":
        """Create UnifiedUser from UserResponse"""
        return cls(
            id=user_response.id,
            email=user_response.email,
            name=user_response.name,
            first_name=user_response.first_name,
            last_name=user_response.last_name,
            image_url=user_response.image_url,
            is_active=user_response.is_active,
            auth_provider="clerk"
        )

class UnifiedAuthService:
    """Unified authentication service that handles Clerk authentication"""
    
    def __init__(self):
        self.environment = os.getenv("ENVIRONMENT", "development")
        self.clerk_publishable_key = os.getenv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY")
        
    def create_dev_user(self) -> UnifiedUser:
        """Create a development user for testing"""
        return UnifiedUser(
            id="dev-user-123",
            email="dev@example.com",
            name="Development User",
            first_name="Dev",
            last_name="User",
            auth_provider="dev"
        )

# Global auth service instance
_auth_service = UnifiedAuthService()

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> UnifiedUser:
    """
    Get the current authenticated user (unified approach)
    
    This uses the proper Clerk authentication system and converts to UnifiedUser.
    """
    # Use the correct Clerk authentication
    user_response = await get_current_user_clerk(credentials)
    
    # Convert to UnifiedUser
    return UnifiedUser.from_user_response(user_response)

async def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False))
) -> Optional[UnifiedUser]:
    """
    Optional authentication dependency for endpoints that work with or without auth
    """
    if not credentials:
        return None
    
    try:
        user_response = await get_current_user_clerk(credentials)
        return UnifiedUser.from_user_response(user_response)
    except HTTPException:
        return None

# Legacy compatibility aliases for existing code
get_current_user_clerk = get_current_user
get_current_user_supabase = get_current_user 