"""
Scheduled Jobs Manager for AgileForge
Handles automated AI-powered features and maintenance tasks using Supabase pg_cron
"""

import os
import logging
import asyncio
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException, status, Depends, BackgroundTasks
from pydantic import BaseModel

from ..auth.enhanced_auth import require_admin, get_current_active_user, UserInDB
from ..database.supabase_client import get_supabase

logger = logging.getLogger(__name__)

# Job models
class CronJobStatus(BaseModel):
    job_name: str
    last_run: Optional[datetime] = None
    next_run: Optional[datetime] = None
    status: str = "active"  # active, paused, error
    error_message: Optional[str] = None

class JobExecutionResult(BaseModel):
    job_name: str
    execution_time: datetime
    success: bool
    duration_seconds: float
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None

# Create router
cron_router = APIRouter(prefix="/cron", tags=["Scheduled Jobs"])

class ScheduledJobsManager:
    """Manager for all scheduled jobs"""
    
    def __init__(self):
        self.supabase = get_supabase()
        self.jobs = {
            "ai_sprint_analysis": {
                "function": self.ai_sprint_analysis,
                "schedule": "0 9 * * 1",  # Every Monday at 9 AM
                "description": "Generate AI-powered sprint analysis reports"
            },
            "ai_story_suggestions": {
                "function": self.ai_story_suggestions,
                "schedule": "0 10 * * *",  # Daily at 10 AM
                "description": "Generate AI story suggestions for active epics"
            },
            "burndown_chart_update": {
                "function": self.update_burndown_charts,
                "schedule": "0 */6 * * *",  # Every 6 hours
                "description": "Update burndown chart data for active sprints"
            },
            "team_productivity_analysis": {
                "function": self.team_productivity_analysis,
                "schedule": "0 8 * * 1",  # Every Monday at 8 AM
                "description": "Analyze team productivity and generate insights"
            },
            "overdue_tasks_notification": {
                "function": self.overdue_tasks_notification,
                "schedule": "0 9 * * *",  # Daily at 9 AM
                "description": "Send notifications for overdue tasks"
            },
            "data_cleanup": {
                "function": self.data_cleanup,
                "schedule": "0 2 * * 0",  # Every Sunday at 2 AM
                "description": "Clean up old data and optimize database"
            },
            "ai_epic_completion_prediction": {
                "function": self.ai_epic_completion_prediction,
                "schedule": "0 11 * * 1,3,5",  # Monday, Wednesday, Friday at 11 AM
                "description": "Predict epic completion dates using AI"
            },
            "team_workload_balancing": {
                "function": self.team_workload_balancing,
                "schedule": "0 14 * * 1",  # Every Monday at 2 PM
                "description": "Analyze and suggest workload balancing"
            }
        }
    
    async def setup_cron_jobs(self):
        """Set up all cron jobs in Supabase"""
        try:
            for job_name, job_config in self.jobs.items():
                # Create cron job in Supabase
                sql = f"""
                SELECT cron.schedule(
                    '{job_name}',
                    '{job_config["schedule"]}',
                    $$
                    SELECT net.http_post(
                        url := '{os.getenv("API_BASE_URL", "http://localhost:8000")}/cron/execute/{job_name}',
                        headers := '{{"Content-Type": "application/json", "Authorization": "Bearer {os.getenv("CRON_API_KEY", "")}"}}',
                        body := '{{"job_name": "{job_name}"}}'
                    );
                    $$
                );
                """
                
                # Execute the SQL to create the cron job
                # Note: This would typically be done through a database migration
                logger.info(f"Cron job setup SQL for {job_name}: {sql}")
                
        except Exception as e:
            logger.error(f"Error setting up cron jobs: {e}")
    
    async def ai_sprint_analysis(self) -> Dict[str, Any]:
        """Generate AI-powered sprint analysis reports"""
        try:
            start_time = datetime.utcnow()
            
            # Get active sprints
            sprints_result = self.supabase.table("sprints").select("*").eq("status", "active").execute()
            
            analysis_results = []
            
            for sprint in sprints_result.data:
                # Get sprint stories
                stories_result = self.supabase.table("stories").select("*").eq("sprint_id", sprint["id"]).execute()
                
                # Calculate sprint metrics
                total_stories = len(stories_result.data)
                completed_stories = len([s for s in stories_result.data if s.get("status") == "done"])
                in_progress_stories = len([s for s in stories_result.data if s.get("status") == "in_progress"])
                
                completion_rate = (completed_stories / total_stories * 100) if total_stories > 0 else 0
                
                # AI Analysis (simplified - would use actual AI service)
                ai_insights = await self.generate_sprint_insights(sprint, stories_result.data)
                
                analysis = {
                    "sprint_id": sprint["id"],
                    "sprint_name": sprint.get("name", "Unnamed Sprint"),
                    "total_stories": total_stories,
                    "completed_stories": completed_stories,
                    "in_progress_stories": in_progress_stories,
                    "completion_rate": completion_rate,
                    "ai_insights": ai_insights,
                    "generated_at": datetime.utcnow().isoformat()
                }
                
                # Store analysis in database
                self.supabase.table("sprint_analyses").insert(analysis).execute()
                analysis_results.append(analysis)
            
            duration = (datetime.utcnow() - start_time).total_seconds()
            
            return {
                "sprints_analyzed": len(analysis_results),
                "duration_seconds": duration,
                "analyses": analysis_results
            }
            
        except Exception as e:
            logger.error(f"Error in AI sprint analysis: {e}")
            raise
    
    async def ai_story_suggestions(self) -> Dict[str, Any]:
        """Generate AI story suggestions for active epics"""
        try:
            start_time = datetime.utcnow()
            
            # Get active epics with few stories
            epics_result = self.supabase.rpc("get_epics_needing_stories").execute()
            
            suggestions_generated = 0
            
            for epic in epics_result.data:
                # Generate AI story suggestions
                suggestions = await self.generate_story_suggestions(epic)
                
                for suggestion in suggestions:
                    suggestion_data = {
                        "epic_id": epic["id"],
                        "suggested_name": suggestion["name"],
                        "suggested_description": suggestion["description"],
                        "suggested_acceptance_criteria": suggestion.get("acceptance_criteria"),
                        "ai_confidence": suggestion.get("confidence", 0.8),
                        "created_at": datetime.utcnow().isoformat(),
                        "status": "pending"
                    }
                    
                    self.supabase.table("story_suggestions").insert(suggestion_data).execute()
                    suggestions_generated += 1
            
            duration = (datetime.utcnow() - start_time).total_seconds()
            
            return {
                "epics_processed": len(epics_result.data),
                "suggestions_generated": suggestions_generated,
                "duration_seconds": duration
            }
            
        except Exception as e:
            logger.error(f"Error in AI story suggestions: {e}")
            raise
    
    async def update_burndown_charts(self) -> Dict[str, Any]:
        """Update burndown chart data for active sprints"""
        try:
            start_time = datetime.utcnow()
            
            # Get active sprints
            sprints_result = self.supabase.table("sprints").select("*").eq("status", "active").execute()
            
            charts_updated = 0
            
            for sprint in sprints_result.data:
                # Calculate current burndown data
                stories_result = self.supabase.table("stories").select("*").eq("sprint_id", sprint["id"]).execute()
                
                total_points = sum(story.get("story_points", 0) for story in stories_result.data)
                completed_points = sum(
                    story.get("story_points", 0) 
                    for story in stories_result.data 
                    if story.get("status") == "done"
                )
                remaining_points = total_points - completed_points
                
                # Create burndown data point
                burndown_data = {
                    "sprint_id": sprint["id"],
                    "date": datetime.utcnow().date().isoformat(),
                    "remaining_points": remaining_points,
                    "completed_points": completed_points,
                    "total_points": total_points,
                    "created_at": datetime.utcnow().isoformat()
                }
                
                # Insert or update burndown data
                self.supabase.table("burndown_data").upsert(burndown_data).execute()
                charts_updated += 1
            
            duration = (datetime.utcnow() - start_time).total_seconds()
            
            return {
                "charts_updated": charts_updated,
                "duration_seconds": duration
            }
            
        except Exception as e:
            logger.error(f"Error updating burndown charts: {e}")
            raise
    
    async def team_productivity_analysis(self) -> Dict[str, Any]:
        """Analyze team productivity and generate insights"""
        try:
            start_time = datetime.utcnow()
            
            # Get team productivity data for the last week
            week_ago = (datetime.utcnow() - timedelta(days=7)).isoformat()
            
            # Get completed stories in the last week
            completed_stories = self.supabase.table("stories").select("*").eq("status", "done").gte("updated_at", week_ago).execute()
            
            # Analyze by assignee
            productivity_by_user = {}
            
            for story in completed_stories.data:
                assignee_id = story.get("assignee_id")
                if assignee_id:
                    if assignee_id not in productivity_by_user:
                        productivity_by_user[assignee_id] = {
                            "stories_completed": 0,
                            "total_points": 0,
                            "avg_completion_time": 0
                        }
                    
                    productivity_by_user[assignee_id]["stories_completed"] += 1
                    productivity_by_user[assignee_id]["total_points"] += story.get("story_points", 0)
            
            # Generate AI insights for productivity
            productivity_insights = await self.generate_productivity_insights(productivity_by_user)
            
            # Store analysis
            analysis_data = {
                "analysis_date": datetime.utcnow().date().isoformat(),
                "period_start": week_ago,
                "period_end": datetime.utcnow().isoformat(),
                "productivity_data": productivity_by_user,
                "ai_insights": productivity_insights,
                "created_at": datetime.utcnow().isoformat()
            }
            
            self.supabase.table("productivity_analyses").insert(analysis_data).execute()
            
            duration = (datetime.utcnow() - start_time).total_seconds()
            
            return {
                "users_analyzed": len(productivity_by_user),
                "stories_analyzed": len(completed_stories.data),
                "duration_seconds": duration,
                "insights": productivity_insights
            }
            
        except Exception as e:
            logger.error(f"Error in team productivity analysis: {e}")
            raise
    
    async def overdue_tasks_notification(self) -> Dict[str, Any]:
        """Send notifications for overdue tasks"""
        try:
            start_time = datetime.utcnow()
            
            # Get overdue stories
            today = datetime.utcnow().date().isoformat()
            overdue_stories = self.supabase.table("stories").select("*").lt("due_date", today).neq("status", "done").execute()
            
            notifications_sent = 0
            
            for story in overdue_stories.data:
                if story.get("assignee_id"):
                    # Send notification
                    notification_data = {
                        "user_id": story["assignee_id"],
                        "title": "Overdue Task",
                        "message": f"Story '{story.get('name', 'Untitled')}' is overdue",
                        "type": "warning",
                        "data": {
                            "story_id": story["id"],
                            "type": "overdue_task",
                            "due_date": story.get("due_date")
                        },
                        "created_at": datetime.utcnow().isoformat(),
                        "read": False
                    }
                    
                    self.supabase.table("notifications").insert(notification_data).execute()
                    notifications_sent += 1
            
            duration = (datetime.utcnow() - start_time).total_seconds()
            
            return {
                "overdue_stories": len(overdue_stories.data),
                "notifications_sent": notifications_sent,
                "duration_seconds": duration
            }
            
        except Exception as e:
            logger.error(f"Error in overdue tasks notification: {e}")
            raise
    
    async def data_cleanup(self) -> Dict[str, Any]:
        """Clean up old data and optimize database"""
        try:
            start_time = datetime.utcnow()
            
            # Clean up old notifications (older than 30 days)
            thirty_days_ago = (datetime.utcnow() - timedelta(days=30)).isoformat()
            old_notifications = self.supabase.table("notifications").delete().lt("created_at", thirty_days_ago).execute()
            
            # Clean up old job execution logs (older than 90 days)
            ninety_days_ago = (datetime.utcnow() - timedelta(days=90)).isoformat()
            old_job_logs = self.supabase.table("job_executions").delete().lt("execution_time", ninety_days_ago).execute()
            
            # Clean up old story suggestions that were rejected (older than 7 days)
            week_ago = (datetime.utcnow() - timedelta(days=7)).isoformat()
            old_suggestions = self.supabase.table("story_suggestions").delete().eq("status", "rejected").lt("created_at", week_ago).execute()
            
            duration = (datetime.utcnow() - start_time).total_seconds()
            
            return {
                "notifications_cleaned": len(old_notifications.data) if old_notifications.data else 0,
                "job_logs_cleaned": len(old_job_logs.data) if old_job_logs.data else 0,
                "suggestions_cleaned": len(old_suggestions.data) if old_suggestions.data else 0,
                "duration_seconds": duration
            }
            
        except Exception as e:
            logger.error(f"Error in data cleanup: {e}")
            raise
    
    async def ai_epic_completion_prediction(self) -> Dict[str, Any]:
        """Predict epic completion dates using AI"""
        try:
            start_time = datetime.utcnow()
            
            # Get active epics
            epics_result = self.supabase.table("epics").select("*").eq("status", "active").execute()
            
            predictions_generated = 0
            
            for epic in epics_result.data:
                # Get epic stories and their completion data
                stories_result = self.supabase.table("stories").select("*").eq("epic_id", epic["id"]).execute()
                
                # Generate AI prediction
                prediction = await self.predict_epic_completion(epic, stories_result.data)
                
                if prediction:
                    prediction_data = {
                        "epic_id": epic["id"],
                        "predicted_completion_date": prediction["completion_date"],
                        "confidence_score": prediction["confidence"],
                        "factors": prediction["factors"],
                        "created_at": datetime.utcnow().isoformat()
                    }
                    
                    self.supabase.table("epic_predictions").insert(prediction_data).execute()
                    predictions_generated += 1
            
            duration = (datetime.utcnow() - start_time).total_seconds()
            
            return {
                "epics_analyzed": len(epics_result.data),
                "predictions_generated": predictions_generated,
                "duration_seconds": duration
            }
            
        except Exception as e:
            logger.error(f"Error in epic completion prediction: {e}")
            raise
    
    async def team_workload_balancing(self) -> Dict[str, Any]:
        """Analyze and suggest workload balancing"""
        try:
            start_time = datetime.utcnow()
            
            # Get current workload for all active users
            active_users = self.supabase.table("users").select("*").eq("is_active", True).execute()
            
            workload_analysis = {}
            
            for user in active_users.data:
                # Get assigned stories
                assigned_stories = self.supabase.table("stories").select("*").eq("assignee_id", user["id"]).neq("status", "done").execute()
                
                total_points = sum(story.get("story_points", 0) for story in assigned_stories.data)
                story_count = len(assigned_stories.data)
                
                workload_analysis[user["id"]] = {
                    "user_name": user.get("name", "Unknown"),
                    "total_points": total_points,
                    "story_count": story_count,
                    "stories": assigned_stories.data
                }
            
            # Generate balancing suggestions
            balancing_suggestions = await self.generate_workload_suggestions(workload_analysis)
            
            # Store analysis
            analysis_data = {
                "analysis_date": datetime.utcnow().date().isoformat(),
                "workload_data": workload_analysis,
                "suggestions": balancing_suggestions,
                "created_at": datetime.utcnow().isoformat()
            }
            
            self.supabase.table("workload_analyses").insert(analysis_data).execute()
            
            duration = (datetime.utcnow() - start_time).total_seconds()
            
            return {
                "users_analyzed": len(workload_analysis),
                "suggestions_generated": len(balancing_suggestions),
                "duration_seconds": duration
            }
            
        except Exception as e:
            logger.error(f"Error in workload balancing: {e}")
            raise
    
    # AI Helper Methods (simplified implementations)
    async def generate_sprint_insights(self, sprint: Dict[str, Any], stories: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Generate AI insights for sprint analysis"""
        # Simplified AI analysis - in production, this would use actual AI services
        insights = {
            "velocity_trend": "stable",
            "risk_factors": [],
            "recommendations": []
        }
        
        # Analyze completion rate
        total_stories = len(stories)
        completed_stories = len([s for s in stories if s.get("status") == "done"])
        completion_rate = (completed_stories / total_stories * 100) if total_stories > 0 else 0
        
        if completion_rate < 50:
            insights["risk_factors"].append("Low completion rate")
            insights["recommendations"].append("Consider reducing scope or extending sprint")
        
        # Analyze story distribution
        high_priority_stories = len([s for s in stories if s.get("priority") in ["high", "critical"]])
        if high_priority_stories > total_stories * 0.7:
            insights["risk_factors"].append("Too many high-priority stories")
            insights["recommendations"].append("Balance story priorities")
        
        return insights
    
    async def generate_story_suggestions(self, epic: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Generate AI story suggestions for an epic"""
        # Simplified story generation - in production, this would use actual AI
        suggestions = [
            {
                "name": f"User authentication for {epic.get('name', 'feature')}",
                "description": "Implement user authentication and authorization",
                "acceptance_criteria": "Users can log in and access protected features",
                "confidence": 0.85
            },
            {
                "name": f"Data validation for {epic.get('name', 'feature')}",
                "description": "Add comprehensive data validation",
                "acceptance_criteria": "All user inputs are validated and sanitized",
                "confidence": 0.80
            }
        ]
        
        return suggestions
    
    async def generate_productivity_insights(self, productivity_data: Dict[str, Any]) -> Dict[str, Any]:
        """Generate AI insights for productivity analysis"""
        insights = {
            "top_performers": [],
            "improvement_areas": [],
            "team_trends": "stable"
        }
        
        # Find top performers
        sorted_users = sorted(
            productivity_data.items(),
            key=lambda x: x[1]["total_points"],
            reverse=True
        )
        
        if sorted_users:
            insights["top_performers"] = [user_id for user_id, _ in sorted_users[:3]]
        
        return insights
    
    async def predict_epic_completion(self, epic: Dict[str, Any], stories: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        """Predict epic completion date using AI"""
        if not stories:
            return None
        
        # Simplified prediction logic
        total_stories = len(stories)
        completed_stories = len([s for s in stories if s.get("status") == "done"])
        remaining_stories = total_stories - completed_stories
        
        if remaining_stories == 0:
            return None
        
        # Estimate based on average completion rate
        avg_completion_time = 3  # days per story (simplified)
        estimated_days = remaining_stories * avg_completion_time
        
        predicted_date = (datetime.utcnow() + timedelta(days=estimated_days)).date().isoformat()
        
        return {
            "completion_date": predicted_date,
            "confidence": 0.75,
            "factors": {
                "remaining_stories": remaining_stories,
                "estimated_days": estimated_days,
                "completion_rate": completed_stories / total_stories if total_stories > 0 else 0
            }
        }
    
    async def generate_workload_suggestions(self, workload_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Generate workload balancing suggestions"""
        suggestions = []
        
        # Find overloaded and underloaded users
        avg_points = sum(data["total_points"] for data in workload_data.values()) / len(workload_data)
        
        overloaded = [(user_id, data) for user_id, data in workload_data.items() if data["total_points"] > avg_points * 1.5]
        underloaded = [(user_id, data) for user_id, data in workload_data.items() if data["total_points"] < avg_points * 0.5]
        
        for user_id, data in overloaded:
            suggestions.append({
                "type": "redistribute",
                "from_user": user_id,
                "reason": f"User has {data['total_points']} points (above average of {avg_points:.1f})",
                "recommendation": "Consider redistributing some stories to less loaded team members"
            })
        
        return suggestions

# Global instance
jobs_manager = ScheduledJobsManager()

# API Endpoints
@cron_router.post("/execute/{job_name}")
async def execute_job(
    job_name: str,
    background_tasks: BackgroundTasks
):
    """Execute a specific cron job"""
    if job_name not in jobs_manager.jobs:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job '{job_name}' not found"
        )
    
    # Execute job in background
    background_tasks.add_task(run_job, job_name)
    
    return {"message": f"Job '{job_name}' started", "status": "running"}

@cron_router.get("/jobs", response_model=List[Dict[str, Any]])
async def list_jobs(
    current_user: UserInDB = Depends(require_admin)
) -> List[Dict[str, Any]]:
    """List all available cron jobs"""
    jobs_list = []
    
    for job_name, job_config in jobs_manager.jobs.items():
        # Get last execution
        last_execution = jobs_manager.supabase.table("job_executions").select("*").eq("job_name", job_name).order("execution_time", desc=True).limit(1).execute()
        
        job_info = {
            "name": job_name,
            "description": job_config["description"],
            "schedule": job_config["schedule"],
            "last_execution": last_execution.data[0] if last_execution.data else None
        }
        
        jobs_list.append(job_info)
    
    return jobs_list

@cron_router.get("/jobs/{job_name}/history")
async def get_job_history(
    job_name: str,
    limit: int = 10,
    current_user: UserInDB = Depends(require_admin)
):
    """Get execution history for a specific job"""
    if job_name not in jobs_manager.jobs:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job '{job_name}' not found"
        )
    
    history = jobs_manager.supabase.table("job_executions").select("*").eq("job_name", job_name).order("execution_time", desc=True).limit(limit).execute()
    
    return {
        "job_name": job_name,
        "executions": history.data
    }

@cron_router.post("/jobs/{job_name}/run")
async def manual_run_job(
    job_name: str,
    background_tasks: BackgroundTasks,
    current_user: UserInDB = Depends(require_admin)
):
    """Manually trigger a job execution"""
    if job_name not in jobs_manager.jobs:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job '{job_name}' not found"
        )
    
    # Execute job in background
    background_tasks.add_task(run_job, job_name, manual=True)
    
    return {"message": f"Job '{job_name}' manually triggered", "status": "running"}

async def run_job(job_name: str, manual: bool = False):
    """Run a specific job and log the execution"""
    start_time = datetime.utcnow()
    
    try:
        # Get job function
        job_function = jobs_manager.jobs[job_name]["function"]
        
        # Execute job
        result = await job_function()
        
        # Log successful execution
        execution_log = JobExecutionResult(
            job_name=job_name,
            execution_time=start_time,
            success=True,
            duration_seconds=(datetime.utcnow() - start_time).total_seconds(),
            result=result
        )
        
        logger.info(f"Job '{job_name}' completed successfully in {execution_log.duration_seconds:.2f}s")
        
    except Exception as e:
        # Log failed execution
        execution_log = JobExecutionResult(
            job_name=job_name,
            execution_time=start_time,
            success=False,
            duration_seconds=(datetime.utcnow() - start_time).total_seconds(),
            error=str(e)
        )
        
        logger.error(f"Job '{job_name}' failed: {e}")
    
    # Store execution log
    try:
        log_data = execution_log.dict()
        log_data["manual_trigger"] = manual
        jobs_manager.supabase.table("job_executions").insert(log_data).execute()
    except Exception as e:
        logger.error(f"Failed to log job execution: {e}")

# Health check
@cron_router.get("/health")
async def cron_health_check():
    """Check cron system health"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "total_jobs": len(jobs_manager.jobs),
        "jobs": list(jobs_manager.jobs.keys())
    } 