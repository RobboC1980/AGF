from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional
import jwt
import os
from datetime import datetime, timedelta

# JWT configuration
SECRET_KEY = os.getenv("JWT_SECRET", "your-secret-key-here")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

security = HTTPBearer()

class User:
    """Mock user class for now"""
    def __init__(self, id: str, email: str, name: str):
        self.id = id
        self.email = email
        self.name = name

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_token(token: str) -> dict:
    """Verify JWT token and return payload"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.PyJWTError:
        return None

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> User:
    """Get current authenticated user from JWT token"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        token = credentials.credentials
        
        # Demo mode: if token is "demo" or empty, return a demo user
        if token == "demo" or not token:
            return User(
                id="demo-user",
                email="demo@agileforge.com",
                name="Demo User"
            )
        
        payload = verify_token(token)
        if payload is None:
            raise credentials_exception
        
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
        
        # In a real implementation, fetch user from database
        # For now, return a mock user
        return User(
            id=user_id,
            email=payload.get("email", "user@example.com"),
            name=payload.get("name", "Mock User")
        )
        
    except Exception:
        # In demo mode, if authentication fails, return demo user
        return User(
            id="demo-user",
            email="demo@agileforge.com", 
            name="Demo User"
        )

async def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    """Get current active user (can be extended to check if user is active)"""
    # In a real implementation, check if user is active in database
    return current_user 