#!/usr/bin/env python3
"""
Simplified AgileForge Backend
Minimal FastAPI server for testing connectivity
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import os
import sys
from datetime import datetime

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

app = FastAPI(
    title="AgileForge API - Simple",
    description="Simplified AgileForge API for testing",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3002",
        "http://localhost:3003",
        "http://localhost:3004",
        "http://localhost:3005",
        "http://127.0.0.1:3000",
        "https://v0-agile-forge-40higfdur-clariq.vercel.app",
        "https://*.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["*"],
)

# Sample data
SAMPLE_STORIES = [
    {
        "id": "story-1",
        "name": "User Authentication System",
        "description": "Implement secure user login and registration",
        "status": "in-progress",
        "priority": "high",
        "assignee": {"id": "user-1", "name": "John Doe", "avatar": "https://api.dicebear.com/7.x/initials/svg?seed=John%20Doe"},
        "epic": {"id": "epic-1", "name": "User Management", "color": "#3B82F6", "project": {"id": "project-1", "name": "AgileForge Platform"}},
        "tags": ["authentication", "security"],
        "stats": {"totalTasks": 8, "completedTasks": 5, "completionPercentage": 62.5, "comments": 12, "attachments": 3},
        "createdAt": "2024-01-15T10:00:00Z",
        "updatedAt": "2024-01-20T14:30:00Z"
    },
    {
        "id": "story-2", 
        "name": "Dashboard Analytics",
        "description": "Create comprehensive analytics dashboard",
        "status": "ready",
        "priority": "medium",
        "assignee": {"id": "user-2", "name": "Jane Smith", "avatar": "https://api.dicebear.com/7.x/initials/svg?seed=Jane%20Smith"},
        "epic": {"id": "epic-2", "name": "Analytics Platform", "color": "#10B981", "project": {"id": "project-1", "name": "AgileForge Platform"}},
        "tags": ["analytics", "dashboard"],
        "stats": {"totalTasks": 12, "completedTasks": 3, "completionPercentage": 25, "comments": 8, "attachments": 1},
        "createdAt": "2024-01-16T09:00:00Z",
        "updatedAt": "2024-01-21T11:15:00Z"
    },
    {
        "id": "story-3",
        "name": "Mobile Responsive Design",
        "description": "Ensure all pages work perfectly on mobile devices",
        "status": "done",
        "priority": "high",
        "assignee": {"id": "user-3", "name": "Mike Johnson", "avatar": "https://api.dicebear.com/7.x/initials/svg?seed=Mike%20Johnson"},
        "epic": {"id": "epic-3", "name": "User Experience", "color": "#8B5CF6", "project": {"id": "project-1", "name": "AgileForge Platform"}},
        "tags": ["mobile", "responsive", "ui"],
        "stats": {"totalTasks": 15, "completedTasks": 15, "completionPercentage": 100, "comments": 20, "attachments": 5},
        "createdAt": "2024-01-10T08:00:00Z",
        "updatedAt": "2024-01-25T16:45:00Z"
    }
]

SAMPLE_EPICS = [
    {
        "id": "epic-1",
        "name": "User Management",
        "description": "Complete user management system with authentication and profiles",
        "status": "in-progress",
        "priority": "high",
        "color": "#3B82F6",
        "project": {"id": "project-1", "name": "AgileForge Platform"},
        "progress": 65,
        "created_at": "2024-01-01T00:00:00Z",
        "updated_at": "2024-01-20T00:00:00Z"
    },
    {
        "id": "epic-2",
        "name": "Analytics Platform",
        "description": "Advanced analytics and reporting capabilities",
        "status": "ready",
        "priority": "medium",
        "color": "#10B981",
        "project": {"id": "project-1", "name": "AgileForge Platform"},
        "progress": 30,
        "created_at": "2024-01-05T00:00:00Z",
        "updated_at": "2024-01-18T00:00:00Z"
    }
]

SAMPLE_USERS = [
    {
        "id": "user-1",
        "name": "John Doe",
        "email": "john@example.com",
        "avatar_url": "https://api.dicebear.com/7.x/initials/svg?seed=John%20Doe",
        "is_active": True,
        "created_at": "2024-01-01T00:00:00Z"
    },
    {
        "id": "user-2",
        "name": "Jane Smith", 
        "email": "jane@example.com",
        "avatar_url": "https://api.dicebear.com/7.x/initials/svg?seed=Jane%20Smith",
        "is_active": True,
        "created_at": "2024-01-02T00:00:00Z"
    },
    {
        "id": "user-3",
        "name": "Mike Johnson",
        "email": "mike@example.com", 
        "avatar_url": "https://api.dicebear.com/7.x/initials/svg?seed=Mike%20Johnson",
        "is_active": True,
        "created_at": "2024-01-03T00:00:00Z"
    }
]

# Health check endpoint
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "environment": os.getenv("ENVIRONMENT", "development"),
        "version": "1.0.0-simple",
        "timestamp": datetime.now().isoformat(),
        "features": {
            "stories": True,
            "epics": True,
            "users": True,
            "analytics": True
        }
    }

@app.get("/")
async def root():
    return {
        "message": "AgileForge API - Simple Version",
        "version": "1.0.0-simple",
        "docs": "/docs",
        "health": "/health"
    }

# Stories endpoints
@app.get("/api/stories")
async def get_stories():
    return {
        "success": True,
        "data": {"stories": SAMPLE_STORIES}
    }

@app.get("/api/stories/{story_id}")
async def get_story(story_id: str):
    story = next((s for s in SAMPLE_STORIES if s["id"] == story_id), None)
    if not story:
        return JSONResponse(status_code=404, content={"error": "Story not found"})
    return {
        "success": True,
        "data": story
    }

# Epics endpoints
@app.get("/api/epics")
async def get_epics():
    return {
        "success": True,
        "data": {"epics": SAMPLE_EPICS}
    }

# Users endpoints
@app.get("/api/users")
async def get_users():
    return {
        "success": True,
        "data": {"users": SAMPLE_USERS}
    }

# Analytics endpoint
@app.get("/api/analytics")
async def get_analytics():
    return {
        "success": True,
        "data": {
            "total_stories": len(SAMPLE_STORIES),
            "completed_stories": len([s for s in SAMPLE_STORIES if s["status"] == "done"]),
            "in_progress_stories": len([s for s in SAMPLE_STORIES if s["status"] == "in-progress"]),
            "total_epics": len(SAMPLE_EPICS),
            "completion_rate": round(len([s for s in SAMPLE_STORIES if s["status"] == "done"]) / len(SAMPLE_STORIES) * 100, 1)
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 