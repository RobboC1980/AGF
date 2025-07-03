from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional, Union
from datetime import datetime
import logging
from sqlalchemy import or_, and_, func, text
from sqlalchemy.orm import Session

# Handle imports for both package and direct execution
try:
    from database.supabase_client import get_supabase
    from auth.enhanced_auth import get_current_active_user, UserInDB
except ImportError:
    from database.supabase_client import get_supabase
    from auth.enhanced_auth import get_current_active_user, UserInDB

logger = logging.getLogger(__name__)
router = APIRouter()

class SearchResult(BaseModel):
    id: str
    type: str  # 'project', 'epic', 'story', 'task', 'user'
    title: str
    description: Optional[str] = None
    key: Optional[str] = None
    status: str
    priority: Optional[str] = None
    assignee: Optional[Dict[str, Any]] = None
    project: Optional[Dict[str, Any]] = None
    epic: Optional[Dict[str, Any]] = None
    story: Optional[Dict[str, Any]] = None
    tags: List[str] = []
    created_at: datetime
    updated_at: Optional[datetime] = None
    due_date: Optional[str] = None
    score: Optional[float] = None

class SearchFilters(BaseModel):
    entity_types: List[str] = []
    statuses: List[str] = []
    priorities: List[str] = []
    assignees: List[str] = []
    projects: List[str] = []
    date_range_start: Optional[str] = None
    date_range_end: Optional[str] = None
    tags: List[str] = []

@router.get("/", response_model=List[SearchResult])
async def search_entities(
    q: str = Query(..., description="Search query"),
    entity_type: Optional[str] = Query(None, description="Comma-separated entity types to search"),
    limit: int = Query(20, le=100, description="Maximum number of results"),
    filters: Optional[str] = Query(None, description="JSON-encoded filters"),
    current_user: UserInDB = Depends(get_current_active_user),
    supabase = Depends(get_supabase)
):
    """
    Advanced search across all entities with full-text search and filtering
    """
    try:
        # Parse entity types
        entity_types = []
        if entity_type:
            entity_types = [t.strip() for t in entity_type.split(',')]
        
        # Default to all types if none specified
        if not entity_types:
            entity_types = ['project', 'epic', 'story', 'task', 'user']
        
        results = []
        
        # Search Projects
        if 'project' in entity_types:
            project_results = await search_projects(q, supabase, limit)
            results.extend(project_results)
        
        # Search Epics
        if 'epic' in entity_types:
            epic_results = await search_epics(q, supabase, limit)
            results.extend(epic_results)
        
        # Search Stories
        if 'story' in entity_types:
            story_results = await search_stories(q, supabase, limit)
            results.extend(story_results)
        
        # Search Tasks
        if 'task' in entity_types:
            task_results = await search_tasks(q, supabase, limit)
            results.extend(task_results)
        
        # Search Users
        if 'user' in entity_types:
            user_results = await search_users(q, supabase, limit)
            results.extend(user_results)
        
        # Sort by relevance score (if available) and limit results
        results.sort(key=lambda x: x.get('score', 0), reverse=True)
        results = results[:limit]
        
        return results
        
    except Exception as e:
        logger.error(f"Search failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")

async def search_projects(query: str, supabase, limit: int) -> List[SearchResult]:
    """Search projects using full-text search"""
    try:
        # Use PostgreSQL full-text search if available, otherwise use ILIKE
        search_query = f"""
        SELECT 
            p.*,
            COALESCE(ts_rank(to_tsvector('english', p.name || ' ' || COALESCE(p.description, '')), plainto_tsquery('english', %s)), 0) as score
        FROM projects p
        WHERE 
            to_tsvector('english', p.name || ' ' || COALESCE(p.description, '')) @@ plainto_tsquery('english', %s)
            OR p.name ILIKE %s 
            OR p.description ILIKE %s
            OR p.key ILIKE %s
        ORDER BY score DESC, p.updated_at DESC
        LIMIT %s
        """
        
        like_query = f'%{query}%'
        
        # Execute using Supabase RPC or direct query
        try:
            # Try PostgreSQL full-text search first
            result = supabase.rpc('execute_sql', {
                'sql': search_query,
                'params': [query, query, like_query, like_query, like_query, limit]
            }).execute()
            
            if result.data:
                projects_data = result.data
            else:
                raise Exception("RPC not available")
                
        except:
            # Fallback to simple ILIKE search
            result = supabase.table('projects').select('*').or_(
                f'name.ilike.%{query}%,description.ilike.%{query}%,key.ilike.%{query}%'
            ).limit(limit).execute()
            projects_data = result.data
        
        projects = []
        for project in projects_data:
            projects.append(SearchResult(
                id=project['id'],
                type='project',
                title=project['name'],
                description=project.get('description'),
                key=project.get('key'),
                status=project.get('status', 'active'),
                priority=project.get('priority'),
                created_at=project['created_at'],
                updated_at=project.get('updated_at'),
                score=project.get('score', 0)
            ))
        
        return projects
        
    except Exception as e:
        logger.error(f"Project search failed: {e}")
        return []

async def search_epics(query: str, supabase, limit: int) -> List[SearchResult]:
    """Search epics with project information"""
    try:
        result = supabase.table('epics').select('''
            *,
            project:projects(id, name, key)
        ''').or_(
            f'name.ilike.%{query}%,description.ilike.%{query}%,epic_key.ilike.%{query}%'
        ).limit(limit).execute()
        
        epics = []
        for epic in result.data:
            epics.append(SearchResult(
                id=epic['id'],
                type='epic',
                title=epic['name'],
                description=epic.get('description'),
                key=epic.get('epic_key'),
                status=epic.get('status', 'backlog'),
                priority=epic.get('priority'),
                project={
                    'id': epic['project']['id'],
                    'name': epic['project']['name']
                } if epic.get('project') else None,
                created_at=epic['created_at'],
                updated_at=epic.get('updated_at'),
                due_date=epic.get('target_end_date')
            ))
        
        return epics
        
    except Exception as e:
        logger.error(f"Epic search failed: {e}")
        return []

async def search_stories(query: str, supabase, limit: int) -> List[SearchResult]:
    """Search stories with epic and project information"""
    try:
        result = supabase.table('stories').select('''
            *,
            epic:epics(id, name, project:projects(id, name)),
            assignee:users!assignee_id(id, name, avatar_url)
        ''').or_(
            f'title.ilike.%{query}%,description.ilike.%{query}%,story_key.ilike.%{query}%,as_a.ilike.%{query}%,i_want.ilike.%{query}%,so_that.ilike.%{query}%,acceptance_criteria.ilike.%{query}%'
        ).limit(limit).execute()
        
        stories = []
        for story in result.data:
            stories.append(SearchResult(
                id=story['id'],
                type='story',
                title=story['title'],
                description=story.get('description'),
                key=story.get('story_key'),
                status=story.get('status', 'backlog'),
                priority=story.get('priority'),
                assignee={
                    'id': story['assignee']['id'],
                    'name': story['assignee']['name'],
                    'avatar': story['assignee'].get('avatar_url')
                } if story.get('assignee') else None,
                epic={
                    'id': story['epic']['id'],
                    'name': story['epic']['name']
                } if story.get('epic') else None,
                project={
                    'id': story['epic']['project']['id'],
                    'name': story['epic']['project']['name']
                } if story.get('epic') and story['epic'].get('project') else None,
                created_at=story['created_at'],
                updated_at=story.get('updated_at'),
                due_date=story.get('due_date')
            ))
        
        return stories
        
    except Exception as e:
        logger.error(f"Story search failed: {e}")
        return []

async def search_tasks(query: str, supabase, limit: int) -> List[SearchResult]:
    """Search tasks with story, epic and project information"""
    try:
        result = supabase.table('tasks').select('''
            *,
            story:stories(id, title, epic:epics(id, name, project:projects(id, name))),
            assignee:users!assignee_id(id, name, avatar_url)
        ''').or_(
            f'title.ilike.%{query}%,description.ilike.%{query}%,task_key.ilike.%{query}%,technical_notes.ilike.%{query}%'
        ).limit(limit).execute()
        
        tasks = []
        for task in result.data:
            tasks.append(SearchResult(
                id=task['id'],
                type='task',
                title=task['title'],
                description=task.get('description'),
                key=task.get('task_key'),
                status=task.get('status', 'todo'),
                priority=task.get('priority'),
                assignee={
                    'id': task['assignee']['id'],
                    'name': task['assignee']['name'],
                    'avatar': task['assignee'].get('avatar_url')
                } if task.get('assignee') else None,
                story={
                    'id': task['story']['id'],
                    'name': task['story']['title']
                } if task.get('story') else None,
                epic={
                    'id': task['story']['epic']['id'],
                    'name': task['story']['epic']['name']
                } if task.get('story') and task['story'].get('epic') else None,
                project={
                    'id': task['story']['epic']['project']['id'],
                    'name': task['story']['epic']['project']['name']
                } if task.get('story') and task['story'].get('epic') and task['story']['epic'].get('project') else None,
                created_at=task['created_at'],
                updated_at=task.get('updated_at'),
                due_date=task.get('due_date')
            ))
        
        return tasks
        
    except Exception as e:
        logger.error(f"Task search failed: {e}")
        return []

async def search_users(query: str, supabase, limit: int) -> List[SearchResult]:
    """Search users"""
    try:
        result = supabase.table('users').select('*').or_(
            f'name.ilike.%{query}%,email.ilike.%{query}%,username.ilike.%{query}%'
        ).eq('is_active', True).limit(limit).execute()
        
        users = []
        for user in result.data:
            users.append(SearchResult(
                id=user['id'],
                type='user',
                title=user['name'],
                description=user.get('email'),
                key=user.get('username'),
                status='active' if user.get('is_active', True) else 'inactive',
                assignee={
                    'id': user['id'],
                    'name': user['name'],
                    'avatar': user.get('avatar_url')
                },
                created_at=user['created_at'],
                updated_at=user.get('updated_at')
            ))
        
        return users
        
    except Exception as e:
        logger.error(f"User search failed: {e}")
        return []

@router.get("/suggestions")
async def get_search_suggestions(
    q: str = Query(..., min_length=2, description="Query for suggestions"),
    current_user: UserInDB = Depends(get_current_active_user),
    supabase = Depends(get_supabase)
):
    """
    Get search suggestions based on partial query
    """
    try:
        suggestions = []
        
        # Get recent entities that match the query
        # Projects
        project_result = supabase.table('projects').select('id, name, key').ilike('name', f'%{q}%').limit(3).execute()
        for project in project_result.data:
            suggestions.append({
                'type': 'project',
                'id': project['id'],
                'title': project['name'],
                'subtitle': f"Project • {project.get('key', '')}"
            })
        
        # Stories
        story_result = supabase.table('stories').select('id, title, story_key').ilike('title', f'%{q}%').limit(3).execute()
        for story in story_result.data:
            suggestions.append({
                'type': 'story',
                'id': story['id'],
                'title': story['title'],
                'subtitle': f"Story • {story.get('story_key', '')}"
            })
        
        # Users
        user_result = supabase.table('users').select('id, name, email').or_(
            f'name.ilike.%{q}%,email.ilike.%{q}%'
        ).eq('is_active', True).limit(3).execute()
        for user in user_result.data:
            suggestions.append({
                'type': 'user',
                'id': user['id'],
                'title': user['name'],
                'subtitle': f"User • {user['email']}"
            })
        
        return {
            "query": q,
            "suggestions": suggestions[:10]  # Limit to 10 total suggestions
        }
        
    except Exception as e:
        logger.error(f"Search suggestions failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get search suggestions")

@router.get("/tags")
async def get_available_tags(
    current_user: UserInDB = Depends(get_current_active_user),
    supabase = Depends(get_supabase)
):
    """
    Get available tags for filtering
    """
    try:
        # This would ideally come from a dedicated tags table
        # For now, we'll return common tags
        common_tags = [
            'frontend', 'backend', 'api', 'ui', 'ux', 'database', 
            'testing', 'performance', 'security', 'documentation',
            'bug', 'feature', 'enhancement', 'refactor', 'deployment'
        ]
        
        return {
            "tags": common_tags
        }
        
    except Exception as e:
        logger.error(f"Failed to get tags: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get available tags") 