"""
Async AI Service with Celery Queue
Implements non-blocking AI operations for production scalability
"""

from celery import Celery
from celery.result import AsyncResult
import asyncio
import json
import logging
from typing import Dict, Any, Optional
from datetime import datetime, timedelta
import redis
from pydantic import BaseModel

# Handle imports for both package and direct execution
try:
    from .ai_service import AIService, AIResponse
    from database.supabase_client import get_supabase
except ImportError:
    from services.ai_service import AIService, AIResponse
    from database.supabase_client import get_supabase

logger = logging.getLogger(__name__)

# Celery app configuration
celery_app = Celery(
    'agileforge_ai',
    broker='redis://localhost:6379/0',
    backend='redis://localhost:6379/0',
    include=['backend.services.async_ai_service']
)

celery_app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
    task_track_started=True,
    task_time_limit=300,  # 5 minutes max per task
    task_soft_time_limit=240,  # 4 minutes soft limit
    worker_prefetch_multiplier=1,  # Process one task at a time
    task_acks_late=True,
    worker_disable_rate_limits=False,
    task_routes={
        'ai_tasks.*': {'queue': 'ai_queue'},
        'analytics_tasks.*': {'queue': 'analytics_queue'},
    }
)

class JobStatus(BaseModel):
    job_id: str
    status: str  # pending, started, success, failure
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    progress: Optional[int] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    estimated_completion: Optional[datetime] = None

class AsyncAIService:
    """
    Async AI Service that queues long-running AI operations
    """
    
    def __init__(self):
        self.redis_client = redis.Redis(host='localhost', port=6379, db=1)
        self.ai_service = AIService()
    
    async def queue_story_generation(
        self, 
        user_id: str,
        request_data: Dict[str, Any],
        priority: str = "normal"
    ) -> str:
        """Queue story generation job and return job ID"""
        
        task_kwargs = {
            'user_id': user_id,
            'request_data': request_data,
            'timestamp': datetime.utcnow().isoformat()
        }
        
        # Set priority
        priority_level = 3 if priority == "high" else 6 if priority == "low" else 5
        
        # Queue the task
        result = generate_story_task.apply_async(
            kwargs=task_kwargs,
            priority=priority_level,
            queue='ai_queue'
        )
        
        # Store job metadata
        job_status = JobStatus(
            job_id=result.id,
            status="pending",
            started_at=datetime.utcnow(),
            estimated_completion=datetime.utcnow() + timedelta(seconds=30)
        )
        
        await self._store_job_status(result.id, job_status)
        
        # Notify via Supabase real-time
        await self._notify_job_queued(user_id, result.id, "story_generation")
        
        logger.info(f"Queued story generation job {result.id} for user {user_id}")
        return result.id
    
    async def queue_analytics_insights(
        self,
        user_id: str,
        project_id: str,
        analysis_type: str = "comprehensive",
        priority: str = "normal"
    ) -> str:
        """Queue analytics insights generation"""
        
        task_kwargs = {
            'user_id': user_id,
            'project_id': project_id,
            'analysis_type': analysis_type,
            'timestamp': datetime.utcnow().isoformat()
        }
        
        priority_level = 3 if priority == "high" else 6 if priority == "low" else 5
        
        result = generate_analytics_insights_task.apply_async(
            kwargs=task_kwargs,
            priority=priority_level,
            queue='analytics_queue'
        )
        
        job_status = JobStatus(
            job_id=result.id,
            status="pending",
            started_at=datetime.utcnow(),
            estimated_completion=datetime.utcnow() + timedelta(minutes=2)
        )
        
        await self._store_job_status(result.id, job_status)
        await self._notify_job_queued(user_id, result.id, "analytics_insights")
        
        logger.info(f"Queued analytics job {result.id} for project {project_id}")
        return result.id
    
    async def get_job_status(self, job_id: str) -> Optional[JobStatus]:
        """Get current job status"""
        try:
            # Get from Redis cache first
            cached_status = self.redis_client.get(f"job_status:{job_id}")
            if cached_status:
                return JobStatus.model_validate_json(cached_status)
            
            # Fall back to Celery result
            result = AsyncResult(job_id, app=celery_app)
            
            status_map = {
                'PENDING': 'pending',
                'STARTED': 'started', 
                'SUCCESS': 'success',
                'FAILURE': 'failure',
                'RETRY': 'started',
                'REVOKED': 'failure'
            }
            
            job_status = JobStatus(
                job_id=job_id,
                status=status_map.get(result.status, 'unknown'),
                result=result.result if result.successful() else None,
                error=str(result.result) if result.failed() else None
            )
            
            return job_status
            
        except Exception as e:
            logger.error(f"Error getting job status for {job_id}: {e}")
            return None
    
    async def cancel_job(self, job_id: str, user_id: str) -> bool:
        """Cancel a queued or running job"""
        try:
            celery_app.control.revoke(job_id, terminate=True)
            
            # Update status
            job_status = JobStatus(
                job_id=job_id,
                status="cancelled",
                completed_at=datetime.utcnow(),
                error="Job cancelled by user"
            )
            
            await self._store_job_status(job_id, job_status)
            await self._notify_job_completed(user_id, job_id, "cancelled", None)
            
            logger.info(f"Cancelled job {job_id} for user {user_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error cancelling job {job_id}: {e}")
            return False
    
    async def _store_job_status(self, job_id: str, status: JobStatus):
        """Store job status in Redis with TTL"""
        try:
            self.redis_client.setex(
                f"job_status:{job_id}",
                3600,  # 1 hour TTL
                status.model_dump_json()
            )
        except Exception as e:
            logger.error(f"Error storing job status: {e}")
    
    async def _notify_job_queued(self, user_id: str, job_id: str, job_type: str):
        """Notify user via Supabase real-time that job was queued"""
        try:
            supabase = get_supabase()
            
            notification = {
                'user_id': user_id,
                'job_id': job_id,
                'job_type': job_type,
                'status': 'queued',
                'timestamp': datetime.utcnow().isoformat()
            }
            
            # Insert into notifications table for real-time updates
            supabase.table('job_notifications').insert(notification).execute()
            
        except Exception as e:
            logger.error(f"Error sending queue notification: {e}")
    
    async def _notify_job_completed(self, user_id: str, job_id: str, status: str, result: Any):
        """Notify user when job completes"""
        try:
            supabase = get_supabase()
            
            notification = {
                'user_id': user_id,
                'job_id': job_id,
                'status': status,
                'result': result,
                'timestamp': datetime.utcnow().isoformat()
            }
            
            supabase.table('job_notifications').insert(notification).execute()
            
        except Exception as e:
            logger.error(f"Error sending completion notification: {e}")

# Celery Tasks
@celery_app.task(bind=True, name='ai_tasks.generate_story')
def generate_story_task(self, user_id: str, request_data: Dict[str, Any], timestamp: str):
    """Celery task for story generation"""
    try:
        # Update status to started
        self.update_state(state='STARTED', meta={'progress': 10})
        
        # Initialize AI service
        ai_service = AIService()
        
        # Prepare variables
        variables = {
            "user_description": request_data.get("description", ""),
            "priority_level": request_data.get("priority", "medium"),
            "epic_context": request_data.get("epic_context", ""),
            "project_context": request_data.get("project_context", ""),
            "include_acceptance_criteria": True,
            "include_tags": True
        }
        
        self.update_state(state='STARTED', meta={'progress': 30})
        
        # Generate story using AI
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            result = loop.run_until_complete(
                ai_service.generate_completion("story_generator", variables)
            )
            
            self.update_state(state='STARTED', meta={'progress': 80})
            
            if result.success:
                # Store result in database if needed
                # ... database operations ...
                
                self.update_state(state='STARTED', meta={'progress': 95})
                
                return {
                    'success': True,
                    'story': result.data,
                    'model_used': result.model_used,
                    'tokens_used': result.tokens_used,
                    'processing_time': result.processing_time,
                    'user_id': user_id,
                    'completed_at': datetime.utcnow().isoformat()
                }
            else:
                raise Exception(f"AI generation failed: {result.error}")
                
        finally:
            loop.close()
            
    except Exception as e:
        logger.error(f"Story generation task failed: {e}")
        raise self.retry(exc=e, countdown=60, max_retries=3)

@celery_app.task(bind=True, name='analytics_tasks.generate_insights')
def generate_analytics_insights_task(
    self, 
    user_id: str, 
    project_id: str, 
    analysis_type: str, 
    timestamp: str
):
    """Celery task for analytics insights generation"""
    try:
        try:
            from services.analytics_service import AnalyticsService
            from database.supabase_client import get_supabase
        except ImportError:
            from analytics_service import AnalyticsService
            from database.supabase_client import get_supabase
        
        self.update_state(state='STARTED', meta={'progress': 10})
        
        # Initialize services
        supabase = get_supabase()
        analytics_service = AnalyticsService(supabase)
        
        self.update_state(state='STARTED', meta={'progress': 30})
        
        # Generate comprehensive project analytics
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            dashboard_data = loop.run_until_complete(
                analytics_service.get_project_dashboard(project_id, 30)
            )
            
            self.update_state(state='STARTED', meta={'progress': 90})
            
            return {
                'success': True,
                'analytics': dashboard_data,
                'project_id': project_id,
                'analysis_type': analysis_type,
                'user_id': user_id,
                'completed_at': datetime.utcnow().isoformat()
            }
            
        finally:
            loop.close()
            
    except Exception as e:
        logger.error(f"Analytics insights task failed: {e}")
        raise self.retry(exc=e, countdown=120, max_retries=2)

# Global async AI service instance
async_ai_service = AsyncAIService()

def get_async_ai_service() -> AsyncAIService:
    """Get async AI service instance"""
    return async_ai_service 