"""
Enhanced Real-time Service for AgileForge
Provides live collaboration features using Supabase Realtime
"""

import logging
import json
from typing import Dict, Any, List, Optional, Callable
from datetime import datetime
from fastapi import WebSocket, WebSocketDisconnect
from supabase import Client
import asyncio
from enum import Enum

logger = logging.getLogger(__name__)

class PresenceStatus(Enum):
    ONLINE = "online"
    AWAY = "away"
    BUSY = "busy"
    OFFLINE = "offline"

class RealtimeEventType(Enum):
    USER_JOINED = "user_joined"
    USER_LEFT = "user_left"
    CURSOR_MOVED = "cursor_moved"
    STORY_UPDATED = "story_updated"
    COMMENT_ADDED = "comment_added"
    STATUS_CHANGED = "status_changed"
    TYPING_START = "typing_start"
    TYPING_STOP = "typing_stop"

class RealtimeService:
    """Service for managing real-time collaboration features"""
    
    def __init__(self, supabase_client: Client):
        self.supabase = supabase_client
        self.active_connections: Dict[str, WebSocket] = {}
        self.user_presence: Dict[str, Dict[str, Any]] = {}
        self.room_members: Dict[str, List[str]] = {}
        self.typing_users: Dict[str, List[str]] = {}
        
    async def connect_user(self, websocket: WebSocket, user_id: str, room_id: str):
        """Connect a user to a real-time room"""
        try:
            await websocket.accept()
            connection_id = f"{user_id}_{room_id}"
            self.active_connections[connection_id] = websocket
            
            # Add user to room
            if room_id not in self.room_members:
                self.room_members[room_id] = []
            if user_id not in self.room_members[room_id]:
                self.room_members[room_id].append(user_id)
                
            # Set user presence
            self.user_presence[user_id] = {
                "status": PresenceStatus.ONLINE.value,
                "room_id": room_id,
                "last_seen": datetime.utcnow().isoformat(),
                "cursor_position": None
            }
            
            # Notify other users in room
            await self.broadcast_to_room(
                room_id,
                {
                    "type": RealtimeEventType.USER_JOINED.value,
                    "user_id": user_id,
                    "timestamp": datetime.utcnow().isoformat()
                },
                exclude_user=user_id
            )
            
            # Send current room state to new user
            await self.send_room_state(websocket, room_id)
            
            logger.info(f"User {user_id} connected to room {room_id}")
            
        except Exception as e:
            logger.error(f"Error connecting user {user_id}: {e}")
            
    async def disconnect_user(self, user_id: str, room_id: str):
        """Disconnect a user from a real-time room"""
        try:
            connection_id = f"{user_id}_{room_id}"
            
            # Remove connection
            if connection_id in self.active_connections:
                del self.active_connections[connection_id]
                
            # Remove from room
            if room_id in self.room_members and user_id in self.room_members[room_id]:
                self.room_members[room_id].remove(user_id)
                
            # Update presence
            if user_id in self.user_presence:
                self.user_presence[user_id]["status"] = PresenceStatus.OFFLINE.value
                self.user_presence[user_id]["last_seen"] = datetime.utcnow().isoformat()
                
            # Remove from typing users
            if room_id in self.typing_users and user_id in self.typing_users[room_id]:
                self.typing_users[room_id].remove(user_id)
                
            # Notify other users
            await self.broadcast_to_room(
                room_id,
                {
                    "type": RealtimeEventType.USER_LEFT.value,
                    "user_id": user_id,
                    "timestamp": datetime.utcnow().isoformat()
                },
                exclude_user=user_id
            )
            
            logger.info(f"User {user_id} disconnected from room {room_id}")
            
        except Exception as e:
            logger.error(f"Error disconnecting user {user_id}: {e}")
            
    async def handle_message(self, websocket: WebSocket, user_id: str, room_id: str, message: Dict[str, Any]):
        """Handle incoming real-time messages"""
        try:
            message_type = message.get("type")
            
            if message_type == RealtimeEventType.CURSOR_MOVED.value:
                await self.handle_cursor_movement(user_id, room_id, message.get("data", {}))
                
            elif message_type == RealtimeEventType.TYPING_START.value:
                await self.handle_typing_start(user_id, room_id, message.get("data", {}))
                
            elif message_type == RealtimeEventType.TYPING_STOP.value:
                await self.handle_typing_stop(user_id, room_id)
                
            elif message_type == RealtimeEventType.STORY_UPDATED.value:
                await self.handle_story_update(user_id, room_id, message.get("data", {}))
                
            elif message_type == RealtimeEventType.COMMENT_ADDED.value:
                await self.handle_comment_added(user_id, room_id, message.get("data", {}))
                
            elif message_type == RealtimeEventType.STATUS_CHANGED.value:
                await self.handle_status_change(user_id, room_id, message.get("data", {}))
                
        except Exception as e:
            logger.error(f"Error handling message from user {user_id}: {e}")
            
    async def handle_cursor_movement(self, user_id: str, room_id: str, data: Dict[str, Any]):
        """Handle cursor movement events"""
        try:
            # Update user's cursor position
            if user_id in self.user_presence:
                self.user_presence[user_id]["cursor_position"] = {
                    "x": data.get("x"),
                    "y": data.get("y"),
                    "element_id": data.get("element_id"),
                    "timestamp": datetime.utcnow().isoformat()
                }
                
            # Broadcast to other users in room
            await self.broadcast_to_room(
                room_id,
                {
                    "type": RealtimeEventType.CURSOR_MOVED.value,
                    "user_id": user_id,
                    "data": data,
                    "timestamp": datetime.utcnow().isoformat()
                },
                exclude_user=user_id
            )
            
        except Exception as e:
            logger.error(f"Error handling cursor movement: {e}")
            
    async def handle_typing_start(self, user_id: str, room_id: str, data: Dict[str, Any]):
        """Handle typing start events"""
        try:
            if room_id not in self.typing_users:
                self.typing_users[room_id] = []
                
            if user_id not in self.typing_users[room_id]:
                self.typing_users[room_id].append(user_id)
                
            # Broadcast to other users
            await self.broadcast_to_room(
                room_id,
                {
                    "type": RealtimeEventType.TYPING_START.value,
                    "user_id": user_id,
                    "data": data,
                    "timestamp": datetime.utcnow().isoformat()
                },
                exclude_user=user_id
            )
            
        except Exception as e:
            logger.error(f"Error handling typing start: {e}")
            
    async def handle_typing_stop(self, user_id: str, room_id: str):
        """Handle typing stop events"""
        try:
            if room_id in self.typing_users and user_id in self.typing_users[room_id]:
                self.typing_users[room_id].remove(user_id)
                
            # Broadcast to other users
            await self.broadcast_to_room(
                room_id,
                {
                    "type": RealtimeEventType.TYPING_STOP.value,
                    "user_id": user_id,
                    "timestamp": datetime.utcnow().isoformat()
                },
                exclude_user=user_id
            )
            
        except Exception as e:
            logger.error(f"Error handling typing stop: {e}")
            
    async def handle_story_update(self, user_id: str, room_id: str, data: Dict[str, Any]):
        """Handle story update events"""
        try:
            # Store the update in database
            update_data = {
                "story_id": data.get("story_id"),
                "field": data.get("field"),
                "old_value": data.get("old_value"),
                "new_value": data.get("new_value"),
                "updated_by": user_id,
                "updated_at": datetime.utcnow().isoformat()
            }
            
            # Insert into story_updates table for audit trail
            self.supabase.table("story_updates").insert(update_data).execute()
            
            # Broadcast to other users
            await self.broadcast_to_room(
                room_id,
                {
                    "type": RealtimeEventType.STORY_UPDATED.value,
                    "user_id": user_id,
                    "data": data,
                    "timestamp": datetime.utcnow().isoformat()
                },
                exclude_user=user_id
            )
            
        except Exception as e:
            logger.error(f"Error handling story update: {e}")
            
    async def handle_comment_added(self, user_id: str, room_id: str, data: Dict[str, Any]):
        """Handle comment added events"""
        try:
            # Store comment in database
            comment_data = {
                "id": data.get("comment_id"),
                "story_id": data.get("story_id"),
                "content": data.get("content"),
                "author_id": user_id,
                "created_at": datetime.utcnow().isoformat()
            }
            
            self.supabase.table("comments").insert(comment_data).execute()
            
            # Broadcast to other users
            await self.broadcast_to_room(
                room_id,
                {
                    "type": RealtimeEventType.COMMENT_ADDED.value,
                    "user_id": user_id,
                    "data": data,
                    "timestamp": datetime.utcnow().isoformat()
                }
            )
            
        except Exception as e:
            logger.error(f"Error handling comment added: {e}")
            
    async def handle_status_change(self, user_id: str, room_id: str, data: Dict[str, Any]):
        """Handle user status change events"""
        try:
            new_status = data.get("status")
            if new_status in [status.value for status in PresenceStatus]:
                if user_id in self.user_presence:
                    self.user_presence[user_id]["status"] = new_status
                    self.user_presence[user_id]["last_seen"] = datetime.utcnow().isoformat()
                    
                # Broadcast to other users
                await self.broadcast_to_room(
                    room_id,
                    {
                        "type": RealtimeEventType.STATUS_CHANGED.value,
                        "user_id": user_id,
                        "data": {"status": new_status},
                        "timestamp": datetime.utcnow().isoformat()
                    },
                    exclude_user=user_id
                )
                
        except Exception as e:
            logger.error(f"Error handling status change: {e}")
            
    async def broadcast_to_room(self, room_id: str, message: Dict[str, Any], exclude_user: Optional[str] = None):
        """Broadcast a message to all users in a room"""
        try:
            if room_id not in self.room_members:
                return
                
            for user_id in self.room_members[room_id]:
                if exclude_user and user_id == exclude_user:
                    continue
                    
                connection_id = f"{user_id}_{room_id}"
                if connection_id in self.active_connections:
                    websocket = self.active_connections[connection_id]
                    try:
                        await websocket.send_text(json.dumps(message))
                    except Exception as e:
                        logger.error(f"Error sending message to {user_id}: {e}")
                        # Remove dead connection
                        await self.disconnect_user(user_id, room_id)
                        
        except Exception as e:
            logger.error(f"Error broadcasting to room {room_id}: {e}")
            
    async def send_room_state(self, websocket: WebSocket, room_id: str):
        """Send current room state to a user"""
        try:
            room_state = {
                "type": "room_state",
                "data": {
                    "room_id": room_id,
                    "members": self.room_members.get(room_id, []),
                    "typing_users": self.typing_users.get(room_id, []),
                    "user_presence": {
                        user_id: presence 
                        for user_id, presence in self.user_presence.items()
                        if presence.get("room_id") == room_id
                    }
                },
                "timestamp": datetime.utcnow().isoformat()
            }
            
            await websocket.send_text(json.dumps(room_state))
            
        except Exception as e:
            logger.error(f"Error sending room state: {e}")
            
    async def get_user_presence(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user presence information"""
        return self.user_presence.get(user_id)
        
    async def get_room_members(self, room_id: str) -> List[str]:
        """Get list of users in a room"""
        return self.room_members.get(room_id, [])
        
    async def cleanup_inactive_users(self):
        """Clean up inactive users (run periodically)"""
        try:
            current_time = datetime.utcnow()
            inactive_users = []
            
            for user_id, presence in self.user_presence.items():
                last_seen = datetime.fromisoformat(presence["last_seen"].replace("Z", "+00:00"))
                if (current_time - last_seen).total_seconds() > 300:  # 5 minutes
                    inactive_users.append(user_id)
                    
            for user_id in inactive_users:
                room_id = self.user_presence[user_id].get("room_id")
                if room_id:
                    await self.disconnect_user(user_id, room_id)
                    
        except Exception as e:
            logger.error(f"Error cleaning up inactive users: {e}")

# Global realtime service instance
realtime_service: Optional[RealtimeService] = None

def init_realtime_service(supabase_client: Client):
    """Initialize the realtime service"""
    global realtime_service
    realtime_service = RealtimeService(supabase_client)
    return realtime_service

def get_realtime_service() -> RealtimeService:
    """Get the realtime service instance"""
    if realtime_service is None:
        raise RuntimeError("Realtime service not initialized")
    return realtime_service 