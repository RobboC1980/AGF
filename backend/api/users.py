from fastapi import APIRouter, HTTPException, Depends
from typing import List
import logging
from ..database.supabase_client import get_supabase
from supabase import Client

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("/")
async def get_users(supabase: Client = Depends(get_supabase)):
    """Get all users"""
    try:
        result = supabase.table("users").select("*").execute()
        return result.data
    except Exception as e:
        logger.error(f"Error fetching users: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch users")

@router.post("/")
async def create_user(user_data: dict, supabase: Client = Depends(get_supabase)):
    """Create a new user"""
    try:
        result = supabase.table("users").insert(user_data).execute()
        return result.data[0] if result.data else {"success": True, "message": "User created"}
    except Exception as e:
        logger.error(f"Error creating user: {e}")
        raise HTTPException(status_code=500, detail="Failed to create user")

@router.get("/{user_id}")
async def get_user(user_id: str, supabase: Client = Depends(get_supabase)):
    """Get a specific user"""
    try:
        result = supabase.table("users").select("*").eq("id", user_id).execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="User not found")
        return result.data[0]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching user: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch user")

@router.put("/{user_id}")
async def update_user(user_id: str, user_data: dict, supabase: Client = Depends(get_supabase)):
    """Update a user"""
    try:
        result = supabase.table("users").update(user_data).eq("id", user_id).execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="User not found")
        return result.data[0]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating user: {e}")
        raise HTTPException(status_code=500, detail="Failed to update user")

@router.delete("/{user_id}")
async def delete_user(user_id: str, supabase: Client = Depends(get_supabase)):
    """Delete a user"""
    try:
        result = supabase.table("users").delete().eq("id", user_id).execute()
        return {"success": True, "message": "User deleted"}
    except Exception as e:
        logger.error(f"Error deleting user: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete user") 