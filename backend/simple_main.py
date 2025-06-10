from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import jwt
import bcrypt
import os
from datetime import datetime, timedelta
import uuid

# Create FastAPI app
app = FastAPI(
    title="AgileForge API",
    description="AI-Powered Agile Project Management Platform",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# JWT Configuration
JWT_SECRET = os.getenv("JWT_SECRET", "your-secret-key-change-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# Security
security = HTTPBearer()

# CORS configuration
allowed_origins = [
    "http://localhost:3000",  # Next.js dev server
    "http://localhost:3001",  # Alternative port
    "http://localhost:3002",  # Alternative port
    "https://v0-agile-forge-40higfdur-clariq.vercel.app",  # Deployed frontend
    "https://*.vercel.app",  # Vercel preview deployments
]

# Add environment-specific origins
if os.getenv("FRONTEND_URL"):
    allowed_origins.append(os.getenv("FRONTEND_URL"))

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"]
)

# Pydantic models
class UserCreate(BaseModel):
    email: str
    name: str
    password: str

class UserLogin(BaseModel):
    email: str
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

class PasswordResetRequest(BaseModel):
    email: str

class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str

# In-memory storage (for demo purposes)
users_db: Dict[str, Dict] = {}
password_reset_tokens: Dict[str, Dict] = {}

# Sample data initialization
def init_sample_data():
    # Create a sample user for testing
    sample_user_id = str(uuid.uuid4())
    hashed_password = hash_password("password123")
    
    users_db[sample_user_id] = {
        "id": sample_user_id,
        "email": "demo@agileforge.com",
        "name": "Demo User",
        "password_hash": hashed_password,
        "avatar_url": "/placeholder.svg?height=32&width=32",
        "created_at": datetime.now().isoformat()
    }

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

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get the current authenticated user"""
    payload = verify_token(credentials.credentials)
    user_id = payload.get("user_id")
    
    if not user_id or user_id not in users_db:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    
    user = users_db[user_id]
    return UserResponse(
        id=user["id"],
        email=user["email"],
        name=user["name"],
        avatar_url=user.get("avatar_url")
    )

# Health check endpoint
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "version": "1.0.0",
        "database": "connected",
        "services": {
            "api": "running",
            "auth": "available",
            "storage": "available"
        }
    }

@app.get("/")
async def root():
    return {
        "message": "AgileForge API is running!",
        "version": "1.0.0",
        "status": "operational",
        "docs": "/docs"
    }

# Authentication endpoints
@app.post("/api/auth/register", response_model=TokenResponse)
async def register(user_data: UserCreate):
    """Register a new user"""
    # Check if user already exists
    for user in users_db.values():
        if user["email"] == user_data.email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
    
    # Create new user
    user_id = str(uuid.uuid4())
    hashed_password = hash_password(user_data.password)
    
    new_user = {
        "id": user_id,
        "email": user_data.email,
        "name": user_data.name,
        "password_hash": hashed_password,
        "avatar_url": "/placeholder.svg?height=32&width=32",
        "created_at": datetime.now().isoformat()
    }
    
    users_db[user_id] = new_user
    
    # Create access token
    access_token = create_access_token(user_id, user_data.email)
    
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse(
            id=user_id,
            email=user_data.email,
            name=user_data.name,
            avatar_url=new_user["avatar_url"]
        )
    )

@app.post("/api/auth/login", response_model=TokenResponse)
async def login(login_data: UserLogin):
    """Login user"""
    # Find user by email
    user = None
    for u in users_db.values():
        if u["email"] == login_data.email:
            user = u
            break
    
    if not user or not verify_password(login_data.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    # Create access token
    access_token = create_access_token(user["id"], user["email"])
    
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse(
            id=user["id"],
            email=user["email"],
            name=user["name"],
            avatar_url=user.get("avatar_url")
        )
    )

@app.get("/api/auth/me", response_model=UserResponse)
async def get_current_user_info(current_user: UserResponse = Depends(get_current_user)):
    """Get current user information"""
    return current_user

@app.post("/api/auth/password-reset-request")
async def password_reset_request(reset_data: PasswordResetRequest):
    """Initiate password reset process"""
    # For demo purposes, always return success
    return {"message": "If an account with this email exists, you will receive a password reset link."}

@app.post("/api/auth/password-reset-confirm")
async def password_reset_confirm(reset_data: PasswordResetConfirm):
    """Confirm password reset with token"""
    # For demo purposes, just return success
    return {"message": "Password reset successful. You can now log in with your new password."}

# Basic API endpoints
@app.get("/api/status")
async def api_status():
    return {
        "status": "healthy",
        "entities": {
            "users": len(users_db),
            "stories": 5,
            "epics": 2,
            "projects": 2
        }
    }

@app.get("/api/users")
async def get_users(current_user: UserResponse = Depends(get_current_user)):
    """Get all users"""
    return [
        {
            "id": user["id"],
            "username": user["name"],
            "email": user["email"],
            "first_name": user["name"].split()[0] if user["name"] else "",
            "last_name": " ".join(user["name"].split()[1:]) if len(user["name"].split()) > 1 else "",
            "avatar_url": user.get("avatar_url"),
            "is_active": True,
            "created_at": user["created_at"]
        }
        for user in users_db.values()
    ]

@app.get("/api/stories")
async def get_stories():
    """Get all stories"""
    return [
        {
            "id": "story-1",
            "epic_id": "epic-1",
            "title": "User Authentication",
            "description": "Implement user login and registration",
            "story_key": "AGF-1",
            "as_a": "user",
            "i_want": "to authenticate",
            "so_that": "I can access the system",
            "acceptance_criteria": "User can register and login successfully",
            "status": "in-progress",
            "priority": "high",
            "story_points": 5,
            "assignee_id": None,
            "due_date": None,
            "created_by": "user-1",
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        },
        {
            "id": "story-2",
            "epic_id": "epic-1",
            "title": "Data Persistence",
            "description": "Save user data and preferences",
            "story_key": "AGF-2",
            "as_a": "user",
            "i_want": "my data to be saved",
            "so_that": "I don't lose my work",
            "acceptance_criteria": "User data persists across sessions",
            "status": "backlog",
            "priority": "medium",
            "story_points": 3,
            "assignee_id": None,
            "due_date": None,
            "created_by": "user-1",
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }
    ]

@app.post("/api/stories")
async def create_story(story_data: dict, current_user: UserResponse = Depends(get_current_user)):
    """Create a new story"""
    story_id = str(uuid.uuid4())
    new_story = {
        "id": story_id,
        "epic_id": story_data.get("epic_id", "epic-1"),
        "title": story_data.get("title", "New Story"),
        "description": story_data.get("description", ""),
        "story_key": f"AGF-{story_id[:8]}",
        "as_a": story_data.get("as_a", ""),
        "i_want": story_data.get("i_want", ""),
        "so_that": story_data.get("so_that", ""),
        "acceptance_criteria": story_data.get("acceptance_criteria", ""),
        "status": story_data.get("status", "backlog"),
        "priority": story_data.get("priority", "medium"),
        "story_points": story_data.get("story_points"),
        "assignee_id": story_data.get("assignee_id"),
        "due_date": story_data.get("due_date"),
        "created_by": current_user.id,
        "created_at": datetime.now().isoformat(),
        "updated_at": datetime.now().isoformat()
    }
    return new_story

@app.get("/api/epics")
async def get_epics():
    """Get all epics"""
    return [
        {
            "id": "epic-1",
            "project_id": "proj-1",
            "title": "User Management",
            "description": "Complete user management system",
            "epic_key": "AGF-E1",
            "status": "in-progress",
            "priority": "high",
            "start_date": None,
            "target_end_date": None,
            "estimated_story_points": 20,
            "actual_story_points": 8,
            "progress": 40,
            "created_by": "user-1",
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }
    ]

@app.get("/api/projects")
async def get_projects():
    """Get all projects"""
    return [
        {
            "id": "proj-1",
            "name": "AgileForge Platform",
            "key": "AGF",
            "description": "Complete project management platform",
            "status": "in-progress",
            "priority": "high",
            "start_date": None,
            "target_end_date": None,
            "progress": 35,
            "created_by": "user-1",
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }
    ]

@app.get("/api/tasks")
async def get_tasks():
    """Get all tasks"""
    return [
        {
            "id": "task-1",
            "story_id": "story-1",
            "title": "Setup authentication backend",
            "description": "Configure JWT and password hashing",
            "task_key": "AGF-T1",
            "status": "in-progress",
            "priority": "high",
            "assignee_id": None,
            "estimated_hours": 8,
            "actual_hours": 4,
            "due_date": None,
            "created_by": "user-1",
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }
    ]

# Initialize sample data
init_sample_data()

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 4000))
    uvicorn.run(
        "simple_main:app",
        host="0.0.0.0",
        port=port,
        reload=True
    ) 