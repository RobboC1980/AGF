from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel, Field, validator
from typing import List, Dict, Any, Optional
from datetime import datetime, date
import logging

from ..services.ai_service import ai_service, AIResponse
from ..auth.dependencies import get_current_user
from ..database.supabase_client import get_supabase

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/ai", tags=["AI Features"])

# Request/Response Models
class SprintPlanningRequest(BaseModel):
    team_id: str
    team_capacity: int = Field(..., gt=0, description="Team capacity in story points")
    candidate_story_ids: List[str] = Field(..., min_items=1)
    sprint_goal: Optional[str] = None
    
    @validator('team_capacity')
    def validate_capacity(cls, v):
        if v > 200:  # Reasonable upper limit
            raise ValueError('Team capacity seems unreasonably high')
        return v

class SprintPlanningResponse(BaseModel):
    success: bool
    recommended_stories: List[Dict[str, Any]]
    total_points: int
    capacity_utilization: float
    risks: List[str]
    dependency_warnings: List[str]
    ai_metadata: Dict[str, Any]

class StandupRequest(BaseModel):
    team_id: str
    date: date = Field(default_factory=date.today)
    include_individual_summaries: bool = True

class StandupResponse(BaseModel):
    success: bool
    team_summary: Dict[str, List[str]]
    individual_summaries: List[Dict[str, Any]]
    export_options: Dict[str, str]
    ai_metadata: Dict[str, Any]

class RetrospectiveRequest(BaseModel):
    sprint_id: str
    feedback_entries: List[Dict[str, str]] = Field(..., min_items=1)
    auto_create_tasks: bool = True

class RetrospectiveResponse(BaseModel):
    success: bool
    went_well: List[str]
    needs_improvement: List[str] 
    action_items: List[Dict[str, Any]]
    created_task_ids: Optional[List[str]] = None
    ai_metadata: Dict[str, Any]

class StoryValidationRequest(BaseModel):
    story_id: Optional[str] = None
    title: str = Field(..., min_length=5, max_length=200)
    description: str = Field(..., min_length=10)
    acceptance_criteria: Optional[str] = None
    story_points: Optional[int] = Field(None, ge=1, le=100)

class StoryValidationResponse(BaseModel):
    success: bool
    is_valid: bool
    score: int = Field(..., ge=0, le=100)
    issues: List[Dict[str, Any]]
    improvements: List[str]
    ai_metadata: Dict[str, Any]

class BacklogRefinementRequest(BaseModel):
    project_id: str
    include_completed: bool = False
    max_stories: int = Field(50, ge=1, le=200)

class BacklogRefinementResponse(BaseModel):
    success: bool
    split_suggestions: List[Dict[str, Any]]
    merge_suggestions: List[Dict[str, Any]]
    dependency_warnings: List[Dict[str, Any]]
    missing_stories: List[Dict[str, Any]]
    ai_metadata: Dict[str, Any]

class ReleaseNotesRequest(BaseModel):
    release_id: str
    version: str
    custom_highlights: Optional[List[str]] = None
    include_technical_details: bool = False

class ReleaseNotesResponse(BaseModel):
    success: bool
    markdown_content: str
    sections: Dict[str, List[str]]
    ai_metadata: Dict[str, Any]

class RiskAnalysisRequest(BaseModel):
    project_id: str
    analysis_period_days: int = Field(30, ge=7, le=90)
    include_predictions: bool = True

class RiskAnalysisResponse(BaseModel):
    success: bool
    schedule_risks: List[Dict[str, Any]]
    scope_risks: List[Dict[str, Any]]
    team_risks: List[Dict[str, Any]]
    overall_health: str
    priority_actions: List[str]
    ai_metadata: Dict[str, Any]

# Endpoints
@router.post("/sprint-planning", response_model=SprintPlanningResponse)
async def plan_sprint(
    request: SprintPlanningRequest,
    current_user = Depends(get_current_user),
    supabase = Depends(get_supabase)
):
    """AI-powered sprint planning assistant"""
    try:
        # Fetch team data and stories
        # This would integrate with your database models
        team_data = await fetch_team_data(request.team_id, supabase)
        candidate_stories = await fetch_stories(request.candidate_story_ids, supabase)
        historical_velocity = await calculate_velocity(request.team_id, supabase)
        dependencies = await analyze_dependencies(request.candidate_story_ids, supabase)
        
        # Prepare AI variables
        variables = {
            "team_capacity": request.team_capacity,
            "historical_velocity": historical_velocity["average"],
            "velocity_sprints": historical_velocity["sprint_count"],
            "candidate_stories": format_stories_for_ai(candidate_stories),
            "dependencies": format_dependencies_for_ai(dependencies)
        }
        
        # Generate AI response
        ai_response = await ai_service.generate_completion("sprint_planning", variables)
        
        if not ai_response.success:
            raise HTTPException(status_code=500, detail=f"AI generation failed: {ai_response.error}")
        
        # Process and validate AI response
        ai_data = ai_response.data
        
        return SprintPlanningResponse(
            success=True,
            recommended_stories=ai_data["recommended_stories"],
            total_points=ai_data["total_points"],
            capacity_utilization=ai_data["capacity_utilization"],
            risks=ai_data["risks"],
            dependency_warnings=ai_data["dependency_warnings"],
            ai_metadata={
                "tokens_used": ai_response.tokens_used,
                "processing_time": ai_response.processing_time,
                "model_used": ai_response.model_used
            }
        )
        
    except Exception as e:
        logger.error(f"Sprint planning failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/standup-report", response_model=StandupResponse)
async def generate_standup_report(
    request: StandupRequest,
    current_user = Depends(get_current_user),
    supabase = Depends(get_supabase)
):
    """Generate AI standup reports"""
    try:
        # Fetch task updates for the team and date
        task_updates = await fetch_task_updates(request.team_id, request.date, supabase)
        team_info = await fetch_team_info(request.team_id, supabase)
        
        variables = {
            "team_name": team_info["name"],
            "date": request.date.isoformat(),
            "task_updates": format_task_updates_for_ai(task_updates)
        }
        
        ai_response = await ai_service.generate_completion("standup_reporter", variables)
        
        if not ai_response.success:
            raise HTTPException(status_code=500, detail=f"AI generation failed: {ai_response.error}")
        
        ai_data = ai_response.data
        
        # Generate export URLs
        export_options = {
            "slack_webhook": f"/api/ai/standup-report/{request.team_id}/export/slack",
            "email": f"/api/ai/standup-report/{request.team_id}/export/email", 
            "dashboard": f"/api/ai/standup-report/{request.team_id}/export/dashboard"
        }
        
        return StandupResponse(
            success=True,
            team_summary=ai_data["team_summary"],
            individual_summaries=ai_data["individual_summaries"] if request.include_individual_summaries else [],
            export_options=export_options,
            ai_metadata={
                "tokens_used": ai_response.tokens_used,
                "processing_time": ai_response.processing_time,
                "model_used": ai_response.model_used
            }
        )
        
    except Exception as e:
        logger.error(f"Standup report generation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/retrospective-summary", response_model=RetrospectiveResponse)
async def summarize_retrospective(
    request: RetrospectiveRequest,
    background_tasks: BackgroundTasks,
    current_user = Depends(get_current_user),
    supabase = Depends(get_supabase)
):
    """Summarize retrospective feedback and create action items"""
    try:
        sprint_info = await fetch_sprint_info(request.sprint_id, supabase)
        team_info = await fetch_team_info(sprint_info["team_id"], supabase)
        
        # Combine feedback entries
        feedback_text = "\n\n".join([
            f"From {entry.get('author', 'Anonymous')}: {entry['content']}"
            for entry in request.feedback_entries
        ])
        
        variables = {
            "sprint_name": sprint_info["name"],
            "team_name": team_info["name"],
            "feedback_text": feedback_text
        }
        
        ai_response = await ai_service.generate_completion("retrospective_summarizer", variables)
        
        if not ai_response.success:
            raise HTTPException(status_code=500, detail=f"AI generation failed: {ai_response.error}")
        
        ai_data = ai_response.data
        created_task_ids = None
        
        # Auto-create tasks if requested
        if request.auto_create_tasks:
            background_tasks.add_task(
                create_action_item_tasks,
                ai_data["action_items"],
                sprint_info["team_id"],
                current_user.id,
                supabase
            )
        
        return RetrospectiveResponse(
            success=True,
            went_well=ai_data["went_well"],
            needs_improvement=ai_data["needs_improvement"],
            action_items=ai_data["action_items"],
            created_task_ids=created_task_ids,
            ai_metadata={
                "tokens_used": ai_response.tokens_used,
                "processing_time": ai_response.processing_time,
                "model_used": ai_response.model_used
            }
        )
        
    except Exception as e:
        logger.error(f"Retrospective summary failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/validate-story", response_model=StoryValidationResponse)
async def validate_story(
    request: StoryValidationRequest,
    current_user = Depends(get_current_user)
):
    """Validate user story quality and completeness"""
    try:
        variables = {
            "story_title": request.title,
            "story_description": request.description,
            "acceptance_criteria": request.acceptance_criteria or "Not provided",
            "story_points": request.story_points or "Not estimated"
        }
        
        ai_response = await ai_service.generate_completion("story_validator", variables)
        
        if not ai_response.success:
            raise HTTPException(status_code=500, detail=f"AI validation failed: {ai_response.error}")
        
        ai_data = ai_response.data
        
        return StoryValidationResponse(
            success=True,
            is_valid=ai_data["is_valid"],
            score=ai_data["score"],
            issues=ai_data["issues"],
            improvements=ai_data["improvements"],
            ai_metadata={
                "tokens_used": ai_response.tokens_used,
                "processing_time": ai_response.processing_time,
                "model_used": ai_response.model_used
            }
        )
        
    except Exception as e:
        logger.error(f"Story validation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/backlog-refinement", response_model=BacklogRefinementResponse)
async def analyze_backlog(
    request: BacklogRefinementRequest,
    current_user = Depends(get_current_user),
    supabase = Depends(get_supabase)
):
    """Analyze backlog for refinement opportunities"""
    try:
        stories = await fetch_project_stories(
            request.project_id, 
            request.include_completed,
            request.max_stories,
            supabase
        )
        
        variables = {
            "stories_data": format_stories_for_refinement_ai(stories)
        }
        
        ai_response = await ai_service.generate_completion("backlog_coach", variables)
        
        if not ai_response.success:
            raise HTTPException(status_code=500, detail=f"AI analysis failed: {ai_response.error}")
        
        ai_data = ai_response.data
        
        return BacklogRefinementResponse(
            success=True,
            split_suggestions=ai_data["split_suggestions"],
            merge_suggestions=ai_data["merge_suggestions"],
            dependency_warnings=ai_data["dependency_warnings"],
            missing_stories=ai_data["missing_stories"],
            ai_metadata={
                "tokens_used": ai_response.tokens_used,
                "processing_time": ai_response.processing_time,
                "model_used": ai_response.model_used
            }
        )
        
    except Exception as e:
        logger.error(f"Backlog analysis failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/release-notes", response_model=ReleaseNotesResponse)
async def generate_release_notes(
    request: ReleaseNotesRequest,
    current_user = Depends(get_current_user),
    supabase = Depends(get_supabase)
):
    """Generate release notes from completed stories"""
    try:
        release_info = await fetch_release_info(request.release_id, supabase)
        completed_stories = await fetch_release_stories(request.release_id, supabase)
        
        variables = {
            "release_name": release_info["name"],
            "version": request.version,
            "release_date": release_info["release_date"].isoformat(),
            "completed_stories": format_stories_for_release_notes(completed_stories),
            "custom_highlights": "\n".join(request.custom_highlights or [])
        }
        
        ai_response = await ai_service.generate_completion("release_notes", variables)
        
        if not ai_response.success:
            raise HTTPException(status_code=500, detail=f"AI generation failed: {ai_response.error}")
        
        markdown_content = ai_response.data
        
        # Parse sections from markdown (simplified)
        sections = parse_release_notes_sections(markdown_content)
        
        return ReleaseNotesResponse(
            success=True,
            markdown_content=markdown_content,
            sections=sections,
            ai_metadata={
                "tokens_used": ai_response.tokens_used,
                "processing_time": ai_response.processing_time,
                "model_used": ai_response.model_used
            }
        )
        
    except Exception as e:
        logger.error(f"Release notes generation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/risk-analysis", response_model=RiskAnalysisResponse)
async def analyze_project_risks(
    request: RiskAnalysisRequest,
    current_user = Depends(get_current_user),
    supabase = Depends(get_supabase)
):
    """Analyze project risks and provide mitigation suggestions"""
    try:
        project_data = await fetch_project_risk_data(
            request.project_id,
            request.analysis_period_days,
            supabase
        )
        
        variables = {
            "current_sprint_data": format_sprint_data_for_ai(project_data["current_sprint"]),
            "historical_blockers": format_blockers_for_ai(project_data["blockers"]),
            "estimate_accuracy": format_estimates_for_ai(project_data["estimates"]),
            "capacity_trends": format_capacity_trends_for_ai(project_data["capacity"])
        }
        
        ai_response = await ai_service.generate_completion("risk_radar", variables)
        
        if not ai_response.success:
            raise HTTPException(status_code=500, detail=f"AI analysis failed: {ai_response.error}")
        
        ai_data = ai_response.data
        
        return RiskAnalysisResponse(
            success=True,
            schedule_risks=ai_data["schedule_risks"],
            scope_risks=ai_data["scope_risks"],
            team_risks=ai_data["team_risks"],
            overall_health=ai_data["overall_health"],
            priority_actions=ai_data["priority_actions"],
            ai_metadata={
                "tokens_used": ai_response.tokens_used,
                "processing_time": ai_response.processing_time,
                "model_used": ai_response.model_used
            }
        )
        
    except Exception as e:
        logger.error(f"Risk analysis failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Velocity tracking endpoint
@router.get("/velocity-forecast/{team_id}")
async def get_velocity_forecast(
    team_id: str,
    sprints_back: int = 6,
    current_user = Depends(get_current_user),
    supabase = Depends(get_supabase)
):
    """Get velocity trends and forecasting"""
    try:
        velocity_data = await fetch_velocity_data(team_id, sprints_back, supabase)
        
        # Calculate trends and generate AI insights
        variables = {
            "team_name": velocity_data["team_name"],
            "velocity_history": velocity_data["history"],
            "current_capacity": velocity_data["current_capacity"],
            "upcoming_work": velocity_data["upcoming_work"]
        }
        
        # Use a simplified prompt for velocity insights
        ai_response = await ai_service.generate_completion(
            "velocity_insights", 
            variables,
            {"max_tokens": 500, "temperature": 0.3}
        )
        
        return {
            "success": True,
            "velocity_data": velocity_data,
            "ai_insights": ai_response.data if ai_response.success else None,
            "export_url": f"/api/ai/velocity-forecast/{team_id}/export/csv"
        }
        
    except Exception as e:
        logger.error(f"Velocity forecast failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Helper functions (these would be implemented based on your database models)
async def fetch_team_data(team_id: str, supabase): pass
async def fetch_stories(story_ids: List[str], supabase): pass
async def calculate_velocity(team_id: str, supabase): pass
async def analyze_dependencies(story_ids: List[str], supabase): pass
async def format_stories_for_ai(stories): pass
async def format_dependencies_for_ai(dependencies): pass
async def fetch_task_updates(team_id: str, date: date, supabase): pass
async def fetch_team_info(team_id: str, supabase): pass
async def format_task_updates_for_ai(updates): pass
async def fetch_sprint_info(sprint_id: str, supabase): pass
async def create_action_item_tasks(action_items, team_id, user_id, supabase): pass
async def fetch_project_stories(project_id: str, include_completed: bool, max_stories: int, supabase): pass
async def format_stories_for_refinement_ai(stories): pass
async def fetch_release_info(release_id: str, supabase): pass
async def fetch_release_stories(release_id: str, supabase): pass
async def format_stories_for_release_notes(stories): pass
async def parse_release_notes_sections(markdown: str): pass
async def fetch_project_risk_data(project_id: str, days: int, supabase): pass
async def format_sprint_data_for_ai(data): pass
async def format_blockers_for_ai(data): pass
async def format_estimates_for_ai(data): pass
async def format_capacity_trends_for_ai(data): pass
async def fetch_velocity_data(team_id: str, sprints_back: int, supabase): pass
