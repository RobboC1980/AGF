from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from datetime import datetime
import logging
import uuid

try:
    from ..services.ai_service import get_basic_ai_service, AIResponse
    from ..database.supabase_client import get_supabase
    from ..auth.enhanced_auth import get_current_active_user, UserInDB
    from .story_mentions import handle_story_description_mentions
except ImportError:
    from services.ai_service import get_basic_ai_service, AIResponse
    from database.supabase_client import get_supabase
    from auth.enhanced_auth import get_current_active_user, UserInDB
    from api.story_mentions import handle_story_description_mentions

logger = logging.getLogger(__name__)
router = APIRouter()

# Request/Response Models
class StoryCreateRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    priority: str = Field(default="medium", pattern="^(low|medium|high|critical)$")
    status: str = Field(default="backlog", pattern="^(backlog|ready|in-progress|review|done)$")
    storyPoints: Optional[int] = Field(None, ge=1, le=100)
    epicId: Optional[str] = None
    assigneeId: Optional[str] = None
    tags: Optional[List[str]] = None
    acceptanceCriteria: Optional[List[str]] = None
    dueDate: Optional[str] = None

class StoryUpdateRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    priority: Optional[str] = Field(None, pattern="^(low|medium|high|critical)$")
    status: Optional[str] = Field(None, pattern="^(backlog|ready|in-progress|review|done)$")
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
    priority: Optional[str] = Field(default="medium", pattern="^(low|medium|high|critical)$")
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

# Fallback story generation when AI is not available
def generate_story_fallback(description: str, priority: str, include_acceptance_criteria: bool, include_tags: bool) -> Dict[str, Any]:
    """Generate a mock story when AI service is not available"""
    description_lower = description.lower()
    
    # Extract key concepts for title generation
    if "login" in description_lower or "sign in" in description_lower:
        title = "As a user, I want to log in to access my account"
    elif "register" in description_lower or "sign up" in description_lower:
        title = "As a user, I want to register for a new account"
    elif "search" in description_lower:
        title = "As a user, I want to search for items efficiently"
    elif "filter" in description_lower:
        title = "As a user, I want to filter results to find what I need"
    elif "dashboard" in description_lower:
        title = "As a user, I want to view a dashboard with key information"
    elif "profile" in description_lower:
        title = "As a user, I want to manage my profile information"
    else:
        # Generic title based on first few words
        words = description.split()[:10]
        title = f"As a user, I want to {' '.join(words).lower()}"
    
    # Generate acceptance criteria
    acceptance_criteria = []
    if include_acceptance_criteria:
        if "login" in description_lower:
            acceptance_criteria = [
                "Given valid credentials, when I submit the login form, then I should be authenticated",
                "Given invalid credentials, when I submit the login form, then I should see an error message",
                "Given I am logged in, when I click logout, then I should be signed out"
            ]
        elif "search" in description_lower:
            acceptance_criteria = [
                "Given search results exist, when I enter a query, then relevant results should be displayed",
                "Given no results match, when I search, then a 'no results' message should appear",
                "Given I clear the search, when I submit, then all items should be shown"
            ]
        else:
            acceptance_criteria = [
                "Given the feature is implemented, when I use it, then it should work as expected",
                "Given an error occurs, when I see it, then a helpful message should be displayed"
            ]
    
    # Generate tags
    tags = []
    if include_tags:
        if "login" in description_lower or "auth" in description_lower:
            tags = ["authentication", "security", "user-management"]
        elif "search" in description_lower or "filter" in description_lower:
            tags = ["search", "filtering", "user-experience"]
        elif "dashboard" in description_lower:
            tags = ["dashboard", "analytics", "reporting"]
        else:
            tags = ["feature", "user-story"]
    
    # Estimate story points
    story_points = 3  # Default
    if any(word in description_lower for word in ["complex", "integration", "multiple"]):
        story_points = 8
    elif any(word in description_lower for word in ["simple", "basic", "minor"]):
        story_points = 2
    
    return {
        "title": title,
        "description": description,
        "acceptance_criteria": acceptance_criteria,
        "tags": tags,
        "story_points": story_points,
        "confidence": 0.7,
        "improvement_suggestions": [
            "Consider adding more specific acceptance criteria",
            "Review story points based on team velocity"
        ]
    }

# Endpoints
@router.post("/generate", response_model=GeneratedStoryResponse)
async def generate_story(
    request: StoryGenerateRequest,
    current_user: UserInDB = Depends(get_current_active_user),
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
        
        # Try to use AI service
        ai_response = None
        generated_data = None
        
        try:
            # Get AI service instance
            ai_service = get_basic_ai_service()
            
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
            
            if ai_response.success:
                generated_data = ai_response.data
                # Try to parse if it's a string
                if isinstance(generated_data, str):
                    import json
                    try:
                        generated_data = json.loads(generated_data)
                    except:
                        logger.warning("Failed to parse AI response as JSON")
                        generated_data = None
        except Exception as e:
            logger.warning(f"AI service not available or failed: {str(e)}")
            # Fall back to mock generation
        
        # Use fallback if AI didn't work
        if not generated_data:
            logger.info("Using fallback story generation")
            generated_data = generate_story_fallback(
                request.description,
                request.priority,
                request.includeAcceptanceCriteria,
                request.includeTags
            )
            provider = "Fallback Generator"
            model = "rule-based-v1"
        else:
            provider = "OpenAI/Anthropic"
            model = ai_response.model_used if ai_response else "unknown"
        
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
            provider=provider,
            model=model,
            confidence=generated_data.get("confidence"),
            suggestions=generated_data.get("improvement_suggestions", [])
        )
        
    except Exception as e:
        logger.error(f"Story generation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/", response_model=StoryResponse)
async def create_story(
    request: StoryCreateRequest,
    current_user: UserInDB = Depends(get_current_active_user),
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

@router.get("/")
async def get_stories(
    supabase = Depends(get_supabase)
):
    """Get all user stories"""
    try:
        result = supabase.table("stories").select("*").execute()
        return {"success": True, "data": {"stories": result.data}}
    except Exception as e:
        logger.error(f"Failed to fetch stories: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch stories")

@router.get("/{story_id}", response_model=StoryResponse)
async def get_story(
    story_id: str,
    current_user: UserInDB = Depends(get_current_active_user),
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
    background_tasks: BackgroundTasks,
    current_user: UserInDB = Depends(get_current_active_user),
    supabase = Depends(get_supabase)
):
    """Update a user story (full update)"""
    try:
        # Get current story for @mention comparison
        current_story = supabase.table('stories').select('description').eq('id', story_id).single().execute()
        if not current_story.data:
            raise HTTPException(status_code=404, detail="Story not found")
            
        old_description = current_story.data.get('description', '')
        new_description = request.description or ''
        
        # Update story in database
        result = supabase.table('stories').update({
            'name': request.name,
            'description': request.description,
            'priority': request.priority,
            'status': request.status,
            'story_points': request.storyPoints,
            'epic_id': request.epicId,
            'assignee_id': request.assigneeId,
            'tags': request.tags,
            'acceptance_criteria': '\n'.join(request.acceptanceCriteria) if request.acceptanceCriteria else None,
            'due_date': request.dueDate,
            'updated_at': datetime.utcnow().isoformat()
        }).eq('id', story_id).execute()

        if not result.data:
            raise HTTPException(status_code=404, detail="Story not found")

        # Process @mentions in background
        if new_description != old_description:
            background_tasks.add_task(
                handle_story_description_mentions,
                story_id,
                new_description,
                old_description,
                current_user.id
            )

        return result.data[0]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating story {story_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to update story: {str(e)}")

@router.patch("/{story_id}", response_model=StoryResponse)
async def patch_story(
    story_id: str,
    request: StoryUpdateRequest,
    background_tasks: BackgroundTasks,
    current_user: UserInDB = Depends(get_current_active_user),
    supabase = Depends(get_supabase)
):
    """Partially update a user story (only provided fields)"""
    try:
        # Get current story for @mention comparison if description is being updated
        old_description = ''
        if request.description is not None:
            current_story = supabase.table('stories').select('description').eq('id', story_id).single().execute()
            if not current_story.data:
                raise HTTPException(status_code=404, detail="Story not found")
            old_description = current_story.data.get('description', '')
        
        # Build update dict with only provided fields
        update_data = {}
        if request.name is not None:
            update_data['name'] = request.name
        if request.description is not None:
            update_data['description'] = request.description
        if request.priority is not None:
            update_data['priority'] = request.priority
        if request.status is not None:
            update_data['status'] = request.status
        if request.storyPoints is not None:
            update_data['story_points'] = request.storyPoints
        if request.epicId is not None:
            update_data['epic_id'] = request.epicId
        if request.assigneeId is not None:
            update_data['assignee_id'] = request.assigneeId
        if request.tags is not None:
            update_data['tags'] = request.tags
        if request.acceptanceCriteria is not None:
            update_data['acceptance_criteria'] = '\n'.join(request.acceptanceCriteria) if request.acceptanceCriteria else None
        if request.dueDate is not None:
            update_data['due_date'] = request.dueDate
        
        # Always update the timestamp
        update_data['updated_at'] = datetime.utcnow().isoformat()
        
        # Update story in database
        result = supabase.table('stories').update(update_data).eq('id', story_id).execute()

        if not result.data:
            raise HTTPException(status_code=404, detail="Story not found")

        # Process @mentions in background if description changed
        if request.description is not None and request.description != old_description:
            background_tasks.add_task(
                handle_story_description_mentions,
                story_id,
                request.description,
                old_description,
                current_user.id
            )

        return result.data[0]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error patching story {story_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to patch story: {str(e)}")

@router.delete("/{story_id}")
async def delete_story(
    story_id: str,
    current_user: UserInDB = Depends(get_current_active_user),
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