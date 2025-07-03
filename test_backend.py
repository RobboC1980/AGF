#!/usr/bin/env python3
"""
Test backend for AgileForge with authentication
"""

from fastapi import FastAPI, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import uvicorn
import os
import sys
import logging
from datetime import datetime
from typing import Optional, Dict, Any

# Add backend to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

# Import our authentication system
try:
    from backend.auth.unified_auth import get_current_user, get_current_user_optional, UnifiedUser
except ImportError:
    # Fallback for direct execution
    sys.path.insert(0, 'backend')
    from auth.unified_auth import get_current_user, get_current_user_optional, UnifiedUser

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="AgileForge API - Test with Auth",
    description="AI-Powered Agile Project Management Platform with Authentication",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins in development
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"]
)

# Health check endpoint
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "environment": os.getenv("ENVIRONMENT", "development"),
        "version": "1.0.0",
        "timestamp": datetime.utcnow().isoformat(),
        "message": "AgileForge Test Backend with Auth is running",
        "features": {
            "unified_auth": True,
            "clerk_integration": True,
            "supabase_integration": True
        }
    }

@app.get("/")
async def root():
    return {
        "message": "AgileForge API - Test Backend with Authentication",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs",
        "health": "/health",
        "auth_endpoints": [
            "/api/auth/me",
            "/api/auth/status"
        ]
    }

# Authentication endpoints
@app.get("/api/auth/me")
async def get_current_user_info(current_user: UnifiedUser = Depends(get_current_user)):
    """Get current user information using unified auth"""
    return {
        "id": current_user.id,
        "email": current_user.email,
        "name": current_user.name,
        "first_name": current_user.first_name,
        "last_name": current_user.last_name,
        "image_url": current_user.image_url,
        "auth_provider": current_user.auth_provider,
        "is_active": current_user.is_active
    }

@app.get("/api/auth/status")
async def auth_status():
    """Authentication system status"""
    return {
        "status": "active",
        "auth_providers": ["clerk", "supabase"],
        "development_mode": os.getenv("ENVIRONMENT", "development") == "development",
        "features": {
            "jwt_verification": True,
            "jwks_validation": True,
            "dev_tokens": True,
            "unified_auth": True
        }
    }

# Protected analytics endpoint
@app.get("/api/analytics/overview")
async def get_analytics_overview(current_user: UnifiedUser = Depends(get_current_user)):
    """Get analytics overview with authentication"""
    return {
        "user_id": current_user.id,
        "total_stories": 0,
        "completed_stories": 0,
        "in_progress_stories": 0,
        "completion_rate": 0.0,
        "message": f"Analytics for user {current_user.name}",
        "timestamp": datetime.utcnow().isoformat()
    }

# AI endpoints
@app.post("/api/ai/generate-project")
async def generate_project(request: Request, current_user: UnifiedUser = Depends(get_current_user)):
    """AI project generation with authentication"""
    try:
        body = await request.json()
        project_name = body.get("name", "Sample Project")
        
        return {
            "success": True,
            "message": "Project generated successfully",
            "user_id": current_user.id,
            "project": {
                "name": project_name,
                "description": f"AI-generated project: {project_name} for {current_user.name}",
                "status": "active",
                "created_by": current_user.id,
                "created_at": datetime.utcnow().isoformat()
            }
        }
    except Exception as e:
        logger.error(f"Error generating project: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/ai/status")
async def ai_status():
    """AI service status endpoint"""
    return {
        "status": "available",
        "provider": os.getenv("AI_PROVIDER", "openai"),
        "services": {
            "project_generation": "active",
            "story_generation": "active",
            "task_analysis": "active"
        },
        "message": "AI services are operational"
    }

# Basic project endpoints with auth
@app.get("/api/projects")
async def get_projects(current_user: UnifiedUser = Depends(get_current_user)):
    """Get all projects for the authenticated user"""
    return {
        "projects": [
            {
                "id": "1",
                "name": "Sample Project 1",
                "description": "A sample project for testing",
                "status": "active",
                "owner_id": current_user.id,
                "created_at": datetime.utcnow().isoformat()
            },
            {
                "id": "2", 
                "name": "Sample Project 2",
                "description": "Another sample project",
                "status": "active",
                "owner_id": current_user.id,
                "created_at": datetime.utcnow().isoformat()
            }
        ],
        "total": 2,
        "user_id": current_user.id
    }

@app.post("/api/projects")
async def create_project(request: Request, current_user: UnifiedUser = Depends(get_current_user)):
    """Create a new project for the authenticated user"""
    try:
        body = await request.json()
        project_name = body.get("name", "New Project")
        project_description = body.get("description", "")
        
        return {
            "success": True,
            "project": {
                "id": "new-project-id",
                "name": project_name,
                "description": project_description,
                "status": "active",
                "owner_id": current_user.id,
                "created_by": current_user.id,
                "created_at": datetime.utcnow().isoformat()
            }
        }
    except Exception as e:
        logger.error(f"Error creating project: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Test endpoint for optional auth
@app.get("/api/public/info")
async def public_info(current_user: Optional[UnifiedUser] = Depends(get_current_user_optional)):
    """Public endpoint that works with or without authentication"""
    if current_user:
        return {
            "message": f"Hello {current_user.name}! This is a public endpoint.",
            "authenticated": True,
            "user_id": current_user.id
        }
    else:
        return {
            "message": "Hello anonymous user! This is a public endpoint.",
            "authenticated": False
        }

# Error handlers
@app.exception_handler(404)
async def not_found_handler(request, exc):
    return JSONResponse(
        status_code=404,
        content={
            "error": "Endpoint not found",
            "status_code": 404,
            "path": request.url.path,
            "timestamp": datetime.utcnow().isoformat(),
            "available_endpoints": [
                "/health",
                "/api/auth/me",
                "/api/auth/status",
                "/api/analytics/overview",
                "/api/ai/status",
                "/api/projects"
            ]
        }
    )

@app.exception_handler(401)
async def unauthorized_handler(request, exc):
    return JSONResponse(
        status_code=401,
        content={
            "error": "Authentication required",
            "status_code": 401,
            "detail": "Please provide a valid authentication token",
            "timestamp": datetime.utcnow().isoformat(),
            "help": "Use 'Bearer dev-token' for development testing"
        }
    )

@app.exception_handler(500)
async def internal_error_handler(request, exc):
    logger.error(f"Internal server error: {exc}")
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "status_code": 500,
            "timestamp": datetime.utcnow().isoformat()
        }
    )

if __name__ == "__main__":
    print("🧪 Starting AgileForge Test Backend with Authentication...")
    print("📍 Server will be available at: http://localhost:8000")
    print("📖 API Documentation: http://localhost:8000/docs")
    print("❤️  Health Check: http://localhost:8000/health")
    print("🔐 Auth Test: curl -H 'Authorization: Bearer dev-token' http://localhost:8000/api/auth/me")
    
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        log_level="info",
        reload=False
    ) 