#!/usr/bin/env python3
"""
Check Supabase RPC Capabilities and Database Status
"""

import os
import logging
from supabase import create_client
import json

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def check_supabase_capabilities():
    """Check what RPC functions and capabilities are available"""
    
    # Get Supabase credentials
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_KEY")
    
    if not supabase_url or not supabase_key:
        logger.error("❌ Supabase credentials not found")
        return False
    
    try:
        # Initialize Supabase client
        supabase = create_client(supabase_url, supabase_key)
        logger.info("✅ Supabase client initialized")
        
        # 1. Check available RPC functions
        logger.info("\n🔍 Checking available RPC functions...")
        
        # Try to check if we have any custom RPC functions
        try:
            # Check for vector extension function
            result = supabase.rpc('check_vector_extension').execute()
            logger.info("✅ check_vector_extension RPC function exists")
        except Exception as e:
            logger.info("ℹ️ check_vector_extension RPC not available")
        
        try:
            # Check for get_epics_needing_stories function
            result = supabase.rpc('get_epics_needing_stories').execute()
            logger.info("✅ get_epics_needing_stories RPC function exists")
            logger.info(f"   Found {len(result.data)} epics needing stories")
        except Exception as e:
            logger.info("ℹ️ get_epics_needing_stories RPC not available")
        
        # 2. Check table structure
        logger.info("\n📊 Checking table structures...")
        
        # Check users table columns
        try:
            # Try to select specific columns
            columns_to_check = [
                'id', 'email', 'name', 'avatar_url', 'created_at',
                'hashed_password', 'roles', 'permissions', 
                'is_active', 'is_verified', 'last_login', 'team_id'
            ]
            
            logger.info("\n👤 Users table columns:")
            for col in columns_to_check:
                try:
                    result = supabase.table("users").select(col).limit(1).execute()
                    logger.info(f"  ✅ {col}")
                except Exception as e:
                    if 'column' in str(e).lower():
                        logger.info(f"  ❌ {col} (missing)")
                    else:
                        logger.info(f"  ⚠️ {col} (error: {str(e)[:50]}...)")
        except Exception as e:
            logger.error(f"❌ Error checking users table: {e}")
        
        # 3. Check for required tables
        logger.info("\n🗄️ Checking required tables...")
        tables_to_check = [
            'users', 'projects', 'epics', 'stories',
            'story_embeddings', 'project_insights', 'sprint_analyses',
            'story_suggestions', 'sprints'
        ]
        
        for table in tables_to_check:
            try:
                result = supabase.table(table).select("id").limit(1).execute()
                count = len(result.data) if result.data else 0
                logger.info(f"  ✅ {table} (exists)")
            except Exception as e:
                if '404' in str(e) or 'not exist' in str(e).lower():
                    logger.info(f"  ❌ {table} (does not exist)")
                else:
                    logger.info(f"  ⚠️ {table} (error: {str(e)[:50]}...)")
        
        # 4. Test authentication-related queries
        logger.info("\n🔐 Testing authentication queries...")
        
        # Check if we can query users by email
        try:
            result = supabase.table("users").select("*").eq("email", "test@example.com").execute()
            logger.info("✅ Can query users by email")
        except Exception as e:
            logger.error(f"❌ Cannot query users by email: {e}")
        
        # 5. Check if we need to use Supabase Auth or custom auth
        logger.info("\n🔑 Checking authentication setup...")
        
        # Check if any users have hashed_password
        try:
            result = supabase.table("users").select("email").not_.is_("hashed_password", "null").limit(1).execute()
            if result.data:
                logger.info("✅ Custom authentication is set up (users have hashed passwords)")
            else:
                logger.info("ℹ️ No users with hashed passwords found")
        except Exception as e:
            logger.info("ℹ️ hashed_password column not available - need schema update")
        
        # 6. Provide recommendations
        logger.info("\n📋 RECOMMENDATIONS:")
        logger.info("="*50)
        
        logger.info("\n1️⃣ For missing database columns:")
        logger.info("   - Go to Supabase Dashboard > SQL Editor")
        logger.info("   - Run the following SQL:")
        logger.info("""
   ALTER TABLE users 
   ADD COLUMN IF NOT EXISTS hashed_password TEXT,
   ADD COLUMN IF NOT EXISTS roles TEXT[] DEFAULT '{"developer"}',
   ADD COLUMN IF NOT EXISTS permissions TEXT[] DEFAULT '{}',
   ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
   ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false,
   ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE,
   ADD COLUMN IF NOT EXISTS team_id UUID;
        """)
        
        logger.info("\n2️⃣ For missing tables:")
        logger.info("   - Use the fix_database_schema.sql file")
        logger.info("   - Execute it in Supabase SQL Editor")
        
        logger.info("\n3️⃣ For vector search (optional):")
        logger.info("   - Enable pgvector extension in Supabase")
        logger.info("   - CREATE EXTENSION IF NOT EXISTS vector;")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Failed to check capabilities: {e}")
        return False

if __name__ == "__main__":
    check_supabase_capabilities() 