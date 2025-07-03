#!/usr/bin/env python3
"""
Story Mentions Handler
Handles @mentions in story comments and descriptions, sending notifications
"""

import re
import logging
from typing import List, Set, Dict, Any, Optional
from datetime import datetime
from fastapi import HTTPException
try:
    from database.supabase_client import get_supabase
    from services.notification_service import NotificationService, Notification, NotificationType, NotificationPriority, NotificationChannel
except ImportError:
    from database.supabase_client import get_supabase
    from services.notification_service import NotificationService, Notification, NotificationType, NotificationPriority, NotificationChannel

logger = logging.getLogger(__name__)

class MentionHandler:
    def __init__(self, supabase_client):
        self.supabase = supabase_client
        self.notification_service = NotificationService(supabase_client)
    
    def extract_mentions(self, text: str) -> Set[str]:
        """
        Extract @mentions from text
        Supports formats: @username, @email, @"First Last"
        """
        if not text:
            return set()
        
        # Regex patterns for different mention formats
        patterns = [
            r'@([a-zA-Z0-9_.-]+@[a-zA-Z0-9_.-]+\.[a-zA-Z]{2,})',  # @email@domain.com
            r'@([a-zA-Z0-9_.-]+)',  # @username
            r'@"([^"]+)"',  # @"Full Name"
        ]
        
        mentions = set()
        for pattern in patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            mentions.update(matches)
        
        return mentions
    
    async def resolve_mentions_to_users(self, mentions: Set[str]) -> List[Dict[str, Any]]:
        """
        Resolve mentions to actual users in the database
        """
        if not mentions:
            return []
        
        users = []
        
        for mention in mentions:
            # Try to find user by email first
            if '@' in mention and '.' in mention:
                user_result = self.supabase.table('users').select('*').eq('email', mention).execute()
                if user_result.data:
                    users.append(user_result.data[0])
                    continue
            
            # Try to find by username or name
            user_result = self.supabase.table('users').select('*').or_(
                f'name.ilike.%{mention}%,username.ilike.%{mention}%,email.ilike.%{mention}%'
            ).limit(1).execute()
            
            if user_result.data:
                users.append(user_result.data[0])
        
        return users
    
    async def send_mention_notifications(
        self, 
        mentioned_users: List[Dict[str, Any]], 
        story_id: str, 
        mentioner_id: str, 
        context: str,
        mention_type: str = 'comment'
    ):
        """
        Send email notifications to mentioned users
        """
        try:
            # Get story details
            story_result = self.supabase.table('stories').select('''
                *, 
                epic:epics(name, project_id, project:projects(name))
            ''').eq('id', story_id).single().execute()
            
            if not story_result.data:
                logger.error(f"Story {story_id} not found for mention notifications")
                return
            
            story = story_result.data
            epic = story.get('epic', {})
            project = epic.get('project', {}) if epic else {}
            
            # Get mentioner details
            mentioner_result = self.supabase.table('users').select('name, email').eq(
                'id', mentioner_id
            ).single().execute()
            
            mentioner_name = mentioner_result.data['name'] if mentioner_result.data else "Someone"
            
            for user in mentioned_users:
                # Don't notify the person who made the mention
                if user['id'] == mentioner_id:
                    continue
                
                notification = Notification(
                    user_id=user['id'],
                    type=NotificationType.TEAM_MENTION,
                    title=f"You were mentioned in {story['title']}",
                    message=f"{mentioner_name} mentioned you in a story {mention_type}",
                    priority=NotificationPriority.MEDIUM,
                    channels=[NotificationChannel.IN_APP, NotificationChannel.EMAIL],
                    data={
                        "story_id": story_id,
                        "story_title": story['title'],
                        "story_description": story.get('description', ''),
                        "epic_name": epic.get('name', 'Unknown Epic'),
                        "project_name": project.get('name', 'Unknown Project'),
                        "project_id": epic.get('project_id'),
                        "mentioner_name": mentioner_name,
                        "mention_context": context[:200] + "..." if len(context) > 200 else context,
                        "mention_type": mention_type,
                        "story_url": f"/projects/{epic.get('project_id')}/stories/{story_id}"
                    }
                )
                
                await self.notification_service.send_notification(notification)
                
        except Exception as e:
            logger.error(f"Failed to send mention notifications: {e}")
    
    async def process_story_mentions(
        self, 
        story_id: str, 
        new_text: str, 
        old_text: str = "", 
        user_id: str = "",
        context_type: str = "description"
    ):
        """
        Process mentions in story text (description or comments)
        """
        try:
            new_mentions = self.extract_mentions(new_text)
            old_mentions = self.extract_mentions(old_text)
            
            # Only notify for new mentions
            fresh_mentions = new_mentions - old_mentions
            
            if not fresh_mentions:
                return
            
            # Resolve mentions to users
            mentioned_users = await self.resolve_mentions_to_users(fresh_mentions)
            
            if mentioned_users:
                await self.send_mention_notifications(
                    mentioned_users, 
                    story_id, 
                    user_id, 
                    new_text,
                    context_type
                )
                
                logger.info(f"Sent mention notifications to {len(mentioned_users)} users for story {story_id}")
            
        except Exception as e:
            logger.error(f"Failed to process story mentions: {e}")

# Create a global mention handler
def get_mention_handler():
    """Get mention handler instance"""
    supabase = get_supabase()
    return MentionHandler(supabase)

# Helper functions for API endpoints
async def handle_story_description_mentions(story_id: str, new_description: str, old_description: str, user_id: str):
    """Handle mentions in story description updates"""
    handler = get_mention_handler()
    await handler.process_story_mentions(
        story_id=story_id,
        new_text=new_description,
        old_text=old_description,
        user_id=user_id,
        context_type="description"
    )

async def handle_story_comment_mentions(story_id: str, comment_text: str, user_id: str):
    """Handle mentions in new story comments"""
    handler = get_mention_handler()
    await handler.process_story_mentions(
        story_id=story_id,
        new_text=comment_text,
        old_text="",
        user_id=user_id,
        context_type="comment"
    ) 