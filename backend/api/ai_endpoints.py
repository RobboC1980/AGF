from __future__ import annotations

from fastapi import APIRouter, HTTPException, Depends
from typing import List, Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)
router = APIRouter(tags=["AI Features"])

# Simple test endpoint without complex models
@router.get("/health")
async def ai_health_check():
    """Simple health check for AI endpoints"""
    return {"status": "ok", "message": "AI endpoints are working"}

@router.get("/test")
async def test_endpoint():
    """Test endpoint to verify basic functionality"""
    try:
        # Test basic AI service import
        from ..services.ai_service import get_basic_ai_service
        return {"status": "success", "message": "AI service imports working"}
    except Exception as e:
        logger.error(f"AI service import failed: {e}")
        return {"status": "error", "message": str(e)} 