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
from backend.auth.auth_endpoints import auth_router
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

# Configure logging for production
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler("app.log") if os.getenv("ENVIRONMENT") == "production" else logging.StreamHandler()
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
        
        # Initialize enhanced authentication manager
        import backend.auth.enhanced_auth as auth_module
        auth_module.auth_manager = EnhancedAuthManager(supabase)
        logger.info("Enhanced authentication manager initialized")
        
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
app.include_router(auth_router)
app.include_router(webhooks_router)
app.include_router(cron_router)
app.include_router(storage_router)
app.include_router(realtime_router)
app.include_router(analytics_router)
app.include_router(ai_router, prefix="/api/ai")
app.include_router(notification_router)

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
    # Production origins
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
    """Authentication dependency with proper JWT validation"""
    # In development mode without Supabase, return a mock user
    if not supabase:
        return {"id": "dev-user", "email": "dev@example.com", "name": "Development User"}
    
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    try:
        payload = verify_jwt_token(credentials.credentials)
        user_id = payload.get("sub")
        
        # Get user from database
        result = supabase.table("users").select("*").eq("id", user_id).execute()
        if not result.data:
            raise HTTPException(status_code=401, detail="User not found")
        
        return result.data[0]
    except Exception as e:
        logger.error(f"Authentication error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
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
        
        response = openai.ChatCompletion.create(
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
async def not_found_handler(request, exc):
    return {"error": "Resource not found", "status_code": 404}

@app.exception_handler(500)
async def internal_error_handler(request, exc):
    logger.error(f"Internal server error: {exc}")
    return {"error": "Internal server error", "status_code": 500}

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
            logger.error(f"Redis health check failed: {e}")
            health_status["services"]["redis"] = "unhealthy"
            health_status["status"] = "degraded"
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

# Users endpoints
@app.get("/api/users", response_model=List[Dict[str, Any]])
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
                    return json.loads(cached_data)
            except Exception as e:
                logger.warning(f"Cache read failed: {e}")
        
        result = supabase.table("users").select("*").execute()
        
        # Cache the result
        if redis_client:
            try:
                redis_client.setex(cache_key, 300, json.dumps(result.data))  # Cache for 5 minutes
            except Exception as e:
                logger.warning(f"Cache write failed: {e}")
        
        return result.data
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
async def get_projects(current_user = Depends(get_current_active_user)):
    """Get all projects (requires view project permission)"""
    try:
        # Check if user has permission to view projects
        from backend.auth.enhanced_auth import get_auth_manager, Permission
        auth_mgr = get_auth_manager()
        
        if not auth_mgr.has_permission(current_user, Permission.VIEW_PROJECT):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Permission to view projects required"
            )
        
        result = supabase.table("projects").select("*").execute()
        return result.data
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching projects: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch projects")

@app.post("/api/projects", status_code=status.HTTP_201_CREATED)
async def create_project(project_data: ProjectCreate, current_user = Depends(require_create_project)):
    """Create a new project (requires create project permission)"""
    try:
        # Add created_by from current user
        data = project_data.dict()
        data["created_by"] = current_user.id
        data["created_at"] = datetime.utcnow().isoformat()
        
        result = supabase.table("projects").insert(data).execute()
        if result.data:
            logger.info(f"Project created: {result.data[0]['id']} by user: {current_user.email}")
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
        return result.data
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
        return result.data
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