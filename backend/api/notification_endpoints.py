#!/usr/bin/env python3
"""
Notification API Endpoints
Provides comprehensive notification management, preferences, and campaigns
"""

import logging
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks, Query
from pydantic import BaseModel, Field
from datetime import datetime

from backend.auth.enhanced_auth import get_current_active_user, require_admin
from backend.services.notification_service import (
    get_notification_service, 
    Notification, 
    NotificationPreference, 
    NotificationType, 
    NotificationPriority, 
    NotificationChannel
)

logger = logging.getLogger(__name__)

# Create router
notification_router = APIRouter(prefix="/api/notifications", tags=["Notifications"])

# Request/Response Models
class SendNotificationRequest(BaseModel):
    user_id: str = Field(..., description="Target user ID")
    type: NotificationType = Field(..., description="Notification type")
    title: str = Field(..., description="Notification title")
    message: str = Field(..., description="Notification message")
    priority: NotificationPriority = Field(default=NotificationPriority.MEDIUM, description="Notification priority")
    channels: List[NotificationChannel] = Field(..., description="Notification channels")
    data: Optional[Dict[str, Any]] = Field(default=None, description="Additional notification data")

class UpdatePreferencesRequest(BaseModel):
    preferences: List[NotificationPreference] = Field(..., description="User notification preferences")

class CreateCampaignRequest(BaseModel):
    name: str = Field(..., description="Campaign name")
    type: NotificationType = Field(..., description="Campaign notification type")
    target_criteria: Dict[str, Any] = Field(..., description="Target user criteria")
    template_id: Optional[str] = Field(default=None, description="Email template ID")
    scheduled_for: Optional[datetime] = Field(default=None, description="Schedule campaign for later")

class NotificationResponse(BaseModel):
    id: str
    type: str
    title: str
    message: str
    priority: str
    read: bool
    created_at: datetime
    data: Optional[Dict[str, Any]] = None

class PreferencesResponse(BaseModel):
    preferences: List[NotificationPreference]
    user_id: str

class CampaignResponse(BaseModel):
    id: str
    name: str
    type: str
    status: str
    sent_count: int
    created_at: datetime

# Endpoints
@notification_router.post("/send")
async def send_notification(
    request: SendNotificationRequest,
    current_user: dict = Depends(get_current_active_user)
):
    """
    Send a notification to a user
    """
    try:
        notification_service = get_notification_service()
        
        notification = Notification(
            user_id=request.user_id,
            type=request.type,
            title=request.title,
            message=request.message,
            priority=request.priority,
            channels=request.channels,
            data=request.data
        )
        
        success = await notification_service.send_notification(notification)
        
        if success:
            return {"message": "Notification sent successfully", "success": True}
        else:
            raise HTTPException(status_code=500, detail="Failed to send notification")
            
    except Exception as e:
        logger.error(f"Failed to send notification: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to send notification: {str(e)}")

@notification_router.get("/", response_model=List[NotificationResponse])
async def get_user_notifications(
    limit: int = Query(default=50, ge=1, le=100, description="Maximum number of notifications"),
    unread_only: bool = Query(default=False, description="Return only unread notifications"),
    current_user: dict = Depends(get_current_active_user)
):
    """
    Get notifications for the current user
    """
    try:
        notification_service = get_notification_service()
        
        notifications = await notification_service.get_user_notifications(
            user_id=current_user['id'],
            limit=limit,
            unread_only=unread_only
        )
        
        return [
            NotificationResponse(
                id=notif['id'],
                type=notif['type'],
                title=notif['title'],
                message=notif['message'],
                priority=notif['priority'],
                read=notif['read'],
                created_at=notif['created_at'],
                data=notif.get('data')
            )
            for notif in notifications
        ]
        
    except Exception as e:
        logger.error(f"Failed to get user notifications: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get notifications: {str(e)}")

@notification_router.put("/{notification_id}/read")
async def mark_notification_read(
    notification_id: str,
    current_user: dict = Depends(get_current_active_user)
):
    """
    Mark a notification as read
    """
    try:
        notification_service = get_notification_service()
        
        success = await notification_service.mark_notification_read(
            notification_id=notification_id,
            user_id=current_user['id']
        )
        
        if success:
            return {"message": "Notification marked as read", "success": True}
        else:
            raise HTTPException(status_code=404, detail="Notification not found")
            
    except Exception as e:
        logger.error(f"Failed to mark notification as read: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to mark notification as read: {str(e)}")

@notification_router.get("/preferences", response_model=PreferencesResponse)
async def get_user_preferences(
    current_user: dict = Depends(get_current_active_user)
):
    """
    Get user notification preferences
    """
    try:
        notification_service = get_notification_service()
        
        # Get preferences for all notification types
        all_preferences = []
        for notif_type in NotificationType:
            pref = await notification_service._get_user_preferences(
                current_user['id'], 
                notif_type
            )
            if pref:
                all_preferences.append(pref)
        
        return PreferencesResponse(
            preferences=all_preferences,
            user_id=current_user['id']
        )
        
    except Exception as e:
        logger.error(f"Failed to get user preferences: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get preferences: {str(e)}")

@notification_router.put("/preferences")
async def update_user_preferences(
    request: UpdatePreferencesRequest,
    current_user: dict = Depends(get_current_active_user)
):
    """
    Update user notification preferences
    """
    try:
        notification_service = get_notification_service()
        
        success = await notification_service.update_user_preferences(
            user_id=current_user['id'],
            preferences=request.preferences
        )
        
        if success:
            return {"message": "Preferences updated successfully", "success": True}
        else:
            raise HTTPException(status_code=500, detail="Failed to update preferences")
            
    except Exception as e:
        logger.error(f"Failed to update user preferences: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update preferences: {str(e)}")

@notification_router.post("/campaigns", response_model=CampaignResponse)
async def create_campaign(
    request: CreateCampaignRequest,
    current_user: dict = Depends(require_admin)
):
    """
    Create a notification campaign (admin only)
    """
    try:
        notification_service = get_notification_service()
        
        campaign_data = {
            'name': request.name,
            'type': request.type.value,
            'target_criteria': request.target_criteria,
            'template_id': request.template_id,
            'scheduled_for': request.scheduled_for.isoformat() if request.scheduled_for else None
        }
        
        campaign_id = await notification_service.create_notification_campaign(campaign_data)
        
        # Get created campaign details
        campaign_result = notification_service.supabase.table('notification_campaigns').select('*').eq(
            'id', campaign_id
        ).single().execute()
        
        campaign = campaign_result.data
        
        return CampaignResponse(
            id=campaign['id'],
            name=campaign['name'],
            type=campaign['type'],
            status=campaign['status'],
            sent_count=campaign['sent_count'],
            created_at=campaign['created_at']
        )
        
    except Exception as e:
        logger.error(f"Failed to create campaign: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create campaign: {str(e)}")

@notification_router.post("/campaigns/{campaign_id}/send")
async def send_campaign(
    campaign_id: str,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(require_admin)
):
    """
    Send a notification campaign (admin only)
    """
    try:
        notification_service = get_notification_service()
        
        # Add background task to send campaign
        background_tasks.add_task(
            notification_service.send_campaign,
            campaign_id
        )
        
        return {"message": "Campaign sending started", "campaign_id": campaign_id}
        
    except Exception as e:
        logger.error(f"Failed to send campaign: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to send campaign: {str(e)}")

@notification_router.get("/campaigns", response_model=List[CampaignResponse])
async def get_campaigns(
    current_user: dict = Depends(require_admin)
):
    """
    Get all notification campaigns (admin only)
    """
    try:
        notification_service = get_notification_service()
        
        result = notification_service.supabase.table('notification_campaigns').select('*').order(
            'created_at', desc=True
        ).execute()
        
        campaigns = result.data
        
        return [
            CampaignResponse(
                id=campaign['id'],
                name=campaign['name'],
                type=campaign['type'],
                status=campaign['status'],
                sent_count=campaign['sent_count'],
                created_at=campaign['created_at']
            )
            for campaign in campaigns
        ]
        
    except Exception as e:
        logger.error(f"Failed to get campaigns: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get campaigns: {str(e)}")

@notification_router.get("/templates")
async def get_email_templates(
    current_user: dict = Depends(require_admin)
):
    """
    Get all email templates (admin only)
    """
    try:
        notification_service = get_notification_service()
        
        result = notification_service.supabase.table('email_templates').select('*').order(
            'created_at', desc=True
        ).execute()
        
        return {"templates": result.data}
        
    except Exception as e:
        logger.error(f"Failed to get email templates: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get templates: {str(e)}")

@notification_router.post("/templates")
async def create_email_template(
    template_data: Dict[str, Any],
    current_user: dict = Depends(require_admin)
):
    """
    Create a new email template (admin only)
    """
    try:
        notification_service = get_notification_service()
        
        result = notification_service.supabase.table('email_templates').insert(template_data).execute()
        
        return {"message": "Template created successfully", "template": result.data[0]}
        
    except Exception as e:
        logger.error(f"Failed to create email template: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create template: {str(e)}")

@notification_router.get("/stats")
async def get_notification_stats(
    current_user: dict = Depends(get_current_active_user)
):
    """
    Get notification statistics for the current user
    """
    try:
        notification_service = get_notification_service()
        
        # Get total notifications
        total_result = notification_service.supabase.table('notifications').select(
            'id', count='exact'
        ).eq('user_id', current_user['id']).execute()
        
        # Get unread notifications
        unread_result = notification_service.supabase.table('notifications').select(
            'id', count='exact'
        ).eq('user_id', current_user['id']).eq('read', False).execute()
        
        # Get notifications by type (last 30 days)
        thirty_days_ago = (datetime.now() - timedelta(days=30)).isoformat()
        type_result = notification_service.supabase.table('notifications').select(
            'type'
        ).eq('user_id', current_user['id']).gte('created_at', thirty_days_ago).execute()
        
        # Count by type
        type_counts = {}
        for notif in type_result.data:
            notif_type = notif['type']
            type_counts[notif_type] = type_counts.get(notif_type, 0) + 1
        
        return {
            "total_notifications": total_result.count,
            "unread_notifications": unread_result.count,
            "notifications_by_type_last_30_days": type_counts,
            "user_id": current_user['id']
        }
        
    except Exception as e:
        logger.error(f"Failed to get notification stats: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get stats: {str(e)}")

@notification_router.post("/initialize")
async def initialize_notification_system(
    current_user: dict = Depends(require_admin)
):
    """
    Initialize the notification system (admin only)
    """
    try:
        notification_service = get_notification_service()
        
        await notification_service.initialize_notification_system()
        
        return {"message": "Notification system initialized successfully"}
        
    except Exception as e:
        logger.error(f"Failed to initialize notification system: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to initialize: {str(e)}")

@notification_router.post("/test")
async def send_test_notification(
    current_user: dict = Depends(get_current_active_user)
):
    """
    Send a test notification to the current user
    """
    try:
        notification_service = get_notification_service()
        
        test_notification = Notification(
            user_id=current_user['id'],
            type=NotificationType.SYSTEM_ALERT,
            title="Test Notification",
            message="This is a test notification to verify the system is working correctly.",
            priority=NotificationPriority.LOW,
            channels=[NotificationChannel.IN_APP, NotificationChannel.EMAIL],
            data={
                "test": True,
                "timestamp": datetime.now().isoformat()
            }
        )
        
        success = await notification_service.send_notification(test_notification)
        
        if success:
            return {"message": "Test notification sent successfully", "success": True}
        else:
            raise HTTPException(status_code=500, detail="Failed to send test notification")
            
    except Exception as e:
        logger.error(f"Failed to send test notification: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to send test notification: {str(e)}")

@notification_router.delete("/{notification_id}")
async def delete_notification(
    notification_id: str,
    current_user: dict = Depends(get_current_active_user)
):
    """
    Delete a notification
    """
    try:
        notification_service = get_notification_service()
        
        result = notification_service.supabase.table('notifications').delete().eq(
            'id', notification_id
        ).eq('user_id', current_user['id']).execute()
        
        if result.data:
            return {"message": "Notification deleted successfully", "success": True}
        else:
            raise HTTPException(status_code=404, detail="Notification not found")
            
    except Exception as e:
        logger.error(f"Failed to delete notification: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete notification: {str(e)}")

@notification_router.put("/mark-all-read")
async def mark_all_notifications_read(
    current_user: dict = Depends(get_current_active_user)
):
    """
    Mark all notifications as read for the current user
    """
    try:
        notification_service = get_notification_service()
        
        result = notification_service.supabase.table('notifications').update({
            'read': True
        }).eq('user_id', current_user['id']).eq('read', False).execute()
        
        return {
            "message": f"Marked {len(result.data)} notifications as read",
            "count": len(result.data),
            "success": True
        }
        
    except Exception as e:
        logger.error(f"Failed to mark all notifications as read: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to mark all as read: {str(e)}")

# Helper function to send story assignment notification
async def send_story_assignment_notification(story_id: str, assignee_id: str, assigner_id: str):
    """Helper function to send story assignment notification"""
    try:
        notification_service = get_notification_service()
        
        # Get story and epic details
        story_result = notification_service.supabase.table('stories').select(
            '*, epics!inner(name, project_id)'
        ).eq('id', story_id).single().execute()
        
        if not story_result.data:
            return
            
        story = story_result.data
        epic = story['epics']
        
        # Get assigner details
        assigner_result = notification_service.supabase.table('users').select(
            'name'
        ).eq('id', assigner_id).single().execute()
        
        assigner_name = assigner_result.data['name'] if assigner_result.data else "Someone"
        
        notification = Notification(
            user_id=assignee_id,
            type=NotificationType.STORY_ASSIGNED,
            title=f"New Story Assigned: {story['name']}",
            message=f"{assigner_name} assigned you a new story in the {epic['name']} epic.",
            priority=NotificationPriority.MEDIUM,
            channels=[NotificationChannel.IN_APP, NotificationChannel.EMAIL],
            data={
                "story_id": story_id,
                "story_name": story['name'],
                "epic_name": epic['name'],
                "priority": story.get('priority', 'medium'),
                "story_points": story.get('story_points'),
                "description": story.get('description', ''),
                "story_url": f"/projects/{epic['project_id']}/stories/{story_id}",
                "assigner_name": assigner_name
            }
        )
        
        await notification_service.send_notification(notification)
        
    except Exception as e:
        logger.error(f"Failed to send story assignment notification: {e}")

# Helper function to send AI insight notification
async def send_ai_insight_notification(project_id: str, insight_data: Dict[str, Any]):
    """Helper function to send AI insight notification"""
    try:
        notification_service = get_notification_service()
        
        # Get project details
        project_result = notification_service.supabase.table('projects').select('*').eq(
            'id', project_id
        ).single().execute()
        
        if not project_result.data:
            return
            
        project = project_result.data
        
        # Get project team members (simplified - you might have a more complex team structure)
        team_result = notification_service.supabase.table('users').select('id').execute()
        
        for user in team_result.data:
            notification = Notification(
                user_id=user['id'],
                type=NotificationType.AI_INSIGHT,
                title=f"AI Insight: {insight_data['title']}",
                message=f"New AI insight available for project {project['name']}",
                priority=NotificationPriority.HIGH if insight_data.get('priority') == 'high' else NotificationPriority.MEDIUM,
                channels=[NotificationChannel.IN_APP, NotificationChannel.EMAIL],
                data={
                    "project_id": project_id,
                    "project_name": project['name'],
                    "insight_title": insight_data['title'],
                    "insight_description": insight_data['description'],
                    "confidence": int(insight_data.get('confidence', 0) * 100),
                    "priority": insight_data.get('priority', 'medium'),
                    "actionable_items": insight_data.get('actionable_items', []),
                    "project_url": f"/projects/{project_id}"
                }
            )
            
            await notification_service.send_notification(notification)
        
    except Exception as e:
        logger.error(f"Failed to send AI insight notification: {e}") 