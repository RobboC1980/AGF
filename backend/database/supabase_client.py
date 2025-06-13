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
        self.supabase_key = os.getenv("SUPABASE_SERVICE_KEY")
        
        if not self.supabase_url or not self.supabase_key:
            raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables are required")
    
    def init_client(self):
        """Initialize the Supabase client"""
        try:
            self.client = create_client(self.supabase_url, self.supabase_key)
            logger.info("Supabase client initialized")
            
            # Test the connection
            self.client.table("users").select("count").limit(1).execute()
            logger.info("Supabase connection test successful")
            
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