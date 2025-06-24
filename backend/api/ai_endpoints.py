from __future__ import annotations

from fastapi import APIRouter, HTTPException, Depends
from typing import List, Dict, Any, Optional
import logging
from pydantic import BaseModel
from ..auth.enhanced_auth import get_current_active_user
from .auth import get_current_user_supabase

logger = logging.getLogger(__name__)
router = APIRouter(tags=["AI Features"])

class StoryGenerateRequest(BaseModel):
    description: str
    epic_id: Optional[str] = None
    project_id: Optional[str] = None
    priority: Optional[str] = "medium"

class TaskGenerateRequest(BaseModel):
    story_title: str
    story_description: str
    story_points: Optional[int] = 5
    acceptance_criteria: str
    technical_context: Optional[str] = ""
    team_skills: Optional[str] = ""
    include_subtasks: bool = True

class EpicGenerateRequest(BaseModel):
    description: str
    project_id: Optional[str] = None
    priority: Optional[str] = "medium"
    business_value: Optional[str] = None

# Simple test endpoint without complex models
@router.get("/health")
async def ai_health_check():
    """Simple health check for AI endpoints"""
    return {"status": "ok", "message": "AI endpoints are working"}

@router.get("/test")
async def test_endpoint():
    """Test endpoint to verify basic functionality"""
    try:
        # Test basic AI service import
        from ..services.ai_service import get_basic_ai_service
        ai_service = get_basic_ai_service()
        return {
            "status": "success", 
            "message": "AI service imports and initialization working",
            "openai_available": ai_service.openai_client is not None,
            "anthropic_available": ai_service.anthropic_client is not None
        }
    except Exception as e:
        logger.error(f"AI service test failed: {e}")
        return {"status": "error", "message": str(e)}

@router.get("/status")
async def ai_status():
    """Detailed AI service status"""
    try:
        from ..services.ai_service import get_basic_ai_service, get_ai_service
        from ..database.supabase_client import get_supabase
        
        status = {
            "basic_service": False,
            "enhanced_service": False,
            "supabase_connection": False,
            "openai_client": False,
            "anthropic_client": False,
            "errors": []
        }
        
        # Test basic service
        try:
            basic_service = get_basic_ai_service()
            status["basic_service"] = True
            status["openai_client"] = basic_service.openai_client is not None
            status["anthropic_client"] = basic_service.anthropic_client is not None
        except Exception as e:
            status["errors"].append(f"Basic service: {str(e)}")
        
        # Test enhanced service
        try:
            enhanced_service = get_ai_service()
            status["enhanced_service"] = True
        except Exception as e:
            status["errors"].append(f"Enhanced service: {str(e)}")
        
        # Test Supabase
        try:
            supabase = get_supabase()
            if supabase:
                status["supabase_connection"] = True
        except Exception as e:
            status["errors"].append(f"Supabase: {str(e)}")
        
        return status
        
    except Exception as e:
        logger.error(f"AI status check failed: {e}")
        return {"status": "error", "message": str(e)}

@router.post("/generate-epic")
async def generate_epic_endpoint(
    request: EpicGenerateRequest,
    current_user = Depends(get_current_user_supabase)
):
    """Generate an epic using AI"""
    try:
        from ..services.ai_service import get_basic_ai_service
        
        ai_service = get_basic_ai_service()
        
        # Prepare variables for AI completion
        variables = {
            "user_description": request.description,
            "priority_level": request.priority,
            "project_context": f"Project ID: {request.project_id}" if request.project_id else "",
            "business_value": request.business_value or "",
            "include_acceptance_criteria": True,
            "include_story_breakdown": True
        }
        
        # Generate epic using AI
        result = await ai_service.generate_completion("epic_generator", variables)
        
        if result.success:
            return {
                "success": True,
                "epic": result.data,
                "model_used": result.model_used,
                "tokens_used": result.tokens_used,
                "processing_time": result.processing_time
            }
        else:
            return {
                "success": False,
                "error": result.error,
                "fallback_available": True
            }
            
    except Exception as e:
        logger.error(f"Epic generation failed: {e}")
        import traceback
        logger.error(f"Full traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/generate-story")
async def generate_story_endpoint(
    request: StoryGenerateRequest,
    current_user = Depends(get_current_user_supabase)
):
    """Generate a user story using AI"""
    try:
        from ..services.ai_service import get_basic_ai_service
        
        ai_service = get_basic_ai_service()
        
        # Prepare variables for AI completion
        variables = {
            "user_description": request.description,
            "priority_level": request.priority,
            "epic_context": f"Epic ID: {request.epic_id}" if request.epic_id else "",
            "project_context": f"Project ID: {request.project_id}" if request.project_id else "",
            "include_acceptance_criteria": True,
            "include_tags": True
        }
        
        # Generate story using AI
        result = await ai_service.generate_completion("story_generator", variables)
        
        if result.success:
            return {
                "success": True,
                "story": result.data,
                "model_used": result.model_used,
                "tokens_used": result.tokens_used,
                "processing_time": result.processing_time
            }
        else:
            return {
                "success": False,
                "error": result.error,
                "fallback_available": True
            }
            
    except Exception as e:
        logger.error(f"Story generation failed: {e}")
        import traceback
        logger.error(f"Full traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/generate-tasks")
async def generate_tasks_endpoint(
    request: TaskGenerateRequest,
    current_user = Depends(get_current_user_supabase)
):
    """Generate tasks for a user story using AI"""
    try:
        from ..services.ai_service import get_basic_ai_service
        
        ai_service = get_basic_ai_service()
        
        # Prepare variables for AI completion
        variables = {
            "story_title": request.story_title,
            "story_description": request.story_description,
            "story_points": request.story_points,
            "acceptance_criteria": request.acceptance_criteria,
            "technical_context": request.technical_context,
            "team_skills": request.team_skills,
            "include_subtasks": request.include_subtasks
        }
        
        # Generate tasks using AI
        result = await ai_service.generate_completion("task_generator", variables)
        
        if result.success:
            return {
                "success": True,
                "tasks": result.data,
                "model_used": result.model_used,
                "tokens_used": result.tokens_used,
                "processing_time": result.processing_time
            }
        else:
            return {
                "success": False,
                "error": result.error,
                "fallback_available": True
            }
            
    except Exception as e:
        logger.error(f"Task generation failed: {e}")
        import traceback
        logger.error(f"Full traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e)) 