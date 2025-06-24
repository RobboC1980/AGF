#!/usr/bin/env python3
"""
Sprint Management API
Provides endpoints for creating, managing, and tracking sprints
"""

import uuid
import logging
from datetime import datetime, date
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel, Field

try:
    from ..auth.enhanced_auth import get_current_active_user, UserInDB
    from ..database.supabase_client import get_supabase
    from ..models.api_models import SprintResponse, SprintBase, SprintUpdate
except ImportError:
    from auth.enhanced_auth import get_current_active_user, UserInDB
    from database.supabase_client import get_supabase
    from models.api_models import SprintResponse, SprintBase, SprintUpdate

logger = logging.getLogger(__name__)

router = APIRouter()

class SprintCreateRequest(SprintBase):
    project_id: str = Field(..., description="Project ID this sprint belongs to")

class SprintStoryAssignment(BaseModel):
    story_ids: List[str] = Field(..., description="List of story IDs to assign/unassign")
    action: str = Field(..., description="'add' or 'remove'")

class SprintStatusUpdate(BaseModel):
    status: str = Field(..., description="New sprint status")
    actual_start_date: Optional[date] = None
    actual_end_date: Optional[date] = None

# Utility functions
async def get_sprint_stories(sprint_id: str, supabase):
    """Get all stories assigned to a sprint"""
    try:
        result = supabase.table('stories').select('''
            id, name, description, status, priority, story_points,
            assignee:users!assignee_id(id, name, email, avatar_url),
            epic:epics(id, name, color)
        ''').eq('sprint_id', sprint_id).execute()
        
        return result.data
    except Exception as e:
        logger.error(f"Failed to get sprint stories: {e}")
        return []

async def calculate_sprint_metrics(sprint_id: str, supabase):
    """Calculate sprint progress and metrics"""
    try:
        stories = await get_sprint_stories(sprint_id, supabase)
        
        total_points = sum(story.get('story_points', 0) for story in stories)
        completed_points = sum(
            story.get('story_points', 0) 
            for story in stories 
            if story.get('status') == 'done'
        )
        
        return {
            'total_stories': len(stories),
            'completed_stories': len([s for s in stories if s.get('status') == 'done']),
            'total_points': total_points,
            'completed_points': completed_points,
            'progress_percentage': int((completed_points / total_points * 100)) if total_points > 0 else 0
        }
    except Exception as e:
        logger.error(f"Failed to calculate sprint metrics: {e}")
        return {
            'total_stories': 0,
            'completed_stories': 0,
            'total_points': 0,
            'completed_points': 0,
            'progress_percentage': 0
        }

async def send_sprint_notification(sprint_id: str, action: str, current_user, supabase):
    """Send notifications for sprint events"""
    try:
        # Get sprint details
        sprint_result = supabase.table('sprints').select('*').eq('id', sprint_id).single().execute()
        if not sprint_result.data:
            return
            
        sprint = sprint_result.data
        
        # Get team members (users assigned to stories in this sprint)
        stories = await get_sprint_stories(sprint_id, supabase)
        team_members = set()
        for story in stories:
            if story.get('assignee') and story['assignee'].get('id'):
                team_members.add(story['assignee']['id'])
        
        # Create notifications
        for user_id in team_members:
            if user_id == current_user.id:  # Don't notify the user who made the change
                continue
                
            notification_data = {
                'user_id': user_id,
                'type': f'sprint_{action}',
                'title': f'Sprint {action.title()}: {sprint["name"]}',
                'message': f'{current_user.name} {action}ed sprint "{sprint["name"]}"',
                'entity_type': 'sprint',
                'entity_id': sprint_id,
                'action_url': f'/sprints/{sprint_id}',
                'is_read': False,
                'created_at': datetime.utcnow().isoformat()
            }
            
            supabase.table('notifications').insert(notification_data).execute()
            
    except Exception as e:
        logger.error(f"Failed to send sprint notification: {e}")

# API Endpoints

@router.get("/", response_model=List[SprintResponse])
async def get_sprints(
    project_id: Optional[str] = None,
    status: Optional[str] = None,
    current_user: UserInDB = Depends(get_current_active_user),
    supabase = Depends(get_supabase)
):
    """Get sprints with optional filtering"""
    try:
        query = supabase.table('sprints').select('''
            *,
            project:projects(id, name),
            creator:users!created_by(id, name, email, avatar_url)
        ''')
        
        if project_id:
            query = query.eq('project_id', project_id)
        if status:
            query = query.eq('status', status)
            
        result = query.order('created_at', desc=True).execute()
        
        # Enrich with metrics
        sprints = []
        for sprint in result.data:
            metrics = await calculate_sprint_metrics(sprint['id'], supabase)
            sprint_data = {
                **sprint,
                'stories_count': metrics['total_stories'],
                'completed_story_points': metrics['completed_points'],
                'velocity': metrics['completed_points'] if sprint['status'] == 'completed' else None
            }
            sprints.append(sprint_data)
        
        return sprints
        
    except Exception as e:
        logger.error(f"Failed to get sprints: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get sprints: {str(e)}")

@router.get("/{sprint_id}", response_model=SprintResponse)
async def get_sprint(
    sprint_id: str,
    current_user: UserInDB = Depends(get_current_active_user),
    supabase = Depends(get_supabase)
):
    """Get a specific sprint with detailed information"""
    try:
        result = supabase.table('sprints').select('''
            *,
            project:projects(id, name),
            creator:users!created_by(id, name, email, avatar_url)
        ''').eq('id', sprint_id).single().execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Sprint not found")
        
        sprint = result.data
        metrics = await calculate_sprint_metrics(sprint_id, supabase)
        
        return {
            **sprint,
            'stories_count': metrics['total_stories'],
            'completed_story_points': metrics['completed_points'],
            'velocity': metrics['completed_points'] if sprint['status'] == 'completed' else None
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get sprint {sprint_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get sprint: {str(e)}")

@router.post("/", response_model=SprintResponse)
async def create_sprint(
    request: SprintCreateRequest,
    current_user: UserInDB = Depends(get_current_active_user),
    supabase = Depends(get_supabase)
):
    """Create a new sprint"""
    try:
        sprint_id = str(uuid.uuid4())
        now = datetime.utcnow()
        
        # Verify project exists
        project_result = supabase.table('projects').select('id').eq('id', request.project_id).single().execute()
        if not project_result.data:
            raise HTTPException(status_code=404, detail="Project not found")
        
        # Get next sprint number for the project
        existing_sprints = supabase.table('sprints').select('sprint_number').eq(
            'project_id', request.project_id
        ).order('sprint_number', desc=True).limit(1).execute()
        
        sprint_number = 1
        if existing_sprints.data:
            sprint_number = existing_sprints.data[0]['sprint_number'] + 1
        
        # Create sprint
        sprint_data = {
            'id': sprint_id,
            'project_id': request.project_id,
            'name': request.name,
            'goal': request.goal,
            'description': request.description,
            'sprint_number': sprint_number,
            'start_date': request.start_date.isoformat(),
            'end_date': request.end_date.isoformat(),
            'status': 'planning',
            'team_capacity': request.team_capacity,
            'planned_story_points': request.planned_story_points,
            'completed_story_points': 0,
            'scope_changes': 0,
            'created_at': now.isoformat(),
            'updated_at': now.isoformat(),
            'created_by': current_user.id
        }
        
        result = supabase.table('sprints').insert(sprint_data).execute()
        
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to create sprint")
        
        return {
            **result.data[0],
            'stories_count': 0,
            'completed_story_points': 0,
            'velocity': None
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to create sprint: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create sprint: {str(e)}")

@router.put("/{sprint_id}", response_model=SprintResponse)
async def update_sprint(
    sprint_id: str,
    request: SprintUpdate,
    current_user: UserInDB = Depends(get_current_active_user),
    supabase = Depends(get_supabase)
):
    """Update a sprint"""
    try:
        # Check if sprint exists
        current_sprint = supabase.table('sprints').select('*').eq('id', sprint_id).single().execute()
        if not current_sprint.data:
            raise HTTPException(status_code=404, detail="Sprint not found")
        
        # Build update data
        update_data = {}
        for field, value in request.dict(exclude_unset=True).items():
            if value is not None:
                if isinstance(value, date):
                    update_data[field] = value.isoformat()
                else:
                    update_data[field] = value
        
        update_data['updated_at'] = datetime.utcnow().isoformat()
        
        # Update sprint
        result = supabase.table('sprints').update(update_data).eq('id', sprint_id).execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Sprint not found")
        
        # Get updated sprint with metrics
        metrics = await calculate_sprint_metrics(sprint_id, supabase)
        
        return {
            **result.data[0],
            'stories_count': metrics['total_stories'],
            'completed_story_points': metrics['completed_points'],
            'velocity': metrics['completed_points'] if result.data[0]['status'] == 'completed' else None
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update sprint {sprint_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to update sprint: {str(e)}")

@router.patch("/{sprint_id}/status", response_model=SprintResponse)
async def update_sprint_status(
    sprint_id: str,
    request: SprintStatusUpdate,
    background_tasks: BackgroundTasks,
    current_user: UserInDB = Depends(get_current_active_user),
    supabase = Depends(get_supabase)
):
    """Update sprint status (start, complete, cancel)"""
    try:
        now = datetime.utcnow()
        
        update_data = {
            'status': request.status,
            'updated_at': now.isoformat()
        }
        
        if request.status == 'active':
            update_data['actual_start_date'] = (request.actual_start_date or now.date()).isoformat()
        elif request.status == 'completed':
            update_data['actual_end_date'] = (request.actual_end_date or now.date()).isoformat()
            
            # Calculate final velocity
            metrics = await calculate_sprint_metrics(sprint_id, supabase)
            update_data['velocity'] = metrics['completed_points']
            update_data['completed_story_points'] = metrics['completed_points']
        
        result = supabase.table('sprints').update(update_data).eq('id', sprint_id).execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Sprint not found")
        
        # Send notification
        background_tasks.add_task(
            send_sprint_notification,
            sprint_id,
            request.status,
            current_user,
            supabase
        )
        
        # Get updated sprint with metrics
        metrics = await calculate_sprint_metrics(sprint_id, supabase)
        
        return {
            **result.data[0],
            'stories_count': metrics['total_stories'],
            'completed_story_points': metrics['completed_points'],
            'velocity': result.data[0].get('velocity')
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update sprint status {sprint_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to update sprint status: {str(e)}")

@router.patch("/{sprint_id}/stories", response_model=Dict[str, Any])
async def manage_sprint_stories(
    sprint_id: str,
    request: SprintStoryAssignment,
    current_user: UserInDB = Depends(get_current_active_user),
    supabase = Depends(get_supabase)
):
    """Add or remove stories from a sprint"""
    try:
        # Verify sprint exists
        sprint_result = supabase.table('sprints').select('*').eq('id', sprint_id).single().execute()
        if not sprint_result.data:
            raise HTTPException(status_code=404, detail="Sprint not found")
        
        updated_count = 0
        
        for story_id in request.story_ids:
            try:
                if request.action == 'add':
                    # Add story to sprint
                    result = supabase.table('stories').update({
                        'sprint_id': sprint_id,
                        'updated_at': datetime.utcnow().isoformat()
                    }).eq('id', story_id).execute()
                    
                    if result.data:
                        updated_count += 1
                        
                elif request.action == 'remove':
                    # Remove story from sprint
                    result = supabase.table('stories').update({
                        'sprint_id': None,
                        'updated_at': datetime.utcnow().isoformat()
                    }).eq('id', story_id).execute()
                    
                    if result.data:
                        updated_count += 1
                        
            except Exception as e:
                logger.error(f"Failed to {request.action} story {story_id}: {e}")
                continue
        
        # Update sprint metrics
        metrics = await calculate_sprint_metrics(sprint_id, supabase)
        
        return {
            'success': True,
            'updated_stories': updated_count,
            'total_stories': metrics['total_stories'],
            'total_points': metrics['total_points']
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to manage sprint stories {sprint_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to manage sprint stories: {str(e)}")

@router.get("/{sprint_id}/stories")
async def get_sprint_stories_detailed(
    sprint_id: str,
    current_user: UserInDB = Depends(get_current_active_user),
    supabase = Depends(get_supabase)
):
    """Get detailed stories for a sprint"""
    try:
        stories = await get_sprint_stories(sprint_id, supabase)
        
        # Get tasks for each story
        for story in stories:
            tasks_result = supabase.table('tasks').select('''
                id, title, status, estimated_hours, actual_hours,
                assignee:users!assignee_id(id, name, avatar_url)
            ''').eq('story_id', story['id']).execute()
            
            story['tasks'] = tasks_result.data or []
        
        return {'stories': stories}
        
    except Exception as e:
        logger.error(f"Failed to get sprint stories {sprint_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get sprint stories: {str(e)}")

@router.get("/{sprint_id}/burndown")
async def get_sprint_burndown(
    sprint_id: str,
    current_user: UserInDB = Depends(get_current_active_user),
    supabase = Depends(get_supabase)
):
    """Get sprint burndown chart data"""
    try:
        # Get sprint details
        sprint_result = supabase.table('sprints').select('*').eq('id', sprint_id).single().execute()
        if not sprint_result.data:
            raise HTTPException(status_code=404, detail="Sprint not found")
        
        sprint = sprint_result.data
        
        # For now, return basic burndown data
        # In a real implementation, you'd track daily progress
        metrics = await calculate_sprint_metrics(sprint_id, supabase)
        
        return {
            'sprint_id': sprint_id,
            'total_points': metrics['total_points'],
            'completed_points': metrics['completed_points'],
            'remaining_points': metrics['total_points'] - metrics['completed_points'],
            'start_date': sprint['start_date'],
            'end_date': sprint['end_date'],
            'current_progress': metrics['progress_percentage']
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get sprint burndown {sprint_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get sprint burndown: {str(e)}")

@router.delete("/{sprint_id}")
async def delete_sprint(
    sprint_id: str,
    current_user: UserInDB = Depends(get_current_active_user),
    supabase = Depends(get_supabase)
):
    """Delete a sprint (only if status is planning)"""
    try:
        # Check if sprint exists and is in planning state
        sprint_result = supabase.table('sprints').select('*').eq('id', sprint_id).single().execute()
        if not sprint_result.data:
            raise HTTPException(status_code=404, detail="Sprint not found")
        
        sprint = sprint_result.data
        if sprint['status'] != 'planning':
            raise HTTPException(
                status_code=400, 
                detail="Only sprints in planning status can be deleted"
            )
        
        # Remove sprint assignment from stories
        supabase.table('stories').update({
            'sprint_id': None,
            'updated_at': datetime.utcnow().isoformat()
        }).eq('sprint_id', sprint_id).execute()
        
        # Delete sprint
        result = supabase.table('sprints').delete().eq('id', sprint_id).execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Sprint not found")
        
        return {'message': 'Sprint deleted successfully'}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete sprint {sprint_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to delete sprint: {str(e)}") 