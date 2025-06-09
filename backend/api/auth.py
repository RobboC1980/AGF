from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from typing import Optional
import jwt
import bcrypt
import os
from datetime import datetime, timedelta
import logging

from ..database.connection import get_db_connection

logger = logging.getLogger(__name__)
router = APIRouter()
security = HTTPBearer()

# JWT Configuration
JWT_SECRET = os.getenv("JWT_SECRET", "your-secret-key-change-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

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

def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    """Verify a password against its hash"""
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_access_token(user_id: str, email: str) -> str:
    """Create a JWT access token"""
    expire = datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS)
    payload = {
        "user_id": user_id,
        "email": email,
        "exp": expire,
        "iat": datetime.utcnow()
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def verify_token(token: str) -> dict:
    """Verify and decode a JWT token"""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired"
        )
    except jwt.JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db = Depends(get_db_connection)
):
    """Get the current authenticated user"""
    payload = verify_token(credentials.credentials)
    user_id = payload.get("user_id")
    
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload"
        )
    
    # Fetch user from database
    user = await db.fetchrow(
        "SELECT id, email, name, avatar_url FROM users WHERE id = $1",
        user_id
    )
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    
    return UserResponse(**dict(user))

@router.post("/register", response_model=TokenResponse)
async def register(user_data: UserCreate, db = Depends(get_db_connection)):
    """Register a new user"""
    try:
        # Check if user already exists
        existing_user = await db.fetchrow(
            "SELECT id FROM users WHERE email = $1",
            user_data.email
        )
        
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        # Hash password
        hashed_password = hash_password(user_data.password)
        
        # Create user
        user = await db.fetchrow("""
            INSERT INTO users (email, name, password_hash)
            VALUES ($1, $2, $3)
            RETURNING id, email, name, avatar_url
        """, user_data.email, user_data.name, hashed_password)
        
        # Create access token
        access_token = create_access_token(str(user['id']), user['email'])
        
        return TokenResponse(
            access_token=access_token,
            token_type="bearer",
            user=UserResponse(**dict(user))
        )
        
    except Exception as e:
        logger.error(f"Registration failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration failed"
        )

@router.post("/login", response_model=TokenResponse)
async def login(login_data: UserLogin, db = Depends(get_db_connection)):
    """Login user"""
    try:
        # Fetch user with password
        user = await db.fetchrow("""
            SELECT id, email, name, avatar_url, password_hash
            FROM users WHERE email = $1
        """, login_data.email)
        
        if not user or not verify_password(login_data.password, user['password_hash']):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )
        
        # Create access token
        access_token = create_access_token(str(user['id']), user['email'])
        
        # Remove password from response
        user_data = {k: v for k, v in dict(user).items() if k != 'password_hash'}
        
        return TokenResponse(
            access_token=access_token,
            token_type="bearer",
            user=UserResponse(**user_data)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Login failed"
        )

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: UserResponse = Depends(get_current_user)):
    """Get current user information"""
    return current_user

@router.post("/refresh")
async def refresh_token(current_user: UserResponse = Depends(get_current_user)):
    """Refresh access token"""
    access_token = create_access_token(current_user.id, current_user.email)
    return {
        "access_token": access_token,
        "token_type": "bearer"
    }
