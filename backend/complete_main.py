"""
AgileForge Complete Backend Implementation
FastAPI application with full CRUD operations for all entities
"""

# Load environment variables FIRST before any other imports
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, HTTPException, Depends, Query, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime, date
from contextlib import asynccontextmanager
import uvicorn
import uuid
import json
import logging
from enum import Enum

# Database imports
import asyncpg
from database.connection import db_manager, init_db, close_db, get_db_connection

# Import AI service
try:
    from services.ai_service import ai_service
    AI_SERVICE_AVAILABLE = True
    logging.info("AI service imported successfully")
except ImportError as e:
    AI_SERVICE_AVAILABLE = False
    logging.warning(f"AI service not available: {e}")

# Import billing service
try:
    from services.billing_service import billing_service
    from api.billing import router as billing_router
    from middleware.usage_tracking import get_usage_middleware, track_usage
    BILLING_SERVICE_AVAILABLE = True
    logging.info("Billing service imported successfully")
except ImportError as e:
    BILLING_SERVICE_AVAILABLE = False
    logging.warning(f"Billing service not available: {e}")

# Lifespan event handler
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan event handler for startup and shutdown"""
    # Startup
    try:
        await init_db()
        await init_sample_data()
        
        # Initialize billing system
        if BILLING_SERVICE_AVAILABLE:
            await billing_service.initialize_plans()
            logging.info("Billing system initialized")
        
        logging.info("Database initialized successfully")
    except Exception as e:
        logging.error(f"Failed to initialize database: {e}")
        raise
    
    yield
    
    # Shutdown
    await close_db()
    logging.info("Database connections closed")

# Initialize FastAPI app
app = FastAPI(
    title="AgileForge API",
    description="Complete Agile Project Management Platform API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000", 
        "http://127.0.0.1:3000",
        "http://localhost:3001", 
        "http://127.0.0.1:3001",
        "http://localhost:3002", 
        "http://127.0.0.1:3002"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Custom exception handler to ensure CORS headers are included in error responses
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request, exc):
    response = JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail}
    )
    # Add CORS headers manually
    origin = request.headers.get("origin")
    if origin in ["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:3001", "http://127.0.0.1:3001"]:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
    return response

@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    import traceback
    logging.error(f"Unhandled exception: {exc}")
    logging.error(traceback.format_exc())
    
    response = JSONResponse(
        status_code=500,
        content={"detail": f"Internal server error: {str(exc)}"}
    )
    # Add CORS headers manually
    origin = request.headers.get("origin")
    if origin in ["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:3001", "http://127.0.0.1:3001"]:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
    return response

# Add usage tracking middleware
if BILLING_SERVICE_AVAILABLE:
    app.middleware("http")(get_usage_middleware)

# Include billing routes
if BILLING_SERVICE_AVAILABLE:
    app.include_router(billing_router, prefix="/api/billing", tags=["billing"])

# Security
security = HTTPBearer()

# =====================================
# ENUMS & MODELS (Simplified)
# =====================================

class PriorityLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class StatusType(str, Enum):
    BACKLOG = "backlog"
    TODO = "todo"
    READY = "ready"
    IN_PROGRESS = "in-progress"
    REVIEW = "review"
    TESTING = "testing"
    DONE = "done"
    CLOSED = "closed"
    CANCELLED = "cancelled"

class EntityType(str, Enum):
    PROJECT = "project"
    EPIC = "epic"
    STORY = "story"
    TASK = "task"

# Simple User Model
class User(BaseModel):
    id: str
    username: str
    email: str
    first_name: str
    last_name: str
    avatar_url: Optional[str] = None
    is_active: bool = True
    created_at: datetime

class UserCreate(BaseModel):
    username: str
    email: str
    password: str
    first_name: str
    last_name: str

class UserUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    avatar_url: Optional[str] = None

# Project Models
class Project(BaseModel):
    id: str
    name: str
    key: str
    description: Optional[str] = None
    status: StatusType = StatusType.BACKLOG
    priority: PriorityLevel = PriorityLevel.MEDIUM
    start_date: Optional[date] = None
    target_end_date: Optional[date] = None
    progress: int = 0
    created_by: str
    created_at: datetime
    updated_at: Optional[datetime] = None

class ProjectCreate(BaseModel):
    name: str
    key: str
    description: Optional[str] = None
    priority: PriorityLevel = PriorityLevel.MEDIUM
    start_date: Optional[date] = None
    target_end_date: Optional[date] = None

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[StatusType] = None
    priority: Optional[PriorityLevel] = None
    start_date: Optional[date] = None
    target_end_date: Optional[date] = None
    progress: Optional[int] = None

# Epic Models
class Epic(BaseModel):
    id: str
    project_id: str
    title: str
    description: Optional[str] = None
    epic_key: str
    status: StatusType = StatusType.BACKLOG
    priority: PriorityLevel = PriorityLevel.MEDIUM
    start_date: Optional[date] = None
    target_end_date: Optional[date] = None
    estimated_story_points: Optional[int] = None
    actual_story_points: int = 0
    progress: int = 0
    created_by: str
    created_at: datetime
    updated_at: Optional[datetime] = None

class EpicCreate(BaseModel):
    project_id: str
    title: str
    description: Optional[str] = None
    priority: PriorityLevel = PriorityLevel.MEDIUM
    start_date: Optional[date] = None
    target_end_date: Optional[date] = None
    estimated_story_points: Optional[int] = None

class EpicUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[StatusType] = None
    priority: Optional[PriorityLevel] = None
    start_date: Optional[date] = None
    target_end_date: Optional[date] = None
    estimated_story_points: Optional[int] = None
    progress: Optional[int] = None

# Story Models
class Story(BaseModel):
    id: str
    epic_id: str
    title: str
    description: Optional[str] = None
    story_key: str
    as_a: Optional[str] = None
    i_want: Optional[str] = None
    so_that: Optional[str] = None
    acceptance_criteria: str
    status: StatusType = StatusType.BACKLOG
    priority: PriorityLevel = PriorityLevel.MEDIUM
    story_points: Optional[int] = None
    assignee_id: Optional[str] = None
    due_date: Optional[date] = None
    created_by: str
    created_at: datetime
    updated_at: Optional[datetime] = None

class StoryCreate(BaseModel):
    epic_id: str
    title: str
    description: Optional[str] = None
    as_a: Optional[str] = None
    i_want: Optional[str] = None
    so_that: Optional[str] = None
    acceptance_criteria: str
    priority: PriorityLevel = PriorityLevel.MEDIUM
    story_points: Optional[int] = None
    assignee_id: Optional[str] = None
    due_date: Optional[date] = None

class StoryUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    as_a: Optional[str] = None
    i_want: Optional[str] = None
    so_that: Optional[str] = None
    acceptance_criteria: Optional[str] = None
    status: Optional[StatusType] = None
    priority: Optional[PriorityLevel] = None
    story_points: Optional[int] = None
    assignee_id: Optional[str] = None
    due_date: Optional[date] = None

# Task Models
class Task(BaseModel):
    id: str
    story_id: str
    title: str
    description: Optional[str] = None
    task_key: str
    status: StatusType = StatusType.TODO
    priority: PriorityLevel = PriorityLevel.MEDIUM
    assignee_id: Optional[str] = None
    estimated_hours: float
    actual_hours: float = 0
    due_date: Optional[date] = None
    created_by: str
    created_at: datetime
    updated_at: Optional[datetime] = None

class TaskCreate(BaseModel):
    story_id: str
    title: str
    description: Optional[str] = None
    priority: PriorityLevel = PriorityLevel.MEDIUM
    assignee_id: Optional[str] = None
    estimated_hours: float
    due_date: Optional[date] = None

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[StatusType] = None
    priority: Optional[PriorityLevel] = None
    assignee_id: Optional[str] = None
    estimated_hours: Optional[float] = None
    actual_hours: Optional[float] = None
    due_date: Optional[date] = None

# =====================================
# IN-MEMORY STORAGE
# =====================================

# In-memory storage for entities (for development/testing)
users_db: Dict[str, User] = {}
projects_db: Dict[str, Project] = {}
epics_db: Dict[str, Epic] = {}
stories_db: Dict[str, Story] = {}
tasks_db: Dict[str, Task] = {}

# =====================================
# DATABASE INITIALIZATION & SAMPLE DATA
# =====================================

# Initialize with sample data
async def init_sample_data():
    """Initialize sample data in the database if it doesn't already exist"""
    async with db_manager.get_connection() as conn:
        # Check if sample data already exists
        existing_users = await conn.fetch("SELECT COUNT(*) as count FROM users")
        if existing_users[0]['count'] > 0:
            logging.info("Sample data already exists, skipping initialization")
            return
            
        # Sample Users
        sample_users = [
            {
                "id": "user-1",
                "username": "sarah.chen",
                "email": "sarah.chen@company.com",
                "first_name": "Sarah",
                "last_name": "Chen",
                "avatar_url": "/placeholder.svg?height=32&width=32",
                "password_hash": "dummy_hash"
            },
            {
                "id": "user-2", 
                "username": "alex.rodriguez",
                "email": "alex.rodriguez@company.com",
                "first_name": "Alex",
                "last_name": "Rodriguez",
                "avatar_url": "/placeholder.svg?height=32&width=32",
                "password_hash": "dummy_hash"
            },
            {
                "id": "user-3",
                "username": "emily.johnson", 
                "email": "emily.johnson@company.com",
                "first_name": "Emily",
                "last_name": "Johnson",
                "avatar_url": "/placeholder.svg?height=32&width=32",
                "password_hash": "dummy_hash"
            },
            {
                "id": "user-4",
                "username": "michael.brown",
                "email": "michael.brown@company.com", 
                "first_name": "Michael",
                "last_name": "Brown",
                "avatar_url": "/placeholder.svg?height=32&width=32",
                "password_hash": "dummy_hash"
            }
        ]
        
        # Insert users
        for user_data in sample_users:
            await conn.execute("""
                INSERT INTO users (id, username, email, first_name, last_name, avatar_url, password_hash, is_active)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            """, user_data["id"], user_data["username"], user_data["email"], 
                user_data["first_name"], user_data["last_name"], user_data["avatar_url"], 
                user_data["password_hash"], True)
        
        # Sample Organizations
        sample_organizations = [
            {
                "id": "org-1",
                "name": "TechCorp Inc",
                "slug": "techcorp",
                "description": "Leading technology company",
                "created_by": "user-1"
            }
        ]
        
        # Insert organizations
        for org_data in sample_organizations:
            await conn.execute("""
                INSERT INTO organizations (id, name, slug, description, created_by)
                VALUES ($1, $2, $3, $4, $5)
            """, org_data["id"], org_data["name"], org_data["slug"], 
                org_data["description"], org_data["created_by"])
        
        # Sample Projects
        sample_projects = [
            {
                "id": "proj-1",
                "organization_id": "org-1",
                "name": "E-commerce Platform",
                "key": "ECOM",
                "description": "Next-generation e-commerce platform with AI recommendations",
                "status": "in-progress",
                "priority": "high",
                "start_date": date(2024, 1, 1),
                "target_end_date": date(2024, 6, 30),
                "progress": 35,
                "created_by": "user-1"
            },
            {
                "id": "proj-2",
                "organization_id": "org-1",
                "name": "Mobile App",
                "key": "MOBILE",
                "description": "Cross-platform mobile application",
                "status": "backlog",
                "priority": "medium",
                "start_date": date(2024, 3, 1),
                "target_end_date": date(2024, 9, 30),
                "progress": 10,
                "created_by": "user-2"
            }
        ]
        
        # Insert projects
        for proj_data in sample_projects:
            await conn.execute("""
                INSERT INTO projects (id, organization_id, name, key, description, status, priority, start_date, target_end_date, progress, created_by)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            """, proj_data["id"], proj_data["organization_id"], proj_data["name"], proj_data["key"], proj_data["description"],
                proj_data["status"], proj_data["priority"], proj_data["start_date"], 
                proj_data["target_end_date"], proj_data["progress"], proj_data["created_by"])
    
        # Sample Epics
        sample_epics = [
            {
                "id": "epic-1",
                "project_id": "proj-1",
                "title": "User Authentication System",
                "description": "Complete user authentication and authorization system",
                "epic_key": "ECOM-1",
                "status": "in-progress",
                "priority": "critical",
                "estimated_story_points": 21,
                "actual_story_points": 8,
                "progress": 40,
                "created_by": "user-1"
            },
            {
                "id": "epic-2",
                "project_id": "proj-1",
                "title": "Product Catalog",
                "description": "Product browsing and search functionality",
                "epic_key": "ECOM-2",
                "status": "backlog",
                "priority": "high",
                "estimated_story_points": 34,
                "actual_story_points": 0,
                "progress": 0,
                "created_by": "user-2"
            }
        ]
        
        # Insert epics
        for epic_data in sample_epics:
            await conn.execute("""
                INSERT INTO epics (id, project_id, title, description, epic_key, status, priority, 
                                 estimated_story_points, actual_story_points, progress, created_by)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            """, epic_data["id"], epic_data["project_id"], epic_data["title"], epic_data["description"],
                epic_data["epic_key"], epic_data["status"], epic_data["priority"], 
                epic_data["estimated_story_points"], epic_data["actual_story_points"], 
                epic_data["progress"], epic_data["created_by"])
    
        # Sample Stories
        sample_stories = [
            {
                "id": "story-1",
                "epic_id": "epic-1",
                "title": "User Registration",
                "description": "Allow new users to register with email and password",
                "story_key": "ECOM-3",
                "as_a": "new user",
                "i_want": "to register an account",
                "so_that": "I can access the platform",
                "acceptance_criteria": "Given a new user visits registration page, when they provide valid email and password, then account is created and welcome email is sent",
                "status": "done",
                "priority": "high",
                "story_points": 5,
                "assignee_id": "user-1",
                "created_by": "user-1"
            },
            {
                "id": "story-2",
                "epic_id": "epic-1",
                "title": "User Login",
                "description": "Allow existing users to login with credentials",
                "story_key": "ECOM-4",
                "as_a": "registered user",
                "i_want": "to login to my account",
                "so_that": "I can access personalized features",
                "acceptance_criteria": "Given a registered user provides valid credentials, when they submit login form, then they are authenticated and redirected to dashboard",
                "status": "in-progress",
                "priority": "high",
                "story_points": 3,
                "assignee_id": "user-2",
                "created_by": "user-1"
            }
        ]
        
        # Insert stories
        for story_data in sample_stories:
            await conn.execute("""
                INSERT INTO stories (id, epic_id, title, description, story_key, as_a, i_want, so_that, 
                                   acceptance_criteria, status, priority, story_points, assignee_id, created_by)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            """, story_data["id"], story_data["epic_id"], story_data["title"], story_data["description"],
                story_data["story_key"], story_data["as_a"], story_data["i_want"], story_data["so_that"],
                story_data["acceptance_criteria"], story_data["status"], story_data["priority"], 
                story_data["story_points"], story_data["assignee_id"], story_data["created_by"])
    
        # Sample Tasks
        sample_tasks = [
            {
                "id": "task-1",
                "story_id": "story-2",
                "title": "Implement login form validation",
                "description": "Add client-side and server-side validation for login form",
                "task_key": "ECOM-5",
                "status": "in-progress",
                "priority": "high",
                "assignee_id": "user-2",
                "estimated_hours": 8.0,
                "actual_hours": 5.0,
                "due_date": date(2024, 2, 15),
                "created_by": "user-2"
            },
            {
                "id": "task-2",
                "story_id": "story-2",
                "title": "Set up password encryption",
                "description": "Implement bcrypt password hashing",
                "task_key": "ECOM-6", 
                "status": "todo",
                "priority": "critical",
                "assignee_id": "user-3",
                "estimated_hours": 4.0,
                "actual_hours": 0.0,
                "due_date": date(2024, 2, 10),
                "created_by": "user-2"
            }
        ]
        
        # Insert tasks
        for task_data in sample_tasks:
            await conn.execute("""
                INSERT INTO tasks (id, story_id, title, description, task_key, status, priority, 
                                 assignee_id, estimated_hours, actual_hours, due_date, created_by)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            """, task_data["id"], task_data["story_id"], task_data["title"], task_data["description"],
                task_data["task_key"], task_data["status"], task_data["priority"], 
                task_data["assignee_id"], task_data["estimated_hours"], task_data["actual_hours"], 
                task_data["due_date"], task_data["created_by"])
                
        logging.info("Sample data initialized successfully")

# =====================================
# HELPER FUNCTIONS
# =====================================

async def generate_key(prefix: str, entity_type: str) -> str:
    """Generate unique key for entities"""
    async with db_manager.get_connection() as conn:
        # Get count of existing entities with this prefix
        table_name = f"{entity_type}s" if entity_type != "story" else "stories"
        count = await conn.fetchval(f"SELECT COUNT(*) FROM {table_name}")
        return f"{prefix}-{count + 1}"

def get_current_user() -> str:
    """Mock function to get current user - in real app this would validate JWT"""
    return "user-1"

# =====================================
# HEALTH CHECK
# =====================================

@app.get("/health")
async def health_check():
    """Health check endpoint"""
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

@app.get("/api/status")
async def api_status():
    """API status with entity counts"""
    async with db_manager.get_connection() as conn:
        users_count = await conn.fetchval("SELECT COUNT(*) FROM users")
        projects_count = await conn.fetchval("SELECT COUNT(*) FROM projects")
        epics_count = await conn.fetchval("SELECT COUNT(*) FROM epics")
        stories_count = await conn.fetchval("SELECT COUNT(*) FROM stories")
        tasks_count = await conn.fetchval("SELECT COUNT(*) FROM tasks")
        
        return {
            "status": "operational",
            "entities": {
                "users": users_count,
                "projects": projects_count,
                "epics": epics_count,
                "stories": stories_count,
                "tasks": tasks_count
            },
            "timestamp": datetime.now().isoformat()
        }

# =====================================
# USER ENDPOINTS
# =====================================

@app.get("/api/users", response_model=List[User])
async def get_users():
    """Get all users"""
    async with db_manager.get_connection() as conn:
        rows = await conn.fetch("SELECT * FROM users WHERE is_active = true ORDER BY created_at")
        return [User(
            id=row['id'],
            username=row['username'],
            email=row['email'],
            first_name=row['first_name'],
            last_name=row['last_name'],
            avatar_url=row['avatar_url'],
            is_active=row['is_active'],
            created_at=row['created_at']
        ) for row in rows]

@app.get("/api/users/{user_id}", response_model=User)
async def get_user(user_id: str):
    """Get user by ID"""
    async with db_manager.get_connection() as conn:
        row = await conn.fetchrow("SELECT * FROM users WHERE id = $1", user_id)
        if not row:
            raise HTTPException(status_code=404, detail="User not found")
        return User(
            id=row['id'],
            username=row['username'],
            email=row['email'],
            first_name=row['first_name'],
            last_name=row['last_name'],
            avatar_url=row['avatar_url'],
            is_active=row['is_active'],
            created_at=row['created_at']
        )

@app.post("/api/users", response_model=User, status_code=201)
async def create_user(user_data: UserCreate):
    """Create new user"""
    user_id = str(uuid.uuid4())
    now = datetime.now()
    
    async with db_manager.get_connection() as conn:
        await conn.execute("""
            INSERT INTO users (id, username, email, first_name, last_name, password_hash, is_active, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        """, user_id, user_data.username, user_data.email, user_data.first_name, 
            user_data.last_name, "dummy_hash", True, now)
        
        return User(
            id=user_id,
            username=user_data.username,
            email=user_data.email,
            first_name=user_data.first_name,
            last_name=user_data.last_name,
            is_active=True,
            created_at=now
        )

@app.put("/api/users/{user_id}", response_model=User)
async def update_user(user_id: str, user_data: UserUpdate):
    """Update user"""
    async with db_manager.get_connection() as conn:
        # Check if user exists
        existing = await conn.fetchrow("SELECT * FROM users WHERE id = $1", user_id)
        if not existing:
            raise HTTPException(status_code=404, detail="User not found")
        
        update_data = user_data.dict(exclude_unset=True)
        if update_data:
            set_clause = ", ".join([f"{key} = ${i+2}" for i, key in enumerate(update_data.keys())])
            values = [user_id] + list(update_data.values())
            await conn.execute(f"UPDATE users SET {set_clause}, updated_at = NOW() WHERE id = $1", *values)
        
        # Return updated user
        row = await conn.fetchrow("SELECT * FROM users WHERE id = $1", user_id)
        return User(
            id=row['id'],
            username=row['username'],
            email=row['email'],
            first_name=row['first_name'],
            last_name=row['last_name'],
            avatar_url=row['avatar_url'],
            is_active=row['is_active'],
            created_at=row['created_at']
        )

@app.delete("/api/users/{user_id}")
async def delete_user(user_id: str):
    """Delete user"""
    async with db_manager.get_connection() as conn:
        result = await conn.execute("UPDATE users SET is_active = false WHERE id = $1", user_id)
        if result == "UPDATE 0":
            raise HTTPException(status_code=404, detail="User not found")
        return {"message": "User deleted successfully"}

# =====================================
# PROJECT ENDPOINTS  
# =====================================

@app.get("/api/projects", response_model=List[Project])
async def get_projects():
    """Get all projects"""
    async with db_manager.get_connection() as conn:
        rows = await conn.fetch("SELECT * FROM projects ORDER BY created_at")
        return [Project(
            id=row['id'],
            name=row['name'],
            key=row['key'],
            description=row['description'],
            status=StatusType(row['status']),
            priority=PriorityLevel(row['priority']),
            start_date=row['start_date'],
            target_end_date=row['target_end_date'],
            progress=row['progress'] or 0,
            created_by=row['created_by'],
            created_at=row['created_at'],
            updated_at=row['updated_at']
        ) for row in rows]

@app.get("/api/projects/{project_id}", response_model=Project)
async def get_project(project_id: str):
    """Get project by ID"""
    async with db_manager.get_connection() as conn:
        row = await conn.fetchrow("SELECT * FROM projects WHERE id = $1", project_id)
        if not row:
            raise HTTPException(status_code=404, detail="Project not found")
        return Project(
            id=row['id'],
            name=row['name'],
            key=row['key'],
            description=row['description'],
            status=StatusType(row['status']),
            priority=PriorityLevel(row['priority']),
            start_date=row['start_date'],
            target_end_date=row['target_end_date'],
            progress=row['progress'] or 0,
            created_by=row['created_by'],
            created_at=row['created_at'],
            updated_at=row['updated_at']
        )

@app.post("/api/projects", response_model=Project, status_code=201)
async def create_project(project_data: ProjectCreate):
    """Create new project"""
    project_id = str(uuid.uuid4())
    project_key = await generate_key(project_data.key, "project")
    now = datetime.now()
    
    # Create project object
    project = Project(
        id=project_id,
        name=project_data.name,
        key=project_key,
        description=project_data.description,
        priority=project_data.priority,
        start_date=project_data.start_date,
        target_end_date=project_data.target_end_date,
        progress=0,
        created_by=get_current_user(),
        created_at=now
    )
    
    # Store in both database and memory for consistency
    async with db_manager.get_connection() as conn:
        await conn.execute("""
            INSERT INTO projects (id, organization_id, name, key, description, status, priority, start_date, target_end_date, progress, created_by, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        """, project_id, "default-org", project_data.name, project_key, project_data.description,
            "backlog", project_data.priority.value, project_data.start_date, 
            project_data.target_end_date, 0, get_current_user(), now)
    
    projects_db[project_id] = project
    return project

@app.put("/api/projects/{project_id}", response_model=Project)
async def update_project(project_id: str, project_data: ProjectUpdate):
    """Update project"""
    if project_id not in projects_db:
        raise HTTPException(status_code=404, detail="Project not found")
    
    project = projects_db[project_id]
    update_data = project_data.dict(exclude_unset=True)
    
    for field, value in update_data.items():
        setattr(project, field, value)
    
    project.updated_at = datetime.now()
    return project

@app.delete("/api/projects/{project_id}")
async def delete_project(project_id: str):
    """Delete project"""
    if project_id not in projects_db:
        raise HTTPException(status_code=404, detail="Project not found")
    
    del projects_db[project_id]
    return {"message": "Project deleted successfully"}

# =====================================
# EPIC ENDPOINTS
# =====================================

@app.get("/api/epics", response_model=List[Epic])
async def get_epics(project_id: Optional[str] = Query(None)):
    """Get all epics, optionally filtered by project"""
    try:
        async with db_manager.get_connection() as conn:
            if project_id and project_id.strip():
                # Check if project_id is not a serialized object
                if project_id.startswith('[object') or '{' in project_id:
                    raise HTTPException(status_code=400, detail="Invalid project_id format")
                
                # Fetch epics filtered by project_id
                rows = await conn.fetch("SELECT * FROM epics WHERE project_id = $1 ORDER BY created_at DESC", project_id)
            else:
                # Fetch all epics
                rows = await conn.fetch("SELECT * FROM epics ORDER BY created_at DESC")
            
            epics = []
            for row in rows:
                epic = Epic(
                    id=row['id'],
                    project_id=row['project_id'],
                    title=row['title'],
                    description=row['description'],
                    epic_key=row['epic_key'],
                    status=StatusType(row['status']),
                    priority=PriorityLevel(row['priority']),
                    start_date=row['start_date'],
                    target_end_date=row['target_end_date'],
                    estimated_story_points=row['estimated_story_points'],
                    actual_story_points=row['actual_story_points'],
                    progress=row['progress'],
                    created_by=row['created_by'],
                    created_at=row['created_at'],
                    updated_at=row['updated_at']
                )
                epics.append(epic)
            
            return epics
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch epics: {str(e)}")

@app.get("/api/epics/{epic_id}", response_model=Epic)
async def get_epic(epic_id: str):
    """Get epic by ID"""
    if epic_id not in epics_db:
        raise HTTPException(status_code=404, detail="Epic not found")
    return epics_db[epic_id]

@app.post("/api/epics", response_model=Epic, status_code=201)
async def create_epic(epic_data: EpicCreate):
    """Create new epic"""
    # Check if project exists in database
    async with db_manager.get_connection() as conn:
        project = await conn.fetchrow("SELECT * FROM projects WHERE id = $1", epic_data.project_id)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
    
    epic_id = str(uuid.uuid4())
    epic_key = await generate_key(project['key'], "epic")
    now = datetime.now()
    
    # Create epic object
    epic = Epic(
        id=epic_id,
        project_id=epic_data.project_id,
        title=epic_data.title,
        description=epic_data.description,
        epic_key=epic_key,
        priority=epic_data.priority,
        start_date=epic_data.start_date,
        target_end_date=epic_data.target_end_date,
        estimated_story_points=epic_data.estimated_story_points,
        actual_story_points=0,
        progress=0,
        created_by=get_current_user(),
        created_at=now
    )
    
    # Store in both database and memory for consistency
    async with db_manager.get_connection() as conn:
        await conn.execute("""
            INSERT INTO epics (id, project_id, title, description, epic_key, status, priority, 
                             estimated_story_points, actual_story_points, progress, created_by, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        """, epic_id, epic_data.project_id, epic_data.title, epic_data.description,
            epic_key, "backlog", epic_data.priority.value, 
            epic_data.estimated_story_points, 0, 0, get_current_user(), now)
    
    epics_db[epic_id] = epic
    return epic

@app.put("/api/epics/{epic_id}", response_model=Epic)
async def update_epic(epic_id: str, epic_data: EpicUpdate):
    """Update epic"""
    if epic_id not in epics_db:
        raise HTTPException(status_code=404, detail="Epic not found")
    
    epic = epics_db[epic_id]
    update_data = epic_data.dict(exclude_unset=True)
    
    for field, value in update_data.items():
        setattr(epic, field, value)
    
    epic.updated_at = datetime.now()
    return epic

@app.delete("/api/epics/{epic_id}")
async def delete_epic(epic_id: str):
    """Delete epic"""
    if epic_id not in epics_db:
        raise HTTPException(status_code=404, detail="Epic not found")
    
    del epics_db[epic_id]
    return {"message": "Epic deleted successfully"}

# =====================================
# STORY ENDPOINTS
# =====================================

@app.get("/api/stories", response_model=List[Story])
async def get_stories(epic_id: Optional[str] = Query(None)):
    """Get all stories, optionally filtered by epic"""
    try:
        async with db_manager.get_connection() as conn:
            if epic_id and epic_id.strip():
                # Check if epic_id is not a serialized object
                if epic_id.startswith('[object') or '{' in epic_id:
                    raise HTTPException(status_code=400, detail="Invalid epic_id format")
                
                # Fetch stories filtered by epic_id
                rows = await conn.fetch("SELECT * FROM stories WHERE epic_id = $1 ORDER BY created_at DESC", epic_id)
            else:
                # Fetch all stories
                rows = await conn.fetch("SELECT * FROM stories ORDER BY created_at DESC")
            
            stories = []
            for row in rows:
                story = Story(
                    id=row['id'],
                    epic_id=row['epic_id'],
                    title=row['title'],
                    description=row['description'],
                    story_key=row['story_key'],
                    as_a=row['as_a'],
                    i_want=row['i_want'],
                    so_that=row['so_that'],
                    acceptance_criteria=row['acceptance_criteria'],
                    status=StatusType(row['status']),
                    priority=PriorityLevel(row['priority']),
                    story_points=row['story_points'],
                    assignee_id=row['assignee_id'],
                    due_date=row['due_date'],
                    created_by=row['created_by'],
                    created_at=row['created_at'],
                    updated_at=row['updated_at']
                )
                stories.append(story)
            
            return stories
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch stories: {str(e)}")

@app.get("/api/stories/{story_id}", response_model=Story)
async def get_story(story_id: str):
    """Get story by ID"""
    async with db_manager.get_connection() as conn:
        row = await conn.fetchrow("SELECT * FROM stories WHERE id = $1", story_id)
        if not row:
            raise HTTPException(status_code=404, detail="Story not found")
        
        return Story(
            id=row['id'],
            epic_id=row['epic_id'],
            title=row['title'],
            description=row['description'],
            story_key=row['story_key'],
            as_a=row['as_a'],
            i_want=row['i_want'],
            so_that=row['so_that'],
            acceptance_criteria=row['acceptance_criteria'],
            status=StatusType(row['status']),
            priority=PriorityLevel(row['priority']),
            story_points=row['story_points'],
            assignee_id=row['assignee_id'],
            due_date=row['due_date'],
            created_by=row['created_by'],
            created_at=row['created_at'],
            updated_at=row['updated_at']
        )

@app.post("/api/stories", response_model=Story, status_code=201)
async def create_story(story_data: StoryCreate):
    """Create new story"""
    async with db_manager.get_connection() as conn:
        # Verify epic exists
        epic = await conn.fetchrow("SELECT * FROM epics WHERE id = $1", story_data.epic_id)
        if not epic:
            raise HTTPException(status_code=404, detail="Epic not found")
        
        # Get project info for key generation
        project = await conn.fetchrow("SELECT * FROM projects WHERE id = $1", epic['project_id'])
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        story_id = str(uuid.uuid4())
        story_key = await generate_key(project['key'], "story")
        now = datetime.now()
        
        # Insert into database
        await conn.execute("""
            INSERT INTO stories (id, epic_id, title, description, story_key, as_a, i_want, so_that,
                               acceptance_criteria, status, priority, story_points, assignee_id, due_date, created_by, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        """, story_id, story_data.epic_id, story_data.title, story_data.description, story_key,
            story_data.as_a, story_data.i_want, story_data.so_that, story_data.acceptance_criteria,
            "backlog", story_data.priority.value, story_data.story_points, story_data.assignee_id,
            story_data.due_date, get_current_user(), now)
        
        # Return the created story
        return Story(
            id=story_id,
            epic_id=story_data.epic_id,
            title=story_data.title,
            description=story_data.description,
            story_key=story_key,
            as_a=story_data.as_a,
            i_want=story_data.i_want,
            so_that=story_data.so_that,
            acceptance_criteria=story_data.acceptance_criteria,
            priority=story_data.priority,
            story_points=story_data.story_points,
            assignee_id=story_data.assignee_id,
            due_date=story_data.due_date,
            created_by=get_current_user(),
            created_at=now
        )

@app.put("/api/stories/{story_id}", response_model=Story)
async def update_story(story_id: str, story_data: StoryUpdate):
    """Update story"""
    async with db_manager.get_connection() as conn:
        # Check if story exists
        existing_story = await conn.fetchrow("SELECT * FROM stories WHERE id = $1", story_id)
        if not existing_story:
            raise HTTPException(status_code=404, detail="Story not found")
        
        # Prepare update data
        update_data = story_data.dict(exclude_unset=True)
        if not update_data:
            # No fields to update, return existing story
            return Story(
                id=existing_story['id'],
                epic_id=existing_story['epic_id'],
                title=existing_story['title'],
                description=existing_story['description'],
                story_key=existing_story['story_key'],
                as_a=existing_story['as_a'],
                i_want=existing_story['i_want'],
                so_that=existing_story['so_that'],
                acceptance_criteria=existing_story['acceptance_criteria'],
                status=StatusType(existing_story['status']),
                priority=PriorityLevel(existing_story['priority']),
                story_points=existing_story['story_points'],
                assignee_id=existing_story['assignee_id'],
                due_date=existing_story['due_date'],
                created_by=existing_story['created_by'],
                created_at=existing_story['created_at'],
                updated_at=existing_story['updated_at']
            )
        
        # Build dynamic update query
        set_clauses = []
        values = []
        param_count = 1
        
        for field, value in update_data.items():
            if field in ['status', 'priority'] and value:
                set_clauses.append(f"{field} = ${param_count}")
                values.append(value.value if hasattr(value, 'value') else value)
            else:
                set_clauses.append(f"{field} = ${param_count}")
                values.append(value)
            param_count += 1
        
        # Add updated_at
        set_clauses.append(f"updated_at = ${param_count}")
        values.append(datetime.now())
        param_count += 1
        
        # Add story_id for WHERE clause
        values.append(story_id)
        
        query = f"UPDATE stories SET {', '.join(set_clauses)} WHERE id = ${param_count} RETURNING *"
        
        # Execute update
        updated_row = await conn.fetchrow(query, *values)
        
        return Story(
            id=updated_row['id'],
            epic_id=updated_row['epic_id'],
            title=updated_row['title'],
            description=updated_row['description'],
            story_key=updated_row['story_key'],
            as_a=updated_row['as_a'],
            i_want=updated_row['i_want'],
            so_that=updated_row['so_that'],
            acceptance_criteria=updated_row['acceptance_criteria'],
            status=StatusType(updated_row['status']),
            priority=PriorityLevel(updated_row['priority']),
            story_points=updated_row['story_points'],
            assignee_id=updated_row['assignee_id'],
            due_date=updated_row['due_date'],
            created_by=updated_row['created_by'],
            created_at=updated_row['created_at'],
            updated_at=updated_row['updated_at']
        )

@app.delete("/api/stories/{story_id}")
async def delete_story(story_id: str):
    """Delete story"""
    async with db_manager.get_connection() as conn:
        # Check if story exists
        existing_story = await conn.fetchrow("SELECT * FROM stories WHERE id = $1", story_id)
        if not existing_story:
            raise HTTPException(status_code=404, detail="Story not found")
        
        # Delete the story
        await conn.execute("DELETE FROM stories WHERE id = $1", story_id)
        return {"message": "Story deleted successfully"}

# =====================================
# AI STORY GENERATION ENDPOINTS
# =====================================

class StoryGenerateRequest(BaseModel):
    description: str
    priority: Optional[str] = "medium"
    epicId: Optional[str] = None
    includeAcceptanceCriteria: bool = True
    includeTags: bool = True

class GeneratedStoryResponse(BaseModel):
    success: bool
    story: Dict[str, Any]
    provider: str
    model: str
    confidence: Optional[float] = None
    suggestions: Optional[List[str]] = None

@app.post("/api/stories/generate", response_model=GeneratedStoryResponse)
@track_usage("ai_story_generation", 1) if BILLING_SERVICE_AVAILABLE else lambda f: f
async def generate_story(request: StoryGenerateRequest):
    """Generate AI stories based on description"""
    try:
        if AI_SERVICE_AVAILABLE:
            # Use real AI service
            logging.info(f"Generating story with AI service for description: {request.description[:50]}...")
            
            # Prepare context for AI
            epic_context = ""
            project_context = ""
            
            if request.epicId:
                # In a real implementation, fetch epic details from database
                epic_context = f"Epic ID: {request.epicId}"
            
            # Create AI prompt variables
            variables = {
                "user_description": request.description,
                "priority_level": request.priority,
                "epic_context": epic_context,
                "project_context": project_context,
                "include_acceptance_criteria": request.includeAcceptanceCriteria,
                "include_tags": request.includeTags
            }
            
            # Generate story using AI service
            ai_response = await ai_service.generate_completion("story_generator", variables)
            
            if ai_response.success:
                # Parse AI response
                generated_data = ai_response.data
                logging.info(f"AI response data type: {type(generated_data)}, content: {str(generated_data)[:200]}...")
                
                # Handle both string and dict responses
                if isinstance(generated_data, str):
                    try:
                        import json
                        import re
                        
                        # Extract JSON from markdown code blocks if present
                        json_match = re.search(r'```json\s*(.*?)\s*```', generated_data, re.DOTALL)
                        if json_match:
                            json_str = json_match.group(1)
                        else:
                            json_str = generated_data
                        
                        generated_data = json.loads(json_str)
                    except (json.JSONDecodeError, AttributeError) as e:
                        logging.error(f"Failed to parse AI response as JSON: {str(e)[:200]}...")
                        # Fall back to mock implementation
                        pass
                
                if isinstance(generated_data, dict):
                    # Format the response
                    story_data = {
                        "name": generated_data.get("title", "Generated User Story"),
                        "description": generated_data.get("description", request.description),
                        "acceptanceCriteria": generated_data.get("acceptance_criteria", []) if request.includeAcceptanceCriteria else [],
                        "tags": generated_data.get("tags", []) if request.includeTags else [],
                        "storyPoints": generated_data.get("story_points", 3)
                    }
                    
                    return GeneratedStoryResponse(
                        success=True,
                        story=story_data,
                        provider="OpenAI/Anthropic",
                        model=ai_response.model_used or "unknown",
                        confidence=generated_data.get("confidence", 0.8),
                        suggestions=generated_data.get("improvement_suggestions", [
                            "Consider adding more specific acceptance criteria",
                            "Review the story points estimation based on your team's velocity"
                        ])
                    )
                else:
                    logging.error(f"AI response is not a dictionary: {type(generated_data)}")
                    # Fall back to mock implementation
                    pass
            else:
                logging.error(f"AI generation failed: {ai_response.error}")
                # Fall back to mock implementation
                pass
        
        # Fallback to mock implementation if AI service is not available or fails
        logging.info("Using fallback mock AI implementation")
        
        # Extract key concepts from description
        description_lower = request.description.lower()
        
        # Generate title based on common patterns
        if "login" in description_lower or "sign in" in description_lower:
            title = "As a user, I want to log into my account so that I can access my personal information"
            enhanced_description = "Enable users to securely authenticate into the system using their credentials. The login process should include validation, error handling, session management, and optional features like remember me functionality."
        elif "register" in description_lower or "sign up" in description_lower:
            title = "As a user, I want to create an account so that I can use the platform"
            enhanced_description = "Allow new users to create an account on the platform. The registration process should include email validation, password strength requirements, terms acceptance, and welcome email functionality."
        elif "search" in description_lower:
            title = "As a user, I want to search for content so that I can find what I'm looking for quickly"
            enhanced_description = "Implement a comprehensive search functionality that allows users to find content across the platform. Include features like auto-complete, filters, search history, and relevant result ranking."
        elif "filter" in description_lower:
            title = "As a user, I want to filter results so that I can find relevant items"
            enhanced_description = "Provide advanced filtering capabilities to help users narrow down results based on multiple criteria. Include options for saving filter presets and combining multiple filters."
        elif "dashboard" in description_lower:
            title = "As a user, I want to view a dashboard so that I can see an overview of my data"
            enhanced_description = "Create an intuitive dashboard that displays key metrics, recent activities, and important notifications. The dashboard should be customizable and provide quick access to frequently used features."
        elif "profile" in description_lower:
            title = "As a user, I want to manage my profile so that I can keep my information up to date"
            enhanced_description = "Enable users to view and edit their profile information including personal details, preferences, avatar, and account settings. Include validation and confirmation for sensitive changes."
        elif "notification" in description_lower:
            title = "As a user, I want to receive notifications so that I stay informed about important updates"
            enhanced_description = "Implement a notification system that keeps users informed about relevant activities, updates, and alerts. Include options for notification preferences, delivery methods (email, in-app), and notification history."
        elif "password" in description_lower and "reset" in description_lower:
            title = "As a user, I want to reset my password so that I can regain access to my account"
            enhanced_description = "Provide a secure password reset mechanism that allows users to recover their account access. The process should include email verification, secure token generation, password strength validation, and confirmation of the password change. Consider implementing additional security measures like security questions or two-factor authentication."
        else:
            title = f"As a user, I want to {request.description.lower()} so that I can achieve my goals"
            enhanced_description = f"This feature will enable users to {request.description.lower()}. The implementation should focus on user experience, security, and performance while ensuring the feature integrates seamlessly with existing functionality."
        
        # Generate acceptance criteria
        acceptance_criteria = []
        if request.includeAcceptanceCriteria:
            if "login" in description_lower:
                acceptance_criteria = [
                    "Given I am on the login page, when I enter valid credentials, then I should be logged in",
                    "Given I enter invalid credentials, when I try to login, then I should see an error message",
                    "Given I am logged in, when I navigate to protected pages, then I should have access"
                ]
            elif "password" in description_lower and "reset" in description_lower:
                acceptance_criteria = [
                    "Given I am on the password reset page, when I enter my email, then I should receive a reset link",
                    "Given I click the reset link, when I enter a new password, then my password should be updated",
                    "Given I have reset my password, when I login with the new password, then I should be authenticated"
                ]
            elif "search" in description_lower:
                acceptance_criteria = [
                    "Given I am on the search page, when I enter a search term, then I should see relevant results",
                    "Given I search for something that doesn't exist, when I submit the search, then I should see a 'no results' message",
                    "Given I have search results, when I click on a result, then I should navigate to that item"
                ]
            else:
                acceptance_criteria = [
                    f"Given I am a user, when I {request.description.lower()}, then the system should respond appropriately",
                    "Given the feature is working correctly, when I use it, then I should see the expected outcome",
                    "Given there are edge cases, when they occur, then the system should handle them gracefully"
                ]
        
        # Generate tags
        tags = []
        if request.includeTags:
            if "login" in description_lower or "auth" in description_lower:
                tags = ["authentication", "security", "user-management"]
            elif "password" in description_lower and "reset" in description_lower:
                tags = ["authentication", "security", "password-management"]
            elif "search" in description_lower:
                tags = ["search", "functionality", "user-experience"]
            elif "dashboard" in description_lower:
                tags = ["dashboard", "analytics", "overview"]
            elif "profile" in description_lower:
                tags = ["profile", "user-settings", "account"]
            else:
                tags = ["feature", "user-story", "functionality"]
        
        # Estimate story points based on complexity
        story_points = 3  # Default
        if any(word in description_lower for word in ["complex", "integration", "multiple", "advanced"]):
            story_points = 8
        elif any(word in description_lower for word in ["simple", "basic", "quick"]):
            story_points = 2
        elif any(word in description_lower for word in ["dashboard", "analytics", "reporting"]):
            story_points = 5
        
        story_data = {
            "name": title,
            "description": enhanced_description,
            "acceptanceCriteria": acceptance_criteria,
            "tags": tags,
            "storyPoints": story_points
        }
        
        provider = "OpenAI/Anthropic (Fallback)" if not AI_SERVICE_AVAILABLE else "AgileForge AI (Fallback)"
        
        return GeneratedStoryResponse(
            success=True,
            story=story_data,
            provider=provider,
            model="story-generator-v1",
            confidence=0.75,
            suggestions=[
                "Consider adding more specific acceptance criteria",
                "Review the story points estimation based on your team's velocity",
                "Add relevant tags for better organization"
            ]
        )
        
    except Exception as e:
        logging.error(f"Story generation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Story generation failed: {str(e)}")

# =====================================
# TASK ENDPOINTS
# =====================================

@app.get("/api/tasks", response_model=List[Task])
async def get_tasks(story_id: Optional[str] = Query(None)):
    """Get all tasks, optionally filtered by story"""
    tasks = list(tasks_db.values())
    if story_id:
        tasks = [task for task in tasks if task.story_id == story_id]
    return tasks

@app.get("/api/tasks/{task_id}", response_model=Task)
async def get_task(task_id: str):
    """Get task by ID"""
    if task_id not in tasks_db:
        raise HTTPException(status_code=404, detail="Task not found")
    return tasks_db[task_id]

@app.post("/api/tasks", response_model=Task, status_code=201)
async def create_task(task_data: TaskCreate):
    """Create new task"""
    # Check if story exists in database and get project info
    async with db_manager.get_connection() as conn:
        story = await conn.fetchrow("SELECT * FROM stories WHERE id = $1", task_data.story_id)
        if not story:
            raise HTTPException(status_code=404, detail="Story not found")
        
        epic = await conn.fetchrow("SELECT * FROM epics WHERE id = $1", story['epic_id'])
        if not epic:
            raise HTTPException(status_code=404, detail="Epic not found")
        
        project = await conn.fetchrow("SELECT * FROM projects WHERE id = $1", epic['project_id'])
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
    
    task_id = str(uuid.uuid4())
    task_key = await generate_key(project['key'], "task")
    now = datetime.now()
    
    # Create task object
    task = Task(
        id=task_id,
        story_id=task_data.story_id,
        title=task_data.title,
        description=task_data.description,
        task_key=task_key,
        priority=task_data.priority,
        assignee_id=task_data.assignee_id,
        estimated_hours=task_data.estimated_hours,
        actual_hours=0.0,
        due_date=task_data.due_date,
        created_by=get_current_user(),
        created_at=now
    )
    
    # Store in both database and memory for consistency
    async with db_manager.get_connection() as conn:
        await conn.execute("""
            INSERT INTO tasks (id, story_id, title, description, task_key, status, priority, 
                             assignee_id, estimated_hours, actual_hours, due_date, created_by, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        """, task_id, task_data.story_id, task_data.title, task_data.description,
            task_key, "todo", task_data.priority.value, 
            task_data.assignee_id, task_data.estimated_hours, 0.0, 
            task_data.due_date, get_current_user(), now)
    
    tasks_db[task_id] = task
    return task

@app.put("/api/tasks/{task_id}", response_model=Task)
async def update_task(task_id: str, task_data: TaskUpdate):
    """Update task"""
    if task_id not in tasks_db:
        raise HTTPException(status_code=404, detail="Task not found")
    
    task = tasks_db[task_id]
    update_data = task_data.dict(exclude_unset=True)
    
    for field, value in update_data.items():
        setattr(task, field, value)
    
    task.updated_at = datetime.now()
    return task

@app.delete("/api/tasks/{task_id}")
async def delete_task(task_id: str):
    """Delete task"""
    if task_id not in tasks_db:
        raise HTTPException(status_code=404, detail="Task not found")
    
    del tasks_db[task_id]
    return {"message": "Task deleted successfully"}

# =====================================
# ANALYTICS ENDPOINTS
# =====================================

@app.get("/api/analytics/overview")
async def get_analytics_overview():
    """Get overall analytics"""
    total_projects = len(projects_db)
    active_projects = len([p for p in projects_db.values() if p.status == StatusType.IN_PROGRESS])
    total_epics = len(epics_db)
    total_stories = len(stories_db)
    total_tasks = len(tasks_db)
    
    completed_stories = len([s for s in stories_db.values() if s.status == StatusType.DONE])
    completed_tasks = len([t for t in tasks_db.values() if t.status == StatusType.DONE])
    
    return {
        "projects": {
            "total": total_projects,
            "active": active_projects,
            "completion_rate": round((active_projects / total_projects * 100) if total_projects > 0 else 0, 1)
        },
        "epics": {
            "total": total_epics
        },
        "stories": {
            "total": total_stories,
            "completed": completed_stories,
            "completion_rate": round((completed_stories / total_stories * 100) if total_stories > 0 else 0, 1)
        },
        "tasks": {
            "total": total_tasks,
            "completed": completed_tasks,
            "completion_rate": round((completed_tasks / total_tasks * 100) if total_tasks > 0 else 0, 1)
        },
        "users": {
            "total": len(users_db)
        }
    }

@app.get("/api/analytics/project/{project_id}")
async def get_project_analytics(project_id: str):
    """Get analytics for specific project"""
    if project_id not in projects_db:
        raise HTTPException(status_code=404, detail="Project not found")
    
    project = projects_db[project_id]
    project_epics = [e for e in epics_db.values() if e.project_id == project_id]
    project_stories = [s for s in stories_db.values() if s.epic_id in [e.id for e in project_epics]]
    project_tasks = [t for t in tasks_db.values() if t.story_id in [s.id for s in project_stories]]
    
    return {
        "project": project,
        "metrics": {
            "epics": len(project_epics),
            "stories": len(project_stories),
            "tasks": len(project_tasks),
            "completed_stories": len([s for s in project_stories if s.status == StatusType.DONE]),
            "completed_tasks": len([t for t in project_tasks if t.status == StatusType.DONE]),
            "total_story_points": sum([s.story_points or 0 for s in project_stories]),
            "completed_story_points": sum([s.story_points or 0 for s in project_stories if s.status == StatusType.DONE]),
            "total_estimated_hours": sum([t.estimated_hours for t in project_tasks]),
            "total_actual_hours": sum([t.actual_hours for t in project_tasks])
        }
    }

# =====================================
# SEARCH ENDPOINTS
# =====================================

@app.get("/api/search")
async def search(
    q: str = Query(..., min_length=1),
    entity_type: Optional[str] = Query(None),
    limit: int = Query(20, ge=1, le=100)
):
    """Search across all entities"""
    results = []
    
    # Search projects
    if not entity_type or entity_type == "project":
        for project in projects_db.values():
            if q.lower() in project.name.lower() or (project.description and q.lower() in project.description.lower()):
                results.append({
                    "type": "project",
                    "id": project.id,
                    "title": project.name,
                    "description": project.description,
                    "url": f"/projects/{project.id}"
                })
    
    # Search epics
    if not entity_type or entity_type == "epic":
        for epic in epics_db.values():
            if q.lower() in epic.title.lower() or (epic.description and q.lower() in epic.description.lower()):
                results.append({
                    "type": "epic",
                    "id": epic.id,
                    "title": epic.title,
                    "description": epic.description,
                    "url": f"/epics/{epic.id}"
                })
    
    # Search stories
    if not entity_type or entity_type == "story":
        for story in stories_db.values():
            if q.lower() in story.title.lower() or (story.description and q.lower() in story.description.lower()):
                results.append({
                    "type": "story",
                    "id": story.id,
                    "title": story.title,
                    "description": story.description,
                    "url": f"/stories/{story.id}"
                })
    
    # Search tasks
    if not entity_type or entity_type == "task":
        for task in tasks_db.values():
            if q.lower() in task.title.lower() or (task.description and q.lower() in task.description.lower()):
                results.append({
                    "type": "task",
                    "id": task.id,
                    "title": task.title,
                    "description": task.description,
                    "url": f"/tasks/{task.id}"
                })
    
    return {
        "results": results[:limit],
        "total": len(results),
        "query": q
    }

# =====================================
# AUTHENTICATION ENDPOINTS
# =====================================

class UserLogin(BaseModel):
    email: str
    password: str

class UserRegister(BaseModel):
    email: str
    password: str
    name: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: Dict[str, Any]

@app.post("/api/auth/login", response_model=TokenResponse)
async def login(login_data: UserLogin):
    """Mock login endpoint - returns a test token"""
    # For demo purposes, accept any email/password combination
    user_id = str(uuid.uuid4())
    username = login_data.email.split("@")[0]
    user_data = {
        "id": user_id,
        "email": login_data.email,
        "name": f"Test User",  # Include full name for frontend compatibility
        "username": username,
        "first_name": "Test",
        "last_name": "User"
    }
    
    # Create a mock JWT token (in production, use proper JWT)
    mock_token = f"test-token-{user_id}"
    
    return TokenResponse(
        access_token=mock_token,
        token_type="bearer",
        user=user_data
    )

@app.post("/api/auth/register", response_model=TokenResponse)
async def register(register_data: UserRegister):
    """Mock register endpoint - creates a test user"""
    user_id = str(uuid.uuid4())
    now = datetime.now()
    
    # Parse the name field (could be "First Last" format)
    name_parts = register_data.name.split(" ", 1)
    first_name = name_parts[0] if name_parts else "User"
    last_name = name_parts[1] if len(name_parts) > 1 else ""
    username = register_data.email.split("@")[0]  # Use email prefix as username
    
    # Create user in mock database
    user = User(
        id=user_id,
        username=username,
        email=register_data.email,
        first_name=first_name,
        last_name=last_name,
        is_active=True,
        created_at=now
    )
    users_db[user_id] = user
    
    user_data = {
        "id": user_id,
        "email": register_data.email,
        "name": register_data.name,  # Include full name for frontend compatibility
        "username": username,
        "first_name": first_name,
        "last_name": last_name
    }
    
    # Create a mock JWT token (in production, use proper JWT)
    mock_token = f"test-token-{user_id}"
    
    return TokenResponse(
        access_token=mock_token,
        token_type="bearer",
        user=user_data
    )

@app.get("/api/auth/me")
async def get_current_user_info():
    """Get current user information - mock endpoint"""
    # For now, return a mock user since we don't have proper JWT validation
    # In a real implementation, this would validate the JWT token
    return {
        "id": "demo-user",
        "email": "demo@agileforge.com", 
        "name": "Demo User",
        "username": "demo",
        "first_name": "Demo",
        "last_name": "User",
        "avatar_url": "/placeholder.svg?height=32&width=32"
    }

# =====================================
# RUN SERVER
# =====================================

if __name__ == "__main__":
    import os
    port = int(os.getenv("PORT", 4000))
    uvicorn.run(
        "complete_main:app",
        host="0.0.0.0",
        port=port,
        reload=True,
        log_level="info"
    ) 