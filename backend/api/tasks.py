from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
import logging
import uuid

from ..database.supabase_client import get_supabase
from ..auth.dependencies import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter()

# Request/Response Models
class TaskCreateRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    story_id: str = Field(..., description="ID of the story this task belongs to")
    assignee_id: Optional[str] = None
    status: str = Field(default="todo", pattern="^(todo|in-progress|review|done)$")
    priority: str = Field(default="medium", pattern="^(low|medium|high|critical)$")
    estimated_hours: Optional[float] = Field(default=4.0, ge=0.5, le=40)
    due_date: Optional[str] = None

class TaskUpdateRequest(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    story_id: Optional[str] = None
    assignee_id: Optional[str] = None
    status: Optional[str] = Field(None, pattern="^(todo|in-progress|review|done)$")
    priority: Optional[str] = Field(None, pattern="^(low|medium|high|critical)$")
    estimated_hours: Optional[float] = Field(None, ge=0.5, le=40)
    due_date: Optional[str] = None

class TaskResponse(BaseModel):
    id: str
    title: str
    description: Optional[str]
    story_id: str
    assignee_id: Optional[str]
    status: str
    priority: str
    estimated_hours: float
    due_date: Optional[str]
    created_at: datetime
    updated_at: datetime

# Endpoints
@router.get("/")
async def get_tasks(
    story_id: Optional[str] = Query(None, description="Filter tasks by story ID"),
    supabase = Depends(get_supabase),
    current_user = Depends(get_current_user)
):
    """Get all tasks, optionally filtered by story"""
    try:
        query = supabase.table("tasks").select("*")
        
        if story_id:
            query = query.eq("story_id", story_id)
        
        result = query.execute()
        
        # Transform the data to match expected format
        tasks = []
        for task in result.data:
            tasks.append({
                "id": task["id"],
                "title": task["title"],
                "description": task.get("description"),
                "story_id": task["story_id"], 
                "assignee_id": task.get("assignee_id"),
                "status": task.get("status", "todo"),
                "priority": "medium",  # Default since not in DB schema
                "estimated_hours": 4.0,  # Default since not in DB schema
                "due_date": task.get("due_date"),
                "created_at": task["created_at"],
                "updated_at": task["updated_at"]
            })
        
        return {"success": True, "data": {"tasks": tasks}}
        
    except Exception as e:
        logger.error(f"Failed to fetch tasks: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch tasks")

@router.get("/{task_id}")
async def get_task(
    task_id: str,
    supabase = Depends(get_supabase),
    current_user = Depends(get_current_user)
):
    """Get a specific task by ID"""
    try:
        result = supabase.table("tasks").select("*").eq("id", task_id).execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Task not found")
        
        task = result.data[0]
        
        # Transform the data to match expected format
        task_data = {
            "id": task["id"],
            "title": task["title"],
            "description": task.get("description"),
            "story_id": task["story_id"],
            "assignee_id": task.get("assignee_id"),
            "status": task.get("status", "todo"),
            "priority": "medium",  # Default since not in DB schema
            "estimated_hours": 4.0,  # Default since not in DB schema
            "due_date": task.get("due_date"),
            "created_at": task["created_at"],
            "updated_at": task["updated_at"]
        }
        
        return {"success": True, "data": task_data}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to fetch task {task_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch task")

@router.post("/")
async def create_task(
    request: TaskCreateRequest,
    supabase = Depends(get_supabase),
    current_user = Depends(get_current_user)
):
    """Create a new task"""
    try:
        task_id = str(uuid.uuid4())
        now = datetime.utcnow().isoformat()
        
        # Prepare task data for database (only fields that exist in schema)
        task_data = {
            "id": task_id,
            "title": request.title,
            "description": request.description,
            "story_id": request.story_id,
            "assignee_id": request.assignee_id,
            "status": request.status,
            "created_at": now,
            "updated_at": now
        }
        
        result = supabase.table("tasks").insert(task_data).execute()
        
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to create task")
        
        created_task = result.data[0]
        
        # Return response with all expected fields
        response_data = {
            "id": created_task["id"],
            "title": created_task["title"],
            "description": created_task.get("description"),
            "story_id": created_task["story_id"],
            "assignee_id": created_task.get("assignee_id"),
            "status": created_task.get("status", "todo"),
            "priority": request.priority,
            "estimated_hours": request.estimated_hours,
            "due_date": request.due_date,
            "created_at": created_task["created_at"],
            "updated_at": created_task["updated_at"]
        }
        
        return {"success": True, "data": response_data}
        
    except Exception as e:
        logger.error(f"Failed to create task: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create task: {str(e)}")

@router.put("/{task_id}")
async def update_task(
    task_id: str,
    request: TaskUpdateRequest,
    supabase = Depends(get_supabase),
    current_user = Depends(get_current_user)
):
    """Update an existing task"""
    try:
        # Check if task exists
        existing = supabase.table("tasks").select("*").eq("id", task_id).execute()
        
        if not existing.data:
            raise HTTPException(status_code=404, detail="Task not found")
        
        # Prepare update data (only fields that exist in schema)
        update_data = {"updated_at": datetime.utcnow().isoformat()}
        
        if request.title is not None:
            update_data["title"] = request.title
        if request.description is not None:
            update_data["description"] = request.description
        if request.story_id is not None:
            update_data["story_id"] = request.story_id
        if request.assignee_id is not None:
            update_data["assignee_id"] = request.assignee_id
        if request.status is not None:
            update_data["status"] = request.status
        
        result = supabase.table("tasks").update(update_data).eq("id", task_id).execute()
        
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to update task")
        
        updated_task = result.data[0]
        
        # Return response with all expected fields
        response_data = {
            "id": updated_task["id"],
            "title": updated_task["title"],
            "description": updated_task.get("description"),
            "story_id": updated_task["story_id"],
            "assignee_id": updated_task.get("assignee_id"),
            "status": updated_task.get("status", "todo"),
            "priority": request.priority or "medium",
            "estimated_hours": request.estimated_hours or 4.0,
            "due_date": request.due_date,
            "created_at": updated_task["created_at"],
            "updated_at": updated_task["updated_at"]
        }
        
        return {"success": True, "data": response_data}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update task {task_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to update task: {str(e)}")

@router.delete("/{task_id}")
async def delete_task(
    task_id: str,
    supabase = Depends(get_supabase),
    current_user = Depends(get_current_user)
):
    """Delete a task"""
    try:
        # Check if task exists
        existing = supabase.table("tasks").select("id").eq("id", task_id).execute()
        
        if not existing.data:
            raise HTTPException(status_code=404, detail="Task not found")
        
        result = supabase.table("tasks").delete().eq("id", task_id).execute()
        
        return {"success": True, "message": "Task deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete task {task_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to delete task: {str(e)}")

# Bulk operations
@router.post("/bulk-update")
async def bulk_update_tasks(
    task_ids: List[str],
    updates: TaskUpdateRequest,
    supabase = Depends(get_supabase),
    current_user = Depends(get_current_user)
):
    """Bulk update multiple tasks"""
    try:
        update_data = {"updated_at": datetime.utcnow().isoformat()}
        
        if updates.status is not None:
            update_data["status"] = updates.status
        if updates.assignee_id is not None:
            update_data["assignee_id"] = updates.assignee_id
        
        results = []
        for task_id in task_ids:
            result = supabase.table("tasks").update(update_data).eq("id", task_id).execute()
            if result.data:
                results.extend(result.data)
        
        return {"success": True, "data": {"updated_tasks": results}}
        
    except Exception as e:
        logger.error(f"Failed to bulk update tasks: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to bulk update tasks: {str(e)}") 