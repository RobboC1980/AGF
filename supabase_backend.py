from fastapi import FastAPI, Depends, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
import os
import logging
import json
import httpx
from dotenv import load_dotenv
from typing import Dict, Any, List, Optional
from contextlib import asynccontextmanager
from pydantic import BaseModel, Field, UUID4
from uuid import uuid4
from auth_middleware import SupabaseAuthMiddleware
from backend.api.auth import router as auth_router

# Load environment variables
load_dotenv(dotenv_path='.env')

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Supabase configuration
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    raise ValueError("Missing Supabase environment variables. Please set SUPABASE_URL and SUPABASE_SERVICE_KEY")

# Create FastAPI app
app = FastAPI(
    title="AgileForge API",
    description="Supabase-powered API Server",
    version="1.0.0",
)

# CORS configuration
allowed_origins = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"]
)

# Add Supabase Auth middleware
app.add_middleware(
    SupabaseAuthMiddleware,
    public_routes=[
        "/",
        "/health",
        "/docs",
        "/openapi.json",
        "/redoc",
        "/api"  # All API endpoints are currently public for simplicity
    ]
)

# Insert (after CORS middleware and before health endpoint) the following line to include the auth router:
app.include_router(auth_router, prefix="/api/auth")

# Pydantic models for request validation
class ProjectBase(BaseModel):
    name: str
    description: Optional[str] = None
    status: Optional[str] = 'active'

class ProjectCreate(ProjectBase):
    pass

class ProjectUpdate(ProjectBase):
    name: Optional[str] = None
    status: Optional[str] = None

class StoryBase(BaseModel):
    name: str
    description: Optional[str] = None
    acceptance_criteria: Optional[str] = None
    story_points: Optional[int] = None
    priority: Optional[str] = 'medium'
    status: Optional[str] = 'backlog'
    epic_id: UUID4
    assignee_id: Optional[UUID4] = None
    tags: Optional[List[str]] = None
    due_date: Optional[str] = None

class StoryCreate(StoryBase):
    pass

class StoryUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    acceptance_criteria: Optional[str] = None
    story_points: Optional[int] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    epic_id: Optional[UUID4] = None
    assignee_id: Optional[UUID4] = None
    tags: Optional[List[str]] = None
    due_date: Optional[str] = None

class SupabaseClient:
    """Client for interacting with Supabase PostgreSQL REST API"""
    
    def __init__(self, url: str, key: str, service_role_key: str = None):
        self.url = url
        self.key = key
        self.service_role_key = service_role_key
        self.rest_url = f"{url}/rest/v1"
        self.auth_url = f"{url}/auth/v1"
        
    async def _request(self, method: str, endpoint: str, data: Any = None, 
                       params: Dict = None, use_service_role: bool = False,
                       user_token: str = None) -> Dict:
        """Make HTTP request to Supabase"""
        headers = {
            "apikey": self.service_role_key if use_service_role else self.key,
            "Content-Type": "application/json",
            "Prefer": "return=representation"
        }
        
        if use_service_role:
            headers["Authorization"] = f"Bearer {self.service_role_key}"
        elif user_token:
            headers["Authorization"] = f"Bearer {user_token}"
            
        url = f"{self.rest_url}/{endpoint}"
        
        async with httpx.AsyncClient() as client:
            response = await client.request(
                method, 
                url,
                headers=headers,
                json=data,
                params=params
            )
            
            if response.status_code >= 400:
                logger.error(f"Supabase Error: {response.text}")
                raise HTTPException(status_code=response.status_code, detail=response.text)
                
            try:
                return response.json()
            except json.JSONDecodeError:
                return {"status": "success"}
    
    # Projects methods
    async def get_projects(self) -> List[Dict]:
        """Get all projects"""
        return await self._request("GET", "projects", use_service_role=True)
    
    async def get_project(self, project_id: str) -> Dict:
        """Get a specific project by ID"""
        params = {"id": f"eq.{project_id}"}
        result = await self._request("GET", "projects", params=params, use_service_role=True)
        if not result:
            raise HTTPException(status_code=404, detail="Project not found")
        return result[0]
    
    async def create_project(self, project_data: Dict) -> Dict:
        """Create a new project"""
        result = await self._request("POST", "projects", data=project_data, use_service_role=True)
        return result[0] if isinstance(result, list) else result
    
    async def update_project(self, project_id: str, project_data: Dict) -> Dict:
        """Update an existing project"""
        params = {"id": f"eq.{project_id}"}
        result = await self._request("PATCH", "projects", data=project_data, params=params, use_service_role=True)
        if not result:
            raise HTTPException(status_code=404, detail="Project not found or not updated")
        return result[0] if isinstance(result, list) else result
    
    async def delete_project(self, project_id: str) -> Dict:
        """Delete a project"""
        params = {"id": f"eq.{project_id}"}
        await self._request("DELETE", "projects", params=params, use_service_role=True)
        return {"status": "success", "message": "Project deleted"}
    
    # Stories methods
    async def get_stories(self, epic_id: str = None) -> List[Dict]:
        """Get all stories, optionally filtered by epic_id"""
        params = {"epic_id": f"eq.{epic_id}"} if epic_id else None
        return await self._request("GET", "stories", params=params, use_service_role=True)
    
    async def get_story(self, story_id: str) -> Dict:
        """Get a specific story by ID"""
        params = {"id": f"eq.{story_id}"}
        result = await self._request("GET", "stories", params=params, use_service_role=True)
        if not result:
            raise HTTPException(status_code=404, detail="Story not found")
        return result[0]
    
    async def create_story(self, story_data: Dict) -> Dict:
        """Create a new story"""
        result = await self._request("POST", "stories", data=story_data, use_service_role=True)
        return result[0] if isinstance(result, list) else result
    
    async def update_story(self, story_id: str, story_data: Dict) -> Dict:
        """Update an existing story"""
        params = {"id": f"eq.{story_id}"}
        result = await self._request("PATCH", "stories", data=story_data, params=params, use_service_role=True)
        if not result:
            raise HTTPException(status_code=404, detail="Story not found or not updated")
        return result[0] if isinstance(result, list) else result
    
    async def delete_story(self, story_id: str) -> Dict:
        """Delete a story"""
        params = {"id": f"eq.{story_id}"}
        await self._request("DELETE", "stories", params=params, use_service_role=True)
        return {"status": "success", "message": "Story deleted"}
    
    # Epics methods
    async def get_epics(self, project_id: str = None) -> List[Dict]:
        """Get all epics, optionally filtered by project_id"""
        params = {"project_id": f"eq.{project_id}"} if project_id else None
        return await self._request("GET", "epics", params=params, use_service_role=True)
    
    async def get_epic(self, epic_id: str) -> Dict:
        """Get a specific epic by ID"""
        params = {"id": f"eq.{epic_id}"}
        result = await self._request("GET", "epics", params=params, use_service_role=True)
        if not result:
            raise HTTPException(status_code=404, detail="Epic not found")
        return result[0]
    
    # Users methods
    async def get_users(self) -> List[Dict]:
        """Get all user profiles"""
        return await self._request("GET", "profiles", use_service_role=True)
    
    async def get_user(self, user_id: str) -> Dict:
        """Get a specific user profile by ID"""
        params = {"id": f"eq.{user_id}"}
        result = await self._request("GET", "profiles", params=params, use_service_role=True)
        if not result:
            raise HTTPException(status_code=404, detail="User not found")
        return result[0]

# Create Supabase client instance
supabase = SupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_KEY)

# Health check endpoint
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "environment": "development",
        "version": "1.0.0",
        "database": "supabase"
    }

@app.get("/")
async def root():
    return {
        "message": "AgileForge API - Supabase-powered Development Server",
        "version": "1.0.0",
        "docs": "/docs"
    }

# Project endpoints
@app.get("/api/projects")
async def get_projects():
    try:
        projects = await supabase.get_projects()
        return {"projects": projects}
    except Exception as e:
        logger.error(f"Error fetching projects: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/projects/{project_id}")
async def get_project(project_id: str):
    try:
        project = await supabase.get_project(project_id)
        return project
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching project: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/projects")
async def create_project(project: ProjectCreate = Body(...)):
    try:
        project_data = project.model_dump()
        # Set created_by to first user for demo purposes
        # In a real app, this would come from the authenticated user
        users = await supabase.get_users()
        if users:
            project_data["created_by"] = users[0]["id"]
        
        result = await supabase.create_project(project_data)
        return result
    except Exception as e:
        logger.error(f"Error creating project: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/projects/{project_id}")
async def update_project(project_id: str, project: ProjectUpdate = Body(...)):
    try:
        project_data = {k: v for k, v in project.model_dump().items() if v is not None}
        result = await supabase.update_project(project_id, project_data)
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating project: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/projects/{project_id}")
async def delete_project(project_id: str):
    try:
        result = await supabase.delete_project(project_id)
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting project: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Story endpoints
@app.get("/api/stories")
async def get_stories(epic_id: str = None):
    try:
        stories = await supabase.get_stories(epic_id)
        return {"stories": stories}
    except Exception as e:
        logger.error(f"Error fetching stories: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/stories/{story_id}")
async def get_story(story_id: str):
    try:
        story = await supabase.get_story(story_id)
        return story
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching story: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/stories")
async def create_story(story: StoryCreate = Body(...)):
    try:
        story_data = story.model_dump()
        result = await supabase.create_story(story_data)
        return result
    except Exception as e:
        logger.error(f"Error creating story: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/stories/{story_id}")
async def update_story(story_id: str, story: StoryUpdate = Body(...)):
    try:
        story_data = {k: v for k, v in story.model_dump().items() if v is not None}
        result = await supabase.update_story(story_id, story_data)
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating story: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/stories/{story_id}")
async def delete_story(story_id: str):
    try:
        result = await supabase.delete_story(story_id)
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting story: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Epic endpoints
@app.get("/api/epics")
async def get_epics(project_id: str = None):
    try:
        epics = await supabase.get_epics(project_id)
        return {"epics": epics}
    except Exception as e:
        logger.error(f"Error fetching epics: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/epics/{epic_id}")
async def get_epic(epic_id: str):
    try:
        epic = await supabase.get_epic(epic_id)
        return epic
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching epic: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# User endpoints
@app.get("/api/users")
async def get_users():
    try:
        users = await supabase.get_users()
        return {"users": users}
    except Exception as e:
        logger.error(f"Error fetching users: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/users/{user_id}")
async def get_user(user_id: str):
    try:
        user = await supabase.get_user(user_id)
        return user
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching user: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(
        "supabase_backend:app",
        host="0.0.0.0",
        port=port,
        reload=True
    ) 