from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from contextlib import asynccontextmanager
import os
import sys
import logging
import time
from typing import List
from fastapi.responses import JSONResponse, Response
from datetime import datetime

# Add parent directory to path for proper imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import routers - handle both relative and absolute imports
try:
    from backend.api.ai_endpoints import router as ai_router
    from backend.api.ai_analysis import router as ai_analysis_router
    from backend.api.ai_kanban_endpoints import router as ai_kanban_router
    from backend.api.ai_sprint_endpoints import router as ai_sprint_router
    from backend.api.ai_analytics_endpoints import router as ai_analytics_router
    from backend.api.stories import router as stories_router
    from backend.api.auth import router as auth_router
    from backend.api.projects import router as projects_router
    from backend.api.epics import router as epics_router
    from backend.api.users import router as users_router
    from backend.api.tasks import router as tasks_router
    from backend.api.teams import router as teams_router
    from backend.api.search import router as search_router
    from backend.api.sprints import router as sprints_router
    from backend.api.analytics_endpoints import analytics_router
    from backend.api.access_control import router as access_control_router
    # Phase 2 & 3 API endpoints
    from backend.api.performance_endpoints import router as performance_router
    from backend.database.supabase_client import init_supabase, close_supabase, get_supabase
    from backend.services.ai_service import init_ai_service
    from backend.middleware.auth import AuthMiddleware
    from backend.middleware.logging import LoggingMiddleware
    from backend.auth.enhanced_auth import EnhancedAuthManager
    # Phase 2 imports
    from backend.middleware.observability import (
        ObservabilityMiddleware, setup_telemetry, instrument_fastapi_app
    )
    from backend.middleware.security import (
        SecurityMiddleware, RateLimitMiddleware
    )
    from backend.services.monitoring import health_router, get_system_monitor
    # Phase 3 imports - Security and Backup
    from backend.security.advanced_security import AdvancedEncryption, InputValidator, ThreatDetector
    from backend.backup.backup_manager import BackupManager
    from backend.database.query_optimizer import QueryOptimizer
except ImportError as e:
    # Fallback for running as script
    try:
        from api.ai_endpoints import router as ai_router
        from api.ai_analysis import router as ai_analysis_router
        from api.ai_kanban_endpoints import router as ai_kanban_router
        from api.ai_sprint_endpoints import router as ai_sprint_router
        from api.ai_analytics_endpoints import router as ai_analytics_router
        from api.stories import router as stories_router
        from api.auth import router as auth_router
        from api.projects import router as projects_router
        from api.epics import router as epics_router
        from api.users import router as users_router
        from api.tasks import router as tasks_router
        from api.teams import router as teams_router
        from api.search import router as search_router
        from api.sprints import router as sprints_router
        from api.analytics_endpoints import analytics_router
        from api.access_control import router as access_control_router
        # Phase 2 & 3 API endpoints
        from api.performance_endpoints import router as performance_router
        from database.supabase_client import init_supabase, close_supabase, get_supabase
        from services.ai_service import init_ai_service
        from middleware.auth import AuthMiddleware
        from middleware.logging import LoggingMiddleware
        from auth.enhanced_auth import EnhancedAuthManager
        # Phase 2 imports with fallback
        try:
            from middleware.observability import (
                ObservabilityMiddleware, setup_telemetry, instrument_fastapi_app
            )
            from middleware.security import (
                SecurityMiddleware, RateLimitMiddleware
            )
            from services.monitoring import health_router, get_system_monitor
            # Phase 3 imports - Security and Backup
            from security.advanced_security import AdvancedEncryption, InputValidator, ThreatDetector
            from backup.backup_manager import BackupManager
            from database.query_optimizer import QueryOptimizer
        except ImportError:
            # Minimal fallback
            ObservabilityMiddleware = None
            SecurityMiddleware = None
            RateLimitMiddleware = None
            health_router = None
            performance_router = None
            AdvancedEncryption = None
            InputValidator = None
            ThreatDetector = None
            BackupManager = None
            QueryOptimizer = None
    except ImportError as e2:
        print(f"Import error: {e2}")
        sys.exit(1)

# Configure logging - Enhanced with structured logging
import structlog

# Configure structured logging
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
        structlog.processors.JSONRenderer() if os.getenv("ENVIRONMENT") == "production" 
        else structlog.dev.ConsoleRenderer()
    ],
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger(__name__)

# Optional authentication dependency for error logging
async def get_current_user_optional(request):
    """Get current user if authenticated, otherwise return None"""
    try:
        from backend.auth.unified_auth import get_current_user_optional as get_optional_user
        return await get_optional_user(request)
    except:
        return None

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting AgileForge API with Phase 2 & 3 enhancements...")
    
    # Setup telemetry (OpenTelemetry)
    if setup_telemetry:
        setup_telemetry()
    
    # Initialize Supabase
    try:
        init_supabase()
        logger.info("Supabase client initialized successfully")
        
        # Get Supabase client for service initialization
        supabase = get_supabase()
        
        # Initialize Query Optimizer
        if QueryOptimizer:
            try:
                query_optimizer = QueryOptimizer(supabase)
                logger.info("Query optimizer initialized successfully")
            except Exception as optimizer_error:
                logger.error("Query optimizer initialization failed", error=str(optimizer_error))
        
        # Initialize Security Components
        if AdvancedEncryption and InputValidator and ThreatDetector:
            try:
                # Initialize security components
                encryption = AdvancedEncryption()
                input_validator = InputValidator()
                threat_detector = ThreatDetector()
                logger.info("Advanced security components initialized successfully")
            except Exception as security_error:
                logger.error("Advanced security initialization failed", error=str(security_error))
        
        # Initialize Backup Manager
        if BackupManager:
            try:
                backup_manager = BackupManager(supabase)
                logger.info("Backup manager initialized successfully")
            except Exception as backup_error:
                logger.error("Backup manager initialization failed", error=str(backup_error))
        
        # Initialize Analytics Service - Re-enabled after fixing proxy issue
        try:
            from backend.services.analytics_service import init_analytics_service
            analytics_svc = init_analytics_service(supabase)
            logger.info("Analytics service initialized successfully")
        except Exception as analytics_error:
            logger.error("Analytics service initialization failed", error=str(analytics_error))
        
        # Initialize Enhanced Auth Manager
        try:
            auth_manager = EnhancedAuthManager(supabase)
            logger.info("Enhanced Auth Manager initialized successfully")
        except Exception as auth_error:
            logger.error("Enhanced Auth Manager initialization failed", error=str(auth_error))
        
        # Initialize AI service with Supabase
        try:
            enhanced_service = init_ai_service(supabase)
            if enhanced_service:
                logger.info("Enhanced AI service initialized successfully")
            else:
                logger.warning("Enhanced AI service failed to initialize, basic service available")
        except Exception as ai_error:
            logger.warning("AI service initialization encountered issues", error=str(ai_error))
            logger.info("Basic AI service should still be available for fallback")
        
        # Initialize Async AI Service & Cache
        try:
            from backend.services.async_ai_service import get_async_ai_service
            from backend.services.cache_service import get_cache_service, get_project_cache
            
            # Initialize Redis-based services
            async_ai_svc = get_async_ai_service()
            cache_svc = get_cache_service()
            project_cache = get_project_cache()
            
            logger.info("Async AI service and cache layer initialized successfully")
        except ImportError:
            from services.async_ai_service import get_async_ai_service
            from services.cache_service import get_cache_service, get_project_cache
            
            async_ai_svc = get_async_ai_service()
            cache_svc = get_cache_service()
            project_cache = get_project_cache()
            
            logger.info("Async AI service and cache layer initialized successfully")
        except Exception as async_error:
            logger.error("Async services initialization failed", error=str(async_error))
            logger.warning("Application will continue with synchronous AI operations")
        
        # Initialize monitoring
        if get_system_monitor:
            monitor = get_system_monitor()
            logger.info("System monitoring initialized successfully")
            
    except Exception as supabase_error:
        logger.error("Supabase initialization failed", error=str(supabase_error))
        logger.warning("Application will continue with limited database functionality")
    
    # Application is ready
    logger.info("AgileForge API startup completed with Phase 2 & 3 enhancements", 
                features=["observability", "security", "monitoring", "async_ai", "caching", "performance", "backup"])
    
    yield
    
    # Shutdown
    logger.info("Shutting down AgileForge API...")
    try:
        close_supabase()
        logger.info("Supabase client closed")
    except Exception as e:
        logger.error("Error during shutdown", error=str(e))

# Create FastAPI app
app = FastAPI(
    title="AgileForge API",
    description="AI-Powered Agile Project Management Platform with Enterprise Security, Performance Monitoring & Backup",
    version="3.0.0",  # Phase 3 version
    docs_url="/docs" if os.getenv("ENVIRONMENT") != "production" else None,
    redoc_url="/redoc" if os.getenv("ENVIRONMENT") != "production" else None,
    lifespan=lifespan
)

# Instrument with OpenTelemetry
if instrument_fastapi_app:
    instrument_fastapi_app(app)

# CORS configuration for deployment
# In development, we'll allow all localhost origins
if os.getenv("ENVIRONMENT") == "development":
    allowed_origins = ["*"]  # Allow all origins in development
else:
    allowed_origins = [
        "http://localhost:3000",  # Local development
        "http://localhost:3001",  # Alternative local port
        "http://localhost:3002",  # Alternative local port
        "http://localhost:3003",  # Alternative local port
        "http://localhost:3004",  # Alternative local port
        "http://localhost:3005",  # Alternative local port
        "https://v0-agile-forge-40higfdur-clariq.vercel.app",  # Your Vercel deployment
        "https://*.vercel.app",  # Vercel preview deployments
    ]

# Add environment-specific origins
if os.getenv("FRONTEND_URL"):
    allowed_origins.append(os.getenv("FRONTEND_URL"))

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"]
)

# Security middleware
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["*"] if os.getenv("ENVIRONMENT") == "development" else [
        "synqforge-api.onrender.com",
        "localhost",
        "127.0.0.1"
    ]
)

# Phase 2 Middleware Stack (order matters!)
if ObservabilityMiddleware:
    app.add_middleware(ObservabilityMiddleware)
    logger.info("Observability middleware enabled")

if SecurityMiddleware:
    app.add_middleware(SecurityMiddleware)
    logger.info("Security middleware enabled")

if RateLimitMiddleware:
    app.add_middleware(RateLimitMiddleware)
    logger.info("Rate limiting middleware enabled")

# Original middleware
app.add_middleware(AuthMiddleware)
app.add_middleware(LoggingMiddleware)

# Health check endpoint (enhanced)
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "environment": os.getenv("ENVIRONMENT", "development"),
        "version": "3.0.0",
        "features": {
            "observability": ObservabilityMiddleware is not None,
            "security": SecurityMiddleware is not None,
            "advanced_security": AdvancedEncryption is not None,
            "rate_limiting": RateLimitMiddleware is not None,
            "async_ai": True,
            "caching": True,
            "monitoring": health_router is not None,
            "performance_monitoring": performance_router is not None,
            "backup_system": BackupManager is not None,
            "query_optimization": QueryOptimizer is not None
        }
    }

# Metrics endpoint for Prometheus
@app.get("/metrics")
async def metrics():
    """Prometheus metrics endpoint"""
    from prometheus_client import generate_latest, CONTENT_TYPE_LATEST
    
    return Response(
        generate_latest(),
        media_type=CONTENT_TYPE_LATEST
    )

@app.get("/")
async def root():
    return {
        "message": "AgileForge API v3.0 - Enterprise Ready with Advanced Security & Performance",
        "version": "3.0.0",
        "features": [
            "Async AI Operations",
            "Redis Caching",
            "OpenTelemetry Tracing", 
            "Rate Limiting",
            "Circuit Breakers",
            "JWT Refresh",
            "System Monitoring",
            "Structured Logging",
            "Performance Monitoring",
            "Query Optimization",
            "Advanced Security",
            "Threat Detection",
            "Automated Backup",
            "Disaster Recovery"
        ],
        "docs": "/docs" if os.getenv("ENVIRONMENT") != "production" else "Documentation disabled in production"
    }

# Include routers
app.include_router(auth_router, prefix="/api/auth", tags=["Authentication"])
app.include_router(stories_router, prefix="/api/stories", tags=["Stories"])
app.include_router(projects_router, prefix="/api/projects", tags=["Projects"])
app.include_router(epics_router, prefix="/api/epics", tags=["Epics"])
app.include_router(users_router, prefix="/api/users", tags=["Users"])
app.include_router(tasks_router, prefix="/api/tasks", tags=["Tasks"])
app.include_router(teams_router, prefix="/api/teams", tags=["Teams"])
app.include_router(search_router, prefix="/api/search", tags=["Search"])
app.include_router(sprints_router, prefix="/api/sprints", tags=["Sprints"])
app.include_router(ai_router, prefix="/api/ai", tags=["AI Features"])
app.include_router(ai_analysis_router, prefix="/api/ai-analysis", tags=["AI Analysis"])
app.include_router(ai_kanban_router, tags=["AI Kanban Features"])
app.include_router(ai_sprint_router, tags=["AI Sprint Planning"])
app.include_router(ai_analytics_router, tags=["AI Analytics & Insights"])
app.include_router(analytics_router, prefix="/api", tags=["Analytics"])
app.include_router(access_control_router, tags=["Access Control"])

# RBAC Project Assignment endpoints
try:
    from backend.api.project_assignments import router as project_assignments_router
    app.include_router(project_assignments_router, tags=["Project Assignments"])
except ImportError:
    try:
        from api.project_assignments import router as project_assignments_router
        app.include_router(project_assignments_router, tags=["Project Assignments"])
    except ImportError:
        logger.warning("Project assignments router not available")

# RBAC User Permissions endpoints
try:
    from backend.api.user_permissions import router as user_permissions_router
    app.include_router(user_permissions_router, tags=["User Permissions"])
except ImportError:
    try:
        from api.user_permissions import router as user_permissions_router
        app.include_router(user_permissions_router, tags=["User Permissions"])
    except ImportError:
        logger.warning("User permissions router not available")

# Phase 2 & 3: Include monitoring and performance routers
if health_router:
    app.include_router(health_router, tags=["Monitoring"])

if performance_router:
    app.include_router(performance_router, prefix="/api/performance", tags=["Performance Monitoring"])

# Enhanced error handlers
@app.exception_handler(404)
async def not_found_handler(request, exc):
    return JSONResponse(
        status_code=404,
        content={
            "error": "Endpoint not found", 
            "status_code": 404,
            "request_id": getattr(request.state, 'request_id', 'unknown'),
            "timestamp": time.time()
        }
    )

@app.exception_handler(500)
async def internal_error_handler(request, exc):
    logger.error("Internal server error", 
                error=str(exc),
                request_id=getattr(request.state, 'request_id', 'unknown'))
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error", 
            "status_code": 500,
            "request_id": getattr(request.state, 'request_id', 'unknown'),
            "timestamp": time.time()
        }
    )

@app.exception_handler(RuntimeError)
async def runtime_error_handler(request, exc):
    logger.error("Runtime error", 
                error=str(exc),
                request_id=getattr(request.state, 'request_id', 'unknown'))
    # Handle specific service initialization errors
    if "Analytics service not initialized" in str(exc):
        return JSONResponse(
            status_code=503,
            content={
                "error": "Analytics service temporarily unavailable", 
                "status_code": 503,
                "detail": "The analytics service is initializing. Please try again in a moment.",
                "request_id": getattr(request.state, 'request_id', 'unknown'),
                "timestamp": time.time()
            }
        )
    return JSONResponse(
        status_code=500,
        content={
            "error": "Service error", 
            "status_code": 500, 
            "detail": str(exc),
            "request_id": getattr(request.state, 'request_id', 'unknown'),
            "timestamp": time.time()
        }
    )

# Add error logging endpoint
@app.post("/api/errors/log")
async def log_error(
    error_data: dict,
    current_user: dict = Depends(get_current_user_optional)
):
    """Log frontend errors for monitoring and debugging"""
    try:
        # Extract error information
        message = error_data.get('message', 'Unknown error')
        stack = error_data.get('stack', '')
        component_stack = error_data.get('componentStack', '')
        url = error_data.get('url', '')
        user_agent = error_data.get('userAgent', '')
        timestamp = error_data.get('timestamp', '')
        
        # Log the error with structured logging
        logger.error(
            "Frontend error logged",
            error_message=message,
            stack_trace=stack[:1000] if stack else None,  # Limit stack trace length
            component_stack=component_stack[:500] if component_stack else None,
            page_url=url,
            user_agent=user_agent[:200] if user_agent else None,
            user_id=current_user.get('id') if current_user else None,
            user_email=current_user.get('email') if current_user else None,
            error_timestamp=timestamp,
            logged_at=time.time()
        )
        
        # Store in database for analytics (optional)
        try:
            error_record = {
                'message': message,
                'stack_trace': stack,
                'component_stack': component_stack,
                'page_url': url,
                'user_agent': user_agent,
                'user_id': current_user.get('id') if current_user else None,
                'error_timestamp': timestamp,
                'created_at': datetime.utcnow().isoformat()
            }
            
            # Only store if we have a database table for errors
            # For now, just log to file/console
            logger.info(f"Error logged for analysis: {error_record}")
            
        except Exception as db_error:
            logger.warning(f"Failed to store error in database: {db_error}")
        
        return {
            "success": True,
            "message": "Error logged successfully"
        }
        
    except Exception as e:
        logger.error(f"Failed to log frontend error: {e}")
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": "Failed to log error"
            }
        )

if __name__ == "__main__":
    import uvicorn
    import time
    
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=os.getenv("ENVIRONMENT") == "development"
    )
