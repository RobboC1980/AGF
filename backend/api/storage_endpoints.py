"""
Storage API Endpoints for AgileForge
Handles file uploads, downloads, and management using Supabase Storage
"""

import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from fastapi.responses import StreamingResponse
from backend.auth.enhanced_auth import get_current_active_user, require_admin
from backend.services.storage_service import StorageService, get_storage_service
import io

logger = logging.getLogger(__name__)

# Create router
storage_router = APIRouter(prefix="/storage", tags=["Storage"])

@storage_router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    bucket_type: str = Form(...),
    folder: Optional[str] = Form(None),
    custom_name: Optional[str] = Form(None),
    current_user: dict = Depends(get_current_active_user),
    storage_service: StorageService = Depends(get_storage_service)
):
    """Upload a file to Supabase Storage"""
    try:
        result = await storage_service.upload_file(
            file=file,
            bucket_type=bucket_type,
            folder=folder,
            user_id=current_user["sub"],
            custom_name=custom_name
        )
        
        return {
            "success": True,
            "message": "File uploaded successfully",
            "data": result
        }
        
    except Exception as e:
        logger.error(f"Error uploading file: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@storage_router.get("/download/{file_id}")
async def download_file(
    file_id: str,
    current_user: dict = Depends(get_current_active_user),
    storage_service: StorageService = Depends(get_storage_service)
):
    """Download a file by ID"""
    try:
        # Get file metadata
        file_metadata = await storage_service.get_file_metadata(file_id)
        
        # Check permissions (user can download their own files or public files)
        if (file_metadata["uploaded_by"] != current_user["sub"] and 
            not file_metadata.get("public_url")):
            raise HTTPException(status_code=403, detail="Permission denied")
        
        # Download file content
        file_content = await storage_service.download_file(
            file_metadata["file_path"],
            file_metadata["bucket"].replace("-", "_")  # Convert bucket name back
        )
        
        # Return as streaming response
        return StreamingResponse(
            io.BytesIO(file_content),
            media_type=file_metadata["content_type"],
            headers={
                "Content-Disposition": f"attachment; filename={file_metadata['original_name']}"
            }
        )
        
    except Exception as e:
        logger.error(f"Error downloading file: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@storage_router.get("/signed-url/{file_id}")
async def get_signed_url(
    file_id: str,
    expires_in: int = 3600,
    current_user: dict = Depends(get_current_active_user),
    storage_service: StorageService = Depends(get_storage_service)
):
    """Get a signed URL for private file access"""
    try:
        # Get file metadata
        file_metadata = await storage_service.get_file_metadata(file_id)
        
        # Check permissions
        if file_metadata["uploaded_by"] != current_user["sub"]:
            raise HTTPException(status_code=403, detail="Permission denied")
        
        # Generate signed URL
        signed_url = await storage_service.generate_signed_url(
            file_metadata["file_path"],
            file_metadata["bucket"].replace("-", "_"),
            expires_in
        )
        
        return {
            "success": True,
            "signed_url": signed_url,
            "expires_in": expires_in
        }
        
    except Exception as e:
        logger.error(f"Error generating signed URL: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@storage_router.delete("/files/{file_id}")
async def delete_file(
    file_id: str,
    current_user: dict = Depends(get_current_active_user),
    storage_service: StorageService = Depends(get_storage_service)
):
    """Delete a file"""
    try:
        # Get file metadata
        file_metadata = await storage_service.get_file_metadata(file_id)
        
        # Delete file
        result = await storage_service.delete_file(
            file_metadata["file_path"],
            file_metadata["bucket"].replace("-", "_"),
            current_user["sub"]
        )
        
        return result
        
    except Exception as e:
        logger.error(f"Error deleting file: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@storage_router.get("/files")
async def list_files(
    bucket_type: Optional[str] = None,
    folder: Optional[str] = None,
    limit: int = 50,
    current_user: dict = Depends(get_current_active_user),
    storage_service: StorageService = Depends(get_storage_service)
):
    """List user's files"""
    try:
        files = await storage_service.list_files(
            bucket_type=bucket_type or "attachments",
            folder=folder,
            user_id=current_user["sub"],
            limit=limit
        )
        
        return {
            "success": True,
            "files": files,
            "total": len(files)
        }
        
    except Exception as e:
        logger.error(f"Error listing files: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@storage_router.get("/files/{file_id}/metadata")
async def get_file_metadata(
    file_id: str,
    current_user: dict = Depends(get_current_active_user),
    storage_service: StorageService = Depends(get_storage_service)
):
    """Get file metadata"""
    try:
        metadata = await storage_service.get_file_metadata(file_id)
        
        # Check permissions
        if (metadata["uploaded_by"] != current_user["sub"] and 
            not metadata.get("public_url")):
            raise HTTPException(status_code=403, detail="Permission denied")
        
        return {
            "success": True,
            "metadata": metadata
        }
        
    except Exception as e:
        logger.error(f"Error getting file metadata: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@storage_router.post("/avatar/upload")
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_active_user),
    storage_service: StorageService = Depends(get_storage_service)
):
    """Upload user avatar"""
    try:
        result = await storage_service.upload_file(
            file=file,
            bucket_type="avatars",
            folder="avatars",
            user_id=current_user["sub"],
            custom_name=f"avatar_{current_user['sub']}"
        )
        
        return {
            "success": True,
            "message": "Avatar uploaded successfully",
            "avatar_url": result["public_url"],
            "data": result
        }
        
    except Exception as e:
        logger.error(f"Error uploading avatar: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@storage_router.post("/project/{project_id}/attachment")
async def upload_project_attachment(
    project_id: str,
    file: UploadFile = File(...),
    description: Optional[str] = Form(None),
    current_user: dict = Depends(get_current_active_user),
    storage_service: StorageService = Depends(get_storage_service)
):
    """Upload project attachment"""
    try:
        result = await storage_service.upload_file(
            file=file,
            bucket_type="attachments",
            folder=f"projects/{project_id}",
            user_id=current_user["sub"]
        )
        
        # TODO: Link attachment to project in database
        # You might want to create a project_attachments table
        
        return {
            "success": True,
            "message": "Project attachment uploaded successfully",
            "data": result
        }
        
    except Exception as e:
        logger.error(f"Error uploading project attachment: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@storage_router.post("/story/{story_id}/attachment")
async def upload_story_attachment(
    story_id: str,
    file: UploadFile = File(...),
    description: Optional[str] = Form(None),
    current_user: dict = Depends(get_current_active_user),
    storage_service: StorageService = Depends(get_storage_service)
):
    """Upload story attachment"""
    try:
        result = await storage_service.upload_file(
            file=file,
            bucket_type="attachments",
            folder=f"stories/{story_id}",
            user_id=current_user["sub"]
        )
        
        # TODO: Link attachment to story in database
        # You might want to create a story_attachments table
        
        return {
            "success": True,
            "message": "Story attachment uploaded successfully",
            "data": result
        }
        
    except Exception as e:
        logger.error(f"Error uploading story attachment: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@storage_router.get("/admin/buckets")
async def list_buckets(
    current_user: dict = Depends(require_admin),
    storage_service: StorageService = Depends(get_storage_service)
):
    """List all storage buckets (admin only)"""
    try:
        # This would require additional implementation in StorageService
        return {
            "success": True,
            "buckets": list(storage_service.buckets.values())
        }
        
    except Exception as e:
        logger.error(f"Error listing buckets: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@storage_router.post("/admin/initialize-buckets")
async def initialize_buckets(
    current_user: dict = Depends(require_admin),
    storage_service: StorageService = Depends(get_storage_service)
):
    """Initialize storage buckets (admin only)"""
    try:
        await storage_service.initialize_buckets()
        
        return {
            "success": True,
            "message": "Storage buckets initialized successfully"
        }
        
    except Exception as e:
        logger.error(f"Error initializing buckets: {e}")
        raise HTTPException(status_code=500, detail=str(e)) 