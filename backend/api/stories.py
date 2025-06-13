from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from datetime import datetime
import logging
import uuid

from ..services.ai_service import ai_service
from ..database.supabase_client import get_supabase
from ..auth.dependencies import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter()

# Request/Response Models
class StoryCreateRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    priority: str = Field(default="medium", regex="^(low|medium|high|critical)$")
    status: str = Field(default="backlog", regex="^(backlog|ready|in-progress|review|done)$")
    storyPoints: Optional[int] = Field(None, ge=1, le=100)
    epicId: Optional[str] = None
    assigneeId: Optional[str] = None
    tags: Optional[List[str]] = None
    acceptanceCriteria: Optional[List[str]] = None
    dueDate: Optional[str] = None

class StoryGenerateRequest(BaseModel):
    description: str = Field(..., min_length=10, max_length=1000)
    epicId: Optional[str] = None
    projectId: Optional[str] = None
    priority: Optional[str] = Field(default="medium", regex="^(low|medium|high|critical)$")
    includeAcceptanceCriteria: bool = True
    includeTags: bool = True

class StoryResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    priority: str
    status: str
    storyPoints: Optional[int]
    epicId: Optional[str]
    assigneeId: Optional[str]
    tags: Optional[List[str]]
    acceptanceCriteria: Optional[List[str]]
    createdAt: datetime
    updatedAt: datetime
    dueDate: Optional[str]

class GeneratedStoryResponse(BaseModel):
    success: bool
    story: Dict[str, Any]
    provider: str
    model: str
    confidence: Optional[float]
    suggestions: Optional[List[str]]

# Endpoints
@router.post("/generate", response_model=GeneratedStoryResponse)
async def generate_story(
    request: StoryGenerateRequest,
    current_user = Depends(get_current_user),
    supabase = Depends(get_supabase)
):
    """Generate a user story using AI based on description"""
    try:
        # Prepare context for AI
        epic_context = ""
        project_context = ""
        
        if request.epicId:
            # In a real implementation, fetch epic details from database
            epic_context = f"Epic ID: {request.epicId}"
        
        if request.projectId:
            # In a real implementation, fetch project details from database
            project_context = f"Project ID: {request.projectId}"
        
        # Create AI prompt variables
        variables = {
            "user_description": request.description,
            "priority_level": request.priority,
            "epic_context": epic_context,
            "project_context": project_context,
            "include_acceptance_criteria": request.includeAcceptanceCriteria,
            "include_tags": request.includeTags
        }
        
        # Generate story using AI service
        ai_response = await ai_service.generate_completion("story_generator", variables)
        
        if not ai_response.success:
            raise HTTPException(status_code=500, detail=f"AI generation failed: {ai_response.error}")
        
        # Parse AI response
        generated_data = ai_response.data
        
        # Format the response
        story_data = {
            "name": generated_data.get("title", "Generated User Story"),
            "description": generated_data.get("description", request.description),
            "priority": request.priority,
            "status": "backlog",
            "acceptanceCriteria": generated_data.get("acceptance_criteria", []) if request.includeAcceptanceCriteria else [],
            "tags": generated_data.get("tags", []) if request.includeTags else [],
            "storyPoints": generated_data.get("story_points"),
            "epicId": request.epicId,
            "assigneeId": None
        }
        
        return GeneratedStoryResponse(
            success=True,
            story=story_data,
            provider="OpenAI/Anthropic",
            model=ai_response.model_used or "unknown",
            confidence=generated_data.get("confidence"),
            suggestions=generated_data.get("improvement_suggestions", [])
        )
        
    except Exception as e:
        logger.error(f"Story generation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/", response_model=StoryResponse)
async def create_story(
    request: StoryCreateRequest,
    current_user = Depends(get_current_user),
    supabase = Depends(get_supabase)
):
    """Create a new user story"""
    try:
        story_id = str(uuid.uuid4())
        now = datetime.utcnow()
        
        # In a real implementation, save to database
        # For now, return a mock response
        return StoryResponse(
            id=story_id,
            name=request.name,
            description=request.description,
            priority=request.priority,
            status=request.status,
            storyPoints=request.storyPoints,
            epicId=request.epicId,
            assigneeId=request.assigneeId,
            tags=request.tags or [],
            acceptanceCriteria=request.acceptanceCriteria or [],
            createdAt=now,
            updatedAt=now,
            dueDate=request.dueDate
        )
        
    except Exception as e:
        logger.error(f"Story creation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/", response_model=List[StoryResponse])
async def get_stories(
    current_user = Depends(get_current_user),
    supabase = Depends(get_supabase)
):
    """Get all user stories"""
    try:
        # In a real implementation, fetch from database
        # For now, return mock data
        return []
        
    except Exception as e:
        logger.error(f"Failed to fetch stories: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{story_id}", response_model=StoryResponse)
async def get_story(
    story_id: str,
    current_user = Depends(get_current_user),
    supabase = Depends(get_supabase)
):
    """Get a specific user story"""
    try:
        # In a real implementation, fetch from database
        # For now, return mock data or 404
        raise HTTPException(status_code=404, detail="Story not found")
        
    except Exception as e:
        logger.error(f"Failed to fetch story {story_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{story_id}", response_model=StoryResponse)
async def update_story(
    story_id: str,
    request: StoryCreateRequest,
    current_user = Depends(get_current_user),
    supabase = Depends(get_supabase)
):
    """Update a user story"""
    try:
        # In a real implementation, update in database
        # For now, return mock data or 404
        raise HTTPException(status_code=404, detail="Story not found")
        
    except Exception as e:
        logger.error(f"Failed to update story {story_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{story_id}")
async def delete_story(
    story_id: str,
    current_user = Depends(get_current_user),
    supabase = Depends(get_supabase)
):
    """Delete a user story"""
    try:
        # In a real implementation, delete from database
        # For now, return success or 404
        return {"success": True, "message": "Story deleted successfully"}
        
    except Exception as e:
        logger.error(f"Failed to delete story {story_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e)) 