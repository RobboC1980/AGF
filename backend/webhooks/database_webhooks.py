"""
Database Webhooks Handler for AgileForge
Handles real-time database changes from Supabase webhooks
"""

import logging
from datetime import datetime
from typing import Dict, Any, Optional
from fastapi import APIRouter, Request, BackgroundTasks, HTTPException, status
from pydantic import BaseModel

logger = logging.getLogger(__name__)

# Webhook payload models
class WebhookPayload(BaseModel):
    table: str
    type: str  # INSERT, UPDATE, DELETE
    record: Optional[Dict[str, Any]] = None
    old_record: Optional[Dict[str, Any]] = None
    schema: str = "public"

class NotificationPayload(BaseModel):
    user_id: str
    title: str
    message: str
    type: str = "info"  # info, success, warning, error
    data: Optional[Dict[str, Any]] = None

# Create router
webhooks_router = APIRouter(prefix="/webhooks", tags=["Webhooks"])

@webhooks_router.post("/database")
async def handle_database_webhook(
    request: Request,
    background_tasks: BackgroundTasks
):
    """Handle database change webhooks from Supabase"""
    try:
        payload = await request.json()
        webhook_data = WebhookPayload(**payload)
        
        logger.info(f"Received webhook for table: {webhook_data.table}, type: {webhook_data.type}")
        
        # Route to appropriate handler based on table
        if webhook_data.table == "stories":
            background_tasks.add_task(handle_story_changes, webhook_data)
        elif webhook_data.table == "epics":
            background_tasks.add_task(handle_epic_changes, webhook_data)
        elif webhook_data.table == "projects":
            background_tasks.add_task(handle_project_changes, webhook_data)
        elif webhook_data.table == "users":
            background_tasks.add_task(handle_user_changes, webhook_data)
        else:
            logger.info(f"No handler for table: {webhook_data.table}")
        
        return {"status": "success", "message": "Webhook processed"}
        
    except Exception as e:
        logger.error(f"Error processing webhook: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process webhook"
        )

async def handle_story_changes(webhook_data: WebhookPayload):
    """Handle story table changes"""
    try:
        if webhook_data.type == "INSERT":
            await notify_story_created(webhook_data.record)
        elif webhook_data.type == "UPDATE":
            await notify_story_updated(webhook_data.record, webhook_data.old_record)
        elif webhook_data.type == "DELETE":
            await notify_story_deleted(webhook_data.old_record)
            
    except Exception as e:
        logger.error(f"Error handling story changes: {e}")

async def handle_epic_changes(webhook_data: WebhookPayload):
    """Handle epic table changes"""
    try:
        if webhook_data.type == "INSERT":
            await notify_epic_created(webhook_data.record)
        elif webhook_data.type == "UPDATE":
            await notify_epic_updated(webhook_data.record, webhook_data.old_record)
        elif webhook_data.type == "DELETE":
            await notify_epic_deleted(webhook_data.old_record)
            
    except Exception as e:
        logger.error(f"Error handling epic changes: {e}")

async def handle_project_changes(webhook_data: WebhookPayload):
    """Handle project table changes"""
    try:
        if webhook_data.type == "INSERT":
            await notify_project_created(webhook_data.record)
        elif webhook_data.type == "UPDATE":
            await notify_project_updated(webhook_data.record, webhook_data.old_record)
        elif webhook_data.type == "DELETE":
            await notify_project_deleted(webhook_data.old_record)
            
    except Exception as e:
        logger.error(f"Error handling project changes: {e}")

async def handle_user_changes(webhook_data: WebhookPayload):
    """Handle user table changes"""
    try:
        if webhook_data.type == "INSERT":
            await notify_user_created(webhook_data.record)
        elif webhook_data.type == "UPDATE":
            await notify_user_updated(webhook_data.record, webhook_data.old_record)
            
    except Exception as e:
        logger.error(f"Error handling user changes: {e}")

# Story notification handlers
async def notify_story_created(story: Dict[str, Any]):
    """Notify when a new story is created"""
    try:
        # Notify assignee if assigned
        if story.get("assignee_id"):
            await send_notification(NotificationPayload(
                user_id=story["assignee_id"],
                title="New Story Assigned",
                message=f"You have been assigned a new story: {story.get('name', 'Untitled')}",
                type="info",
                data={"story_id": story["id"], "type": "story_assigned"}
            ))
        
        # Notify team members about new story in epic
        if story.get("epic_id"):
            await notify_epic_team_members(
                story["epic_id"],
                f"New story created: {story.get('name', 'Untitled')}",
                {"story_id": story["id"], "type": "story_created"}
            )
            
    except Exception as e:
        logger.error(f"Error notifying story creation: {e}")

async def notify_story_updated(story: Dict[str, Any], old_story: Dict[str, Any]):
    """Notify when a story is updated"""
    try:
        # Check for status changes
        if story.get("status") != old_story.get("status"):
            await notify_status_change(
                story,
                old_story.get("status"),
                story.get("status"),
                "story"
            )
        
        # Check for assignee changes
        if story.get("assignee_id") != old_story.get("assignee_id"):
            await notify_assignee_change(story, old_story, "story")
        
        # Check for priority changes
        if story.get("priority") != old_story.get("priority"):
            await notify_priority_change(story, old_story, "story")
            
    except Exception as e:
        logger.error(f"Error notifying story update: {e}")

async def notify_story_deleted(story: Dict[str, Any]):
    """Notify when a story is deleted"""
    try:
        # Notify team members
        if story.get("epic_id"):
            await notify_epic_team_members(
                story["epic_id"],
                f"Story deleted: {story.get('name', 'Untitled')}",
                {"story_id": story["id"], "type": "story_deleted"}
            )
            
    except Exception as e:
        logger.error(f"Error notifying story deletion: {e}")

# Epic notification handlers
async def notify_epic_created(epic: Dict[str, Any]):
    """Notify when a new epic is created"""
    try:
        # Notify project team members
        if epic.get("project_id"):
            await notify_project_team_members(
                epic["project_id"],
                f"New epic created: {epic.get('name', 'Untitled')}",
                {"epic_id": epic["id"], "type": "epic_created"}
            )
            
    except Exception as e:
        logger.error(f"Error notifying epic creation: {e}")

async def notify_epic_updated(epic: Dict[str, Any], old_epic: Dict[str, Any]):
    """Notify when an epic is updated"""
    try:
        # Check for status changes
        if epic.get("status") != old_epic.get("status"):
            await notify_status_change(
                epic,
                old_epic.get("status"),
                epic.get("status"),
                "epic"
            )
            
    except Exception as e:
        logger.error(f"Error notifying epic update: {e}")

async def notify_epic_deleted(epic: Dict[str, Any]):
    """Notify when an epic is deleted"""
    try:
        # Notify project team members
        if epic.get("project_id"):
            await notify_project_team_members(
                epic["project_id"],
                f"Epic deleted: {epic.get('name', 'Untitled')}",
                {"epic_id": epic["id"], "type": "epic_deleted"}
            )
            
    except Exception as e:
        logger.error(f"Error notifying epic deletion: {e}")

# Project notification handlers
async def notify_project_created(project: Dict[str, Any]):
    """Notify when a new project is created"""
    try:
        # Notify all team members with project access
        await broadcast_to_role(
            ["admin", "project_manager"],
            f"New project created: {project.get('name', 'Untitled')}",
            {"project_id": project["id"], "type": "project_created"}
        )
            
    except Exception as e:
        logger.error(f"Error notifying project creation: {e}")

async def notify_project_updated(project: Dict[str, Any], old_project: Dict[str, Any]):
    """Notify when a project is updated"""
    try:
        # Check for status changes
        if project.get("status") != old_project.get("status"):
            await notify_status_change(
                project,
                old_project.get("status"),
                project.get("status"),
                "project"
            )
            
    except Exception as e:
        logger.error(f"Error notifying project update: {e}")

async def notify_project_deleted(project: Dict[str, Any]):
    """Notify when a project is deleted"""
    try:
        # Notify all team members
        await broadcast_to_role(
            ["admin", "project_manager"],
            f"Project deleted: {project.get('name', 'Untitled')}",
            {"project_id": project["id"], "type": "project_deleted"}
        )
            
    except Exception as e:
        logger.error(f"Error notifying project deletion: {e}")

# User notification handlers
async def notify_user_created(user: Dict[str, Any]):
    """Notify when a new user is created"""
    try:
        # Notify admins about new user
        await broadcast_to_role(
            ["admin"],
            f"New user registered: {user.get('name', 'Unknown')} ({user.get('email', 'No email')})",
            {"user_id": user["id"], "type": "user_created"}
        )
            
    except Exception as e:
        logger.error(f"Error notifying user creation: {e}")

async def notify_user_updated(user: Dict[str, Any], old_user: Dict[str, Any]):
    """Notify when a user is updated"""
    try:
        # Check for role changes
        if user.get("roles") != old_user.get("roles"):
            await send_notification(NotificationPayload(
                user_id=user["id"],
                title="Role Updated",
                message=f"Your roles have been updated to: {', '.join(user.get('roles', []))}",
                type="info",
                data={"type": "role_updated", "new_roles": user.get("roles", [])}
            ))
            
    except Exception as e:
        logger.error(f"Error notifying user update: {e}")

# Helper notification functions
async def notify_status_change(
    item: Dict[str, Any],
    old_status: str,
    new_status: str,
    item_type: str
):
    """Notify about status changes"""
    try:
        # Notify assignee if applicable
        if item.get("assignee_id"):
            await send_notification(NotificationPayload(
                user_id=item["assignee_id"],
                title=f"{item_type.title()} Status Changed",
                message=f"{item.get('name', 'Untitled')} status changed from {old_status} to {new_status}",
                type="info",
                data={
                    f"{item_type}_id": item["id"],
                    "type": "status_change",
                    "old_status": old_status,
                    "new_status": new_status
                }
            ))
            
    except Exception as e:
        logger.error(f"Error notifying status change: {e}")

async def notify_assignee_change(
    item: Dict[str, Any],
    old_item: Dict[str, Any],
    item_type: str
):
    """Notify about assignee changes"""
    try:
        # Notify old assignee
        if old_item.get("assignee_id"):
            await send_notification(NotificationPayload(
                user_id=old_item["assignee_id"],
                title=f"{item_type.title()} Unassigned",
                message=f"You are no longer assigned to: {item.get('name', 'Untitled')}",
                type="info",
                data={f"{item_type}_id": item["id"], "type": "unassigned"}
            ))
        
        # Notify new assignee
        if item.get("assignee_id"):
            await send_notification(NotificationPayload(
                user_id=item["assignee_id"],
                title=f"{item_type.title()} Assigned",
                message=f"You have been assigned to: {item.get('name', 'Untitled')}",
                type="info",
                data={f"{item_type}_id": item["id"], "type": "assigned"}
            ))
            
    except Exception as e:
        logger.error(f"Error notifying assignee change: {e}")

async def notify_priority_change(
    item: Dict[str, Any],
    old_item: Dict[str, Any],
    item_type: str
):
    """Notify about priority changes"""
    try:
        # Notify assignee if applicable
        if item.get("assignee_id"):
            await send_notification(NotificationPayload(
                user_id=item["assignee_id"],
                title=f"{item_type.title()} Priority Changed",
                message=f"{item.get('name', 'Untitled')} priority changed from {old_item.get('priority')} to {item.get('priority')}",
                type="warning" if item.get("priority") in ["high", "critical"] else "info",
                data={
                    f"{item_type}_id": item["id"],
                    "type": "priority_change",
                    "old_priority": old_item.get("priority"),
                    "new_priority": item.get("priority")
                }
            ))
            
    except Exception as e:
        logger.error(f"Error notifying priority change: {e}")

async def notify_epic_team_members(epic_id: str, message: str, data: Dict[str, Any]):
    """Notify team members working on an epic"""
    try:
        from ..database.supabase_client import get_supabase
        supabase = get_supabase()
        
        # Get all users assigned to stories in this epic
        result = supabase.table("stories").select("assignee_id").eq("epic_id", epic_id).execute()
        
        assignee_ids = set()
        for story in result.data:
            if story.get("assignee_id"):
                assignee_ids.add(story["assignee_id"])
        
        # Send notifications to all assignees
        for user_id in assignee_ids:
            await send_notification(NotificationPayload(
                user_id=user_id,
                title="Epic Update",
                message=message,
                type="info",
                data=data
            ))
            
    except Exception as e:
        logger.error(f"Error notifying epic team members: {e}")

async def notify_project_team_members(project_id: str, message: str, data: Dict[str, Any]):
    """Notify team members working on a project"""
    try:
        from ..database.supabase_client import get_supabase
        supabase = get_supabase()
        
        # Get all users assigned to stories in this project's epics
        result = supabase.rpc("get_project_team_members", {"project_id": project_id}).execute()
        
        # Send notifications to all team members
        for user in result.data:
            await send_notification(NotificationPayload(
                user_id=user["id"],
                title="Project Update",
                message=message,
                type="info",
                data=data
            ))
            
    except Exception as e:
        logger.error(f"Error notifying project team members: {e}")

async def broadcast_to_role(roles: list, message: str, data: Dict[str, Any]):
    """Broadcast notification to users with specific roles"""
    try:
        from ..database.supabase_client import get_supabase
        supabase = get_supabase()
        
        # Get all users with specified roles
        for role in roles:
            result = supabase.table("users").select("id").contains("roles", [role]).execute()
            
            for user in result.data:
                await send_notification(NotificationPayload(
                    user_id=user["id"],
                    title="System Notification",
                    message=message,
                    type="info",
                    data=data
                ))
                
    except Exception as e:
        logger.error(f"Error broadcasting to roles: {e}")

async def send_notification(notification: NotificationPayload):
    """Send notification to user (store in database and/or send real-time)"""
    try:
        from ..database.supabase_client import get_supabase
        supabase = get_supabase()
        
        # Store notification in database
        notification_data = {
            "user_id": notification.user_id,
            "title": notification.title,
            "message": notification.message,
            "type": notification.type,
            "data": notification.data,
            "created_at": datetime.utcnow().isoformat(),
            "read": False
        }
        
        supabase.table("notifications").insert(notification_data).execute()
        
        # TODO: Send real-time notification via WebSocket or push notification
        # This could be implemented using Supabase Realtime or a WebSocket connection
        
        logger.info(f"Notification sent to user {notification.user_id}: {notification.title}")
        
    except Exception as e:
        logger.error(f"Error sending notification: {e}")

# Health check for webhooks
@webhooks_router.get("/health")
async def webhooks_health_check():
    """Check webhooks system health"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "handlers": [
            "stories", "epics", "projects", "users"
        ]
    } 