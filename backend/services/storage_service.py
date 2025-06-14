"""
Supabase Storage Service for AgileForge
Handles file uploads, downloads, and management using Supabase Storage
"""

import os
import logging
import mimetypes
from typing import Optional, List, Dict, Any, BinaryIO
from datetime import datetime, timedelta
from fastapi import HTTPException, UploadFile
from supabase import Client
import uuid

logger = logging.getLogger(__name__)

class StorageService:
    """Service for managing file storage with Supabase Storage"""
    
    def __init__(self, supabase_client: Client):
        self.supabase = supabase_client
        self.buckets = {
            'avatars': 'user-avatars',
            'attachments': 'project-attachments',
            'documents': 'project-documents',
            'exports': 'data-exports'
        }
        
    async def initialize_buckets(self):
        """Initialize storage buckets if they don't exist"""
        try:
            for bucket_name, bucket_id in self.buckets.items():
                try:
                    # Check if bucket exists
                    self.supabase.storage.get_bucket(bucket_id)
                    logger.info(f"Bucket {bucket_id} already exists")
                except:
                    # Create bucket if it doesn't exist
                    self.supabase.storage.create_bucket(
                        bucket_id,
                        options={
                            "public": bucket_name == 'avatars',  # Only avatars are public
                            "allowedMimeTypes": self._get_allowed_mime_types(bucket_name),
                            "fileSizeLimit": self._get_file_size_limit(bucket_name)
                        }
                    )
                    logger.info(f"Created bucket: {bucket_id}")
                    
        except Exception as e:
            logger.error(f"Error initializing buckets: {e}")
            
    def _get_allowed_mime_types(self, bucket_type: str) -> List[str]:
        """Get allowed MIME types for bucket"""
        if bucket_type == 'avatars':
            return ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
        elif bucket_type == 'attachments':
            return [
                'image/jpeg', 'image/png', 'image/webp', 'image/gif',
                'application/pdf', 'text/plain', 'text/csv',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            ]
        elif bucket_type == 'documents':
            return [
                'application/pdf', 'text/plain', 'text/markdown',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'application/vnd.openxmlformats-officedocument.presentationml.presentation'
            ]
        else:  # exports
            return ['application/json', 'text/csv', 'application/zip']
            
    def _get_file_size_limit(self, bucket_type: str) -> int:
        """Get file size limit for bucket (in bytes)"""
        if bucket_type == 'avatars':
            return 2 * 1024 * 1024  # 2MB
        elif bucket_type == 'attachments':
            return 10 * 1024 * 1024  # 10MB
        elif bucket_type == 'documents':
            return 25 * 1024 * 1024  # 25MB
        else:  # exports
            return 100 * 1024 * 1024  # 100MB
            
    async def upload_file(
        self,
        file: UploadFile,
        bucket_type: str,
        folder: Optional[str] = None,
        user_id: Optional[str] = None,
        custom_name: Optional[str] = None
    ) -> Dict[str, Any]:
        """Upload a file to Supabase Storage"""
        try:
            # Validate bucket type
            if bucket_type not in self.buckets:
                raise HTTPException(status_code=400, detail=f"Invalid bucket type: {bucket_type}")
                
            bucket_id = self.buckets[bucket_type]
            
            # Validate file type
            allowed_types = self._get_allowed_mime_types(bucket_type)
            if file.content_type not in allowed_types:
                raise HTTPException(
                    status_code=400, 
                    detail=f"File type {file.content_type} not allowed for {bucket_type}"
                )
                
            # Validate file size
            file_size = 0
            content = await file.read()
            file_size = len(content)
            
            max_size = self._get_file_size_limit(bucket_type)
            if file_size > max_size:
                raise HTTPException(
                    status_code=400,
                    detail=f"File size {file_size} exceeds limit {max_size}"
                )
                
            # Generate file path
            file_extension = os.path.splitext(file.filename)[1]
            file_id = custom_name or str(uuid.uuid4())
            
            path_parts = []
            if folder:
                path_parts.append(folder)
            if user_id and bucket_type == 'avatars':
                path_parts.append(user_id)
            path_parts.append(f"{file_id}{file_extension}")
            
            file_path = "/".join(path_parts)
            
            # Upload file
            result = self.supabase.storage.from_(bucket_id).upload(
                file_path,
                content,
                file_options={
                    "content-type": file.content_type,
                    "cache-control": "3600"
                }
            )
            
            # Get public URL if bucket is public
            public_url = None
            if bucket_type == 'avatars':
                public_url = self.supabase.storage.from_(bucket_id).get_public_url(file_path)
                
            # Store file metadata in database
            file_metadata = {
                "id": str(uuid.uuid4()),
                "original_name": file.filename,
                "file_path": file_path,
                "bucket": bucket_id,
                "content_type": file.content_type,
                "file_size": file_size,
                "uploaded_by": user_id,
                "public_url": public_url,
                "created_at": datetime.utcnow().isoformat()
            }
            
            # Insert metadata into files table
            self.supabase.table("files").insert(file_metadata).execute()
            
            logger.info(f"File uploaded successfully: {file_path}")
            
            return {
                "success": True,
                "file_id": file_metadata["id"],
                "file_path": file_path,
                "public_url": public_url,
                "file_size": file_size,
                "content_type": file.content_type
            }
            
        except Exception as e:
            logger.error(f"Error uploading file: {e}")
            raise HTTPException(status_code=500, detail=f"File upload failed: {str(e)}")
            
    async def download_file(self, file_path: str, bucket_type: str) -> bytes:
        """Download a file from Supabase Storage"""
        try:
            if bucket_type not in self.buckets:
                raise HTTPException(status_code=400, detail=f"Invalid bucket type: {bucket_type}")
                
            bucket_id = self.buckets[bucket_type]
            
            # Download file
            result = self.supabase.storage.from_(bucket_id).download(file_path)
            
            return result
            
        except Exception as e:
            logger.error(f"Error downloading file: {e}")
            raise HTTPException(status_code=500, detail=f"File download failed: {str(e)}")
            
    async def delete_file(self, file_path: str, bucket_type: str, user_id: str) -> Dict[str, Any]:
        """Delete a file from Supabase Storage"""
        try:
            if bucket_type not in self.buckets:
                raise HTTPException(status_code=400, detail=f"Invalid bucket type: {bucket_type}")
                
            bucket_id = self.buckets[bucket_type]
            
            # Check if user has permission to delete file
            file_metadata = self.supabase.table("files").select("*").eq("file_path", file_path).execute()
            
            if not file_metadata.data:
                raise HTTPException(status_code=404, detail="File not found")
                
            file_info = file_metadata.data[0]
            if file_info["uploaded_by"] != user_id:
                raise HTTPException(status_code=403, detail="Permission denied")
                
            # Delete file from storage
            self.supabase.storage.from_(bucket_id).remove([file_path])
            
            # Delete metadata from database
            self.supabase.table("files").delete().eq("file_path", file_path).execute()
            
            logger.info(f"File deleted successfully: {file_path}")
            
            return {"success": True, "message": "File deleted successfully"}
            
        except Exception as e:
            logger.error(f"Error deleting file: {e}")
            raise HTTPException(status_code=500, detail=f"File deletion failed: {str(e)}")
            
    async def get_file_metadata(self, file_id: str) -> Dict[str, Any]:
        """Get file metadata from database"""
        try:
            result = self.supabase.table("files").select("*").eq("id", file_id).execute()
            
            if not result.data:
                raise HTTPException(status_code=404, detail="File not found")
                
            return result.data[0]
            
        except Exception as e:
            logger.error(f"Error getting file metadata: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to get file metadata: {str(e)}")
            
    async def list_files(
        self,
        bucket_type: str,
        folder: Optional[str] = None,
        user_id: Optional[str] = None,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """List files in a bucket/folder"""
        try:
            if bucket_type not in self.buckets:
                raise HTTPException(status_code=400, detail=f"Invalid bucket type: {bucket_type}")
                
            query = self.supabase.table("files").select("*").eq("bucket", self.buckets[bucket_type])
            
            if user_id:
                query = query.eq("uploaded_by", user_id)
                
            if folder:
                query = query.like("file_path", f"{folder}%")
                
            result = query.limit(limit).order("created_at", desc=True).execute()
            
            return result.data
            
        except Exception as e:
            logger.error(f"Error listing files: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to list files: {str(e)}")
            
    async def generate_signed_url(
        self,
        file_path: str,
        bucket_type: str,
        expires_in: int = 3600
    ) -> str:
        """Generate a signed URL for private file access"""
        try:
            if bucket_type not in self.buckets:
                raise HTTPException(status_code=400, detail=f"Invalid bucket type: {bucket_type}")
                
            bucket_id = self.buckets[bucket_type]
            
            # Generate signed URL
            signed_url = self.supabase.storage.from_(bucket_id).create_signed_url(
                file_path,
                expires_in
            )
            
            return signed_url["signedURL"]
            
        except Exception as e:
            logger.error(f"Error generating signed URL: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to generate signed URL: {str(e)}")

# Global storage service instance
storage_service: Optional[StorageService] = None

def init_storage_service(supabase_client: Client):
    """Initialize the storage service"""
    global storage_service
    storage_service = StorageService(supabase_client)
    return storage_service

def get_storage_service() -> StorageService:
    """Get the storage service instance"""
    if storage_service is None:
        raise RuntimeError("Storage service not initialized")
    return storage_service 