from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from typing import Optional
import os
from datetime import datetime, timedelta
import logging

from ..database.supabase_client import get_supabase

logger = logging.getLogger(__name__)
router = APIRouter()
security = HTTPBearer()

class UserCreate(BaseModel):
    email: EmailStr
    name: str
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    avatar_url: Optional[str] = None

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

class RegistrationResponse(BaseModel):
    access_token: Optional[str] = None
    token_type: Optional[str] = None
    user: UserResponse
    message: Optional[str] = None

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    supabase = Depends(get_supabase)
):
    """Get the current authenticated user"""
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

@router.post("/register", response_model=RegistrationResponse)
async def register(user_data: UserCreate, supabase = Depends(get_supabase)):
    """Register a new user"""
    try:
        # Register user with Supabase Auth
        auth_response = supabase.auth.sign_up({
            "email": user_data.email,
            "password": user_data.password
        })
        
        if not auth_response.user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Registration failed - user already exists or invalid data"
            )
        
        # Create user profile in the database
        user_profile = {
            "id": auth_response.user.id,
            "email": user_data.email,
            "name": user_data.name,
            "avatar_url": None
        }
        
        # Use upsert to handle potential conflicts
        profile_response = supabase.table("users").upsert(user_profile).execute()
        
        if not profile_response.data:
            logger.error("Failed to create user profile after auth registration")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create user profile"
            )
        
        # If no session was created (email confirmation required), return success without token
        if not auth_response.session:
            return RegistrationResponse(
                message="Registration successful. Please check your email to confirm your account.",
                user=UserResponse(**user_profile)
            )
        
        return RegistrationResponse(
            access_token=auth_response.session.access_token,
            token_type="bearer",
            user=UserResponse(**user_profile)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Registration failed: {e}")
        # Check if it's a user already exists error
        if "already registered" in str(e) or "duplicate" in str(e) or "already been registered" in str(e):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User with this email already exists"
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Registration failed: {str(e)}"
        )

@router.post("/login", response_model=TokenResponse)
async def login(login_data: UserLogin, supabase = Depends(get_supabase)):
    """Login user"""
    try:
        # Authenticate with Supabase
        auth_response = supabase.auth.sign_in_with_password({
            "email": login_data.email,
            "password": login_data.password
        })
        
        if not auth_response.user or not auth_response.session:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )
        
        # Get user profile
        user_data = supabase.table("users").select("*").eq("id", auth_response.user.id).single().execute()
        
        if not user_data.data:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User profile not found"
            )
        
        return TokenResponse(
            access_token=auth_response.session.access_token,
            token_type="bearer",
            user=UserResponse(**user_data.data)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login failed: {e}")
        # Check if it's an authentication error from Supabase
        if "Invalid login credentials" in str(e) or "invalid_grant" in str(e):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Login failed"
        )

@router.post("/logout")
async def logout(supabase = Depends(get_supabase)):
    """Logout user"""
    try:
        supabase.auth.sign_out()
        return {"message": "Successfully logged out"}
    except Exception as e:
        logger.error(f"Logout failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Logout failed"
        )

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: UserResponse = Depends(get_current_user)):
    """Get current user information"""
    return current_user
