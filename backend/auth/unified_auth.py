"""
Unified Authentication Module

This module provides a single, consistent authentication interface that supports:
- Clerk JWT tokens (primary)
- Supabase JWT tokens (fallback)
- Development mode (for testing)

This resolves the 401 authentication errors by providing a unified approach.
"""

import os
import logging
from typing import Optional, Dict, Any
from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
import jwt

# Import Clerk verification functions
try:
    from .clerk_auth import verify_clerk_token, extract_user_from_token as clerk_extract_user
except ImportError:
    try:
        from backend.auth.clerk_auth import verify_clerk_token, extract_user_from_token as clerk_extract_user
    except ImportError:
        # Fallback function for development
        def verify_clerk_token(token: str):
            raise HTTPException(status_code=401, detail="Clerk auth not available")
        def clerk_extract_user(token: str):
            raise HTTPException(status_code=401, detail="Clerk auth not available")

logger = logging.getLogger(__name__)
security = HTTPBearer()

class UnifiedUser(BaseModel):
    """Unified user model that works with both Clerk and Supabase"""
    id: str
    email: str
    name: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    image_url: Optional[str] = None
    is_active: bool = True
    auth_provider: str = "clerk"  # clerk, supabase, or dev

class UnifiedAuthService:
    """Unified authentication service that handles multiple auth providers"""
    
    def __init__(self):
        self.environment = os.getenv("ENVIRONMENT", "development")
        self.clerk_publishable_key = os.getenv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY")
        self.supabase_jwt_secret = os.getenv("SUPABASE_JWT_SECRET")
        
    def verify_clerk_token_unified(self, token: str) -> Optional[Dict[str, Any]]:
        """Verify Clerk JWT token using the dedicated clerk_auth module"""
        try:
            # Use the proper Clerk verification from clerk_auth module
            payload = verify_clerk_token(token)
            return payload
        except HTTPException:
            # Re-raise HTTP exceptions from clerk_auth
            raise
        except Exception as e:
            logger.debug(f"Clerk token verification failed: {e}")
            return None
    
    def verify_supabase_token(self, token: str) -> Optional[Dict[str, Any]]:
        """Verify Supabase JWT token"""
        try:
            if not self.supabase_jwt_secret:
                return None
                
            payload = jwt.decode(
                token, 
                self.supabase_jwt_secret, 
                algorithms=["HS256"]
            )
            return payload
            
        except Exception as e:
            logger.debug(f"Supabase token verification failed: {e}")
        
        return None
    
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
    
    def extract_user_from_token(self, token: str) -> Optional[UnifiedUser]:
        """Extract user information from any supported token type"""
        
        # Try Clerk token first using the dedicated clerk_auth module
        try:
            clerk_user_data = clerk_extract_user(token)
            if clerk_user_data and clerk_user_data.get("id"):
                return UnifiedUser(
                    id=clerk_user_data.get("id"),
                    email=clerk_user_data.get("email", ""),
                    name=clerk_user_data.get("name", "").strip() or "User",
                    first_name=clerk_user_data.get("first_name"),
                    last_name=clerk_user_data.get("last_name"),
                    image_url=clerk_user_data.get("image_url"),
                    auth_provider="clerk"
                )
        except HTTPException:
            # Re-raise HTTP exceptions from Clerk verification
            raise
        except Exception as e:
            logger.debug(f"Clerk user extraction failed: {e}")
        
        # Try Supabase token as fallback
        try:
            supabase_payload = self.verify_supabase_token(token)
            if supabase_payload:
                return UnifiedUser(
                    id=supabase_payload.get("sub", ""),
                    email=supabase_payload.get("email", ""),
                    name=supabase_payload.get("name", supabase_payload.get("email", "").split("@")[0]),
                    auth_provider="supabase"
                )
        except Exception as e:
            logger.debug(f"Supabase user extraction failed: {e}")
        
        return None

# Global auth service instance
_auth_service = UnifiedAuthService()

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> UnifiedUser:
    """
    Get the current authenticated user (unified approach)
    
    This is the main authentication dependency that should be used
    throughout the application to resolve 401 errors.
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
        
        # Development mode: allow special dev tokens
        if _auth_service.environment == "development" and token == "dev-token":
            return _auth_service.create_dev_user()
        
        # Try to extract user from token
        user = _auth_service.extract_user_from_token(token)
        
        if not user:
            logger.warning("Token verification failed for all providers")
            raise credentials_exception
        
        if not user.id:
            logger.warning("Token verification succeeded but no user ID found")
            raise credentials_exception
        
        logger.debug(f"Successfully authenticated user: {user.id} via {user.auth_provider}")
        return user
        
    except HTTPException:
        # Re-raise HTTP exceptions (including from Clerk verification)
        raise
    except Exception as e:
        logger.error(f"Authentication failed: {e}")
        raise credentials_exception

async def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False))
) -> Optional[UnifiedUser]:
    """
    Optional authentication dependency for endpoints that work with or without auth
    """
    if not credentials:
        return None
    
    try:
        return await get_current_user(credentials)
    except HTTPException:
        return None

async def get_current_active_user(
    current_user: UnifiedUser = Depends(get_current_user)
) -> UnifiedUser:
    """
    Get current active user (ensures user is active)
    """
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
    return current_user

# Legacy compatibility aliases for existing code
get_current_user_clerk = get_current_user
get_current_user_supabase = get_current_user 