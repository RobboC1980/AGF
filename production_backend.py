#!/usr/bin/env python3
"""
AgileForge Production Backend
Production-ready FastAPI server with security, validation, and proper error handling
"""

import os
import logging
import json
import stripe
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import jwt
from fastapi import FastAPI, HTTPException, Depends, status, Request, BackgroundTasks
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr, field_validator
from supabase import create_client, Client
from dotenv import load_dotenv
import uvicorn
import sendgrid
from sendgrid.helpers.mail import Mail
import openai
import redis
from contextlib import asynccontextmanager

# Import enhanced authentication system
from backend.auth.enhanced_auth import (
    EnhancedAuthManager, get_auth_manager, get_current_user, get_current_active_user,
    require_admin, require_manager, require_team_lead,
    require_create_project, require_manage_team, require_view_analytics, require_use_ai,
    UserRole, Permission
)
from backend.api.auth import router as auth_router
from backend.webhooks.database_webhooks import webhooks_router
from backend.cron.scheduled_jobs import cron_router, get_jobs_manager

# Import new services and endpoints
from backend.services.storage_service import StorageService, init_storage_service
from backend.services.realtime_service import RealtimeService, init_realtime_service
from backend.services.analytics_service import AnalyticsService, init_analytics_service
from backend.services.ai_service import init_ai_service, get_ai_service
from backend.services.notification_service import init_notification_service, get_notification_service
from backend.api.storage_endpoints import storage_router
from backend.api.realtime_endpoints import realtime_router
from backend.api.analytics_endpoints import analytics_router
from backend.api.ai_endpoints import router as ai_router
from backend.api.notification_endpoints import notification_router
from backend.api.stripe_products import router as stripe_products_router

# Load environment variables
load_dotenv()

# Initialize Sentry for error tracking
if os.getenv("SENTRY_DSN"):
    integrations = [FastApiIntegration(auto_enabling=True)]
    
    # Only add SQLAlchemy integration if SQLAlchemy is available
    try:
        from sentry_sdk.integrations.sqlalchemy import SqlAlchemyIntegration
        integrations.append(SqlAlchemyIntegration())
    except ImportError:
        pass  # SQLAlchemy not available, skip this integration
    
    sentry_sdk.init(
        dsn=os.getenv("SENTRY_DSN"),
        integrations=integrations,
        traces_sample_rate=0.1,
        environment=os.getenv("ENVIRONMENT", "development"),
    )

# Configure logging for production (avoid duplicate handlers)
if not logging.getLogger().handlers:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        handlers=[
            logging.StreamHandler(),
            logging.FileHandler("app.log") if os.getenv("ENVIRONMENT") == "production" else logging.NullHandler()
        ]
    )
logger = logging.getLogger(__name__)

# Initialize services
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_SERVICE_KEY")
jwt_secret = os.getenv("SUPABASE_JWT_SECRET")

# Initialize Supabase client only if credentials are provided
supabase: Client = None
if supabase_url and supabase_key:
    try:
        supabase = create_client(supabase_url, supabase_key)
        logger.info("Supabase client initialized successfully")
        
        # Initialize the Supabase manager for the auth router
        from backend.database.supabase_client import supabase_manager
        supabase_manager.client = supabase
        logger.info("Supabase manager initialized for auth router")
        
        # Initialize new services
        storage_service = init_storage_service(supabase)
        realtime_service = init_realtime_service(supabase)
        analytics_service = init_analytics_service(supabase)
        ai_service = init_ai_service(supabase)
        notification_service = init_notification_service(supabase)
        logger.info("All enhanced services initialized successfully")
        
    except Exception as e:
        logger.error(f"Failed to initialize Supabase client: {e}")
        supabase = None
else:
    logger.warning("Supabase credentials not provided - running in development mode")

# Initialize Stripe
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

# Initialize SendGrid
sendgrid_client = sendgrid.SendGridAPIClient(api_key=os.getenv("SENDGRID_API_KEY"))

# Initialize OpenAI
openai.api_key = os.getenv("OPENAI_API_KEY")

# Initialize Redis for caching
redis_client = None
if os.getenv("REDIS_URL"):
    try:
        redis_client = redis.from_url(os.getenv("REDIS_URL"))
    except Exception as e:
        logger.warning(f"Redis connection failed: {e}")

# Security
security = HTTPBearer(auto_error=False)

# Pydantic models for validation
class UserCreate(BaseModel):
    email: EmailStr
    name: str
    avatar_url: Optional[str] = None

class UserUpdate(BaseModel):
    name: Optional[str] = None
    avatar_url: Optional[str] = None

class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = None
    status: Optional[str] = "active"
    
    @field_validator('status')
    @classmethod
    def validate_status(cls, v):
        allowed_statuses = ['active', 'inactive', 'completed', 'on-hold']
        if v not in allowed_statuses:
            raise ValueError(f'Status must be one of: {allowed_statuses}')
        return v

class EpicCreate(BaseModel):
    name: str
    description: Optional[str] = None
    project_id: str
    color: Optional[str] = "#3B82F6"
    status: Optional[str] = "active"

class StoryCreate(BaseModel):
    name: str
    description: Optional[str] = None
    acceptance_criteria: Optional[str] = None
    story_points: Optional[int] = None
    priority: Optional[str] = "medium"
    status: Optional[str] = "backlog"
    epic_id: str
    assignee_id: Optional[str] = None
    tags: Optional[List[str]] = None
    
    @field_validator('priority')
    @classmethod
    def validate_priority(cls, v):
        allowed_priorities = ['low', 'medium', 'high', 'critical']
        if v not in allowed_priorities:
            raise ValueError(f'Priority must be one of: {allowed_priorities}')
        return v
    
    @field_validator('story_points')
    @classmethod
    def validate_story_points(cls, v):
        if v is not None and (v < 1 or v > 21):
            raise ValueError('Story points must be between 1 and 21')
        return v

class AIStoryRequest(BaseModel):
    epic_id: str
    description: str
    requirements: Optional[str] = None
    priority: Optional[str] = "medium"

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

class EmailRequest(BaseModel):
    to_email: str
    subject: str
    content: str
    template_id: Optional[str] = None

# Lifespan context manager for startup/shutdown
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting AgileForge API...")
    
    # Test database connection
    try:
        result = supabase.table("users").select("count").limit(1).execute()
        logger.info("Database connection successful")
    except Exception as e:
        logger.error(f"Database connection failed: {e}")
    
    # Test Redis connection
    if redis_client:
        try:
            redis_client.ping()
            logger.info("Redis connection successful")
        except Exception as e:
            logger.warning(f"Redis connection failed: {e}")
    
    # Setup cron jobs
    try:
        from backend.cron.scheduled_jobs import get_jobs_manager
        jobs_manager = get_jobs_manager()
        await jobs_manager.setup_cron_jobs()
        logger.info("Cron jobs setup completed")
    except Exception as e:
        logger.warning(f"Cron jobs setup failed: {e}")
    
    yield
    
    # Shutdown
    logger.info("Shutting down AgileForge API...")

# Create FastAPI app
app = FastAPI(
    title="AgileForge API",
    description="Production AI-Powered Agile Project Management Platform",
    version="1.0.0",
    docs_url="/docs" if os.getenv("ENVIRONMENT") != "production" else None,
    redoc_url="/redoc" if os.getenv("ENVIRONMENT") != "production" else None,
    lifespan=lifespan
)

# Include enhanced authentication and feature routers
app.include_router(auth_router, prefix="/api/auth")
app.include_router(webhooks_router)
app.include_router(cron_router)
app.include_router(storage_router)
app.include_router(realtime_router)
app.include_router(analytics_router)
app.include_router(ai_router, prefix="/api/ai")
app.include_router(notification_router)
app.include_router(stripe_products_router)

# Security middleware
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["*"] if os.getenv("ENVIRONMENT") == "development" else [
        "localhost",
        "127.0.0.1",
        os.getenv("ALLOWED_HOST", "your-domain.com")
    ]
)

# CORS configuration for production
allowed_origins = []
if os.getenv("ENVIRONMENT") == "development":
    allowed_origins = ["http://localhost:3000", "http://localhost:3001"]
else:
    # Production origins - but allow localhost for local testing
    allowed_origins = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001"
    ]
    
    frontend_url = os.getenv("FRONTEND_URL")
    if frontend_url:
        allowed_origins.append(frontend_url)
    
    # Add your production domains
    production_domains = os.getenv("PRODUCTION_DOMAINS", "").split(",")
    allowed_origins.extend([domain.strip() for domain in production_domains if domain.strip()])

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["*"],
)

# Optional authentication dependency for development
async def get_current_user_optional(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Optional authentication - returns None if no credentials provided"""
    if not credentials:
        return None
    return await get_current_user(credentials)

# Authentication functions
def verify_jwt_token(token: str) -> Dict[str, Any]:
    """Verify JWT token from Supabase"""
    try:
        if not jwt_secret:
            raise ValueError("SUPABASE_JWT_SECRET not configured")
        
        payload = jwt.decode(
            token,
            jwt_secret,
            algorithms=["HS256"],
            options={"verify_signature": True}
        )
        
        if "sub" not in payload:
            raise ValueError("Missing sub claim in token")
            
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Authentication dependency with Supabase JWT validation"""
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    try:
        # Check for cron job authentication
        cron_api_key = os.getenv("CRON_API_KEY")
        if cron_api_key and credentials.credentials == cron_api_key:
            return {"id": "cron-system", "email": "system@agileforge.com", "name": "System User"}
        
        if not supabase:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Database not available"
            )
        
        # Verify JWT token with Supabase
        try:
            user_response = supabase.auth.get_user(credentials.credentials)
            if not user_response or not user_response.user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid token"
                )
            
            user_id = user_response.user.id
            
        except Exception as e:
            logger.warning(f"Token verification failed: {e}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials"
            )
        
        # Get user from database
        try:
            result = supabase.table("users").select("*").eq("id", user_id).execute()
            if not result.data:
                logger.warning(f"User not found for ID: {user_id}")
                raise HTTPException(status_code=401, detail="User not found")
            
            return result.data[0]
        except Exception as e:
            logger.error(f"Database error while fetching user: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Database error"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Authentication error: {str(e)[:100]}...")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

# Service functions
async def send_email(to_email: str, subject: str, content: str, template_id: Optional[str] = None):
    """Send email using SendGrid"""
    try:
        message = Mail(
            from_email=os.getenv("FROM_EMAIL", "noreply@agileforge.com"),
            to_emails=to_email,
            subject=subject,
            html_content=content
        )
        
        if template_id:
            message.template_id = template_id
        
        response = sendgrid_client.send(message)
        logger.info(f"Email sent successfully to {to_email}")
        return response
    except Exception as e:
        logger.error(f"Failed to send email: {e}")
        raise HTTPException(status_code=500, detail="Failed to send email")

async def generate_ai_story(epic_id: str, description: str, requirements: Optional[str] = None) -> Dict[str, Any]:
    """Generate user story using OpenAI"""
    try:
        # Get epic context
        epic_result = supabase.table("epics").select("*").eq("id", epic_id).execute()
        if not epic_result.data:
            raise HTTPException(status_code=404, detail="Epic not found")
        
        epic = epic_result.data[0]
        
        prompt = f"""
        Generate a detailed user story for the following epic:
        Epic: {epic['name']}
        Epic Description: {epic.get('description', '')}
        
        Story Description: {description}
        Additional Requirements: {requirements or 'None'}
        
        Please provide:
        1. A clear user story title
        2. Detailed description
        3. Acceptance criteria (as bullet points)
        4. Suggested story points (1-21 scale)
        5. Priority level (low, medium, high, critical)
        
        Format the response as JSON with keys: title, description, acceptance_criteria, story_points, priority
        """
        
        client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=1000,
            temperature=0.7
        )
        
        ai_response = response.choices[0].message.content
        
        # Try to parse as JSON, fallback to structured text
        try:
            story_data = json.loads(ai_response)
        except json.JSONDecodeError:
            # Fallback parsing
            story_data = {
                "title": f"AI Generated Story for {epic['name']}",
                "description": ai_response,
                "acceptance_criteria": "To be defined",
                "story_points": 5,
                "priority": "medium"
            }
        
        return story_data
    except Exception as e:
        logger.error(f"AI story generation failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate AI story")

# Error handlers
@app.exception_handler(404)
async def not_found_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=404,
        content={"error": "Resource not found", "detail": str(exc.detail) if hasattr(exc, 'detail') else "Not found"}
    )

@app.exception_handler(500)
async def internal_error_handler(request: Request, exc: Exception):
    logger.error(f"Internal server error: {exc}")
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error", "detail": "An unexpected error occurred"}
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {exc}")
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error", "detail": "An unexpected error occurred"}
    )

# Health check endpoint with comprehensive monitoring
@app.get("/health")
async def health_check():
    health_status = {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "version": "1.0.0",
        "environment": os.getenv("ENVIRONMENT", "development"),
        "services": {}
    }
    
    # Test database connection
    if supabase:
        try:
            result = supabase.table("users").select("count").limit(1).execute()
            health_status["services"]["database"] = "healthy"
        except Exception as e:
            logger.error(f"Database health check failed: {e}")
            health_status["services"]["database"] = "unhealthy"
            health_status["status"] = "degraded"
    else:
        health_status["services"]["database"] = "not_configured"
    
    # Test Redis connection
    if redis_client:
        try:
            redis_client.ping()
            health_status["services"]["redis"] = "healthy"
        except Exception as e:
            logger.warning(f"Redis health check failed: {e}")
            health_status["services"]["redis"] = "unhealthy"
            # Redis is not critical for basic functionality
        except redis.ConnectionError:
            health_status["services"]["redis"] = "connection_failed"
    else:
        health_status["services"]["redis"] = "not_configured"
    
    # Test external services
    health_status["services"]["stripe"] = "configured" if os.getenv("STRIPE_SECRET_KEY") else "not_configured"
    health_status["services"]["sendgrid"] = "configured" if os.getenv("SENDGRID_API_KEY") else "not_configured"
    health_status["services"]["openai"] = "configured" if os.getenv("OPENAI_API_KEY") else "not_configured"
    
    return health_status

@app.get("/metrics")
async def get_metrics():
    """Endpoint for monitoring metrics"""
    try:
        # Get basic database metrics
        users_count = supabase.table("users").select("count").execute()
        projects_count = supabase.table("projects").select("count").execute()
        epics_count = supabase.table("epics").select("count").execute()
        stories_count = supabase.table("stories").select("count").execute()
        
        return {
            "timestamp": datetime.utcnow().isoformat(),
            "database": {
                "users": len(users_count.data) if users_count.data else 0,
                "projects": len(projects_count.data) if projects_count.data else 0,
                "epics": len(epics_count.data) if epics_count.data else 0,
                "stories": len(stories_count.data) if stories_count.data else 0,
            },
            "cache": {
                "redis_connected": redis_client is not None and redis_client.ping() if redis_client else False
            }
        }
    except Exception as e:
        logger.error(f"Metrics collection failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to collect metrics")

@app.get("/")
async def root():
    return {
        "message": "AgileForge API",
        "version": "1.0.0",
        "environment": os.getenv("ENVIRONMENT", "development"),
        "docs": "/docs" if os.getenv("ENVIRONMENT") != "production" else "Documentation disabled in production",
        "health": "/health",
        "metrics": "/metrics"
    }

# Development endpoints removed - production authentication required

# Users endpoints
@app.get("/api/users")
async def get_users(current_user: dict = Depends(get_current_user)):
    """Get all users"""
    try:
        # Cache key for users list
        cache_key = "users:all"
        
        # Try to get from cache first
        if redis_client:
            try:
                cached_data = redis_client.get(cache_key)
                if cached_data:
                    users_data = json.loads(cached_data)
                    return {"data": {"users": users_data}, "success": True}
            except Exception as e:
                logger.warning(f"Cache read failed: {e}")
        
        result = supabase.table("users").select("*").execute()
        
        # Cache the result
        if redis_client:
            try:
                redis_client.setex(cache_key, 300, json.dumps(result.data))  # Cache for 5 minutes
            except Exception as e:
                logger.warning(f"Cache write failed: {e}")
        
        return {"data": {"users": result.data}, "success": True}
    except Exception as e:
        logger.error(f"Error fetching users: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch users")

@app.post("/api/users", status_code=status.HTTP_201_CREATED)
async def create_user(user_data: UserCreate, current_user: dict = Depends(get_current_user)):
    """Create a new user"""
    try:
        result = supabase.table("users").insert(user_data.dict()).execute()
        if result.data:
            logger.info(f"User created: {result.data[0]['id']}")
            return result.data[0]
        else:
            raise HTTPException(status_code=400, detail="Failed to create user")
    except Exception as e:
        logger.error(f"Error creating user: {e}")
        raise HTTPException(status_code=500, detail="Failed to create user")

@app.get("/api/users/{user_id}")
async def get_user(user_id: str, current_user: dict = Depends(get_current_user)):
    """Get a specific user"""
    try:
        result = supabase.table("users").select("*").eq("id", user_id).execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="User not found")
        return result.data[0]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching user: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch user")

@app.put("/api/users/{user_id}")
async def update_user(user_id: str, user_data: UserUpdate, current_user: dict = Depends(get_current_user)):
    """Update a user"""
    try:
        update_data = {k: v for k, v in user_data.dict().items() if v is not None}
        result = supabase.table("users").update(update_data).eq("id", user_id).execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="User not found")
        logger.info(f"User updated: {user_id}")
        return result.data[0]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating user: {e}")
        raise HTTPException(status_code=500, detail="Failed to update user")

# Projects endpoints
@app.get("/api/projects")
async def get_projects(current_user: dict = Depends(get_current_user)):
    """Get all projects"""
    try:
        # For now, allow all authenticated users to view projects
        # In the future, we can add more granular permissions
        result = supabase.table("projects").select("*").execute()
        
        # Debug logging
        logger.info(f"Projects query returned {len(result.data)} projects")
        logger.info(f"Sample project data: {result.data[0] if result.data else 'No projects found'}")
        
        # Format the response to match what the frontend expects
        formatted_response = {
            "success": True,
            "data": {
                "projects": result.data
            }
        }
        
        logger.info(f"Formatted response structure: {list(formatted_response.keys())}")
        return formatted_response
        
    except Exception as e:
        logger.error(f"Error fetching projects: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch projects")

@app.post("/api/projects", status_code=status.HTTP_201_CREATED)
async def create_project(project_data: ProjectCreate, current_user: dict = Depends(get_current_user)):
    """Create a new project"""
    try:
        # Add created_by from current user
        data = project_data.dict()
        data["created_by"] = current_user["id"]
        data["created_at"] = datetime.utcnow().isoformat()
        
        result = supabase.table("projects").insert(data).execute()
        if result.data:
            logger.info(f"Project created: {result.data[0]['id']} by user: {current_user.get('email', 'unknown')}")
            return result.data[0]
        else:
            raise HTTPException(status_code=400, detail="Failed to create project")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating project: {e}")
        raise HTTPException(status_code=500, detail="Failed to create project")

# Epics endpoints
@app.get("/api/epics")
async def get_epics(current_user: dict = Depends(get_current_user)):
    """Get all epics"""
    try:
        result = supabase.table("epics").select("*").execute()
        return {"data": {"epics": result.data}, "success": True}
    except Exception as e:
        logger.error(f"Error fetching epics: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch epics")

@app.post("/api/epics", status_code=status.HTTP_201_CREATED)
async def create_epic(epic_data: EpicCreate, current_user: dict = Depends(get_current_user)):
    """Create a new epic"""
    try:
        result = supabase.table("epics").insert(epic_data.dict()).execute()
        if result.data:
            logger.info(f"Epic created: {result.data[0]['id']}")
            return result.data[0]
        else:
            raise HTTPException(status_code=400, detail="Failed to create epic")
    except Exception as e:
        logger.error(f"Error creating epic: {e}")
        raise HTTPException(status_code=500, detail="Failed to create epic")

@app.get("/api/epics/{epic_id}")
async def get_epic(epic_id: str, current_user: dict = Depends(get_current_user)):
    """Get a specific epic"""
    try:
        result = supabase.table("epics").select("*").eq("id", epic_id).execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="Epic not found")
        return result.data[0]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching epic: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch epic")

# Stories endpoints
@app.get("/api/stories")
async def get_stories(current_user: dict = Depends(get_current_user)):
    """Get all stories"""
    try:
        result = supabase.table("stories").select("*").execute()
        return {"data": {"stories": result.data}, "success": True}
    except Exception as e:
        logger.error(f"Error fetching stories: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch stories")

@app.post("/api/stories", status_code=status.HTTP_201_CREATED)
async def create_story(story_data: StoryCreate, current_user: dict = Depends(get_current_user)):
    """Create a new story"""
    try:
        result = supabase.table("stories").insert(story_data.dict()).execute()
        if result.data:
            logger.info(f"Story created: {result.data[0]['id']}")
            return result.data[0]
        else:
            raise HTTPException(status_code=400, detail="Failed to create story")
    except Exception as e:
        logger.error(f"Error creating story: {e}")
        raise HTTPException(status_code=500, detail="Failed to create story")

@app.get("/api/stories/{story_id}")
async def get_story(story_id: str, current_user: dict = Depends(get_current_user)):
    """Get a specific story"""
    try:
        result = supabase.table("stories").select("*").eq("id", story_id).execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="Story not found")
        return result.data[0]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching story: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch story")

@app.post("/api/stories/generate", response_model=GeneratedStoryResponse)
async def generate_story_endpoint(request: StoryGenerateRequest, current_user: dict = Depends(get_current_user)):
    """Generate AI-powered user story using real AI services"""
    try:
        logger.info(f"Generating AI story for user {current_user.get('id', 'unknown')}: {request.description}")
        
        # Try to use real AI service first
        try:
            from backend.services.ai_service import get_basic_ai_service
            ai_service = get_basic_ai_service()
            
            if ai_service.openai_client or ai_service.anthropic_client:
                # Use real AI generation
                story_data = await generate_real_ai_story(ai_service, request)
                
                return GeneratedStoryResponse(
                    success=True,
                    story=story_data,
                    provider="Anthropic Claude" if ai_service.anthropic_client else "OpenAI GPT-4",
                    model="claude-3-5-sonnet-20241022" if ai_service.anthropic_client else ai_service.config.model,
                    confidence=0.95,
                    suggestions=[
                        "AI-generated story based on best practices",
                        "Review and adjust based on your specific domain context",
                        "Consider team capacity when estimating story points"
                    ]
                )
            else:
                logger.warning("No AI clients available, falling back to pattern-based generation")
                raise Exception("No AI clients available")
                
        except Exception as ai_error:
            logger.warning(f"AI generation failed, using fallback: {ai_error}")
            # Fall back to pattern-based generation
            story_data = generate_fallback_story(request)
            
            return GeneratedStoryResponse(
                success=True,
                story=story_data,
                provider="AgileForge AI (Fallback)",
                model="story-generator-v1",
                confidence=0.75,
                suggestions=[
                    "Generated using fallback patterns - consider upgrading to AI service",
                    "Review the story points estimation based on your team's velocity",
                    "Add relevant tags that match your project's taxonomy"
                ]
            )
        
    except Exception as e:
        logger.error(f"Error generating story: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate story")


async def generate_real_ai_story(ai_service, request: StoryGenerateRequest) -> Dict[str, Any]:
    """Generate story using real AI service"""
    
    # Create a comprehensive prompt for story generation using INVEST principles
    prompt = f"""
    You are an expert Agile coach specializing in creating INVEST-quality user stories.

    INVEST PRINCIPLES:
    - Independent: Can be developed and tested independently
    - Negotiable: Details can be discussed and refined
    - Valuable: Delivers clear value to users or business
    - Estimable: Can be estimated for effort and complexity
    - Small: Fits within a single sprint (1-2 weeks)
    - Testable: Has clear acceptance criteria

    Generate a professional user story based on this input: "{request.description}"
    Priority Level: {request.priority}
    
    CREATE A USER STORY THAT INCLUDES:
    1. Perfect "As a [user type], I want [goal] so that [benefit]" format
    2. Enhanced description with context, user motivation, and business value
    3. {3 if request.includeAcceptanceCriteria else 0} acceptance criteria in Given/When/Then format
    4. Relevant tags for categorization
    5. Story points estimation (1, 2, 3, 5, 8, 13) based on complexity
    
    ACCEPTANCE CRITERIA GUIDELINES:
    - Use Given/When/Then format for clarity
    - Make each criterion testable and verifiable
    - Cover happy path, edge cases, and error scenarios
    
    Return ONLY a JSON object with this exact structure:
    {{
        "name": "Short Reference Title (e.g., 'Password Reset Feature', 'User Dashboard Access')",
        "description": "As a [specific user type], I want [specific goal] so that [clear business benefit]. Enhanced description following INVEST principles that expands on the user need, provides context, explains the current pain point, and describes the desired outcome. Include user motivation and business value.",
        "acceptanceCriteria": [
            "Given [specific context], when [user action], then [expected outcome]",
            "Given [error scenario], when [invalid action], then [appropriate error handling]",
            "Given [edge case], when [boundary condition], then [expected behavior]"
        ],
        "tags": ["domain_area", "feature_type", "user_group"],
        "storyPoints": 5
    }}
    """
    
    try:
        if ai_service.anthropic_client:
            # Use Anthropic Claude (prioritized due to OpenAI quota issues)
            response = await ai_service.anthropic_client.messages.create(
                model="claude-3-5-sonnet-20241022",  # Use newer model
                max_tokens=ai_service.config.max_tokens,
                temperature=ai_service.config.temperature,
                system="You are an expert Agile coach and user story writer. Generate professional, well-structured user stories.",
                messages=[{"role": "user", "content": prompt}]
            )
            
            content = response.content[0].text.strip()
            
        elif ai_service.openai_client:
            # Use OpenAI as fallback
            response = await ai_service.openai_client.chat.completions.create(
                model=ai_service.config.model,
                messages=[
                    {"role": "system", "content": "You are an expert Agile coach and user story writer. Generate professional, well-structured user stories."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=ai_service.config.max_tokens,
                temperature=ai_service.config.temperature
            )
            
            content = response.choices[0].message.content.strip()
        
        else:
            raise Exception("No AI client available")
        
        # Parse JSON response
        import json
        
        # Clean up the response to extract JSON
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0].strip()
        elif "```" in content:
            content = content.split("```")[1].strip()
        
        # Try to parse JSON
        try:
            story_data = json.loads(content)
            
            # Validate required fields
            required_fields = ["name", "description", "acceptanceCriteria", "tags", "storyPoints"]
            for field in required_fields:
                if field not in story_data:
                    raise ValueError(f"Missing required field: {field}")
            
            return story_data
            
        except (json.JSONDecodeError, ValueError) as parse_error:
            logger.warning(f"Failed to parse AI response as JSON: {parse_error}")
            logger.warning(f"AI Response content: {content}")
            # Fall back to pattern-based generation
            return generate_fallback_story(request)
    
    except Exception as e:
        logger.error(f"Real AI generation failed: {e}")
        # Fall back to pattern-based generation
        return generate_fallback_story(request)


def generate_fallback_story(request: StoryGenerateRequest) -> Dict[str, Any]:
    """Generate story using pattern-based fallback"""
    description_lower = request.description.lower()
    
    # Smart title generation based on description (short reference titles)
    if "login" in description_lower and "user" in description_lower:
        title = "User Login Feature"
        user_story = "As a user, I want to log into the system so that I can access my account"
    elif "password" in description_lower and "reset" in description_lower:
        title = "Password Reset Feature"
        user_story = "As a user, I want to reset my password so that I can regain access to my account"
    elif "dashboard" in description_lower:
        title = "User Dashboard Access"
        user_story = "As a user, I want to view my dashboard so that I can see an overview of my activities"
    elif "search" in description_lower:
        title = "Content Search Feature"
        user_story = "As a user, I want to search for content so that I can find what I'm looking for"
    elif "profile" in description_lower:
        title = "Profile Management"
        user_story = "As a user, I want to manage my profile so that I can keep my information up to date"
    else:
        # Generic pattern
        title = f"User Feature: {request.description.title()}"
        user_story = f"As a user, I want to {request.description.lower()} so that I can achieve my goals"
    
    # Generate acceptance criteria
    acceptance_criteria = []
    if request.includeAcceptanceCriteria:
        if "login" in description_lower:
            acceptance_criteria = [
                "Given I am on the login page, when I enter valid credentials, then I should be logged in",
                "Given I am on the login page, when I enter invalid credentials, then I should see an error message",
                "Given I am logged in, when I navigate to protected pages, then I should have access"
            ]
        elif "password" in description_lower and "reset" in description_lower:
            acceptance_criteria = [
                "Given I forgot my password, when I click 'Forgot Password', then I should receive a reset email",
                "Given I received a reset email, when I click the reset link, then I should be able to set a new password",
                "Given I set a new password, when I try to login, then I should be able to access my account"
            ]
        elif "dashboard" in description_lower:
            acceptance_criteria = [
                "Given I am logged in, when I navigate to the dashboard, then I should see my key metrics",
                "Given I am on the dashboard, when I click on a widget, then I should see detailed information",
                "Given the dashboard loads, when data is available, then it should display within 3 seconds"
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
    
    # Generate enhanced description (combine user story with context)
    if "password" in description_lower and "reset" in description_lower:
        enhanced_description = f"{user_story}. This feature enables users to securely reset their passwords when they forget them, improving user experience and reducing support requests. The system should validate email addresses, generate secure reset tokens, and provide clear instructions to users throughout the process."
    elif "login" in description_lower:
        enhanced_description = f"{user_story}. This core authentication feature allows users to securely access their accounts. The system should validate credentials, provide clear error messages for failed attempts, and implement security measures like rate limiting to prevent brute force attacks."
    elif "dashboard" in description_lower:
        enhanced_description = f"{user_story}. The dashboard serves as the main hub for users to access key information and functionality. It should display relevant metrics, provide quick access to common tasks, and be personalized based on user roles and preferences."
    elif "search" in description_lower:
        enhanced_description = f"{user_story}. This feature enhances user productivity by allowing them to quickly find relevant content. The search should be fast, accurate, and provide filtering options to help users narrow down results."
    else:
        # Generic enhancement
        enhanced_description = f"{user_story}. This feature is designed to improve user experience and provide value to the business through enhanced functionality and user satisfaction."

    return {
        "name": title,
        "description": enhanced_description,
        "acceptanceCriteria": acceptance_criteria,
        "tags": tags,
        "storyPoints": story_points
    }

# AI endpoints
@app.get("/api/ai/status")
async def ai_status_check():
    """Get detailed AI service status"""
    try:
        from backend.services.ai_service import get_basic_ai_service, get_ai_service
        
        status = {
            "basic_service": False,
            "enhanced_service": False,
            "supabase_connection": False,
            "openai_client": False,
            "anthropic_client": False,
            "production_supabase": False,
            "errors": []
        }
        
        # Test basic service
        try:
            basic_service = get_basic_ai_service()
            status["basic_service"] = True
            status["openai_client"] = basic_service.openai_client is not None
            status["anthropic_client"] = basic_service.anthropic_client is not None
        except Exception as e:
            status["errors"].append(f"Basic service: {str(e)}")
        
        # Test enhanced service (this may fail due to different Supabase client)
        try:
            enhanced_service = get_ai_service()
            status["enhanced_service"] = True
        except Exception as e:
            status["errors"].append(f"Enhanced service: {str(e)}")
        
        # Test Supabase connection using production backend's global supabase instance
        try:
            if supabase:
                # Test with a simple query
                result = supabase.table("epics").select("id").limit(1).execute()
                status["production_supabase"] = True
                status["supabase_connection"] = True
                logger.info(f"Supabase test query returned {len(result.data)} records")
            else:
                status["errors"].append("Production Supabase: Client not initialized")
        except Exception as e:
            status["errors"].append(f"Production Supabase: {str(e)}")
            logger.error(f"Supabase connection test failed: {e}")
        
        return status
        
    except Exception as e:
        logger.error(f"AI status check failed: {e}")
        return {"status": "error", "message": str(e)}

@app.post("/api/ai/generate-story")
async def generate_story(request: AIStoryRequest, current_user: dict = Depends(get_current_user)):
    """Generate AI-powered user story"""
    try:
        story_data = await generate_ai_story(
            epic_id=request.epic_id,
            description=request.description,
            requirements=request.requirements
        )
        
        # Create the story in the database
        story_create_data = {
            "name": story_data["title"],
            "description": story_data["description"],
            "acceptance_criteria": story_data["acceptance_criteria"],
            "story_points": story_data["story_points"],
            "priority": story_data["priority"],
            "epic_id": request.epic_id,
            "status": "backlog",
            "created_by": current_user["id"],
            "created_at": datetime.utcnow().isoformat()
        }
        
        result = supabase.table("stories").insert(story_create_data).execute()
        
        # Clear cache
        if redis_client:
            try:
                redis_client.delete("stories:all")
            except Exception as e:
                logger.warning(f"Cache clear failed: {e}")
        
        return {
            "story": result.data[0] if result.data else story_create_data,
            "ai_generated": True
        }
    except Exception as e:
        logger.error(f"Error generating AI story: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate story")

@app.post("/api/email/send")
async def send_email_endpoint(request: EmailRequest, current_user: dict = Depends(get_current_user)):
    """Send email using SendGrid"""
    try:
        response = await send_email(
            to_email=request.to_email,
            subject=request.subject,
            content=request.content,
            template_id=request.template_id
        )
        
        return {
            "message": "Email sent successfully",
            "status_code": response.status_code
        }
    except Exception as e:
        logger.error(f"Error sending email: {e}")
        raise HTTPException(status_code=500, detail="Failed to send email")

# Webhook endpoints for integrations
@app.post("/api/webhooks/stripe")
async def stripe_webhook(request: Request):
    """Handle Stripe webhooks with proper signature verification"""
    try:
        payload = await request.body()
        sig_header = request.headers.get('stripe-signature')
        endpoint_secret = os.getenv('STRIPE_WEBHOOK_SECRET')
        
        if not endpoint_secret:
            logger.error("Stripe webhook secret not configured")
            raise HTTPException(status_code=500, detail="Webhook secret not configured")
        
        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, endpoint_secret
            )
        except ValueError as e:
            logger.error(f"Invalid payload: {e}")
            raise HTTPException(status_code=400, detail="Invalid payload")
        except stripe.error.SignatureVerificationError as e:
            logger.error(f"Invalid signature: {e}")
            raise HTTPException(status_code=400, detail="Invalid signature")
        
        # Handle the event
        if event['type'] == 'payment_intent.succeeded':
            payment_intent = event['data']['object']
            logger.info(f"Payment succeeded: {payment_intent['id']}")
            
            # Update user subscription or credits
            # Implement your business logic here
            
        elif event['type'] == 'customer.subscription.updated':
            subscription = event['data']['object']
            logger.info(f"Subscription updated: {subscription['id']}")
            
            # Update user subscription status
            # Implement your business logic here
            
        elif event['type'] == 'invoice.payment_failed':
            invoice = event['data']['object']
            logger.warning(f"Payment failed: {invoice['id']}")
            
            # Handle failed payment
            # Implement your business logic here
            
        else:
            logger.info(f"Unhandled event type: {event['type']}")
        
        return {"status": "success"}
        
    except Exception as e:
        logger.error(f"Stripe webhook error: {e}")
        raise HTTPException(status_code=500, detail="Webhook processing failed")

@app.post("/api/stripe/create-checkout-session")
async def create_checkout_session(request: Request):
    """Create a Stripe checkout session"""
    try:
        data = await request.json()
        price_id = data.get('priceId')
        user_id = data.get('userId')
        success_url = data.get('successUrl')
        cancel_url = data.get('cancelUrl')
        
        if not all([price_id, user_id, success_url, cancel_url]):
            raise HTTPException(status_code=400, detail="Missing required parameters")
        
        # Get or create Stripe customer
        try:
            # Check if user already has a Stripe customer ID
            user_result = supabase.table('users').select('stripe_customer_id, email').eq('id', user_id).execute()
            if not user_result.data:
                raise HTTPException(status_code=404, detail="User not found")
            
            user = user_result.data[0]
            customer_id = user.get('stripe_customer_id')
            
            if not customer_id:
                # Create new Stripe customer
                customer = stripe.Customer.create(
                    email=user['email'],
                    metadata={'user_id': user_id}
                )
                customer_id = customer.id
                
                # Save customer ID to user record
                supabase.table('users').update({
                    'stripe_customer_id': customer_id
                }).eq('id', user_id).execute()
            
        except Exception as e:
            logger.error(f"Error handling Stripe customer: {e}")
            raise HTTPException(status_code=500, detail="Failed to process customer")
        
        # Create checkout session
        session = stripe.checkout.Session.create(
            customer=customer_id,
            payment_method_types=['card'],
            line_items=[{
                'price': price_id,
                'quantity': 1,
            }],
            mode='subscription',
            success_url=success_url,
            cancel_url=cancel_url,
            metadata={
                'user_id': user_id
            }
        )
        
        return {"id": session.id, "url": session.url}
        
    except stripe.error.StripeError as e:
        logger.error(f"Stripe error: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Checkout session error: {e}")
        raise HTTPException(status_code=500, detail="Failed to create checkout session")

@app.post("/api/stripe/create-portal-session")
async def create_portal_session(request: Request):
    """Create a Stripe customer portal session"""
    try:
        data = await request.json()
        customer_id = data.get('customerId')
        return_url = data.get('returnUrl')
        
        if not all([customer_id, return_url]):
            raise HTTPException(status_code=400, detail="Missing required parameters")
        
        # Create portal session
        session = stripe.billing_portal.Session.create(
            customer=customer_id,
            return_url=return_url,
        )
        
        return {"url": session.url}
        
    except stripe.error.StripeError as e:
        logger.error(f"Stripe error: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Portal session error: {e}")
        raise HTTPException(status_code=500, detail="Failed to create portal session")

@app.post("/api/webhooks/sendgrid")
async def sendgrid_webhook(request: Request):
    """Handle SendGrid webhooks for email events"""
    try:
        payload = await request.json()
        
        for event in payload:
            event_type = event.get('event')
            email = event.get('email')
            timestamp = event.get('timestamp')
            
            logger.info(f"Email event: {event_type} for {email} at {timestamp}")
            
            # Store email events in database for analytics
            try:
                email_event_data = {
                    "event_type": event_type,
                    "email": email,
                    "timestamp": datetime.fromtimestamp(timestamp).isoformat() if timestamp else None,
                    "data": event,
                    "created_at": datetime.utcnow().isoformat()
                }
                
                # You might want to create an email_events table
                # supabase.table("email_events").insert(email_event_data).execute()
                
            except Exception as e:
                logger.error(f"Failed to store email event: {e}")
        
        return {"status": "success"}
        
    except Exception as e:
        logger.error(f"SendGrid webhook error: {e}")
        raise HTTPException(status_code=500, detail="Webhook processing failed")

# Background task endpoints
@app.post("/api/tasks/send-notification")
async def send_notification(
    background_tasks: BackgroundTasks,
    user_id: str,
    message: str,
    current_user: dict = Depends(get_current_user)
):
    """Send notification to user (background task)"""
    try:
        # Get user email
        user_result = supabase.table("users").select("email, name").eq("id", user_id).execute()
        if not user_result.data:
            raise HTTPException(status_code=404, detail="User not found")
        
        user = user_result.data[0]
        
        # Add background task to send email
        background_tasks.add_task(
            send_email,
            to_email=user["email"],
            subject="AgileForge Notification",
            content=f"<h2>Hello {user['name']}</h2><p>{message}</p>"
        )
        
        return {"message": "Notification queued for sending"}
        
    except Exception as e:
        logger.error(f"Error queuing notification: {e}")
        raise HTTPException(status_code=500, detail="Failed to queue notification")

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    environment = os.getenv("ENVIRONMENT", "development")
    
    uvicorn.run(
        "production_backend:app",
        host="0.0.0.0",
        port=port,
        reload=environment == "development",
        log_level="info"
    ) 