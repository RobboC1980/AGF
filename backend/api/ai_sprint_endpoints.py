"""
AI-Powered Sprint Planning Features

Provides intelligent sprint planning assistance including:
- Capacity planning and team velocity analysis
- Smart story estimation and point allocation
- Sprint goal optimization and risk assessment
- Resource allocation recommendations
- Burndown prediction and sprint health monitoring
"""

from fastapi import APIRouter, HTTPException, Depends, status, Query
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import logging

try:
    from ..auth.dependencies import UserResponse, get_current_user_clerk
    from ..auth.project_access import get_project_validator
    from ..database.supabase_client import get_supabase
except ImportError:
    from auth.dependencies import UserResponse, get_current_user_clerk
    from auth.project_access import get_project_validator
    from database.supabase_client import get_supabase

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/ai/sprint", tags=["AI Sprint Planning"])

# Request/Response Models
class TeamMember(BaseModel):
    id: str
    name: str
    role: str = "developer"
    capacity_hours: float = 40.0
    skills: List[str] = []
    velocity_points: Optional[float] = None
    availability: float = 1.0  # 0.0 to 1.0

class StoryItem(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    story_points: Optional[int] = None
    priority: str = "medium"
    epic_id: Optional[str] = None
    tags: List[str] = []
    estimated_hours: Optional[float] = None
    complexity: Optional[str] = None
    dependencies: List[str] = []

class SprintPlanningRequest(BaseModel):
    project_id: str
    sprint_duration_weeks: int = 2
    team_members: List[TeamMember]
    backlog_items: List[StoryItem]
    sprint_goal: Optional[str] = None
    historical_velocity: Optional[float] = None
    constraints: List[str] = []

class CapacityAnalysisRequest(BaseModel):
    project_id: str
    team_members: List[TeamMember]
    sprint_duration_weeks: int = 2
    planned_stories: List[StoryItem] = []
    
class VelocityAnalysisRequest(BaseModel):
    project_id: str
    historical_sprints: List[Dict[str, Any]] = []
    team_changes: Optional[Dict[str, Any]] = None
    prediction_horizon_sprints: int = 3

class StoryEstimationRequest(BaseModel):
    project_id: str
    stories: List[StoryItem]
    team_context: Optional[Dict[str, Any]] = None
    estimation_method: str = "story_points"  # story_points, hours, t_shirt

class SprintOptimizationRequest(BaseModel):
    project_id: str
    current_sprint_plan: List[StoryItem]
    team_capacity: Dict[str, Any]
    optimization_goals: List[str] = ["maximize_value", "balance_workload", "minimize_risk"]

class SprintHealthRequest(BaseModel):
    project_id: str
    sprint_id: str
    current_progress: Dict[str, Any]
    days_remaining: int

# Response Models
class CapacityAnalysisResponse(BaseModel):
    total_capacity_hours: float
    available_capacity_hours: float
    capacity_utilization: float
    team_breakdown: List[Dict[str, Any]]
    recommendations: List[str]
    risk_factors: List[str]

class VelocityPredictionResponse(BaseModel):
    predicted_velocity: float
    confidence_interval: Dict[str, float]
    trend_analysis: Dict[str, Any]
    recommendations: List[str]
    factors_considered: List[str]

class StoryEstimationResponse(BaseModel):
    story_id: str
    estimated_points: Optional[int]
    estimated_hours: Optional[float]
    confidence: float
    reasoning: str
    complexity_factors: List[str]

class SprintPlanResponse(BaseModel):
    recommended_stories: List[str]
    capacity_analysis: Dict[str, Any]
    risk_assessment: Dict[str, Any]
    alternative_plans: List[Dict[str, Any]]
    success_probability: float

class SprintHealthResponse(BaseModel):
    health_score: float
    burndown_prediction: Dict[str, Any]
    completion_probability: float
    risk_indicators: List[Dict[str, Any]]
    recommended_actions: List[str]

@router.post("/analyze-capacity", response_model=CapacityAnalysisResponse)
async def analyze_team_capacity(
    request: CapacityAnalysisRequest,
    current_user: UserResponse = Depends(get_current_user_clerk)
):
    """
    Analyze team capacity for sprint planning with AI insights
    """
    # Validate project access
    validator = get_project_validator()
    if validator:
        has_access = await validator.validate_project_access(
            current_user, 
            request.project_id, 
            "read"
        )
        if not has_access:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: You don't have permission to analyze capacity for this project"
            )
    
    try:
        # Calculate basic capacity metrics
        total_hours = sum(member.capacity_hours * member.availability for member in request.team_members)
        sprint_hours = total_hours * request.sprint_duration_weeks
        
        # Calculate story points capacity if provided
        planned_points = sum(story.story_points or 0 for story in request.planned_stories)
        
        # Team breakdown analysis
        team_breakdown = []
        for member in request.team_members:
            member_capacity = member.capacity_hours * member.availability * request.sprint_duration_weeks
            team_breakdown.append({
                "name": member.name,
                "role": member.role,
                "capacity_hours": member_capacity,
                "skills": member.skills,
                "utilization": member.availability,
                "velocity_points": member.velocity_points
            })
        
        # Import AI service for advanced analysis
        try:
            from ..services.ai_service import get_basic_ai_service
        except ImportError:
            from services.ai_service import get_basic_ai_service
        
        ai_service = get_basic_ai_service()
        
        # Prepare AI analysis variables
        variables = {
            "team_data": [member.dict() for member in request.team_members],
            "sprint_duration": request.sprint_duration_weeks,
            "planned_stories": [story.dict() for story in request.planned_stories],
            "capacity_metrics": {
                "total_hours": sprint_hours,
                "planned_points": planned_points,
                "team_size": len(request.team_members)
            }
        }
        
        # Generate AI capacity analysis
        result = await ai_service.generate_completion("capacity_analyzer", variables)
        
        # Basic risk assessment
        risk_factors = []
        if planned_points > 0:
            avg_velocity = sum(m.velocity_points for m in request.team_members if m.velocity_points) / len(request.team_members)
            if avg_velocity > 0 and planned_points > avg_velocity * 1.2:
                risk_factors.append("Planned story points exceed team's historical velocity")
        
        if any(member.availability < 0.8 for member in request.team_members):
            risk_factors.append("Some team members have reduced availability")
        
        # Generate recommendations
        recommendations = []
        if planned_points == 0:
            recommendations.append("Consider estimating story points for better capacity planning")
        if len(set(member.role for member in request.team_members)) == 1:
            recommendations.append("Team lacks role diversity - consider cross-training")
        
        if result.success:
            ai_data = result.data
            return CapacityAnalysisResponse(
                total_capacity_hours=sprint_hours,
                available_capacity_hours=sprint_hours * 0.8,  # 80% planning factor
                capacity_utilization=planned_points / max(sum(m.velocity_points for m in request.team_members if m.velocity_points), 1),
                team_breakdown=team_breakdown,
                recommendations=recommendations + ai_data.get("recommendations", []),
                risk_factors=risk_factors + ai_data.get("risk_factors", [])
            )
        else:
            # Fallback analysis
            return CapacityAnalysisResponse(
                total_capacity_hours=sprint_hours,
                available_capacity_hours=sprint_hours * 0.8,
                capacity_utilization=0.7,  # Default assumption
                team_breakdown=team_breakdown,
                recommendations=recommendations,
                risk_factors=risk_factors
            )
            
    except Exception as e:
        logger.error(f"Capacity analysis failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to analyze team capacity: {str(e)}"
        )

@router.post("/predict-velocity", response_model=VelocityPredictionResponse)
async def predict_velocity(
    request: VelocityAnalysisRequest,
    current_user: UserResponse = Depends(get_current_user_clerk)
):
    """
    AI-powered velocity prediction based on historical data and team changes
    """
    # Validate project access
    validator = get_project_validator()
    if validator:
        has_access = await validator.validate_project_access(
            current_user, 
            request.project_id, 
            "read"
        )
        if not has_access:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: You don't have permission to analyze velocity for this project"
            )
    
    try:
        # Import AI service
        try:
            from ..services.ai_service import get_basic_ai_service
        except ImportError:
            from services.ai_service import get_basic_ai_service
        
        ai_service = get_basic_ai_service()
        
        # Calculate basic velocity metrics from historical data
        historical_velocities = [sprint.get("velocity", 0) for sprint in request.historical_sprints]
        avg_velocity = sum(historical_velocities) / len(historical_velocities) if historical_velocities else 0
        
        # Calculate trend
        if len(historical_velocities) >= 2:
            recent_avg = sum(historical_velocities[-3:]) / min(3, len(historical_velocities))
            older_avg = sum(historical_velocities[:-3]) / max(1, len(historical_velocities) - 3)
            trend = (recent_avg - older_avg) / max(older_avg, 1) if older_avg > 0 else 0
        else:
            trend = 0
            recent_avg = avg_velocity
        
        # Prepare AI analysis variables
        variables = {
            "historical_sprints": request.historical_sprints,
            "team_changes": request.team_changes or {},
            "velocity_metrics": {
                "average_velocity": avg_velocity,
                "recent_velocity": recent_avg,
                "trend": trend,
                "sprint_count": len(historical_velocities)
            },
            "prediction_horizon": request.prediction_horizon_sprints
        }
        
        # Generate AI velocity prediction
        result = await ai_service.generate_completion("velocity_predictor", variables)
        
        if result.success:
            ai_data = result.data
            return VelocityPredictionResponse(
                predicted_velocity=ai_data.get("predicted_velocity", avg_velocity),
                confidence_interval=ai_data.get("confidence_interval", {"low": avg_velocity * 0.8, "high": avg_velocity * 1.2}),
                trend_analysis=ai_data.get("trend_analysis", {"direction": "stable", "strength": 0.1}),
                recommendations=ai_data.get("recommendations", []),
                factors_considered=ai_data.get("factors", ["historical_performance", "team_changes"])
            )
        else:
            # Fallback prediction
            confidence_range = avg_velocity * 0.2
            return VelocityPredictionResponse(
                predicted_velocity=max(avg_velocity, 1),
                confidence_interval={"low": max(avg_velocity - confidence_range, 0), "high": avg_velocity + confidence_range},
                trend_analysis={"direction": "increasing" if trend > 0 else "decreasing" if trend < 0 else "stable", "strength": abs(trend)},
                recommendations=["Gather more historical data for better predictions", "Monitor team performance consistently"],
                factors_considered=["historical_velocity", "basic_trend_analysis"]
            )
            
    except Exception as e:
        logger.error(f"Velocity prediction failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to predict velocity: {str(e)}"
        )

@router.post("/estimate-stories")
async def estimate_stories(
    request: StoryEstimationRequest,
    current_user: UserResponse = Depends(get_current_user_clerk)
):
    """
    AI-powered story point estimation with confidence scoring
    """
    # Validate project access
    validator = get_project_validator()
    if validator:
        has_access = await validator.validate_project_access(
            current_user, 
            request.project_id, 
            "write"
        )
        if not has_access:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: You don't have permission to estimate stories in this project"
            )
    
    try:
        # Import AI service
        try:
            from ..services.ai_service import get_basic_ai_service
        except ImportError:
            from services.ai_service import get_basic_ai_service
        
        ai_service = get_basic_ai_service()
        
        estimations = []
        
        for story in request.stories:
            # Prepare AI variables for each story
            variables = {
                "story_data": story.dict(),
                "team_context": request.team_context or {},
                "estimation_method": request.estimation_method,
                "project_context": {"project_id": request.project_id}
            }
            
            # Generate AI estimation
            result = await ai_service.generate_completion("story_estimator", variables)
            
            if result.success:
                ai_data = result.data
                estimation = StoryEstimationResponse(
                    story_id=story.id,
                    estimated_points=ai_data.get("story_points"),
                    estimated_hours=ai_data.get("estimated_hours"),
                    confidence=ai_data.get("confidence", 0.7),
                    reasoning=ai_data.get("reasoning", "AI-based estimation"),
                    complexity_factors=ai_data.get("complexity_factors", [])
                )
            else:
                # Fallback estimation based on description length and complexity
                description_length = len(story.description or "")
                base_points = min(max(description_length // 50, 1), 8)  # 1-8 points based on description
                
                estimation = StoryEstimationResponse(
                    story_id=story.id,
                    estimated_points=base_points,
                    estimated_hours=base_points * 4,  # Rough hours conversion
                    confidence=0.5,
                    reasoning="Fallback estimation based on story complexity",
                    complexity_factors=["description_length", "basic_analysis"]
                )
            
            estimations.append(estimation)
        
        return {
            "success": True,
            "estimations": estimations,
            "total_estimated_points": sum(est.estimated_points or 0 for est in estimations),
            "total_estimated_hours": sum(est.estimated_hours or 0 for est in estimations),
            "average_confidence": sum(est.confidence for est in estimations) / len(estimations) if estimations else 0
        }
        
    except Exception as e:
        logger.error(f"Story estimation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to estimate stories: {str(e)}"
        )

@router.post("/optimize-sprint", response_model=SprintPlanResponse)
async def optimize_sprint_plan(
    request: SprintOptimizationRequest,
    current_user: UserResponse = Depends(get_current_user_clerk)
):
    """
    AI-powered sprint plan optimization
    """
    # Validate project access
    validator = get_project_validator()
    if validator:
        has_access = await validator.validate_project_access(
            current_user, 
            request.project_id, 
            "write"
        )
        if not has_access:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: You don't have permission to optimize sprints in this project"
            )
    
    try:
        # Import AI service
        try:
            from ..services.ai_service import get_basic_ai_service
        except ImportError:
            from services.ai_service import get_basic_ai_service
        
        ai_service = get_basic_ai_service()
        
        # Analyze current plan
        total_points = sum(story.story_points or 0 for story in request.current_sprint_plan)
        total_hours = sum(story.estimated_hours or 0 for story in request.current_sprint_plan)
        
        # Prepare AI variables
        variables = {
            "current_plan": [story.dict() for story in request.current_sprint_plan],
            "team_capacity": request.team_capacity,
            "optimization_goals": request.optimization_goals,
            "current_metrics": {
                "total_points": total_points,
                "total_hours": total_hours,
                "story_count": len(request.current_sprint_plan)
            }
        }
        
        # Generate AI optimization
        result = await ai_service.generate_completion("sprint_optimizer", variables)
        
        if result.success:
            ai_data = result.data
            return SprintPlanResponse(
                recommended_stories=ai_data.get("recommended_stories", [story.id for story in request.current_sprint_plan]),
                capacity_analysis=ai_data.get("capacity_analysis", {}),
                risk_assessment=ai_data.get("risk_assessment", {}),
                alternative_plans=ai_data.get("alternative_plans", []),
                success_probability=ai_data.get("success_probability", 0.75)
            )
        else:
            # Fallback optimization
            return SprintPlanResponse(
                recommended_stories=[story.id for story in request.current_sprint_plan],
                capacity_analysis={"utilization": 0.8, "buffer": 0.2},
                risk_assessment={"level": "medium", "factors": ["estimation_uncertainty"]},
                alternative_plans=[],
                success_probability=0.7
            )
            
    except Exception as e:
        logger.error(f"Sprint optimization failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to optimize sprint plan: {str(e)}"
        )

@router.post("/health-check", response_model=SprintHealthResponse)
async def check_sprint_health(
    request: SprintHealthRequest,
    current_user: UserResponse = Depends(get_current_user_clerk)
):
    """
    AI-powered sprint health monitoring and burndown prediction
    """
    # Validate project access
    validator = get_project_validator()
    if validator:
        has_access = await validator.validate_project_access(
            current_user, 
            request.project_id, 
            "read"
        )
        if not has_access:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: You don't have permission to monitor sprint health for this project"
            )
    
    try:
        # Import AI service
        try:
            from ..services.ai_service import get_basic_ai_service
        except ImportError:
            from services.ai_service import get_basic_ai_service
        
        ai_service = get_basic_ai_service()
        
        # Calculate basic health metrics
        progress = request.current_progress
        completed_points = progress.get("completed_points", 0)
        total_points = progress.get("total_points", 1)
        completion_rate = completed_points / total_points
        
        days_elapsed = progress.get("days_elapsed", 0)
        total_days = days_elapsed + request.days_remaining
        expected_completion_rate = days_elapsed / total_days if total_days > 0 else 0
        
        # Health score calculation
        if completion_rate >= expected_completion_rate * 1.1:
            health_score = min(1.0, 0.8 + (completion_rate - expected_completion_rate))
        elif completion_rate >= expected_completion_rate * 0.9:
            health_score = 0.7
        else:
            health_score = max(0.1, 0.5 - (expected_completion_rate - completion_rate))
        
        # Prepare AI variables
        variables = {
            "sprint_id": request.sprint_id,
            "current_progress": progress,
            "days_remaining": request.days_remaining,
            "health_metrics": {
                "completion_rate": completion_rate,
                "expected_rate": expected_completion_rate,
                "health_score": health_score
            }
        }
        
        # Generate AI health analysis
        result = await ai_service.generate_completion("sprint_health_monitor", variables)
        
        # Risk indicators
        risk_indicators = []
        if completion_rate < expected_completion_rate * 0.8:
            risk_indicators.append({
                "type": "behind_schedule",
                "severity": "high",
                "description": "Sprint is significantly behind schedule"
            })
        
        if request.days_remaining < 2 and completion_rate < 0.8:
            risk_indicators.append({
                "type": "time_pressure",
                "severity": "critical",
                "description": "Limited time remaining with low completion rate"
            })
        
        if result.success:
            ai_data = result.data
            return SprintHealthResponse(
                health_score=health_score,
                burndown_prediction=ai_data.get("burndown_prediction", {}),
                completion_probability=ai_data.get("completion_probability", health_score),
                risk_indicators=risk_indicators + ai_data.get("additional_risks", []),
                recommended_actions=ai_data.get("recommended_actions", [])
            )
        else:
            # Fallback health assessment
            recommended_actions = []
            if health_score < 0.6:
                recommended_actions.extend([
                    "Review sprint scope and consider reducing deliverables",
                    "Identify blockers and remove impediments",
                    "Increase team collaboration and daily standup frequency"
                ])
            
            return SprintHealthResponse(
                health_score=health_score,
                burndown_prediction={"trend": "linear", "projection": completion_rate},
                completion_probability=health_score,
                risk_indicators=risk_indicators,
                recommended_actions=recommended_actions
            )
            
    except Exception as e:
        logger.error(f"Sprint health check failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to check sprint health: {str(e)}"
        )

@router.get("/recommendations")
async def get_sprint_recommendations(
    project_id: str = Query(..., description="Project ID"),
    current_user: UserResponse = Depends(get_current_user_clerk)
):
    """
    Get general sprint planning recommendations for a project
    """
    # Validate project access
    validator = get_project_validator()
    if validator:
        has_access = await validator.validate_project_access(
            current_user, 
            project_id, 
            "read"
        )
        if not has_access:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: You don't have permission to get recommendations for this project"
            )
    
    try:
        # Get project data from database
        supabase = get_supabase()
        project_data = {}
        
        if supabase:
            # Get recent sprint data
            sprints_result = supabase.table("sprints").select("*").eq("project_id", project_id).order("created_at", desc=True).limit(5).execute()
            sprints = sprints_result.data or []
            
            # Get team members
            team_result = supabase.rpc('get_project_team_members', {'project_uuid': project_id}).execute()
            team_members = team_result.data or []
            
            project_data = {
                "recent_sprints": sprints,
                "team_members": team_members
            }
        
        # Generate basic recommendations
        recommendations = [
            {
                "category": "velocity",
                "title": "Track Team Velocity",
                "description": "Consistently track and analyze team velocity across sprints",
                "priority": "high"
            },
            {
                "category": "estimation",
                "title": "Improve Story Estimation",
                "description": "Use planning poker or other estimation techniques for better accuracy",
                "priority": "medium"
            },
            {
                "category": "capacity",
                "title": "Plan Team Capacity",
                "description": "Account for team member availability and planned time off",
                "priority": "high"
            },
            {
                "category": "retrospective",
                "title": "Regular Retrospectives",
                "description": "Hold retrospectives to continuously improve sprint planning",
                "priority": "medium"
            }
        ]
        
        return {
            "success": True,
            "recommendations": recommendations,
            "project_insights": {
                "recent_sprint_count": len(project_data.get("recent_sprints", [])),
                "team_size": len(project_data.get("team_members", [])),
                "last_updated": datetime.utcnow().isoformat()
            }
        }
        
    except Exception as e:
        logger.error(f"Getting sprint recommendations failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get sprint recommendations: {str(e)}"
        ) 