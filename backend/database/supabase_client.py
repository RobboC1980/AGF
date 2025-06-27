from supabase import create_client, Client
import os
import logging
from typing import Optional
from contextlib import asynccontextmanager
from dotenv import load_dotenv

# Load environment variables
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '..', '.env'))

logger = logging.getLogger(__name__)

class SupabaseManager:
    def __init__(self):
        self.client: Optional[Client] = None
        self.supabase_url = os.getenv("SUPABASE_URL")
        # Try multiple possible key environment variables
        self.supabase_key = (
            os.getenv("SUPABASE_SERVICE_KEY") or 
            os.getenv("SUPABASE_KEY") or 
            os.getenv("SUPABASE_ANON_KEY")
        )
        
        if not self.supabase_url or not self.supabase_key:
            logger.error(f"Missing Supabase credentials - URL: {bool(self.supabase_url)}, Key: {bool(self.supabase_key)}")
            raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_KEY (or SUPABASE_KEY) environment variables are required")
    
    def init_client(self):
        """Initialize the Supabase client"""
        try:
            logger.info(f"Initializing Supabase client with URL: {self.supabase_url[:50]}...")
            
            # Initialize with just the required parameters
            self.client = create_client(
                supabase_url=self.supabase_url, 
                supabase_key=self.supabase_key
            )
            logger.info("Supabase client initialized successfully")
            
            # Test the connection with a simple query
            try:
                # Try a simple health check - this might fail if tables don't exist yet
                result = self.client.table("projects").select("id").limit(1).execute()
                logger.info(f"Supabase connection test successful - found {len(result.data)} records")
            except Exception as conn_error:
                logger.warning(f"Supabase connection test failed (tables may not exist yet): {conn_error}")
                # Don't raise here - client is initialized even if test query fails
            
        except Exception as e:
            logger.error(f"Failed to initialize Supabase client: {e}")
            raise
    
    def close_client(self):
        """Close the Supabase client"""
        if self.client:
            # Supabase client doesn't have a close method, but we can clean up any resources
            self.client = None
            logger.info("Supabase client closed")
    
    @asynccontextmanager
    async def get_client(self):
        """Get the Supabase client"""
        if not self.client:
            raise RuntimeError("Supabase client not initialized")
        yield self.client

# Global Supabase manager instance
supabase_manager = SupabaseManager()

def init_supabase():
    """Initialize Supabase connection"""
    supabase_manager.init_client()

def close_supabase():
    """Close Supabase connection"""
    supabase_manager.close_client()

def get_supabase():
    """Dependency to get Supabase client"""
    if not supabase_manager.client:
        raise RuntimeError("Supabase client not initialized")
    return supabase_manager.client 