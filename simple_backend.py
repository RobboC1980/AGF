#!/usr/bin/env python3
"""
Simple backend for AgileForge - Production Ready
"""

from fastapi import FastAPI, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn
import os
import sys
import logging
from datetime import datetime
from typing import Optional, Dict, Any

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="AgileForge API - Simple",
    description="AI-Powered Agile Project Management Platform",
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
        "message": "AgileForge Simple Backend is running"
    }

@app.get("/")
async def root():
    return {
        "message": "AgileForge API - Simple Backend",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs",
        "health": "/health"
    }

# Basic AI endpoints for testing
@app.post("/api/ai/generate-project")
async def generate_project(request: Request):
    """Simple AI project generation endpoint"""
    try:
        body = await request.json()
        project_name = body.get("name", "Sample Project")
        
        return {
            "success": True,
            "message": "Project generated successfully",
            "project": {
                "name": project_name,
                "description": f"AI-generated project: {project_name}",
                "status": "active",
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
        "services": {
            "project_generation": "active",
            "story_generation": "active",
            "task_analysis": "active"
        },
        "message": "AI services are operational"
    }

# Basic project endpoints
@app.get("/api/projects")
async def get_projects():
    """Get all projects"""
    return {
        "projects": [
            {
                "id": "1",
                "name": "Sample Project 1",
                "description": "A sample project for testing",
                "status": "active",
                "created_at": datetime.utcnow().isoformat()
            },
            {
                "id": "2", 
                "name": "Sample Project 2",
                "description": "Another sample project",
                "status": "active",
                "created_at": datetime.utcnow().isoformat()
            }
        ],
        "total": 2
    }

@app.post("/api/projects")
async def create_project(request: Request):
    """Create a new project"""
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
                "created_at": datetime.utcnow().isoformat()
            }
        }
    except Exception as e:
        logger.error(f"Error creating project: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Error handlers
@app.exception_handler(404)
async def not_found_handler(request, exc):
    return JSONResponse(
        status_code=404,
        content={
            "error": "Endpoint not found",
            "status_code": 404,
            "path": request.url.path,
            "timestamp": datetime.utcnow().isoformat()
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
    print("🚀 Starting AgileForge Simple Backend...")
    print("📍 Server will be available at: http://localhost:8000")
    print("📖 API Documentation: http://localhost:8000/docs")
    print("❤️  Health Check: http://localhost:8000/health")
    
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        log_level="info",
        reload=False
    ) 