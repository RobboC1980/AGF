"""
SynqForge Access Control API Endpoints

Provides REST API endpoints for managing the comprehensive access control system:
- Team role management
- Project role management  
- Role assignments and permissions
- Access control queries
"""

import logging
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from datetime import datetime
import uuid

from backend.auth.dependencies import get_current_active_user
from backend.database.supabase_client import get_supabase
from backend.auth.enhanced_auth import UserInDB
from backend.models.api_models import (
    TeamMemberRequest, TeamMemberUpdateRequest, ProjectMemberRequest, 
    ProjectMemberUpdateRequest, TeamMemberResponse, ProjectMemberResponse,
    UserRoleInfo, RoleAuditEntry, TeamRoleEnum, ProjectRoleEnum
)
from backend.services.access_control import access_control, Action

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/access-control", tags=["Access Control"])

# =====================================
# TEAM ROLE MANAGEMENT
# =====================================

@router.post("/teams/{team_id}/members", response_model=TeamMemberResponse)
async def add_team_member(
    team_id: str,
    request: TeamMemberRequest,
    background_tasks: BackgroundTasks,
    current_user: UserInDB = Depends(get_current_active_user),
    supabase = Depends(get_supabase)
):
    """Add a member to a team with specified role"""
    try:
        # Check if current user can invite team members
        team_check = supabase.table('team_members').select('role').eq(
            'team_id', team_id
        ).eq('user_id', current_user.id).eq('is_active', True).execute()
        
        if not team_check.data or team_check.data[0]['role'] != 'team_admin':
            raise HTTPException(status_code=403, detail="Only team admins can add members")
        
        # Check if user is already a member
        existing = supabase.table('team_members').select('id').eq(
            'team_id', team_id
        ).eq('user_id', request.user_id).execute()
        
        if existing.data:
            raise HTTPException(status_code=400, detail="User is already a team member")
        
        # Verify target user exists
        user_check = supabase.table('profiles').select('id, name, email').eq(
            'id', request.user_id
        ).single().execute()
        
        if not user_check.data:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Add team member
        member_id = str(uuid.uuid4())
        now = datetime.utcnow().isoformat()
        
        member_data = {
            'id': member_id,
            'team_id': team_id,
            'user_id': request.user_id,
            'role': request.role.value,
            'is_active': True,
            'joined_at': now,
            'invited_by': current_user.id,
            'invited_at': now,
            'created_at': now,
            'updated_at': now
        }
        
        result = supabase.table('team_members').insert(member_data).execute()
        
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to add team member")
        
        # Return response
        member = result.data[0]
        return TeamMemberResponse(
            id=member['id'],
            team_id=member['team_id'],
            user_id=member['user_id'],
            role=TeamRoleEnum(member['role']),
            is_active=member['is_active'],
            joined_at=datetime.fromisoformat(member['joined_at'].replace('Z', '+00:00')),
            invited_by=member['invited_by'],
            invited_at=datetime.fromisoformat(member['invited_at'].replace('Z', '+00:00')),
            user=user_check.data
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to add team member: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to add team member")

@router.get("/projects/{project_id}/access-check")
async def check_project_access(
    project_id: str,
    action: str,
    current_user: UserInDB = Depends(get_current_active_user)
):
    """Check if current user can perform specific action on project"""
    try:
        # Validate action
        try:
            action_enum = Action(action)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid action: {action}")
        
        # Mock implementation for now - would use database session
        has_permission = True  # Placeholder
        user_role = "project_viewer"  # Placeholder
        
        return {
            "user_id": current_user.id,
            "project_id": project_id,
            "action": action,
            "has_permission": has_permission,
            "user_role": user_role
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to check project access: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to check project access")
