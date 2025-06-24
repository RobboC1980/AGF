from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from datetime import datetime
import logging
import uuid

from ..database.supabase_client import get_supabase
from ..auth.enhanced_auth import get_current_active_user, UserInDB

logger = logging.getLogger(__name__)
router = APIRouter()

# Request/Response Models
class TeamCreateRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    color: str = Field(default="#3B82F6", pattern=r"^#[0-9A-Fa-f]{6}$")
    is_private: bool = Field(default=False)
    is_default: bool = Field(default=False)

class TeamUpdateRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    color: Optional[str] = Field(None, pattern=r"^#[0-9A-Fa-f]{6}$")
    is_private: Optional[bool] = None
    is_default: Optional[bool] = None

class TeamMemberAddRequest(BaseModel):
    user_id: str
    role: str = Field(default="member", pattern="^(admin|manager|member)$")
    can_manage_team: bool = Field(default=False)
    can_manage_projects: bool = Field(default=False)
    can_assign_tasks: bool = Field(default=True)

class TeamMemberUpdateRequest(BaseModel):
    role: Optional[str] = Field(None, pattern="^(admin|manager|member)$")
    can_manage_team: Optional[bool] = None
    can_manage_projects: Optional[bool] = None
    can_assign_tasks: Optional[bool] = None

class TeamResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    color: str
    is_private: bool
    is_default: bool
    member_count: int
    project_count: int
    created_at: datetime
    created_by: str
    members: List[Dict[str, Any]] = []
    projects: List[str] = []

class TeamMemberResponse(BaseModel):
    id: str
    team_id: str
    user_id: str
    role: str
    can_manage_team: bool
    can_manage_projects: bool
    can_assign_tasks: bool
    joined_at: datetime
    user: Dict[str, Any]

# Utility function to send team invitation notification
async def send_team_invitation_notification(team_id: str, user_id: str, inviter_id: str, supabase):
    """Send notification when user is invited to team"""
    try:
        # Get team details
        team_result = supabase.table('teams').select('name').eq('id', team_id).single().execute()
        if not team_result.data:
            return
            
        team = team_result.data
        
        # Get inviter details
        inviter_result = supabase.table('users').select('name').eq('id', inviter_id).single().execute()
        inviter_name = inviter_result.data['name'] if inviter_result.data else 'Someone'
        
        # Create notification
        notification_data = {
            'user_id': user_id,
            'type': 'team_invitation',
            'title': f'Team Invitation: {team["name"]}',
            'message': f'{inviter_name} invited you to join the {team["name"]} team',
            'entity_type': 'team',
            'entity_id': team_id,
            'action_url': f'/teams/{team_id}',
            'is_read': False,
            'created_at': datetime.utcnow().isoformat()
        }
        
        supabase.table('notifications').insert(notification_data).execute()
        logger.info(f"Team invitation notification sent to user {user_id}")
        
    except Exception as e:
        logger.error(f"Failed to send team invitation notification: {e}")

@router.post("/", response_model=TeamResponse)
async def create_team(
    request: TeamCreateRequest,
    background_tasks: BackgroundTasks,
    current_user: UserInDB = Depends(get_current_active_user),
    supabase = Depends(get_supabase)
):
    """Create a new team"""
    try:
        team_id = str(uuid.uuid4())
        now = datetime.utcnow()
        
        # Create team
        team_data = {
            'id': team_id,
            'name': request.name,
            'description': request.description,
            'color': request.color,
            'is_private': request.is_private,
            'is_default': request.is_default,
            'created_at': now.isoformat(),
            'updated_at': now.isoformat(),
            'created_by': current_user.id
        }
        
        result = supabase.table('teams').insert(team_data).execute()
        
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to create team")
        
        # Add creator as admin member
        member_data = {
            'id': str(uuid.uuid4()),
            'team_id': team_id,
            'user_id': current_user.id,
            'role': 'admin',
            'can_manage_team': True,
            'can_manage_projects': True,
            'can_assign_tasks': True,
            'joined_at': now.isoformat()
        }
        
        supabase.table('team_members').insert(member_data).execute()
        
        # Get team with members
        team_with_members = supabase.table('teams').select('''
            *,
            members:team_members(
                *,
                user:users(id, name, email, avatar_url)
            )
        ''').eq('id', team_id).single().execute()
        
        team = team_with_members.data
        
        return {
            "id": team["id"],
            "name": team["name"],
            "description": team["description"],
            "color": team["color"],
            "is_private": team["is_private"],
            "is_default": team["is_default"],
            "member_count": len(team["members"]),
            "project_count": 0,  # TODO: Calculate from projects
            "created_at": team["created_at"],
            "created_by": team["created_by"],
            "members": team["members"],
            "projects": []
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Team creation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create team: {str(e)}")

@router.get("/")
async def get_teams(
    user_id: Optional[str] = None,
    include_members: bool = True,
    supabase = Depends(get_supabase),
    current_user: UserInDB = Depends(get_current_active_user)
):
    """Get teams with optional filtering"""
    try:
        query = supabase.table('teams').select('*')
        
        if user_id:
            # Filter teams where user is a member
            member_teams = supabase.table('team_members').select('team_id').eq('user_id', user_id).execute()
            team_ids = [m['team_id'] for m in member_teams.data]
            if team_ids:
                query = query.in_('id', team_ids)
            else:
                return {"success": True, "data": {"teams": []}}
        
        result = query.order('created_at', desc=True).execute()
        teams = []
        
        for team in result.data:
            team_data = {
                "id": team["id"],
                "name": team["name"],
                "description": team["description"],
                "color": team["color"],
                "is_private": team["is_private"],
                "is_default": team["is_default"],
                "created_at": team["created_at"],
                "created_by": team["created_by"],
                "members": [],
                "member_count": 0,
                "project_count": 0,
                "projects": []
            }
            
            if include_members:
                # Get team members
                members_result = supabase.table('team_members').select('''
                    *,
                    user:users(id, name, email, avatar_url)
                ''').eq('team_id', team['id']).execute()
                
                team_data["members"] = members_result.data
                team_data["member_count"] = len(members_result.data)
            
            teams.append(team_data)
        
        return {"success": True, "data": {"teams": teams}}
        
    except Exception as e:
        logger.error(f"Failed to fetch teams: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch teams")

@router.get("/{team_id}", response_model=TeamResponse)
async def get_team(
    team_id: str,
    current_user: UserInDB = Depends(get_current_active_user),
    supabase = Depends(get_supabase)
):
    """Get a specific team with all details"""
    try:
        # Check if user has access to team
        member_check = supabase.table('team_members').select('id').eq('team_id', team_id).eq('user_id', current_user.id).execute()
        
        team_result = supabase.table('teams').select('*').eq('id', team_id).single().execute()
        if not team_result.data:
            raise HTTPException(status_code=404, detail="Team not found")
        
        team = team_result.data
        
        # Check access permissions
        if team['is_private'] and not member_check.data:
            raise HTTPException(status_code=403, detail="Access denied to private team")
        
        # Get team members
        members_result = supabase.table('team_members').select('''
            *,
            user:users(id, name, email, avatar_url, roles, department, location)
        ''').eq('team_id', team_id).execute()
        
        return {
            "id": team["id"],
            "name": team["name"],
            "description": team["description"],
            "color": team["color"],
            "is_private": team["is_private"],
            "is_default": team["is_default"],
            "member_count": len(members_result.data),
            "project_count": 0,  # TODO: Calculate from projects
            "created_at": team["created_at"],
            "created_by": team["created_by"],
            "members": members_result.data,
            "projects": []
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to fetch team {team_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch team: {str(e)}")

@router.put("/{team_id}", response_model=TeamResponse)
async def update_team(
    team_id: str,
    request: TeamUpdateRequest,
    current_user: UserInDB = Depends(get_current_active_user),
    supabase = Depends(get_supabase)
):
    """Update a team"""
    try:
        # Check if user can manage team
        member_check = supabase.table('team_members').select('can_manage_team, role').eq(
            'team_id', team_id
        ).eq('user_id', current_user.id).single().execute()
        
        if not member_check.data or (not member_check.data['can_manage_team'] and member_check.data['role'] != 'admin'):
            raise HTTPException(status_code=403, detail="Permission denied to manage team")
        
        # Build update data
        update_data = {}
        for field, value in request.dict(exclude_unset=True).items():
            update_data[field] = value
        
        update_data['updated_at'] = datetime.utcnow().isoformat()
        
        # Update team
        result = supabase.table('teams').update(update_data).eq('id', team_id).execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Team not found")
        
        # Get updated team with members
        team_result = supabase.table('teams').select('''
            *,
            members:team_members(
                *,
                user:users(id, name, email, avatar_url)
            )
        ''').eq('id', team_id).single().execute()
        
        team = team_result.data
        
        return {
            "id": team["id"],
            "name": team["name"],
            "description": team["description"],
            "color": team["color"],
            "is_private": team["is_private"],
            "is_default": team["is_default"],
            "member_count": len(team["members"]),
            "project_count": 0,
            "created_at": team["created_at"],
            "created_by": team["created_by"],
            "members": team["members"],
            "projects": []
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update team {team_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to update team: {str(e)}")

@router.post("/{team_id}/members", response_model=TeamMemberResponse)
async def add_team_member(
    team_id: str,
    request: TeamMemberAddRequest,
    background_tasks: BackgroundTasks,
    current_user: UserInDB = Depends(get_current_active_user),
    supabase = Depends(get_supabase)
):
    """Add a member to a team"""
    try:
        # Check permissions
        member_check = supabase.table('team_members').select('can_manage_team, role').eq(
            'team_id', team_id
        ).eq('user_id', current_user.id).single().execute()
        
        if not member_check.data or (not member_check.data['can_manage_team'] and member_check.data['role'] != 'admin'):
            raise HTTPException(status_code=403, detail="Permission denied to manage team members")
        
        # Check if user is already a member
        existing_member = supabase.table('team_members').select('id').eq(
            'team_id', team_id
        ).eq('user_id', request.user_id).execute()
        
        if existing_member.data:
            raise HTTPException(status_code=400, detail="User is already a team member")
        
        # Verify user exists
        user_check = supabase.table('users').select('id, name, email').eq('id', request.user_id).single().execute()
        if not user_check.data:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Add member
        member_id = str(uuid.uuid4())
        member_data = {
            'id': member_id,
            'team_id': team_id,
            'user_id': request.user_id,
            'role': request.role,
            'can_manage_team': request.can_manage_team,
            'can_manage_projects': request.can_manage_projects,
            'can_assign_tasks': request.can_assign_tasks,
            'joined_at': datetime.utcnow().isoformat(),
            'invited_by': current_user.id
        }
        
        result = supabase.table('team_members').insert(member_data).execute()
        
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to add team member")
        
        # Send invitation notification
        background_tasks.add_task(
            send_team_invitation_notification,
            team_id,
            request.user_id,
            current_user.id,
            supabase
        )
        
        # Get member with user details
        member_with_user = supabase.table('team_members').select('''
            *,
            user:users(id, name, email, avatar_url)
        ''').eq('id', member_id).single().execute()
        
        return member_with_user.data
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to add team member: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to add team member: {str(e)}")

@router.patch("/{team_id}/members/{user_id}", response_model=TeamMemberResponse)
async def update_team_member(
    team_id: str,
    user_id: str,
    request: TeamMemberUpdateRequest,
    current_user: UserInDB = Depends(get_current_active_user),
    supabase = Depends(get_supabase)
):
    """Update a team member's role and permissions"""
    try:
        # Check permissions
        member_check = supabase.table('team_members').select('can_manage_team, role').eq(
            'team_id', team_id
        ).eq('user_id', current_user.id).single().execute()
        
        if not member_check.data or (not member_check.data['can_manage_team'] and member_check.data['role'] != 'admin'):
            raise HTTPException(status_code=403, detail="Permission denied to manage team members")
        
        # Build update data
        update_data = {}
        for field, value in request.dict(exclude_unset=True).items():
            update_data[field] = value
        
        # Update member
        result = supabase.table('team_members').update(update_data).eq(
            'team_id', team_id
        ).eq('user_id', user_id).execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Team member not found")
        
        # Get updated member with user details
        member_with_user = supabase.table('team_members').select('''
            *,
            user:users(id, name, email, avatar_url)
        ''').eq('team_id', team_id).eq('user_id', user_id).single().execute()
        
        return member_with_user.data
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update team member: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to update team member: {str(e)}")

@router.delete("/{team_id}/members/{user_id}")
async def remove_team_member(
    team_id: str,
    user_id: str,
    current_user: UserInDB = Depends(get_current_active_user),
    supabase = Depends(get_supabase)
):
    """Remove a member from a team"""
    try:
        # Check permissions (can't remove yourself if you're the only admin)
        if user_id == current_user.id:
            admin_count = supabase.table('team_members').select('id').eq(
                'team_id', team_id
            ).eq('role', 'admin').execute()
            
            if len(admin_count.data) <= 1:
                raise HTTPException(status_code=400, detail="Cannot remove the last admin from team")
        
        member_check = supabase.table('team_members').select('can_manage_team, role').eq(
            'team_id', team_id
        ).eq('user_id', current_user.id).single().execute()
        
        if not member_check.data or (not member_check.data['can_manage_team'] and member_check.data['role'] != 'admin'):
            raise HTTPException(status_code=403, detail="Permission denied to manage team members")
        
        # Remove member
        result = supabase.table('team_members').delete().eq(
            'team_id', team_id
        ).eq('user_id', user_id).execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Team member not found")
        
        return {"success": True, "message": "Team member removed successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to remove team member: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to remove team member: {str(e)}")

@router.delete("/{team_id}")
async def delete_team(
    team_id: str,
    current_user: UserInDB = Depends(get_current_active_user),
    supabase = Depends(get_supabase)
):
    """Delete a team"""
    try:
        # Check if user is admin
        member_check = supabase.table('team_members').select('role').eq(
            'team_id', team_id
        ).eq('user_id', current_user.id).single().execute()
        
        if not member_check.data or member_check.data['role'] != 'admin':
            raise HTTPException(status_code=403, detail="Only team admins can delete teams")
        
        # Delete team members first
        supabase.table('team_members').delete().eq('team_id', team_id).execute()
        
        # Delete team
        result = supabase.table('teams').delete().eq('id', team_id).execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Team not found")
        
        return {"success": True, "message": "Team deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete team {team_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to delete team: {str(e)}")

@router.get("/{team_id}/projects")
async def get_team_projects(
    team_id: str,
    current_user: UserInDB = Depends(get_current_active_user),
    supabase = Depends(get_supabase)
):
    """Get projects assigned to a team"""
    try:
        # Check team access
        member_check = supabase.table('team_members').select('id').eq(
            'team_id', team_id
        ).eq('user_id', current_user.id).execute()
        
        if not member_check.data:
            raise HTTPException(status_code=403, detail="Access denied to team")
        
        # Get team projects
        projects_result = supabase.table('projects').select('*').eq('team_id', team_id).execute()
        
        return {"success": True, "data": {"projects": projects_result.data}}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to fetch team projects: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch team projects") 