from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from contextlib import asynccontextmanager
import os
import logging
from typing import List

# Import routers
from .api.ai_endpoints import router as ai_router
from .api.stories import router as stories_router
from .api.auth import router as auth_router
from .api.projects import router as projects_router
from .api.epics import router as epics_router
from .api.users import router as users_router
from .database.supabase_client import init_supabase, close_supabase
from .middleware.auth import AuthMiddleware
from .middleware.logging import LoggingMiddleware

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting AgileScribe API...")
    init_supabase()
    logger.info("Supabase client initialized")
    yield
    # Shutdown
    logger.info("Shutting down AgileScribe API...")
    close_supabase()

# Create FastAPI app
app = FastAPI(
    title="AgileScribe API",
    description="AI-Powered Agile Project Management Platform",
    version="1.0.0",
    docs_url="/docs" if os.getenv("ENVIRONMENT") != "production" else None,
    redoc_url="/redoc" if os.getenv("ENVIRONMENT") != "production" else None,
    lifespan=lifespan
)

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
        "agilescribe-api.onrender.com",
        "localhost",
        "127.0.0.1"
    ]
)

# Custom middleware
app.add_middleware(AuthMiddleware)
app.add_middleware(LoggingMiddleware)

# Health check endpoint
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "environment": os.getenv("ENVIRONMENT", "development"),
        "version": "1.0.0"
    }

@app.get("/")
async def root():
    return {
        "message": "AgileScribe API",
        "version": "1.0.0",
        "docs": "/docs" if os.getenv("ENVIRONMENT") != "production" else "Documentation disabled in production"
    }

# Include routers
app.include_router(auth_router, prefix="/api/auth", tags=["Authentication"])
app.include_router(stories_router, prefix="/api/stories", tags=["Stories"])
app.include_router(projects_router, prefix="/api/projects", tags=["Projects"])
app.include_router(epics_router, prefix="/api/epics", tags=["Epics"])
app.include_router(users_router, prefix="/api/users", tags=["Users"])
app.include_router(ai_router, prefix="/api/ai", tags=["AI Features"])

# Error handlers
@app.exception_handler(404)
async def not_found_handler(request, exc):
    return {"error": "Endpoint not found", "status_code": 404}

@app.exception_handler(500)
async def internal_error_handler(request, exc):
    logger.error(f"Internal server error: {exc}")
    return {"error": "Internal server error", "status_code": 500}

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=os.getenv("ENVIRONMENT") == "development"
    )
