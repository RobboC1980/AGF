from fastapi import APIRouter, HTTPException, Depends, Query, BackgroundTasks
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from datetime import datetime
import logging
import uuid

# Handle imports for both package and direct execution
try:
    from ..services.ai_service import get_basic_ai_service, AIResponse
    from ..database.supabase_client import get_supabase
    from ..auth.enhanced_auth import get_current_active_user, UserInDB
    from .auth import get_current_user_supabase
except ImportError:
    from services.ai_service import get_basic_ai_service, AIResponse
    from database.supabase_client import get_supabase
    from auth.enhanced_auth import get_current_active_user, UserInDB
    from api.auth import get_current_user_supabase

logger = logging.getLogger(__name__)
router = APIRouter()

# Request/Response Models
class TaskCreateRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=500)
    description: Optional[str] = None
    story_id: str = Field(..., description="ID of the story this task belongs to")
    priority: str = Field(default="medium", pattern="^(low|medium|high|critical)$")
    status: str = Field(default="todo", pattern="^(todo|in-progress|review|done)$")
    estimated_hours: float = Field(..., ge=0.5, le=40)
    assignee_id: Optional[str] = None
    reviewer_id: Optional[str] = None
    due_date: Optional[str] = None
    technical_notes: Optional[str] = None

class TaskUpdateRequest(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=500)
    description: Optional[str] = None
    priority: Optional[str] = Field(None, pattern="^(low|medium|high|critical)$")
    status: Optional[str] = Field(None, pattern="^(todo|in-progress|review|done)$")
    estimated_hours: Optional[float] = Field(None, ge=0.5, le=40)
    assignee_id: Optional[str] = None
    reviewer_id: Optional[str] = None
    due_date: Optional[str] = None
    technical_notes: Optional[str] = None
    actual_hours: Optional[float] = Field(None, ge=0)

class TaskAssignRequest(BaseModel):
    assignee_id: Optional[str] = None
    notify_assignee: bool = True

class TaskResponse(BaseModel):
    id: str
    title: str
    description: Optional[str]
    story_id: str
    priority: str
    status: str
    estimated_hours: float
    actual_hours: float
    assignee_id: Optional[str]
    reviewer_id: Optional[str]
    due_date: Optional[str]
    technical_notes: Optional[str]
    created_at: datetime
    updated_at: datetime
    assignee: Optional[Dict[str, Any]] = None
    reviewer: Optional[Dict[str, Any]] = None
    story: Optional[Dict[str, Any]] = None

# Utility function to send assignment notification
async def send_assignment_notification(task_id: str, assignee_id: str, assigner_id: str, supabase):
    """Send notification when task is assigned"""
    try:
        # Get task details
        task_result = supabase.table('tasks').select('*, stories(name)').eq('id', task_id).single().execute()
        if not task_result.data:
            return
            
        task = task_result.data
        
        # Get assignee details
        assignee_result = supabase.table('users').select('name, email').eq('id', assignee_id).single().execute()
        if not assignee_result.data:
            return
            
        assignee = assignee_result.data
        
        # Get assigner details
        assigner_result = supabase.table('users').select('name').eq('id', assigner_id).single().execute()
        assigner_name = assigner_result.data['name'] if assigner_result.data else 'Someone'
        
        # Create notification
        notification_data = {
            'user_id': assignee_id,
            'type': 'task_assigned',
            'title': f'Task Assigned: {task["title"]}',
            'message': f'{assigner_name} assigned you a task from story "{task["stories"]["name"]}"',
            'entity_type': 'task',
            'entity_id': task_id,
            'action_url': f'/tasks/{task_id}',
            'is_read': False,
            'created_at': datetime.utcnow().isoformat()
        }
        
        supabase.table('notifications').insert(notification_data).execute()
        logger.info(f"Assignment notification sent to {assignee['name']}")
        
    except Exception as e:
        logger.error(f"Failed to send assignment notification: {e}")

@router.post("/", response_model=TaskResponse)
async def create_task(
    request: TaskCreateRequest,
    background_tasks: BackgroundTasks,
    current_user: UserInDB = Depends(get_current_active_user),
    supabase = Depends(get_supabase)
):
    """Create a new task"""
    try:
        task_id = str(uuid.uuid4())
        now = datetime.utcnow()
        
        # Verify story exists
        story_result = supabase.table('stories').select('id, name').eq('id', request.story_id).single().execute()
        if not story_result.data:
            raise HTTPException(status_code=404, detail="Story not found")
        
        # Create task
        task_data = {
            'id': task_id,
            'title': request.title,
            'description': request.description,
            'story_id': request.story_id,
            'priority': request.priority,
            'status': request.status,
            'estimated_hours': request.estimated_hours,
            'assignee_id': request.assignee_id,
            'reviewer_id': request.reviewer_id,
            'due_date': request.due_date,
            'technical_notes': request.technical_notes,
            'actual_hours': 0,
            'created_at': now.isoformat(),
            'updated_at': now.isoformat(),
            'created_by': current_user.id
        }
        
        result = supabase.table('tasks').insert(task_data).execute()
        
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to create task")
        
        # Send assignment notification if assignee is specified
        if request.assignee_id and request.assignee_id != current_user.id:
            background_tasks.add_task(
                send_assignment_notification,
                task_id,
                request.assignee_id,
                current_user.id,
                supabase
            )
        
        # Get task with related data
        task_with_relations = supabase.table('tasks').select('''
            *,
            assignee:users!assignee_id(id, name, email, avatar_url),
            reviewer:users!reviewer_id(id, name, email, avatar_url),
            story:stories(id, name)
        ''').eq('id', task_id).single().execute()
        
        return task_with_relations.data
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Task creation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create task: {str(e)}")

@router.get("/")
async def get_tasks(
    story_id: Optional[str] = None,
    assignee_id: Optional[str] = None,
    status: Optional[str] = None,
    current_user = Depends(get_current_user_supabase),
    supabase = Depends(get_supabase)
):
    """Get tasks with optional filters"""
    try:
        # Use a simpler query first to avoid join issues
        query = supabase.table('tasks').select('*')
        
        if story_id:
            query = query.eq('story_id', story_id)
        if assignee_id:
            query = query.eq('assignee_id', assignee_id)
        if status:
            query = query.eq('status', status)
            
        result = query.order('created_at', desc=True).execute()
        
        # Enrich with related data if needed
        tasks = result.data or []
        
        # Get related data separately to avoid complex joins
        if tasks:
            story_ids = list(set([task.get('story_id') for task in tasks if task.get('story_id')]))
            assignee_ids = list(set([task.get('assignee_id') for task in tasks if task.get('assignee_id')]))
            reviewer_ids = list(set([task.get('reviewer_id') for task in tasks if task.get('reviewer_id')]))
            
            # Get stories
            stories_map = {}
            if story_ids:
                stories_result = supabase.table('stories').select('id, name').in_('id', story_ids).execute()
                stories_map = {story['id']: story for story in (stories_result.data or [])}
            
            # Get users for assignees and reviewers
            users_map = {}
            all_user_ids = list(set(assignee_ids + reviewer_ids))
            if all_user_ids:
                users_result = supabase.table('users').select('id, name, email, avatar_url').in_('id', all_user_ids).execute()
                users_map = {user['id']: user for user in (users_result.data or [])}
            
            # Enrich tasks with related data
            for task in tasks:
                if task.get('story_id') and task['story_id'] in stories_map:
                    task['story'] = stories_map[task['story_id']]
                if task.get('assignee_id') and task['assignee_id'] in users_map:
                    task['assignee'] = users_map[task['assignee_id']]
                if task.get('reviewer_id') and task['reviewer_id'] in users_map:
                    task['reviewer'] = users_map[task['reviewer_id']]
        
        return {"success": True, "data": {"tasks": tasks}}
        
    except Exception as e:
        logger.error(f"Failed to fetch tasks: {str(e)}")
        import traceback
        logger.error(f"Full traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail="Failed to fetch tasks")

@router.get("/{task_id}", response_model=TaskResponse)
async def get_task(
    task_id: str,
    current_user: UserInDB = Depends(get_current_active_user),
    supabase = Depends(get_supabase)
):
    """Get a specific task with all related data"""
    try:
        result = supabase.table('tasks').select('''
            *,
            assignee:users!assignee_id(id, name, email, avatar_url),
            reviewer:users!reviewer_id(id, name, email, avatar_url),
            story:stories(id, name, epic:epics(id, name))
        ''').eq('id', task_id).single().execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Task not found")
            
        return result.data
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to fetch task {task_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch task: {str(e)}")

@router.put("/{task_id}", response_model=TaskResponse)
async def update_task(
    task_id: str,
    request: TaskUpdateRequest,
    background_tasks: BackgroundTasks,
    current_user: UserInDB = Depends(get_current_active_user),
    supabase = Depends(get_supabase)
):
    """Update a task"""
    try:
        # Get current task data
        current_task = supabase.table('tasks').select('*').eq('id', task_id).single().execute()
        if not current_task.data:
            raise HTTPException(status_code=404, detail="Task not found")
            
        current_assignee_id = current_task.data.get('assignee_id')
        
        # Build update data
        update_data = {}
        for field, value in request.dict(exclude_unset=True).items():
            update_data[field] = value
        
        update_data['updated_at'] = datetime.utcnow().isoformat()
        
        # Update task
        result = supabase.table('tasks').update(update_data).eq('id', task_id).execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Task not found")
        
        # Send assignment notification if assignee changed
        new_assignee_id = request.assignee_id
        if (new_assignee_id is not None and 
            new_assignee_id != current_assignee_id and 
            new_assignee_id != current_user.id):
            background_tasks.add_task(
                send_assignment_notification,
                task_id,
                new_assignee_id,
                current_user.id,
                supabase
            )
        
        # Get updated task with relations
        updated_task = supabase.table('tasks').select('''
            *,
            assignee:users!assignee_id(id, name, email, avatar_url),
            reviewer:users!reviewer_id(id, name, email, avatar_url),
            story:stories(id, name)
        ''').eq('id', task_id).single().execute()
        
        return updated_task.data
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update task {task_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to update task: {str(e)}")

@router.patch("/{task_id}/assign", response_model=TaskResponse)
async def assign_task(
    task_id: str,
    request: TaskAssignRequest,
    background_tasks: BackgroundTasks,
    current_user: UserInDB = Depends(get_current_active_user),
    supabase = Depends(get_supabase)
):
    """Assign or unassign a task"""
    try:
        # Get current task
        current_task = supabase.table('tasks').select('*').eq('id', task_id).single().execute()
        if not current_task.data:
            raise HTTPException(status_code=404, detail="Task not found")
            
        current_assignee_id = current_task.data.get('assignee_id')
        
        # Update assignment
        update_data = {
            'assignee_id': request.assignee_id,
            'updated_at': datetime.utcnow().isoformat()
        }
        
        result = supabase.table('tasks').update(update_data).eq('id', task_id).execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Task not found")
        
        # Send notification if requested and assignee changed
        if (request.notify_assignee and 
            request.assignee_id and 
            request.assignee_id != current_assignee_id and 
            request.assignee_id != current_user.id):
            background_tasks.add_task(
                send_assignment_notification,
                task_id,
                request.assignee_id,
                current_user.id,
                supabase
            )
        
        # Get updated task with relations
        updated_task = supabase.table('tasks').select('''
            *,
            assignee:users!assignee_id(id, name, email, avatar_url),
            reviewer:users!reviewer_id(id, name, email, avatar_url),
            story:stories(id, name)
        ''').eq('id', task_id).single().execute()
        
        return updated_task.data
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to assign task {task_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to assign task: {str(e)}")

@router.delete("/{task_id}")
async def delete_task(
    task_id: str,
    current_user: UserInDB = Depends(get_current_active_user),
    supabase = Depends(get_supabase)
):
    """Delete a task"""
    try:
        result = supabase.table('tasks').delete().eq('id', task_id).execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Task not found")
        
        return {"success": True, "message": "Task deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete task {task_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to delete task: {str(e)}")

@router.get("/{task_id}/time-logs")
async def get_task_time_logs(
    task_id: str,
    current_user: UserInDB = Depends(get_current_active_user),
    supabase = Depends(get_supabase)
):
    """Get time logs for a task"""
    try:
        result = supabase.table('time_logs').select('''
            *,
            user:users(id, name, avatar_url)
        ''').eq('task_id', task_id).order('start_time', desc=True).execute()
        
        return {"success": True, "data": {"time_logs": result.data}}
        
    except Exception as e:
        logger.error(f"Failed to fetch time logs for task {task_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch time logs") 