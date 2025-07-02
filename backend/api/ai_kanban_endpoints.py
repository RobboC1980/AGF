"""
AI-Powered Kanban Board Features

Provides intelligent automation and suggestions for kanban boards including:
- Smart task categorization and prioritization
- Automated workflow optimization suggestions
- Bottleneck detection and resolution recommendations
- Task assignment recommendations based on team skills
- Sprint capacity planning assistance
"""

from fastapi import APIRouter, HTTPException, Depends, status
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
router = APIRouter(prefix="/api/ai/kanban", tags=["AI Kanban Features"])

# Request/Response Models
class TaskItem(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    status: str
    priority: str = "medium"
    assignee_id: Optional[str] = None
    story_points: Optional[int] = None
    estimated_hours: Optional[float] = None
    created_at: str
    updated_at: Optional[str] = None
    tags: List[str] = []

class KanbanColumn(BaseModel):
    id: str
    title: str
    status: str
    wip_limit: Optional[int] = None
    tasks: List[TaskItem] = []

class KanbanAnalysisRequest(BaseModel):
    project_id: str
    columns: List[KanbanColumn]
    team_members: List[Dict[str, Any]] = []
    sprint_duration_days: Optional[int] = 14
    include_suggestions: bool = True

class TaskOptimizationRequest(BaseModel):
    project_id: str
    task_id: str
    current_status: str
    team_context: Optional[Dict[str, Any]] = None

class WorkflowOptimizationRequest(BaseModel):
    project_id: str
    columns: List[KanbanColumn]
    team_capacity: Optional[Dict[str, Any]] = None
    optimization_goals: List[str] = ["reduce_cycle_time", "balance_workload", "improve_flow"]

class BottleneckAnalysisRequest(BaseModel):
    project_id: str
    columns: List[KanbanColumn]
    time_period_days: Optional[int] = 30
    include_recommendations: bool = True

class TaskRecommendationResponse(BaseModel):
    task_id: str
    recommendations: List[Dict[str, Any]]
    confidence: float
    reasoning: str

class WorkflowOptimizationResponse(BaseModel):
    current_metrics: Dict[str, Any]
    suggested_changes: List[Dict[str, Any]]
    expected_improvements: Dict[str, Any]
    implementation_priority: List[str]

class BottleneckAnalysisResponse(BaseModel):
    bottlenecks: List[Dict[str, Any]]
    impact_analysis: Dict[str, Any]
    recommendations: List[Dict[str, Any]]
    priority_actions: List[str]

@router.post("/analyze-board", response_model=Dict[str, Any])
async def analyze_kanban_board(
    request: KanbanAnalysisRequest,
    current_user: UserResponse = Depends(get_current_user_clerk)
):
    """
    Comprehensive AI analysis of kanban board performance and suggestions
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
                detail="Access denied: You don't have permission to analyze this project's kanban board"
            )
    
    try:
        # Import AI service
        try:
            from ..services.ai_service import get_basic_ai_service
        except ImportError:
            from services.ai_service import get_basic_ai_service
        
        ai_service = get_basic_ai_service()
        
        # Analyze board metrics
        total_tasks = sum(len(col.tasks) for col in request.columns)
        column_loads = {col.title: len(col.tasks) for col in request.columns}
        
        # Calculate flow metrics
        flow_metrics = {
            "total_tasks": total_tasks,
            "column_distribution": column_loads,
            "wip_violations": [],
            "cycle_time_estimate": None,
            "throughput_estimate": None
        }
        
        # Check WIP violations
        for col in request.columns:
            if col.wip_limit and len(col.tasks) > col.wip_limit:
                flow_metrics["wip_violations"].append({
                    "column": col.title,
                    "current": len(col.tasks),
                    "limit": col.wip_limit,
                    "excess": len(col.tasks) - col.wip_limit
                })
        
        # Prepare AI analysis variables
        variables = {
            "board_data": {
                "columns": [col.dict() for col in request.columns],
                "total_tasks": total_tasks,
                "team_size": len(request.team_members),
                "sprint_duration": request.sprint_duration_days
            },
            "flow_metrics": flow_metrics,
            "analysis_goals": ["identify_bottlenecks", "optimize_flow", "balance_workload"],
            "include_recommendations": request.include_suggestions
        }
        
        # Generate AI analysis
        result = await ai_service.generate_completion("kanban_analyzer", variables)
        
        if result.success:
            ai_analysis = result.data
            return {
                "success": True,
                "analysis": {
                    "flow_metrics": flow_metrics,
                    "ai_insights": ai_analysis,
                    "recommendations": ai_analysis.get("recommendations", []),
                    "priority_actions": ai_analysis.get("priority_actions", []),
                    "performance_score": ai_analysis.get("performance_score", 0.7),
                    "improvement_areas": ai_analysis.get("improvement_areas", [])
                },
                "model_used": result.model_used,
                "processing_time": result.processing_time
            }
        else:
            # Fallback analysis
            return {
                "success": True,
                "analysis": {
                    "flow_metrics": flow_metrics,
                    "ai_insights": {
                        "summary": "Basic board analysis completed",
                        "key_findings": [
                            f"Board has {total_tasks} total tasks across {len(request.columns)} columns",
                            f"WIP violations detected: {len(flow_metrics['wip_violations'])}" if flow_metrics['wip_violations'] else "No WIP violations detected"
                        ]
                    },
                    "recommendations": [
                        {"type": "wip_management", "action": "Review WIP limits", "priority": "medium"}
                    ] if flow_metrics['wip_violations'] else [],
                    "priority_actions": ["Monitor task flow", "Balance column loads"],
                    "performance_score": 0.7,
                    "improvement_areas": ["flow_optimization", "workload_balance"]
                },
                "model_used": "fallback",
                "processing_time": 0.1
            }
            
    except Exception as e:
        logger.error(f"Kanban board analysis failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to analyze kanban board: {str(e)}"
        )

@router.post("/optimize-task", response_model=TaskRecommendationResponse)
async def optimize_task(
    request: TaskOptimizationRequest,
    current_user: UserResponse = Depends(get_current_user_clerk)
):
    """
    AI-powered task optimization recommendations
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
                detail="Access denied: You don't have permission to optimize tasks in this project"
            )
    
    try:
        # Import AI service
        try:
            from ..services.ai_service import get_basic_ai_service
        except ImportError:
            from services.ai_service import get_basic_ai_service
        
        ai_service = get_basic_ai_service()
        
        # Get task details from database
        supabase = get_supabase()
        if supabase:
            task_result = supabase.table("tasks").select("*").eq("id", request.task_id).execute()
            task_data = task_result.data[0] if task_result.data else None
        else:
            task_data = None
        
        # Prepare AI variables
        variables = {
            "task_id": request.task_id,
            "current_status": request.current_status,
            "task_details": task_data,
            "team_context": request.team_context or {},
            "optimization_focus": ["assignee_matching", "priority_adjustment", "breakdown_suggestions"]
        }
        
        # Generate AI recommendations
        result = await ai_service.generate_completion("task_optimizer", variables)
        
        if result.success:
            ai_data = result.data
            return TaskRecommendationResponse(
                task_id=request.task_id,
                recommendations=ai_data.get("recommendations", []),
                confidence=ai_data.get("confidence", 0.8),
                reasoning=ai_data.get("reasoning", "AI analysis completed")
            )
        else:
            # Fallback recommendations
            return TaskRecommendationResponse(
                task_id=request.task_id,
                recommendations=[
                    {
                        "type": "status_optimization",
                        "action": f"Consider moving task from {request.current_status}",
                        "priority": "medium",
                        "details": "Review task status for workflow efficiency"
                    }
                ],
                confidence=0.6,
                reasoning="Basic optimization analysis completed"
            )
            
    except Exception as e:
        logger.error(f"Task optimization failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to optimize task: {str(e)}"
        )

@router.post("/detect-bottlenecks", response_model=BottleneckAnalysisResponse)
async def detect_bottlenecks(
    request: BottleneckAnalysisRequest,
    current_user: UserResponse = Depends(get_current_user_clerk)
):
    """
    AI-powered bottleneck detection and resolution recommendations
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
                detail="Access denied: You don't have permission to analyze this project"
            )
    
    try:
        # Import AI service
        try:
            from ..services.ai_service import get_basic_ai_service
        except ImportError:
            from services.ai_service import get_basic_ai_service
        
        ai_service = get_basic_ai_service()
        
        # Analyze bottlenecks
        bottlenecks = []
        
        # Check for overloaded columns
        for col in request.columns:
            if col.wip_limit and len(col.tasks) > col.wip_limit:
                bottlenecks.append({
                    "type": "wip_violation",
                    "location": col.title,
                    "severity": "high" if len(col.tasks) > col.wip_limit * 1.5 else "medium",
                    "details": {
                        "current_tasks": len(col.tasks),
                        "wip_limit": col.wip_limit,
                        "excess": len(col.tasks) - col.wip_limit
                    }
                })
        
        # Check for empty columns (potential flow gaps)
        for col in request.columns:
            if len(col.tasks) == 0 and col.title.lower() not in ['done', 'completed', 'deployed']:
                bottlenecks.append({
                    "type": "flow_gap",
                    "location": col.title,
                    "severity": "low",
                    "details": {"message": "Column appears empty, check for flow issues"}
                })
        
        # Prepare AI analysis variables
        variables = {
            "columns_data": [col.dict() for col in request.columns],
            "time_period": request.time_period_days,
            "detected_bottlenecks": bottlenecks,
            "analysis_depth": "comprehensive" if request.include_recommendations else "basic"
        }
        
        # Generate AI analysis
        result = await ai_service.generate_completion("bottleneck_analyzer", variables)
        
        if result.success:
            ai_analysis = result.data
            return BottleneckAnalysisResponse(
                bottlenecks=bottlenecks + ai_analysis.get("additional_bottlenecks", []),
                impact_analysis=ai_analysis.get("impact_analysis", {}),
                recommendations=ai_analysis.get("recommendations", []),
                priority_actions=ai_analysis.get("priority_actions", [])
            )
        else:
            # Fallback analysis
            recommendations = []
            for bottleneck in bottlenecks:
                if bottleneck["type"] == "wip_violation":
                    recommendations.append({
                        "type": "wip_management",
                        "action": f"Reduce tasks in {bottleneck['location']} column",
                        "priority": bottleneck["severity"],
                        "details": "Consider redistributing tasks or increasing team capacity"
                    })
            
            return BottleneckAnalysisResponse(
                bottlenecks=bottlenecks,
                impact_analysis={"flow_efficiency": "potentially_impacted"},
                recommendations=recommendations,
                priority_actions=["Address WIP violations", "Balance column loads"]
            )
            
    except Exception as e:
        logger.error(f"Bottleneck analysis failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to analyze bottlenecks: {str(e)}"
        )

@router.post("/optimize-workflow", response_model=WorkflowOptimizationResponse)
async def optimize_workflow(
    request: WorkflowOptimizationRequest,
    current_user: UserResponse = Depends(get_current_user_clerk)
):
    """
    AI-powered workflow optimization recommendations
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
                detail="Access denied: You don't have permission to optimize workflows in this project"
            )
    
    try:
        # Import AI service
        try:
            from ..services.ai_service import get_basic_ai_service
        except ImportError:
            from services.ai_service import get_basic_ai_service
        
        ai_service = get_basic_ai_service()
        
        # Calculate current metrics
        total_tasks = sum(len(col.tasks) for col in request.columns)
        column_utilization = {col.title: len(col.tasks) / max(col.wip_limit or len(col.tasks), 1) for col in request.columns}
        
        current_metrics = {
            "total_tasks": total_tasks,
            "column_utilization": column_utilization,
            "average_utilization": sum(column_utilization.values()) / len(column_utilization) if column_utilization else 0,
            "workflow_balance": 1.0 - (max(column_utilization.values()) - min(column_utilization.values())) if column_utilization else 0
        }
        
        # Prepare AI variables
        variables = {
            "workflow_data": [col.dict() for col in request.columns],
            "current_metrics": current_metrics,
            "team_capacity": request.team_capacity or {},
            "optimization_goals": request.optimization_goals,
            "analysis_focus": ["wip_optimization", "flow_improvement", "capacity_balancing"]
        }
        
        # Generate AI optimization suggestions
        result = await ai_service.generate_completion("workflow_optimizer", variables)
        
        if result.success:
            ai_data = result.data
            return WorkflowOptimizationResponse(
                current_metrics=current_metrics,
                suggested_changes=ai_data.get("suggested_changes", []),
                expected_improvements=ai_data.get("expected_improvements", {}),
                implementation_priority=ai_data.get("implementation_priority", [])
            )
        else:
            # Fallback optimization
            suggested_changes = []
            
            # Basic WIP limit optimization
            for col in request.columns:
                if not col.wip_limit and len(col.tasks) > 0:
                    suggested_changes.append({
                        "type": "wip_limit",
                        "target": col.title,
                        "action": f"Set WIP limit to {max(2, len(col.tasks) - 1)}",
                        "reasoning": "Establish flow control"
                    })
            
            return WorkflowOptimizationResponse(
                current_metrics=current_metrics,
                suggested_changes=suggested_changes,
                expected_improvements={"flow_efficiency": "improved", "cycle_time": "reduced"},
                implementation_priority=["Set WIP limits", "Balance column loads"]
            )
            
    except Exception as e:
        logger.error(f"Workflow optimization failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to optimize workflow: {str(e)}"
        )

@router.post("/smart-assignment")
async def smart_task_assignment(
    project_id: str,
    task_id: str,
    team_context: Optional[Dict[str, Any]] = None,
    current_user: UserResponse = Depends(get_current_user_clerk)
):
    """
    AI-powered intelligent task assignment recommendations
    """
    # Validate project access
    validator = get_project_validator()
    if validator:
        has_access = await validator.validate_project_access(
            current_user, 
            project_id, 
            "write"
        )
        if not has_access:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: You don't have permission to assign tasks in this project"
            )
    
    try:
        # Import AI service
        try:
            from ..services.ai_service import get_basic_ai_service
        except ImportError:
            from services.ai_service import get_basic_ai_service
        
        ai_service = get_basic_ai_service()
        
        # Get task and team data
        supabase = get_supabase()
        task_data = None
        team_data = []
        
        if supabase:
            # Get task details
            task_result = supabase.table("tasks").select("*").eq("id", task_id).execute()
            task_data = task_result.data[0] if task_result.data else None
            
            # Get project team members
            team_result = supabase.rpc('get_project_team_members', {'project_uuid': project_id}).execute()
            team_data = team_result.data or []
        
        # Prepare AI variables
        variables = {
            "task_data": task_data,
            "team_members": team_data,
            "team_context": team_context or {},
            "assignment_criteria": ["skill_match", "workload_balance", "availability", "performance_history"]
        }
        
        # Generate AI assignment recommendations
        result = await ai_service.generate_completion("task_assignment_advisor", variables)
        
        if result.success:
            return {
                "success": True,
                "recommendations": result.data.get("recommendations", []),
                "reasoning": result.data.get("reasoning", ""),
                "confidence": result.data.get("confidence", 0.8),
                "model_used": result.model_used
            }
        else:
            # Fallback recommendation
            return {
                "success": True,
                "recommendations": [
                    {
                        "assignee_id": team_data[0]["id"] if team_data else None,
                        "assignee_name": team_data[0]["name"] if team_data else "Available team member",
                        "confidence": 0.6,
                        "reasoning": "Basic availability-based assignment"
                    }
                ] if team_data else [],
                "reasoning": "Fallback assignment based on team availability",
                "confidence": 0.6,
                "model_used": "fallback"
            }
            
    except Exception as e:
        logger.error(f"Smart task assignment failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate assignment recommendations: {str(e)}"
        ) 