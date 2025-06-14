"""
Advanced Analytics Service for AgileForge
Provides comprehensive project insights and AI-powered analytics
"""

import logging
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timedelta
from supabase import Client
import json
from dataclasses import dataclass
from enum import Enum
import statistics

logger = logging.getLogger(__name__)

class MetricType(Enum):
    VELOCITY = "velocity"
    BURNDOWN = "burndown"
    CYCLE_TIME = "cycle_time"
    THROUGHPUT = "throughput"
    QUALITY = "quality"
    TEAM_PERFORMANCE = "team_performance"

@dataclass
class AnalyticsMetric:
    name: str
    value: float
    unit: str
    trend: str  # "up", "down", "stable"
    change_percentage: float
    timestamp: datetime

@dataclass
class ProjectInsight:
    project_id: str
    insight_type: str
    title: str
    description: str
    severity: str  # "info", "warning", "critical"
    recommendations: List[str]
    data: Dict[str, Any]

class AnalyticsService:
    """Service for generating project analytics and insights"""
    
    def __init__(self, supabase_client: Client):
        self.supabase = supabase_client
        
    async def get_project_dashboard(self, project_id: str, days: int = 30) -> Dict[str, Any]:
        """Get comprehensive project dashboard data"""
        try:
            end_date = datetime.utcnow()
            start_date = end_date - timedelta(days=days)
            
            # Get basic project metrics
            metrics = await self._calculate_project_metrics(project_id, start_date, end_date)
            
            # Get velocity data
            velocity_data = await self._calculate_velocity(project_id, start_date, end_date)
            
            # Get burndown data
            burndown_data = await self._calculate_burndown(project_id, start_date, end_date)
            
            # Get team performance
            team_performance = await self._calculate_team_performance(project_id, start_date, end_date)
            
            # Get quality metrics
            quality_metrics = await self._calculate_quality_metrics(project_id, start_date, end_date)
            
            # Generate insights
            insights = await self._generate_project_insights(project_id, metrics, velocity_data, team_performance)
            
            return {
                "project_id": project_id,
                "period": {"start": start_date.isoformat(), "end": end_date.isoformat()},
                "metrics": metrics,
                "velocity": velocity_data,
                "burndown": burndown_data,
                "team_performance": team_performance,
                "quality": quality_metrics,
                "insights": insights,
                "generated_at": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error generating project dashboard: {e}")
            raise
            
    async def _calculate_project_metrics(self, project_id: str, start_date: datetime, end_date: datetime) -> Dict[str, AnalyticsMetric]:
        """Calculate basic project metrics"""
        try:
            # Get stories data
            stories_result = self.supabase.table("stories").select("*").eq("project_id", project_id).execute()
            stories = stories_result.data
            
            # Get epics data
            epics_result = self.supabase.table("epics").select("*").eq("project_id", project_id).execute()
            epics = epics_result.data
            
            # Calculate metrics
            total_stories = len(stories)
            completed_stories = len([s for s in stories if s.get("status") == "done"])
            in_progress_stories = len([s for s in stories if s.get("status") == "in_progress"])
            
            total_epics = len(epics)
            completed_epics = len([e for e in epics if e.get("status") == "completed"])
            
            # Calculate story points
            total_points = sum(s.get("story_points", 0) for s in stories if s.get("story_points"))
            completed_points = sum(s.get("story_points", 0) for s in stories if s.get("status") == "done" and s.get("story_points"))
            
            # Calculate completion rate
            completion_rate = (completed_stories / total_stories * 100) if total_stories > 0 else 0
            
            # Calculate average cycle time
            cycle_times = []
            for story in stories:
                if story.get("status") == "done" and story.get("completed_at") and story.get("started_at"):
                    start = datetime.fromisoformat(story["started_at"].replace("Z", "+00:00"))
                    end = datetime.fromisoformat(story["completed_at"].replace("Z", "+00:00"))
                    cycle_times.append((end - start).days)
                    
            avg_cycle_time = statistics.mean(cycle_times) if cycle_times else 0
            
            return {
                "total_stories": AnalyticsMetric("Total Stories", total_stories, "count", "stable", 0, datetime.utcnow()),
                "completed_stories": AnalyticsMetric("Completed Stories", completed_stories, "count", "up", 0, datetime.utcnow()),
                "completion_rate": AnalyticsMetric("Completion Rate", completion_rate, "%", "up", 0, datetime.utcnow()),
                "total_points": AnalyticsMetric("Total Story Points", total_points, "points", "stable", 0, datetime.utcnow()),
                "completed_points": AnalyticsMetric("Completed Points", completed_points, "points", "up", 0, datetime.utcnow()),
                "avg_cycle_time": AnalyticsMetric("Average Cycle Time", avg_cycle_time, "days", "down", 0, datetime.utcnow()),
                "total_epics": AnalyticsMetric("Total Epics", total_epics, "count", "stable", 0, datetime.utcnow()),
                "completed_epics": AnalyticsMetric("Completed Epics", completed_epics, "count", "up", 0, datetime.utcnow())
            }
            
        except Exception as e:
            logger.error(f"Error calculating project metrics: {e}")
            return {}
            
    async def _calculate_velocity(self, project_id: str, start_date: datetime, end_date: datetime) -> Dict[str, Any]:
        """Calculate team velocity over time"""
        try:
            # Get completed stories with completion dates
            stories_result = self.supabase.table("stories").select("*").eq("project_id", project_id).eq("status", "done").execute()
            completed_stories = stories_result.data
            
            # Group by week
            weekly_velocity = {}
            for story in completed_stories:
                if story.get("completed_at") and story.get("story_points"):
                    completed_date = datetime.fromisoformat(story["completed_at"].replace("Z", "+00:00"))
                    if start_date <= completed_date <= end_date:
                        week_start = completed_date - timedelta(days=completed_date.weekday())
                        week_key = week_start.strftime("%Y-%m-%d")
                        
                        if week_key not in weekly_velocity:
                            weekly_velocity[week_key] = {"points": 0, "stories": 0}
                        
                        weekly_velocity[week_key]["points"] += story["story_points"]
                        weekly_velocity[week_key]["stories"] += 1
                        
            # Calculate average velocity
            velocities = [week["points"] for week in weekly_velocity.values()]
            avg_velocity = statistics.mean(velocities) if velocities else 0
            
            # Calculate trend
            if len(velocities) >= 2:
                recent_avg = statistics.mean(velocities[-2:])
                older_avg = statistics.mean(velocities[:-2]) if len(velocities) > 2 else velocities[0]
                trend = "up" if recent_avg > older_avg else "down" if recent_avg < older_avg else "stable"
            else:
                trend = "stable"
                
            return {
                "weekly_data": weekly_velocity,
                "average_velocity": avg_velocity,
                "trend": trend,
                "total_weeks": len(weekly_velocity)
            }
            
        except Exception as e:
            logger.error(f"Error calculating velocity: {e}")
            return {}
            
    async def _calculate_burndown(self, project_id: str, start_date: datetime, end_date: datetime) -> Dict[str, Any]:
        """Calculate burndown chart data"""
        try:
            # Get all stories for the project
            stories_result = self.supabase.table("stories").select("*").eq("project_id", project_id).execute()
            stories = stories_result.data
            
            total_points = sum(s.get("story_points", 0) for s in stories if s.get("story_points"))
            
            # Calculate daily burndown
            daily_burndown = {}
            current_date = start_date
            
            while current_date <= end_date:
                remaining_points = total_points
                
                # Subtract completed points up to this date
                for story in stories:
                    if (story.get("status") == "done" and 
                        story.get("completed_at") and 
                        story.get("story_points")):
                        completed_date = datetime.fromisoformat(story["completed_at"].replace("Z", "+00:00"))
                        if completed_date.date() <= current_date.date():
                            remaining_points -= story["story_points"]
                            
                daily_burndown[current_date.strftime("%Y-%m-%d")] = max(0, remaining_points)
                current_date += timedelta(days=1)
                
            # Calculate ideal burndown line
            days_total = (end_date - start_date).days + 1
            daily_ideal_burn = total_points / days_total if days_total > 0 else 0
            
            ideal_burndown = {}
            for i, date_key in enumerate(daily_burndown.keys()):
                ideal_burndown[date_key] = max(0, total_points - (daily_ideal_burn * (i + 1)))
                
            return {
                "actual_burndown": daily_burndown,
                "ideal_burndown": ideal_burndown,
                "total_points": total_points,
                "remaining_points": list(daily_burndown.values())[-1] if daily_burndown else total_points
            }
            
        except Exception as e:
            logger.error(f"Error calculating burndown: {e}")
            return {}
            
    async def _calculate_team_performance(self, project_id: str, start_date: datetime, end_date: datetime) -> Dict[str, Any]:
        """Calculate team performance metrics"""
        try:
            # Get stories assigned to team members
            stories_result = self.supabase.table("stories").select("*, assignee:assignee_id(id, name)").eq("project_id", project_id).execute()
            stories = stories_result.data
            
            team_stats = {}
            
            for story in stories:
                assignee = story.get("assignee")
                if assignee:
                    user_id = assignee["id"]
                    user_name = assignee["name"]
                    
                    if user_id not in team_stats:
                        team_stats[user_id] = {
                            "name": user_name,
                            "total_stories": 0,
                            "completed_stories": 0,
                            "total_points": 0,
                            "completed_points": 0,
                            "avg_cycle_time": 0,
                            "cycle_times": []
                        }
                    
                    team_stats[user_id]["total_stories"] += 1
                    if story.get("story_points"):
                        team_stats[user_id]["total_points"] += story["story_points"]
                    
                    if story.get("status") == "done":
                        team_stats[user_id]["completed_stories"] += 1
                        if story.get("story_points"):
                            team_stats[user_id]["completed_points"] += story["story_points"]
                            
                        # Calculate cycle time
                        if story.get("completed_at") and story.get("started_at"):
                            start = datetime.fromisoformat(story["started_at"].replace("Z", "+00:00"))
                            end = datetime.fromisoformat(story["completed_at"].replace("Z", "+00:00"))
                            cycle_time = (end - start).days
                            team_stats[user_id]["cycle_times"].append(cycle_time)
                            
            # Calculate averages
            for user_id, stats in team_stats.items():
                if stats["cycle_times"]:
                    stats["avg_cycle_time"] = statistics.mean(stats["cycle_times"])
                stats["completion_rate"] = (stats["completed_stories"] / stats["total_stories"] * 100) if stats["total_stories"] > 0 else 0
                del stats["cycle_times"]  # Remove raw data
                
            return {
                "team_members": len(team_stats),
                "individual_performance": team_stats,
                "top_performer": max(team_stats.items(), key=lambda x: x[1]["completed_points"])[1]["name"] if team_stats else None
            }
            
        except Exception as e:
            logger.error(f"Error calculating team performance: {e}")
            return {}
            
    async def _calculate_quality_metrics(self, project_id: str, start_date: datetime, end_date: datetime) -> Dict[str, Any]:
        """Calculate quality metrics"""
        try:
            # Get stories with defects/bugs
            stories_result = self.supabase.table("stories").select("*").eq("project_id", project_id).execute()
            stories = stories_result.data
            
            # Count stories by priority
            priority_counts = {"low": 0, "medium": 0, "high": 0, "critical": 0}
            bug_stories = 0
            
            for story in stories:
                priority = story.get("priority", "medium")
                if priority in priority_counts:
                    priority_counts[priority] += 1
                    
                # Check if story is a bug (you might have a type field or tags)
                tags = story.get("tags", [])
                if "bug" in tags or "defect" in tags:
                    bug_stories += 1
                    
            total_stories = len(stories)
            bug_rate = (bug_stories / total_stories * 100) if total_stories > 0 else 0
            
            # Calculate rework rate (stories that were reopened)
            # This would require tracking story status changes
            rework_rate = 0  # Placeholder
            
            return {
                "bug_rate": bug_rate,
                "rework_rate": rework_rate,
                "priority_distribution": priority_counts,
                "total_bugs": bug_stories,
                "quality_score": max(0, 100 - bug_rate - rework_rate)
            }
            
        except Exception as e:
            logger.error(f"Error calculating quality metrics: {e}")
            return {}
            
    async def _generate_project_insights(self, project_id: str, metrics: Dict, velocity_data: Dict, team_performance: Dict) -> List[ProjectInsight]:
        """Generate AI-powered project insights"""
        try:
            insights = []
            
            # Velocity insights
            if velocity_data.get("trend") == "down":
                insights.append(ProjectInsight(
                    project_id=project_id,
                    insight_type="velocity",
                    title="Declining Velocity Detected",
                    description="Team velocity has been decreasing over the past few sprints.",
                    severity="warning",
                    recommendations=[
                        "Review sprint planning and story estimation",
                        "Check for team capacity issues or blockers",
                        "Consider reducing story complexity or scope"
                    ],
                    data={"current_velocity": velocity_data.get("average_velocity", 0)}
                ))
                
            # Completion rate insights
            completion_rate = metrics.get("completion_rate", {}).value if "completion_rate" in metrics else 0
            if completion_rate < 70:
                insights.append(ProjectInsight(
                    project_id=project_id,
                    insight_type="completion",
                    title="Low Completion Rate",
                    description=f"Only {completion_rate:.1f}% of stories are completed.",
                    severity="critical" if completion_rate < 50 else "warning",
                    recommendations=[
                        "Review story sizing and complexity",
                        "Identify and remove blockers",
                        "Improve team focus and reduce context switching"
                    ],
                    data={"completion_rate": completion_rate}
                ))
                
            # Cycle time insights
            avg_cycle_time = metrics.get("avg_cycle_time", {}).value if "avg_cycle_time" in metrics else 0
            if avg_cycle_time > 7:  # More than a week
                insights.append(ProjectInsight(
                    project_id=project_id,
                    insight_type="cycle_time",
                    title="High Cycle Time",
                    description=f"Stories are taking an average of {avg_cycle_time:.1f} days to complete.",
                    severity="warning",
                    recommendations=[
                        "Break down large stories into smaller tasks",
                        "Implement daily standups to identify blockers",
                        "Review and optimize development workflow"
                    ],
                    data={"avg_cycle_time": avg_cycle_time}
                ))
                
            # Team performance insights
            if team_performance.get("individual_performance"):
                performances = list(team_performance["individual_performance"].values())
                completion_rates = [p["completion_rate"] for p in performances]
                
                if completion_rates:
                    min_rate = min(completion_rates)
                    max_rate = max(completion_rates)
                    
                    if max_rate - min_rate > 30:  # Large performance gap
                        insights.append(ProjectInsight(
                            project_id=project_id,
                            insight_type="team_balance",
                            title="Uneven Team Performance",
                            description="There's a significant performance gap between team members.",
                            severity="warning",
                            recommendations=[
                                "Provide additional support to struggling team members",
                                "Consider pair programming or mentoring",
                                "Review task assignment and workload distribution"
                            ],
                            data={"performance_gap": max_rate - min_rate}
                        ))
                        
            return insights
            
        except Exception as e:
            logger.error(f"Error generating insights: {e}")
            return []
            
    async def get_team_analytics(self, team_id: Optional[str] = None, days: int = 30) -> Dict[str, Any]:
        """Get team-wide analytics across all projects"""
        try:
            end_date = datetime.utcnow()
            start_date = end_date - timedelta(days=days)
            
            # Get all projects (or filter by team if provided)
            projects_query = self.supabase.table("projects").select("*")
            if team_id:
                projects_query = projects_query.eq("team_id", team_id)
            projects_result = projects_query.execute()
            projects = projects_result.data
            
            team_metrics = {
                "total_projects": len(projects),
                "active_projects": len([p for p in projects if p.get("status") == "active"]),
                "total_stories": 0,
                "completed_stories": 0,
                "total_points": 0,
                "completed_points": 0,
                "average_velocity": 0,
                "projects_data": []
            }
            
            velocities = []
            
            for project in projects:
                project_metrics = await self._calculate_project_metrics(project["id"], start_date, end_date)
                velocity_data = await self._calculate_velocity(project["id"], start_date, end_date)
                
                team_metrics["total_stories"] += project_metrics.get("total_stories", AnalyticsMetric("", 0, "", "", 0, datetime.utcnow())).value
                team_metrics["completed_stories"] += project_metrics.get("completed_stories", AnalyticsMetric("", 0, "", "", 0, datetime.utcnow())).value
                team_metrics["total_points"] += project_metrics.get("total_points", AnalyticsMetric("", 0, "", "", 0, datetime.utcnow())).value
                team_metrics["completed_points"] += project_metrics.get("completed_points", AnalyticsMetric("", 0, "", "", 0, datetime.utcnow())).value
                
                if velocity_data.get("average_velocity"):
                    velocities.append(velocity_data["average_velocity"])
                    
                team_metrics["projects_data"].append({
                    "project_id": project["id"],
                    "project_name": project["name"],
                    "metrics": {k: {"value": v.value, "unit": v.unit} for k, v in project_metrics.items()},
                    "velocity": velocity_data.get("average_velocity", 0)
                })
                
            team_metrics["average_velocity"] = statistics.mean(velocities) if velocities else 0
            team_metrics["completion_rate"] = (team_metrics["completed_stories"] / team_metrics["total_stories"] * 100) if team_metrics["total_stories"] > 0 else 0
            
            return team_metrics
            
        except Exception as e:
            logger.error(f"Error getting team analytics: {e}")
            return {}
            
    async def export_analytics_data(self, project_id: str, format: str = "json") -> Dict[str, Any]:
        """Export analytics data in various formats"""
        try:
            dashboard_data = await self.get_project_dashboard(project_id)
            
            if format == "json":
                return dashboard_data
            elif format == "csv":
                # Convert to CSV format (simplified)
                csv_data = []
                for metric_name, metric in dashboard_data.get("metrics", {}).items():
                    csv_data.append({
                        "metric": metric_name,
                        "value": metric.value,
                        "unit": metric.unit,
                        "trend": metric.trend
                    })
                return {"csv_data": csv_data}
            else:
                raise ValueError(f"Unsupported format: {format}")
                
        except Exception as e:
            logger.error(f"Error exporting analytics data: {e}")
            raise

# Global analytics service instance
analytics_service: Optional[AnalyticsService] = None

def init_analytics_service(supabase_client: Client):
    """Initialize the analytics service"""
    global analytics_service
    analytics_service = AnalyticsService(supabase_client)
    return analytics_service

def get_analytics_service() -> AnalyticsService:
    """Get the analytics service instance"""
    if analytics_service is None:
        raise RuntimeError("Analytics service not initialized")
    return analytics_service 