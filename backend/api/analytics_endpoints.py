"""
Analytics API Endpoints for AgileForge
Provides comprehensive project insights and AI-powered analytics
"""

import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from backend.auth.enhanced_auth import get_current_active_user, require_view_analytics, require_admin
from backend.services.analytics_service import AnalyticsService, get_analytics_service

logger = logging.getLogger(__name__)

# Create router
analytics_router = APIRouter(prefix="/analytics", tags=["Analytics"])

@analytics_router.get("/dashboard/{project_id}")
async def get_project_dashboard(
    project_id: str,
    days: int = Query(30, description="Number of days to analyze"),
    current_user: dict = Depends(require_view_analytics),
    analytics_service: AnalyticsService = Depends(get_analytics_service)
):
    """Get comprehensive project dashboard with analytics"""
    try:
        dashboard_data = await analytics_service.get_project_dashboard(project_id, days)
        
        return {
            "success": True,
            "data": dashboard_data
        }
        
    except Exception as e:
        logger.error(f"Error getting project dashboard: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@analytics_router.get("/velocity/{project_id}")
async def get_project_velocity(
    project_id: str,
    days: int = Query(30, description="Number of days to analyze"),
    current_user: dict = Depends(require_view_analytics),
    analytics_service: AnalyticsService = Depends(get_analytics_service)
):
    """Get project velocity metrics"""
    try:
        from datetime import datetime, timedelta
        
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=days)
        
        velocity_data = await analytics_service._calculate_velocity(project_id, start_date, end_date)
        
        return {
            "success": True,
            "project_id": project_id,
            "period": {"start": start_date.isoformat(), "end": end_date.isoformat()},
            "velocity": velocity_data
        }
        
    except Exception as e:
        logger.error(f"Error getting project velocity: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@analytics_router.get("/burndown/{project_id}")
async def get_project_burndown(
    project_id: str,
    days: int = Query(30, description="Number of days to analyze"),
    current_user: dict = Depends(require_view_analytics),
    analytics_service: AnalyticsService = Depends(get_analytics_service)
):
    """Get project burndown chart data"""
    try:
        from datetime import datetime, timedelta
        
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=days)
        
        burndown_data = await analytics_service._calculate_burndown(project_id, start_date, end_date)
        
        return {
            "success": True,
            "project_id": project_id,
            "period": {"start": start_date.isoformat(), "end": end_date.isoformat()},
            "burndown": burndown_data
        }
        
    except Exception as e:
        logger.error(f"Error getting project burndown: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@analytics_router.get("/team-performance/{project_id}")
async def get_team_performance(
    project_id: str,
    days: int = Query(30, description="Number of days to analyze"),
    current_user: dict = Depends(require_view_analytics),
    analytics_service: AnalyticsService = Depends(get_analytics_service)
):
    """Get team performance metrics for a project"""
    try:
        from datetime import datetime, timedelta
        
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=days)
        
        team_performance = await analytics_service._calculate_team_performance(project_id, start_date, end_date)
        
        return {
            "success": True,
            "project_id": project_id,
            "period": {"start": start_date.isoformat(), "end": end_date.isoformat()},
            "team_performance": team_performance
        }
        
    except Exception as e:
        logger.error(f"Error getting team performance: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@analytics_router.get("/quality/{project_id}")
async def get_quality_metrics(
    project_id: str,
    days: int = Query(30, description="Number of days to analyze"),
    current_user: dict = Depends(require_view_analytics),
    analytics_service: AnalyticsService = Depends(get_analytics_service)
):
    """Get quality metrics for a project"""
    try:
        from datetime import datetime, timedelta
        
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=days)
        
        quality_metrics = await analytics_service._calculate_quality_metrics(project_id, start_date, end_date)
        
        return {
            "success": True,
            "project_id": project_id,
            "period": {"start": start_date.isoformat(), "end": end_date.isoformat()},
            "quality": quality_metrics
        }
        
    except Exception as e:
        logger.error(f"Error getting quality metrics: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@analytics_router.get("/insights/{project_id}")
async def get_project_insights(
    project_id: str,
    days: int = Query(30, description="Number of days to analyze"),
    current_user: dict = Depends(require_view_analytics),
    analytics_service: AnalyticsService = Depends(get_analytics_service)
):
    """Get AI-powered project insights"""
    try:
        from datetime import datetime, timedelta
        
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=days)
        
        # Get required data for insights
        metrics = await analytics_service._calculate_project_metrics(project_id, start_date, end_date)
        velocity_data = await analytics_service._calculate_velocity(project_id, start_date, end_date)
        team_performance = await analytics_service._calculate_team_performance(project_id, start_date, end_date)
        
        # Generate insights
        insights = await analytics_service._generate_project_insights(
            project_id, metrics, velocity_data, team_performance
        )
        
        return {
            "success": True,
            "project_id": project_id,
            "period": {"start": start_date.isoformat(), "end": end_date.isoformat()},
            "insights": [
                {
                    "insight_type": insight.insight_type,
                    "title": insight.title,
                    "description": insight.description,
                    "severity": insight.severity,
                    "recommendations": insight.recommendations,
                    "data": insight.data
                }
                for insight in insights
            ],
            "total_insights": len(insights)
        }
        
    except Exception as e:
        logger.error(f"Error getting project insights: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@analytics_router.get("/team")
async def get_team_analytics(
    team_id: Optional[str] = Query(None, description="Team ID to filter by"),
    days: int = Query(30, description="Number of days to analyze"),
    current_user: dict = Depends(require_view_analytics),
    analytics_service: AnalyticsService = Depends(get_analytics_service)
):
    """Get team-wide analytics across all projects"""
    try:
        team_analytics = await analytics_service.get_team_analytics(team_id, days)
        
        return {
            "success": True,
            "team_id": team_id,
            "analytics": team_analytics
        }
        
    except Exception as e:
        logger.error(f"Error getting team analytics: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@analytics_router.get("/export/{project_id}")
async def export_analytics_data(
    project_id: str,
    format: str = Query("json", description="Export format: json or csv"),
    days: int = Query(30, description="Number of days to analyze"),
    current_user: dict = Depends(require_view_analytics),
    analytics_service: AnalyticsService = Depends(get_analytics_service)
):
    """Export analytics data in various formats"""
    try:
        exported_data = await analytics_service.export_analytics_data(project_id, format)
        
        return {
            "success": True,
            "project_id": project_id,
            "format": format,
            "data": exported_data
        }
        
    except Exception as e:
        logger.error(f"Error exporting analytics data: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@analytics_router.get("/metrics/summary")
async def get_metrics_summary(
    current_user: dict = Depends(require_view_analytics),
    analytics_service: AnalyticsService = Depends(get_analytics_service)
):
    """Get high-level metrics summary across all projects"""
    try:
        # Get team analytics without team filter to get all projects
        team_analytics = await analytics_service.get_team_analytics(None, 30)
        
        summary = {
            "total_projects": team_analytics.get("total_projects", 0),
            "active_projects": team_analytics.get("active_projects", 0),
            "total_stories": team_analytics.get("total_stories", 0),
            "completed_stories": team_analytics.get("completed_stories", 0),
            "completion_rate": team_analytics.get("completion_rate", 0),
            "average_velocity": team_analytics.get("average_velocity", 0),
            "total_points": team_analytics.get("total_points", 0),
            "completed_points": team_analytics.get("completed_points", 0)
        }
        
        return {
            "success": True,
            "summary": summary
        }
        
    except Exception as e:
        logger.error(f"Error getting metrics summary: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@analytics_router.get("/trends/velocity")
async def get_velocity_trends(
    days: int = Query(90, description="Number of days to analyze"),
    current_user: dict = Depends(require_view_analytics),
    analytics_service: AnalyticsService = Depends(get_analytics_service)
):
    """Get velocity trends across all projects"""
    try:
        # This would require additional implementation to aggregate velocity across projects
        # For now, return team analytics
        team_analytics = await analytics_service.get_team_analytics(None, days)
        
        velocity_trends = {
            "average_velocity": team_analytics.get("average_velocity", 0),
            "projects_data": team_analytics.get("projects_data", [])
        }
        
        return {
            "success": True,
            "period_days": days,
            "velocity_trends": velocity_trends
        }
        
    except Exception as e:
        logger.error(f"Error getting velocity trends: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@analytics_router.get("/health")
async def analytics_health_check(
    current_user: dict = Depends(get_current_active_user)
):
    """Health check for analytics service"""
    try:
        return {
            "success": True,
            "service": "analytics",
            "status": "healthy",
            "features": [
                "project_dashboard",
                "velocity_tracking",
                "burndown_charts",
                "team_performance",
                "quality_metrics",
                "ai_insights",
                "data_export"
            ]
        }
        
    except Exception as e:
        logger.error(f"Analytics health check failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@analytics_router.post("/refresh/{project_id}")
async def refresh_project_analytics(
    project_id: str,
    current_user: dict = Depends(require_view_analytics),
    analytics_service: AnalyticsService = Depends(get_analytics_service)
):
    """Manually refresh analytics data for a project"""
    try:
        # Force refresh by getting fresh dashboard data
        dashboard_data = await analytics_service.get_project_dashboard(project_id, 30)
        
        return {
            "success": True,
            "message": "Analytics data refreshed successfully",
            "project_id": project_id,
            "refreshed_at": dashboard_data["generated_at"]
        }
        
    except Exception as e:
        logger.error(f"Error refreshing analytics: {e}")
        raise HTTPException(status_code=500, detail=str(e)) 