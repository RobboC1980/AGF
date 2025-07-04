#!/usr/bin/env python3
"""
AgileForge Enterprise Backend - Fixed Version
All enterprise features preserved with resolved import paths
"""

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
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(current_dir)
sys.path.insert(0, project_root)
sys.path.insert(0, current_dir)

# Configure logging first
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

# Import all routers and services with proper error handling
def import_with_fallback(module_name, item_name, description):
    """Import with multiple fallback strategies"""
    try:
        # Try absolute import first
        module = __import__(module_name, fromlist=[item_name])
        return getattr(module, item_name)
    except ImportError:
        try:
            # Try relative import
            module = __import__(f'backend.{module_name}', fromlist=[item_name])
            return getattr(module, item_name)
        except ImportError:
            logger.warning(f"Failed to import {description}: {module_name}")
            return None

# Core service imports
init_supabase = import_with_fallback('database.supabase_client', 'init_supabase', 'Supabase init')
close_supabase = import_with_fallback('database.supabase_client', 'close_supabase', 'Supabase close')
get_supabase = import_with_fallback('database.supabase_client', 'get_supabase', 'Supabase client')

# AI service imports
init_ai_service = import_with_fallback('services.ai_service', 'init_ai_service', 'AI service init')

# Middleware imports
AuthMiddleware = import_with_fallback('middleware.auth', 'AuthMiddleware', 'Auth middleware')
LoggingMiddleware = import_with_fallback('middleware.logging', 'LoggingMiddleware', 'Logging middleware')

# Authentication imports
EnhancedAuthManager = import_with_fallback('auth.enhanced_auth', 'EnhancedAuthManager', 'Enhanced auth manager')

# Advanced middleware imports
ObservabilityMiddleware = import_with_fallback('middleware.observability', 'ObservabilityMiddleware', 'Observability middleware')
setup_telemetry = import_with_fallback('middleware.observability', 'setup_telemetry', 'Telemetry setup')
instrument_fastapi_app = import_with_fallback('middleware.observability', 'instrument_fastapi_app', 'FastAPI instrumentation')

SecurityMiddleware = import_with_fallback('middleware.security', 'SecurityMiddleware', 'Security middleware')
RateLimitMiddleware = import_with_fallback('middleware.security', 'RateLimitMiddleware', 'Rate limiting')
get_jwt_manager = import_with_fallback('middleware.security', 'get_jwt_manager', 'JWT manager')

# Monitoring imports
health_router = import_with_fallback('services.monitoring', 'health_router', 'Health router')
get_system_monitor = import_with_fallback('services.monitoring', 'get_system_monitor', 'System monitor')

# Advanced security imports
AdvancedEncryption = import_with_fallback('security.advanced_security', 'AdvancedEncryption', 'Advanced encryption')
InputValidator = import_with_fallback('security.advanced_security', 'InputValidator', 'Input validator')
ThreatDetector = import_with_fallback('security.advanced_security', 'ThreatDetector', 'Threat detector')

# Backup and query optimizer imports
BackupManager = import_with_fallback('backup.backup_manager', 'BackupManager', 'Backup manager')
QueryOptimizer = import_with_fallback('database.query_optimizer', 'QueryOptimizer', 'Query optimizer')

# Import all API routers
routers = {}
router_definitions = [
    ('api.auth', 'router', 'auth_router', 'Authentication API'),
    ('api.stories', 'router', 'stories_router', 'Stories API'),
    ('api.projects', 'router', 'projects_router', 'Projects API'),
    ('api.epics', 'router', 'epics_router', 'Epics API'),
    ('api.users', 'router', 'users_router', 'Users API'),
    ('api.tasks', 'router', 'tasks_router', 'Tasks API'),
    ('api.teams', 'router', 'teams_router', 'Teams API'),
    ('api.search', 'router', 'search_router', 'Search API'),
    ('api.sprints', 'router', 'sprints_router', 'Sprints API'),
    ('api.ai_endpoints', 'router', 'ai_router', 'AI Endpoints'),
    ('api.ai_analysis', 'router', 'ai_analysis_router', 'AI Analysis'),
    ('api.ai_kanban_endpoints', 'router', 'ai_kanban_router', 'AI Kanban'),
    ('api.ai_sprint_endpoints', 'router', 'ai_sprint_router', 'AI Sprint'),
    ('api.ai_analytics_endpoints', 'router', 'ai_analytics_router', 'AI Analytics'),
    ('api.analytics_endpoints', 'analytics_router', 'analytics_router', 'Analytics'),
    ('api.access_control', 'router', 'access_control_router', 'Access Control'),
    ('api.performance_endpoints', 'router', 'performance_router', 'Performance Monitoring'),
    ('api.project_assignments', 'router', 'project_assignments_router', 'Project Assignments'),
    ('api.user_permissions', 'router', 'user_permissions_router', 'User Permissions'),
    ('api.stripe_products', 'router', 'stripe_router', 'Stripe Products'),
]

# Load all routers
for module_name, attr_name, var_name, description in router_definitions:
    router = import_with_fallback(module_name, attr_name, description)
    if router:
        routers[var_name] = router
        logger.info(f"Loaded {description}")
    else:
        logger.warning(f"Failed to load {description}")

# Optional authentication dependency for error logging
async def get_current_user_optional(request):
    """Get current user if authenticated, otherwise return None"""
    try:
        from auth.unified_auth import get_current_user_optional as get_optional_user
        return await get_optional_user(request)
    except:
        return None

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting AgileForge API with Phase 2 & 3 enhancements...")
    
    # Setup telemetry (OpenTelemetry)
    if setup_telemetry:
        try:
            setup_telemetry()
            logger.info("OpenTelemetry setup completed")
        except Exception as e:
            logger.warning(f"OpenTelemetry setup failed: {e}")
    
    # Initialize Supabase
    if init_supabase:
        try:
            init_supabase()
            logger.info("Supabase client initialized successfully")
            
            # Get Supabase client for service initialization
            if get_supabase:
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
                
                # Initialize Analytics Service
                try:
                    analytics_service = import_with_fallback('services.analytics_service', 'init_analytics_service', 'Analytics service')
                    if analytics_service:
                        analytics_svc = analytics_service(supabase)
                        logger.info("Analytics service initialized successfully")
                except Exception as analytics_error:
                    logger.error("Analytics service initialization failed", error=str(analytics_error))
                
                # Initialize Enhanced Auth Manager
                if EnhancedAuthManager:
                    try:
                        auth_manager = EnhancedAuthManager(supabase)
                        logger.info("Enhanced Auth Manager initialized successfully")
                    except Exception as auth_error:
                        logger.error("Enhanced Auth Manager initialization failed", error=str(auth_error))
                
                # Initialize AI service with Supabase
                if init_ai_service:
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
                    get_async_ai_service = import_with_fallback('services.async_ai_service', 'get_async_ai_service', 'Async AI service')
                    get_cache_service = import_with_fallback('services.cache_service', 'get_cache_service', 'Cache service')
                    get_project_cache = import_with_fallback('services.cache_service', 'get_project_cache', 'Project cache')
                    
                    if get_async_ai_service and get_cache_service and get_project_cache:
                        # Initialize Redis-based services
                        async_ai_svc = get_async_ai_service()
                        cache_svc = get_cache_service()
                        project_cache = get_project_cache()
                        
                        logger.info("Async AI service and cache layer initialized successfully")
                except Exception as async_error:
                    logger.error("Async services initialization failed", error=str(async_error))
                    logger.warning("Application will continue with synchronous AI operations")
                
                # Initialize monitoring
                if get_system_monitor:
                    try:
                        monitor = get_system_monitor()
                        logger.info("System monitoring initialized successfully")
                    except Exception as monitor_error:
                        logger.error("System monitoring initialization failed", error=str(monitor_error))
                        
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
        if close_supabase:
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
    try:
        instrument_fastapi_app(app)
        logger.info("FastAPI instrumentation enabled")
    except Exception as e:
        logger.warning(f"FastAPI instrumentation failed: {e}")

# CORS configuration for deployment
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
if AuthMiddleware:
    app.add_middleware(AuthMiddleware)
    logger.info("Authentication middleware enabled")

if LoggingMiddleware:
    app.add_middleware(LoggingMiddleware)
    logger.info("Logging middleware enabled")

# Health check endpoint (enhanced)
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "environment": os.getenv("ENVIRONMENT", "development"),
        "version": "3.0.0",
        "timestamp": datetime.utcnow().isoformat(),
        "features": {
            "observability": ObservabilityMiddleware is not None,
            "security": SecurityMiddleware is not None,
            "advanced_security": AdvancedEncryption is not None,
            "rate_limiting": RateLimitMiddleware is not None,
            "async_ai": True,
            "caching": True,
            "monitoring": health_router is not None,
            "performance_monitoring": 'performance_router' in routers,
            "backup_system": BackupManager is not None,
            "query_optimization": QueryOptimizer is not None,
            "loaded_routers": len(routers)
        }
    }

# Metrics endpoint for Prometheus
@app.get("/metrics")
async def metrics():
    """Prometheus metrics endpoint"""
    try:
        from prometheus_client import generate_latest, CONTENT_TYPE_LATEST
        
        return Response(
            generate_latest(),
            media_type=CONTENT_TYPE_LATEST
        )
    except Exception as e:
        logger.error(f"Metrics endpoint failed: {e}")
        return JSONResponse(
            status_code=500,
            content={"error": "Metrics unavailable"}
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
        "loaded_routers": len(routers),
        "docs": "/docs" if os.getenv("ENVIRONMENT") != "production" else "Documentation disabled in production"
    }

# Include all successfully loaded routers
router_configs = [
    ('auth_router', "/api/auth", ["Authentication"]),
    ('stories_router', "/api/stories", ["Stories"]),
    ('projects_router', "/api/projects", ["Projects"]),
    ('epics_router', "/api/epics", ["Epics"]),
    ('users_router', "/api/users", ["Users"]),
    ('tasks_router', "/api/tasks", ["Tasks"]),
    ('teams_router', "/api/teams", ["Teams"]),
    ('search_router', "/api/search", ["Search"]),
    ('sprints_router', "/api/sprints", ["Sprints"]),
    ('ai_router', "/api/ai", ["AI Features"]),
    ('ai_analysis_router', "/api/ai-analysis", ["AI Analysis"]),
    ('ai_kanban_router', "", ["AI Kanban Features"]),
    ('ai_sprint_router', "", ["AI Sprint Planning"]),
    ('ai_analytics_router', "", ["AI Analytics & Insights"]),
    ('analytics_router', "/api", ["Analytics"]),
    ('access_control_router', "", ["Access Control"]),
    ('performance_router', "/api/performance", ["Performance Monitoring"]),
    ('project_assignments_router', "", ["Project Assignments"]),
    ('user_permissions_router', "", ["User Permissions"]),
    ('stripe_router', "", ["Stripe Products"]),
]

for router_name, prefix, tags in router_configs:
    if router_name in routers:
        try:
            app.include_router(routers[router_name], prefix=prefix, tags=tags)
            logger.info(f"Included {router_name} router")
        except Exception as e:
            logger.warning(f"Failed to include {router_name}: {e}")

# Include monitoring router if available
if health_router:
    try:
        app.include_router(health_router, tags=["Monitoring"])
        logger.info("Included health monitoring router")
    except Exception as e:
        logger.warning(f"Failed to include health router: {e}")

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
        
        # Log the error
        logger.error("Frontend error logged",
                    message=message,
                    stack=stack,
                    component_stack=component_stack,
                    url=url,
                    user_agent=user_agent,
                    user_id=current_user.get('id') if current_user else None)
        
        return {"success": True}
    except Exception as e:
        logger.error("Failed to log frontend error", error=str(e))
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": "Failed to log error"
            }
        )

if __name__ == "__main__":
    import uvicorn
    
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(
        "main_fixed:app",
        host="0.0.0.0",
        port=port,
        reload=True,
        log_level="info"
    ) 