"""
Real-time API Endpoints for AgileForge
Handles WebSocket connections and real-time collaboration features
"""

import logging
import json
from typing import Dict, Any, List
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException, Query
from backend.auth.enhanced_auth import get_current_active_user
from backend.services.realtime_service import RealtimeService, get_realtime_service, PresenceStatus

logger = logging.getLogger(__name__)

# Create router
realtime_router = APIRouter(prefix="/realtime", tags=["Real-time"])

@realtime_router.websocket("/ws/{room_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    room_id: str,
    user_id: str = Query(...),
    realtime_service: RealtimeService = Depends(get_realtime_service)
):
    """WebSocket endpoint for real-time collaboration"""
    try:
        # Connect user to room
        await realtime_service.connect_user(websocket, user_id, room_id)
        
        # Handle messages
        while True:
            try:
                # Receive message from client
                data = await websocket.receive_text()
                message = json.loads(data)
                
                # Handle the message
                await realtime_service.handle_message(websocket, user_id, room_id, message)
                
            except WebSocketDisconnect:
                break
            except json.JSONDecodeError:
                logger.error(f"Invalid JSON received from user {user_id}")
                await websocket.send_text(json.dumps({
                    "type": "error",
                    "message": "Invalid JSON format"
                }))
            except Exception as e:
                logger.error(f"Error handling WebSocket message: {e}")
                await websocket.send_text(json.dumps({
                    "type": "error",
                    "message": "Internal server error"
                }))
                
    except Exception as e:
        logger.error(f"WebSocket connection error: {e}")
    finally:
        # Disconnect user
        await realtime_service.disconnect_user(user_id, room_id)

@realtime_router.get("/presence/{room_id}")
async def get_room_presence(
    room_id: str,
    current_user: dict = Depends(get_current_active_user),
    realtime_service: RealtimeService = Depends(get_realtime_service)
):
    """Get presence information for a room"""
    try:
        members = await realtime_service.get_room_members(room_id)
        
        presence_data = {}
        for member_id in members:
            presence = await realtime_service.get_user_presence(member_id)
            if presence:
                presence_data[member_id] = presence
                
        return {
            "success": True,
            "room_id": room_id,
            "members": members,
            "presence": presence_data,
            "total_members": len(members)
        }
        
    except Exception as e:
        logger.error(f"Error getting room presence: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@realtime_router.get("/presence/user/{user_id}")
async def get_user_presence(
    user_id: str,
    current_user: dict = Depends(get_current_active_user),
    realtime_service: RealtimeService = Depends(get_realtime_service)
):
    """Get presence information for a specific user"""
    try:
        presence = await realtime_service.get_user_presence(user_id)
        
        if not presence:
            raise HTTPException(status_code=404, detail="User not found or offline")
            
        return {
            "success": True,
            "user_id": user_id,
            "presence": presence
        }
        
    except Exception as e:
        logger.error(f"Error getting user presence: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@realtime_router.post("/presence/status")
async def update_presence_status(
    status: str,
    room_id: str,
    current_user: dict = Depends(get_current_active_user),
    realtime_service: RealtimeService = Depends(get_realtime_service)
):
    """Update user's presence status"""
    try:
        # Validate status
        valid_statuses = [s.value for s in PresenceStatus]
        if status not in valid_statuses:
            raise HTTPException(
                status_code=400, 
                detail=f"Invalid status. Must be one of: {valid_statuses}"
            )
        
        # Update presence
        if current_user["sub"] in realtime_service.user_presence:
            realtime_service.user_presence[current_user["sub"]]["status"] = status
            
            # Broadcast status change
            await realtime_service.broadcast_to_room(
                room_id,
                {
                    "type": "status_changed",
                    "user_id": current_user["sub"],
                    "data": {"status": status}
                }
            )
            
        return {
            "success": True,
            "message": "Status updated successfully",
            "status": status
        }
        
    except Exception as e:
        logger.error(f"Error updating presence status: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@realtime_router.post("/broadcast/{room_id}")
async def broadcast_message(
    room_id: str,
    message: Dict[str, Any],
    current_user: dict = Depends(get_current_active_user),
    realtime_service: RealtimeService = Depends(get_realtime_service)
):
    """Broadcast a message to all users in a room"""
    try:
        # Add sender information
        message["sender_id"] = current_user["sub"]
        message["timestamp"] = realtime_service.user_presence.get(current_user["sub"], {}).get("last_seen")
        
        # Broadcast message
        await realtime_service.broadcast_to_room(room_id, message)
        
        return {
            "success": True,
            "message": "Message broadcasted successfully"
        }
        
    except Exception as e:
        logger.error(f"Error broadcasting message: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@realtime_router.get("/rooms/active")
async def get_active_rooms(
    current_user: dict = Depends(get_current_active_user),
    realtime_service: RealtimeService = Depends(get_realtime_service)
):
    """Get list of active rooms"""
    try:
        active_rooms = []
        
        for room_id, members in realtime_service.room_members.items():
            if members:  # Only include rooms with active members
                active_rooms.append({
                    "room_id": room_id,
                    "member_count": len(members),
                    "members": members
                })
                
        return {
            "success": True,
            "active_rooms": active_rooms,
            "total_rooms": len(active_rooms)
        }
        
    except Exception as e:
        logger.error(f"Error getting active rooms: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@realtime_router.post("/rooms/{room_id}/join")
async def join_room(
    room_id: str,
    current_user: dict = Depends(get_current_active_user),
    realtime_service: RealtimeService = Depends(get_realtime_service)
):
    """Join a room (for HTTP clients without WebSocket)"""
    try:
        user_id = current_user["sub"]
        
        # Add user to room
        if room_id not in realtime_service.room_members:
            realtime_service.room_members[room_id] = []
        if user_id not in realtime_service.room_members[room_id]:
            realtime_service.room_members[room_id].append(user_id)
            
        # Set user presence
        realtime_service.user_presence[user_id] = {
            "status": PresenceStatus.ONLINE.value,
            "room_id": room_id,
            "last_seen": realtime_service.user_presence.get(user_id, {}).get("last_seen"),
            "cursor_position": None
        }
        
        return {
            "success": True,
            "message": f"Joined room {room_id}",
            "room_id": room_id
        }
        
    except Exception as e:
        logger.error(f"Error joining room: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@realtime_router.post("/rooms/{room_id}/leave")
async def leave_room(
    room_id: str,
    current_user: dict = Depends(get_current_active_user),
    realtime_service: RealtimeService = Depends(get_realtime_service)
):
    """Leave a room"""
    try:
        user_id = current_user["sub"]
        
        # Remove user from room
        if room_id in realtime_service.room_members and user_id in realtime_service.room_members[room_id]:
            realtime_service.room_members[room_id].remove(user_id)
            
        # Update presence
        if user_id in realtime_service.user_presence:
            realtime_service.user_presence[user_id]["status"] = PresenceStatus.OFFLINE.value
            
        return {
            "success": True,
            "message": f"Left room {room_id}",
            "room_id": room_id
        }
        
    except Exception as e:
        logger.error(f"Error leaving room: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@realtime_router.get("/typing/{room_id}")
async def get_typing_users(
    room_id: str,
    current_user: dict = Depends(get_current_active_user),
    realtime_service: RealtimeService = Depends(get_realtime_service)
):
    """Get list of users currently typing in a room"""
    try:
        typing_users = realtime_service.typing_users.get(room_id, [])
        
        return {
            "success": True,
            "room_id": room_id,
            "typing_users": typing_users,
            "count": len(typing_users)
        }
        
    except Exception as e:
        logger.error(f"Error getting typing users: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@realtime_router.post("/cleanup")
async def cleanup_inactive_users(
    current_user: dict = Depends(get_current_active_user),
    realtime_service: RealtimeService = Depends(get_realtime_service)
):
    """Manually trigger cleanup of inactive users (for testing)"""
    try:
        await realtime_service.cleanup_inactive_users()
        
        return {
            "success": True,
            "message": "Inactive users cleaned up successfully"
        }
        
    except Exception as e:
        logger.error(f"Error cleaning up inactive users: {e}")
        raise HTTPException(status_code=500, detail=str(e)) 