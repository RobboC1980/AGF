#!/usr/bin/env python3
"""
Simple AgileForge Backend
A minimal version to get the system running without complex dependencies
"""

import os
import logging
from datetime import datetime
from typing import Dict, Any

import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="AgileForge API",
    description="Simple Project Management API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Supabase client
from backend.database.supabase_client import init_supabase, get_supabase

@app.on_event("startup")
async def startup_event():
    """Initialize services on startup"""
    try:
        logger.info("Starting AgileForge API...")
        
        # Initialize Supabase
        init_supabase()
        
        # Test database connection
        supabase = get_supabase()
        result = supabase.table("users").select("count").limit(1).execute()
        logger.info("Database connection successful")
        
    except Exception as e:
        logger.error(f"Startup error: {e}")
        raise

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    logger.info("Shutting down AgileForge API...")

# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "version": "1.0.0"
    }

# Basic API endpoints
@app.get("/api/projects")
async def get_projects():
    """Get all projects"""
    try:
        supabase = get_supabase()
        result = supabase.table("projects").select("*").execute()
        return {"projects": result.data}
    except Exception as e:
        logger.error(f"Error fetching projects: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch projects")

@app.get("/api/users")
async def get_users():
    """Get all users"""
    try:
        supabase = get_supabase()
        result = supabase.table("users").select("*").execute()
        return {"users": result.data}
    except Exception as e:
        logger.error(f"Error fetching users: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch users")

@app.get("/api/stories")
async def get_stories():
    """Get all stories"""
    try:
        supabase = get_supabase()
        result = supabase.table("stories").select("*").execute()
        return {"stories": result.data}
    except Exception as e:
        logger.error(f"Error fetching stories: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch stories")

@app.get("/api/epics")
async def get_epics():
    """Get all epics"""
    try:
        supabase = get_supabase()
        result = supabase.table("epics").select("*").execute()
        return {"epics": result.data}
    except Exception as e:
        logger.error(f"Error fetching epics: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch epics")

if __name__ == "__main__":
    # Get port from environment or default to 8000
    port = int(os.getenv("PORT", 8000))
    
    # Run the server
    uvicorn.run(
        "simple_backend:app",
        host="0.0.0.0",
        port=port,
        reload=True,
        log_level="info"
    ) 