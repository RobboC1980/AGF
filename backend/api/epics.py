from fastapi import APIRouter, HTTPException, Depends
from typing import List
import logging
from ..database.supabase_client import get_supabase
from supabase import Client

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("/")
async def get_epics(supabase: Client = Depends(get_supabase)):
    """Get all epics"""
    try:
        result = supabase.table("epics").select("*").execute()
        return result.data
    except Exception as e:
        logger.error(f"Error fetching epics: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch epics")

@router.post("/")
async def create_epic(epic_data: dict, supabase: Client = Depends(get_supabase)):
    """Create a new epic"""
    try:
        result = supabase.table("epics").insert(epic_data).execute()
        return result.data[0] if result.data else {"success": True, "message": "Epic created"}
    except Exception as e:
        logger.error(f"Error creating epic: {e}")
        raise HTTPException(status_code=500, detail="Failed to create epic")

@router.get("/{epic_id}")
async def get_epic(epic_id: str, supabase: Client = Depends(get_supabase)):
    """Get a specific epic"""
    try:
        result = supabase.table("epics").select("*").eq("id", epic_id).execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="Epic not found")
        return result.data[0]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching epic: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch epic")

@router.put("/{epic_id}")
async def update_epic(epic_id: str, epic_data: dict, supabase: Client = Depends(get_supabase)):
    """Update an epic"""
    try:
        result = supabase.table("epics").update(epic_data).eq("id", epic_id).execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="Epic not found")
        return result.data[0]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating epic: {e}")
        raise HTTPException(status_code=500, detail="Failed to update epic")

@router.delete("/{epic_id}")
async def delete_epic(epic_id: str, supabase: Client = Depends(get_supabase)):
    """Delete an epic"""
    try:
        result = supabase.table("epics").delete().eq("id", epic_id).execute()
        return {"success": True, "message": "Epic deleted"}
    except Exception as e:
        logger.error(f"Error deleting epic: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete epic") 