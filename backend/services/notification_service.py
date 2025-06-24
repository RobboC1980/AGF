#!/usr/bin/env python3
"""
Advanced Notification Service
Provides intelligent notification routing, real-time updates, and email campaigns
"""

import os
import json
import logging
from typing import List, Dict, Any, Optional, Union
from datetime import datetime, timedelta
from enum import Enum
from supabase import Client
from pydantic import BaseModel, EmailStr
import asyncio
import aiohttp

logger = logging.getLogger(__name__)

class NotificationType(str, Enum):
    STORY_ASSIGNED = "story_assigned"
    STORY_UPDATED = "story_updated"
    STORY_COMPLETED = "story_completed"
    EPIC_CREATED = "epic_created"
    PROJECT_MILESTONE = "project_milestone"
    DEADLINE_APPROACHING = "deadline_approaching"
    TEAM_MENTION = "team_mention"
    AI_INSIGHT = "ai_insight"
    SYSTEM_ALERT = "system_alert"

class NotificationPriority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"

class NotificationChannel(str, Enum):
    IN_APP = "in_app"
    EMAIL = "email"
    PUSH = "push"
    SLACK = "slack"
    TEAMS = "teams"

class NotificationPreference(BaseModel):
    user_id: str
    notification_type: NotificationType
    channels: List[NotificationChannel]
    enabled: bool = True
    quiet_hours_start: Optional[str] = None  # HH:MM format
    quiet_hours_end: Optional[str] = None

class Notification(BaseModel):
    id: Optional[str] = None
    user_id: str
    type: NotificationType
    title: str
    message: str
    priority: NotificationPriority
    channels: List[NotificationChannel]
    data: Optional[Dict[str, Any]] = None
    read: bool = False
    created_at: Optional[datetime] = None
    scheduled_for: Optional[datetime] = None

class EmailTemplate(BaseModel):
    template_id: str
    name: str
    subject: str
    html_content: str
    text_content: str
    variables: List[str]

class NotificationService:
    def __init__(self, supabase: Client):
        self.supabase = supabase
        self.edge_function_url = f"{os.getenv('SUPABASE_URL')}/functions/v1"
        self.service_key = os.getenv('SUPABASE_SERVICE_KEY')
        
    async def initialize_notification_system(self):
        """Initialize notification tables and edge functions"""
        try:
            # Create notification tables
            create_tables_sql = """
            -- Notifications table
            CREATE TABLE IF NOT EXISTS notifications (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                type TEXT NOT NULL,
                title TEXT NOT NULL,
                message TEXT NOT NULL,
                priority TEXT NOT NULL DEFAULT 'medium',
                channels JSONB NOT NULL DEFAULT '[]',
                data JSONB,
                read BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                scheduled_for TIMESTAMP WITH TIME ZONE,
                sent_at TIMESTAMP WITH TIME ZONE,
                error_message TEXT
            );
            
            -- Notification preferences
            CREATE TABLE IF NOT EXISTS notification_preferences (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                notification_type TEXT NOT NULL,
                channels JSONB NOT NULL DEFAULT '[]',
                enabled BOOLEAN DEFAULT TRUE,
                quiet_hours_start TIME,
                quiet_hours_end TIME,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                UNIQUE(user_id, notification_type)
            );
            
            -- Email templates
            CREATE TABLE IF NOT EXISTS email_templates (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                template_id TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                subject TEXT NOT NULL,
                html_content TEXT NOT NULL,
                text_content TEXT NOT NULL,
                variables JSONB NOT NULL DEFAULT '[]',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            
            -- Notification campaigns
            CREATE TABLE IF NOT EXISTS notification_campaigns (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name TEXT NOT NULL,
                type TEXT NOT NULL,
                target_criteria JSONB NOT NULL,
                template_id TEXT REFERENCES email_templates(template_id),
                scheduled_for TIMESTAMP WITH TIME ZONE,
                status TEXT DEFAULT 'draft',
                sent_count INTEGER DEFAULT 0,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                sent_at TIMESTAMP WITH TIME ZONE
            );
            
            -- Indexes for performance
            CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
            CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
            CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
            CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON notification_preferences(user_id);
            """
            
            self.supabase.rpc('execute_sql', {'sql': create_tables_sql}).execute()
            
            # Initialize default email templates
            await self._create_default_templates()
            
            logger.info("Notification system initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize notification system: {e}")
    
    async def _create_default_templates(self):
        """Create default email templates"""
        templates = [
            {
                'template_id': 'task_assigned',
                'name': 'Task Assigned',
                'subject': '[SynqForge] New Task Assigned: {{task_title}}',
                'html_content': '''
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: linear-gradient(135deg, #3B82F6, #8B5CF6); color: white; padding: 20px; text-align: center;">
                        <h1 style="margin: 0;">SynqForge</h1>
                        <p style="margin: 5px 0 0 0; opacity: 0.9;">Task Assignment</p>
                    </div>
                    <div style="padding: 30px 20px;">
                        <h2 style="color: #1F2937; margin-top: 0;">🎯 New Task Assigned</h2>
                        <p style="color: #4B5563; line-height: 1.6; font-size: 16px;">You have been assigned a new task that requires your attention.</p>
                        
                        <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 20px; margin: 20px 0;">
                            <h3 style="margin: 0 0 15px 0; color: #1E40AF;">{{task_title}}</h3>
                            <div style="margin-bottom: 10px;">
                                <strong style="color: #374151;">Story:</strong> {{story_name}}
                            </div>
                            <div style="margin-bottom: 10px;">
                                <strong style="color: #374151;">Priority:</strong> 
                                <span style="background: #FEF3C7; color: #92400E; padding: 2px 8px; border-radius: 12px; font-size: 12px; text-transform: uppercase;">{{priority}}</span>
                            </div>
                            <div style="margin-bottom: 10px;">
                                <strong style="color: #374151;">Estimated Hours:</strong> {{estimated_hours}}h
                            </div>
                            {{#if due_date}}
                            <div style="margin-bottom: 10px;">
                                <strong style="color: #374151;">Due Date:</strong> {{due_date}}
                            </div>
                            {{/if}}
                        </div>
                        
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="{{task_url}}" style="background: linear-gradient(135deg, #3B82F6, #1D4ED8); color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
                                View Task
                            </a>
                        </div>
                        
                        <div style="margin-top: 30px; padding: 20px; background: #F3F4F6; border-radius: 8px;">
                            <p style="margin: 0; color: #6B7280; font-size: 14px;">
                                This task was assigned by your team. Click the button above to view details and start working.
                            </p>
                        </div>
                    </div>
                    <div style="background: #F9FAFB; padding: 20px; text-align: center; border-top: 1px solid #E5E7EB;">
                        <p style="margin: 0; color: #9CA3AF; font-size: 12px;">
                            © 2024 AgileForge. All rights reserved.
                        </p>
                    </div>
                </div>
                ''',
                'text_content': '''
                                  🎯 SynqForge - New Task Assigned
                
                You have been assigned a new task: {{task_title}}
                
                Story: {{story_name}}
                Priority: {{priority}}
                Estimated Hours: {{estimated_hours}}h
                {{#if due_date}}Due Date: {{due_date}}{{/if}}
                
                View task: {{task_url}}
                
                ---
                This task was assigned by your team.
                © 2024 SynqForge. All rights reserved.
                ''',
                'variables': ['task_title', 'story_name', 'priority', 'estimated_hours', 'due_date', 'task_url', 'user_name']
            },
            {
                'template_id': 'story_assigned',
                'name': 'Story Assigned',
                'subject': '[SynqForge] New Story Assigned: {{story_name}}',
                'html_content': '''
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: linear-gradient(135deg, #10B981, #059669); color: white; padding: 20px; text-align: center;">
                        <h1 style="margin: 0;">SynqForge</h1>
                        <p style="margin: 5px 0 0 0; opacity: 0.9;">Story Assignment</p>
                    </div>
                    <div style="padding: 30px 20px;">
                        <h2 style="color: #1F2937; margin-top: 0;">📖 New Story Assigned</h2>
                        <p style="color: #4B5563; line-height: 1.6; font-size: 16px;">You've been assigned a new user story to work on.</p>
                        
                        <div style="background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 8px; padding: 20px; margin: 20px 0;">
                            <h3 style="margin: 0 0 15px 0; color: #14532D;">{{story_name}}</h3>
                            <div style="margin-bottom: 10px;">
                                <strong style="color: #374151;">Epic:</strong> {{epic_name}}
                            </div>
                            <div style="margin-bottom: 10px;">
                                <strong style="color: #374151;">Priority:</strong> 
                                <span style="background: #FEF3C7; color: #92400E; padding: 2px 8px; border-radius: 12px; font-size: 12px; text-transform: uppercase;">{{priority}}</span>
                            </div>
                            <div style="margin-bottom: 15px;">
                                <strong style="color: #374151;">Story Points:</strong> {{story_points}}
                            </div>
                            <div style="background: white; padding: 15px; border-radius: 6px; border-left: 4px solid #10B981;">
                                <p style="margin: 0; color: #4B5563; font-style: italic;">"{{description}}"</p>
                            </div>
                        </div>
                        
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="{{story_url}}" style="background: linear-gradient(135deg, #10B981, #059669); color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
                                View Story
                            </a>
                        </div>
                    </div>
                    <div style="background: #F9FAFB; padding: 20px; text-align: center; border-top: 1px solid #E5E7EB;">
                        <p style="margin: 0; color: #9CA3AF; font-size: 12px;">
                            © 2024 AgileForge. All rights reserved.
                        </p>
                    </div>
                </div>
                ''',
                'text_content': '''
                                  📖 SynqForge - New Story Assigned
                
                You've been assigned a new user story: {{story_name}}
                
                Epic: {{epic_name}}
                Priority: {{priority}}
                Story Points: {{story_points}}
                
                Description: {{description}}
                
                View story: {{story_url}}
                
                ---
                © 2024 SynqForge. All rights reserved.
                ''',
                'variables': ['story_name', 'epic_name', 'priority', 'story_points', 'description', 'story_url', 'user_name']
            },
            {
                'template_id': 'team_mention',
                'name': 'Team Mention',
                'subject': '[SynqForge] You were mentioned in {{story_title}}',
                'html_content': '''
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: linear-gradient(135deg, #8B5CF6, #7C3AED); color: white; padding: 20px; text-align: center;">
                        <h1 style="margin: 0;">SynqForge</h1>
                        <p style="margin: 5px 0 0 0; opacity: 0.9;">You were mentioned</p>
                    </div>
                    <div style="padding: 30px 20px;">
                        <h2 style="color: #1F2937; margin-top: 0;">💬 Mentioned in Story</h2>
                        <p style="color: #4B5563; line-height: 1.6; font-size: 16px;">{{mentioner_name}} mentioned you in a story {{mention_type}}.</p>
                        
                        <div style="background: #F3F4F6; border: 1px solid #E5E7EB; border-radius: 8px; padding: 20px; margin: 20px 0;">
                            <h3 style="margin: 0 0 15px 0; color: #1E40AF;">{{story_title}}</h3>
                            <div style="margin-bottom: 10px;">
                                <strong style="color: #374151;">Epic:</strong> {{epic_name}}
                            </div>
                            <div style="margin-bottom: 10px;">
                                <strong style="color: #374151;">Project:</strong> {{project_name}}
                            </div>
                            <div style="margin-bottom: 15px;">
                                <strong style="color: #374151;">Context:</strong>
                            </div>
                            <div style="background: white; padding: 15px; border-radius: 6px; border-left: 4px solid #8B5CF6;">
                                <p style="margin: 0; color: #4B5563; font-style: italic;">"{{mention_context}}"</p>
                            </div>
                        </div>
                        
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="{{story_url}}" style="background: linear-gradient(135deg, #8B5CF6, #7C3AED); color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
                                View Story
                            </a>
                        </div>
                        
                        <div style="margin-top: 30px; padding: 20px; background: #F3F4F6; border-radius: 8px;">
                            <p style="margin: 0; color: #6B7280; font-size: 14px;">
                                Stay in the loop with your team's conversations and updates.
                            </p>
                        </div>
                    </div>
                    <div style="background: #F9FAFB; padding: 20px; text-align: center; border-top: 1px solid #E5E7EB;">
                        <p style="margin: 0; color: #9CA3AF; font-size: 12px;">
                            © 2024 AgileForge. All rights reserved.
                        </p>
                    </div>
                </div>
                ''',
                'text_content': '''
                💬 SynqForge - You were mentioned
                
                {{mentioner_name}} mentioned you in a story {{mention_type}}.
                
                Story: {{story_title}}
                Epic: {{epic_name}}
                Project: {{project_name}}
                
                Context: "{{mention_context}}"
                
                View story: {{story_url}}
                
                ---
                Stay in the loop with your team's conversations and updates.
                © 2024 AgileForge. All rights reserved.
                ''',
                'variables': ['story_title', 'epic_name', 'project_name', 'mentioner_name', 'mention_context', 'mention_type', 'story_url', 'user_name']
            },
            {
                'template_id': 'team_invitation',
                'name': 'Team Invitation',
                'subject': '[SynqForge] You\'ve been invited to join {{team_name}}',
                'html_content': '''
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: linear-gradient(135deg, #8B5CF6, #7C3AED); color: white; padding: 20px; text-align: center;">
                        <h1 style="margin: 0;">SynqForge</h1>
                        <p style="margin: 5px 0 0 0; opacity: 0.9;">Team Invitation</p>
                    </div>
                    <div style="padding: 30px 20px;">
                        <h2 style="color: #1F2937; margin-top: 0;">🎉 Team Invitation</h2>
                        <p style="color: #4B5563; line-height: 1.6; font-size: 16px;">
                            {{inviter_name}} has invited you to join the <strong>{{team_name}}</strong> team!
                        </p>
                        
                        <div style="background: #F5F3FF; border: 1px solid #DDD6FE; border-radius: 8px; padding: 20px; margin: 20px 0;">
                            <h3 style="margin: 0 0 15px 0; color: #5B21B6;">{{team_name}}</h3>
                            {{#if team_description}}
                            <p style="margin: 0; color: #6B7280;">{{team_description}}</p>
                            {{/if}}
                        </div>
                        
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="{{team_url}}" style="background: linear-gradient(135deg, #8B5CF6, #7C3AED); color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
                                View Team
                            </a>
                        </div>
                        
                        <div style="margin-top: 30px; padding: 20px; background: #F3F4F6; border-radius: 8px;">
                            <p style="margin: 0; color: #6B7280; font-size: 14px;">
                                Join your team to collaborate on projects, share ideas, and track progress together.
                            </p>
                        </div>
                    </div>
                    <div style="background: #F9FAFB; padding: 20px; text-align: center; border-top: 1px solid #E5E7EB;">
                        <p style="margin: 0; color: #9CA3AF; font-size: 12px;">
                            © 2024 AgileForge. All rights reserved.
                        </p>
                    </div>
                </div>
                ''',
                'text_content': '''
                                  🎉 SynqForge - Team Invitation
                
                {{inviter_name}} has invited you to join the {{team_name}} team!
                
                {{#if team_description}}
                About the team: {{team_description}}
                {{/if}}
                
                View team: {{team_url}}
                
                ---
                Join your team to collaborate on projects and track progress together.
                © 2024 AgileForge. All rights reserved.
                ''',
                'variables': ['team_name', 'team_description', 'team_url', 'inviter_name', 'user_name']
            },
            {
                'template_id': 'ai_insight',
                'name': 'AI Project Insight',
                'subject': 'AI Insight for {{project_name}}: {{insight_title}}',
                'html_content': '''
                <h2>New AI Insight for {{project_name}}</h2>
                <div style="border-left: 4px solid #3B82F6; padding-left: 16px; margin: 16px 0;">
                    <h3>{{insight_title}}</h3>
                    <p>{{insight_description}}</p>
                    <p><strong>Confidence:</strong> {{confidence}}%</p>
                    <p><strong>Priority:</strong> {{priority}}</p>
                </div>
                <h4>Recommended Actions:</h4>
                <ul>
                {{#each actionable_items}}
                    <li>{{this}}</li>
                {{/each}}
                </ul>
                <a href="{{project_url}}" style="background-color: #10B981; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Project</a>
                ''',
                'text_content': '''
                New AI Insight for {{project_name}}
                
                {{insight_title}}
                {{insight_description}}
                
                Confidence: {{confidence}}%
                Priority: {{priority}}
                
                Recommended Actions:
                {{#each actionable_items}}
                - {{this}}
                {{/each}}
                
                View project: {{project_url}}
                ''',
                'variables': ['project_name', 'insight_title', 'insight_description', 'confidence', 'priority', 'actionable_items', 'project_url']
            }
        ]
        
        for template in templates:
            self.supabase.table('email_templates').upsert(template, on_conflict='template_id').execute()
    
    async def send_notification(self, notification: Notification) -> bool:
        """Send a notification through specified channels"""
        try:
            # Check user preferences
            user_prefs = await self._get_user_preferences(notification.user_id, notification.type)
            
            # Filter channels based on preferences
            enabled_channels = self._filter_channels_by_preferences(notification.channels, user_prefs)
            
            if not enabled_channels:
                logger.info(f"No enabled channels for notification {notification.type} to user {notification.user_id}")
                return True
            
            # Check quiet hours
            if await self._is_quiet_hours(notification.user_id):
                # Schedule for later if not urgent
                if notification.priority != NotificationPriority.URGENT:
                    await self._schedule_notification(notification)
                    return True
            
            # Store notification in database
            notification_data = {
                'user_id': notification.user_id,
                'type': notification.type.value,
                'title': notification.title,
                'message': notification.message,
                'priority': notification.priority.value,
                'channels': [ch.value for ch in enabled_channels],
                'data': notification.data or {}
            }
            
            result = self.supabase.table('notifications').insert(notification_data).execute()
            notification_id = result.data[0]['id']
            
            # Send through each enabled channel
            success = True
            for channel in enabled_channels:
                try:
                    if channel == NotificationChannel.IN_APP:
                        await self._send_in_app_notification(notification_id, notification)
                    elif channel == NotificationChannel.EMAIL:
                        await self._send_email_notification(notification)
                    elif channel == NotificationChannel.PUSH:
                        await self._send_push_notification(notification)
                    elif channel == NotificationChannel.SLACK:
                        await self._send_slack_notification(notification)
                    elif channel == NotificationChannel.TEAMS:
                        await self._send_teams_notification(notification)
                        
                except Exception as e:
                    logger.error(f"Failed to send notification via {channel}: {e}")
                    success = False
            
            # Update sent status
            self.supabase.table('notifications').update({
                'sent_at': datetime.now().isoformat()
            }).eq('id', notification_id).execute()
            
            return success
            
        except Exception as e:
            logger.error(f"Failed to send notification: {e}")
            return False
    
    async def _get_user_preferences(self, user_id: str, notification_type: NotificationType) -> Optional[NotificationPreference]:
        """Get user notification preferences"""
        try:
            result = self.supabase.table('notification_preferences').select('*').eq(
                'user_id', user_id
            ).eq('notification_type', notification_type.value).execute()
            
            if result.data:
                pref_data = result.data[0]
                return NotificationPreference(
                    user_id=pref_data['user_id'],
                    notification_type=NotificationType(pref_data['notification_type']),
                    channels=[NotificationChannel(ch) for ch in pref_data['channels']],
                    enabled=pref_data['enabled'],
                    quiet_hours_start=pref_data.get('quiet_hours_start'),
                    quiet_hours_end=pref_data.get('quiet_hours_end')
                )
            
            # Return default preferences if none found
            return NotificationPreference(
                user_id=user_id,
                notification_type=notification_type,
                channels=[NotificationChannel.IN_APP, NotificationChannel.EMAIL]
            )
            
        except Exception as e:
            logger.error(f"Failed to get user preferences: {e}")
            return None
    
    def _filter_channels_by_preferences(self, channels: List[NotificationChannel], preferences: Optional[NotificationPreference]) -> List[NotificationChannel]:
        """Filter channels based on user preferences"""
        if not preferences or not preferences.enabled:
            return []
        
        return [ch for ch in channels if ch in preferences.channels]
    
    async def _is_quiet_hours(self, user_id: str) -> bool:
        """Check if current time is within user's quiet hours"""
        try:
            # Get user timezone and quiet hours
            user_result = self.supabase.table('users').select('timezone').eq('id', user_id).execute()
            if not user_result.data:
                return False
            
            # For now, assume UTC. In production, you'd convert to user's timezone
            current_time = datetime.now().time()
            
            # Get preferences with quiet hours
            prefs_result = self.supabase.table('notification_preferences').select(
                'quiet_hours_start, quiet_hours_end'
            ).eq('user_id', user_id).execute()
            
            for pref in prefs_result.data:
                if pref['quiet_hours_start'] and pref['quiet_hours_end']:
                    start_time = datetime.strptime(pref['quiet_hours_start'], '%H:%M').time()
                    end_time = datetime.strptime(pref['quiet_hours_end'], '%H:%M').time()
                    
                    if start_time <= current_time <= end_time:
                        return True
            
            return False
            
        except Exception as e:
            logger.error(f"Failed to check quiet hours: {e}")
            return False
    
    async def _schedule_notification(self, notification: Notification):
        """Schedule notification for later delivery"""
        try:
            # Schedule for 8 AM next day (simplified logic)
            next_delivery = datetime.now().replace(hour=8, minute=0, second=0, microsecond=0)
            if next_delivery <= datetime.now():
                next_delivery += timedelta(days=1)
            
            notification_data = {
                'user_id': notification.user_id,
                'type': notification.type.value,
                'title': notification.title,
                'message': notification.message,
                'priority': notification.priority.value,
                'channels': [ch.value for ch in notification.channels],
                'data': notification.data or {},
                'scheduled_for': next_delivery.isoformat()
            }
            
            self.supabase.table('notifications').insert(notification_data).execute()
            logger.info(f"Notification scheduled for {next_delivery}")
            
        except Exception as e:
            logger.error(f"Failed to schedule notification: {e}")
    
    async def _send_in_app_notification(self, notification_id: str, notification: Notification):
        """Send in-app notification via Supabase Realtime"""
        try:
            # Use Supabase Edge Function for real-time notification
            async with aiohttp.ClientSession() as session:
                headers = {
                    'Authorization': f'Bearer {self.service_key}',
                    'Content-Type': 'application/json'
                }
                
                payload = {
                    'user_id': notification.user_id,
                    'notification_id': notification_id,
                    'type': notification.type.value,
                    'title': notification.title,
                    'message': notification.message,
                    'priority': notification.priority.value,
                    'data': notification.data
                }
                
                async with session.post(
                    f"{self.edge_function_url}/send-realtime-notification",
                    headers=headers,
                    json=payload
                ) as response:
                    if response.status != 200:
                        raise Exception(f"Edge function failed: {await response.text()}")
                        
        except Exception as e:
            logger.error(f"Failed to send in-app notification: {e}")
            raise
    
    async def _send_email_notification(self, notification: Notification):
        """Send email notification using template"""
        try:
            # Get email template
            template_id = f"{notification.type.value}"
            template_result = self.supabase.table('email_templates').select('*').eq(
                'template_id', template_id
            ).execute()
            
            if not template_result.data:
                # Fallback to generic template
                await self._send_generic_email(notification)
                return
            
            template = template_result.data[0]
            
            # Get user email
            user_result = self.supabase.table('users').select('email, name').eq(
                'id', notification.user_id
            ).execute()
            
            if not user_result.data:
                raise Exception("User not found")
            
            user = user_result.data[0]
            
            # Prepare template variables
            template_variables = notification.data or {}
            template_variables.update({
                'user_name': user['name'],
                'user_email': user['email'],
                                  'app_name': 'SynqForge',
                'app_url': os.getenv('FRONTEND_URL', 'http://localhost:3000'),
                'notification_date': datetime.now().strftime('%B %d, %Y')
            })
            
            # Use Edge Function for email sending
            async with aiohttp.ClientSession() as session:
                headers = {
                    'Authorization': f'Bearer {self.service_key}',
                    'Content-Type': 'application/json'
                }
                
                payload = {
                    'to_email': user['email'],
                    'to_name': user['name'],
                    'template_id': template['template_id'],
                    'subject': template['subject'],
                    'html_content': template['html_content'],
                    'text_content': template['text_content'],
                    'variables': template_variables
                }
                
                async with session.post(
                    f"{self.edge_function_url}/send-email",
                    headers=headers,
                    json=payload
                ) as response:
                    if response.status != 200:
                        error_text = await response.text()
                        logger.error(f"Email Edge Function failed: {response.status} - {error_text}")
                        # Don't raise exception to avoid blocking notification creation
                        return
                    
                    result = await response.json()
                    logger.info(f"Email sent successfully via {result.get('provider', 'unknown')} to {user['email']}")
                        
        except Exception as e:
            logger.error(f"Failed to send email notification: {e}")
            # Don't raise exception to avoid blocking notification creation
    
    async def _send_generic_email(self, notification: Notification):
        """Send generic email notification"""
        try:
            user_result = self.supabase.table('users').select('email, name').eq(
                'id', notification.user_id
            ).execute()
            
            if not user_result.data:
                raise Exception("User not found")
            
            user = user_result.data[0]
            
            # Create a simple HTML template for generic emails
            html_content = f"""
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #3B82F6, #8B5CF6); color: white; padding: 20px; text-align: center;">
                    <h1 style="margin: 0;">AgileForge</h1>
                </div>
                <div style="padding: 30px 20px;">
                    <h2 style="color: #1F2937; margin-top: 0;">{notification.title}</h2>
                    <p style="color: #4B5563; line-height: 1.6; font-size: 16px;">{notification.message}</p>
                    <div style="margin-top: 30px; padding: 20px; background: #F3F4F6; border-radius: 8px;">
                        <p style="margin: 0; color: #6B7280; font-size: 14px;">
                            This notification was sent from your AgileForge workspace.
                        </p>
                    </div>
                </div>
                <div style="background: #F9FAFB; padding: 20px; text-align: center; border-top: 1px solid #E5E7EB;">
                    <p style="margin: 0; color: #9CA3AF; font-size: 12px;">
                        © 2024 AgileForge. All rights reserved.
                    </p>
                </div>
            </div>
            """
            
            text_content = f"""
            AgileForge Notification
            
            {notification.title}
            
            {notification.message}
            
            ---
            This notification was sent from your AgileForge workspace.
            © 2024 AgileForge. All rights reserved.
            """
            
            async with aiohttp.ClientSession() as session:
                headers = {
                    'Authorization': f'Bearer {self.service_key}',
                    'Content-Type': 'application/json'
                }
                
                payload = {
                    'to_email': user['email'],
                    'to_name': user['name'],
                    'subject': f"[AgileForge] {notification.title}",
                    'html_content': html_content,
                    'text_content': text_content,
                    'variables': {}
                }
                
                async with session.post(
                    f"{self.edge_function_url}/send-email",
                    headers=headers,
                    json=payload
                ) as response:
                    if response.status != 200:
                        error_text = await response.text()
                        logger.error(f"Generic email Edge Function failed: {response.status} - {error_text}")
                        return
                    
                    result = await response.json()
                    logger.info(f"Generic email sent successfully via {result.get('provider', 'unknown')} to {user['email']}")
                        
        except Exception as e:
            logger.error(f"Failed to send generic email: {e}")
            # Don't raise exception to avoid blocking notification creation
    
    async def _send_push_notification(self, notification: Notification):
        """Send push notification"""
        # Implementation would depend on your push notification service
        # (Firebase, OneSignal, etc.)
        logger.info(f"Push notification would be sent: {notification.title}")
    
    async def _send_slack_notification(self, notification: Notification):
        """Send Slack notification"""
        # Implementation would use Slack webhook or API
        logger.info(f"Slack notification would be sent: {notification.title}")
    
    async def _send_teams_notification(self, notification: Notification):
        """Send Microsoft Teams notification"""
        # Implementation would use Teams webhook or API
        logger.info(f"Teams notification would be sent: {notification.title}")
    
    async def create_notification_campaign(self, campaign_data: Dict[str, Any]) -> str:
        """Create a notification campaign"""
        try:
            result = self.supabase.table('notification_campaigns').insert(campaign_data).execute()
            return result.data[0]['id']
            
        except Exception as e:
            logger.error(f"Failed to create notification campaign: {e}")
            raise
    
    async def send_campaign(self, campaign_id: str):
        """Send a notification campaign"""
        try:
            # Get campaign details
            campaign_result = self.supabase.table('notification_campaigns').select('*').eq(
                'id', campaign_id
            ).execute()
            
            if not campaign_result.data:
                raise Exception("Campaign not found")
            
            campaign = campaign_result.data[0]
            
            # Get target users based on criteria
            target_users = await self._get_campaign_targets(campaign['target_criteria'])
            
            # Send notifications to all targets
            sent_count = 0
            for user in target_users:
                try:
                    notification = Notification(
                        user_id=user['id'],
                        type=NotificationType(campaign['type']),
                        title=campaign['name'],
                        message="Campaign notification",
                        priority=NotificationPriority.MEDIUM,
                        channels=[NotificationChannel.EMAIL, NotificationChannel.IN_APP]
                    )
                    
                    if await self.send_notification(notification):
                        sent_count += 1
                        
                except Exception as e:
                    logger.error(f"Failed to send campaign notification to user {user['id']}: {e}")
            
            # Update campaign status
            self.supabase.table('notification_campaigns').update({
                'status': 'sent',
                'sent_count': sent_count,
                'sent_at': datetime.now().isoformat()
            }).eq('id', campaign_id).execute()
            
            return sent_count
            
        except Exception as e:
            logger.error(f"Failed to send campaign: {e}")
            raise
    
    async def _get_campaign_targets(self, criteria: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Get target users for a campaign based on criteria"""
        try:
            query = self.supabase.table('users').select('*')
            
            # Apply filters based on criteria
            if 'roles' in criteria:
                query = query.in_('role', criteria['roles'])
            
            if 'active_only' in criteria and criteria['active_only']:
                query = query.eq('is_active', True)
            
            if 'project_ids' in criteria:
                # This would need a more complex query joining with project memberships
                pass
            
            result = query.execute()
            return result.data
            
        except Exception as e:
            logger.error(f"Failed to get campaign targets: {e}")
            return []
    
    async def get_user_notifications(self, user_id: str, limit: int = 50, unread_only: bool = False) -> List[Dict[str, Any]]:
        """Get notifications for a user"""
        try:
            query = self.supabase.table('notifications').select('*').eq('user_id', user_id)
            
            if unread_only:
                query = query.eq('read', False)
            
            result = query.order('created_at', desc=True).limit(limit).execute()
            return result.data
            
        except Exception as e:
            logger.error(f"Failed to get user notifications: {e}")
            return []
    
    async def mark_notification_read(self, notification_id: str, user_id: str) -> bool:
        """Mark a notification as read"""
        try:
            result = self.supabase.table('notifications').update({
                'read': True
            }).eq('id', notification_id).eq('user_id', user_id).execute()
            
            return len(result.data) > 0
            
        except Exception as e:
            logger.error(f"Failed to mark notification as read: {e}")
            return False
    
    async def update_user_preferences(self, user_id: str, preferences: List[NotificationPreference]) -> bool:
        """Update user notification preferences"""
        try:
            for pref in preferences:
                pref_data = {
                    'user_id': user_id,
                    'notification_type': pref.notification_type.value,
                    'channels': [ch.value for ch in pref.channels],
                    'enabled': pref.enabled,
                    'quiet_hours_start': pref.quiet_hours_start,
                    'quiet_hours_end': pref.quiet_hours_end,
                    'updated_at': datetime.now().isoformat()
                }
                
                self.supabase.table('notification_preferences').upsert(
                    pref_data, on_conflict='user_id,notification_type'
                ).execute()
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to update user preferences: {e}")
            return False

# Global service instance
notification_service: Optional[NotificationService] = None

def init_notification_service(supabase: Client) -> NotificationService:
    """Initialize the notification service"""
    global notification_service
    notification_service = NotificationService(supabase)
    return notification_service

def get_notification_service() -> NotificationService:
    """Get the global notification service instance"""
    if notification_service is None:
        raise RuntimeError("Notification service not initialized")
    return notification_service 