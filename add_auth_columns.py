#!/usr/bin/env python3
"""
Add Authentication Columns to Supabase Database
This script adds the required columns for authentication to work
"""

import os
import logging
from supabase import create_client
import subprocess
import webbrowser

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def generate_sql_url():
    """Generate the Supabase SQL editor URL with the query pre-filled"""
    supabase_url = os.getenv("SUPABASE_URL", "")
    
    # Extract project ref from URL
    if "supabase.co" in supabase_url:
        project_ref = supabase_url.split("//")[1].split(".")[0]
        base_url = f"https://app.supabase.com/project/{project_ref}/sql/new"
        
        # SQL to add columns
        sql_query = """-- Add Authentication Columns to Users Table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS hashed_password TEXT,
ADD COLUMN IF NOT EXISTS roles TEXT[] DEFAULT '{"developer"}',
ADD COLUMN IF NOT EXISTS permissions TEXT[] DEFAULT '{"view_project","view_epic","create_story","edit_story","view_story","use_ai_features"}',
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS team_id UUID;

-- Update existing users with default values
UPDATE users SET roles = '{"developer"}' WHERE roles IS NULL;
UPDATE users SET permissions = '{"view_project","view_epic","create_story","edit_story","view_story","use_ai_features"}' WHERE permissions IS NULL;
UPDATE users SET is_active = true WHERE is_active IS NULL;
UPDATE users SET is_verified = false WHERE is_verified IS NULL;

-- Grant permissions
GRANT ALL ON users TO postgres, anon, authenticated, service_role;"""
        
        return base_url, sql_query, project_ref
    
    return None, None, None

def main():
    """Main function to add authentication columns"""
    logger.info("🔧 Adding Authentication Columns to Supabase")
    logger.info("="*50)
    
    # Get Supabase credentials
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_KEY")
    
    if not supabase_url or not supabase_key:
        logger.error("❌ Supabase credentials not found in environment")
        return False
    
    # Generate SQL editor URL
    sql_url, sql_query, project_ref = generate_sql_url()
    
    if sql_url and project_ref:
        logger.info(f"📋 Project Reference: {project_ref}")
        logger.info("\n🌐 Opening Supabase SQL Editor...")
        logger.info(f"URL: {sql_url}")
        
        # Try to open in browser
        try:
            webbrowser.open(sql_url)
            logger.info("✅ Opened SQL editor in your browser")
        except Exception:
            logger.info("⚠️ Could not open browser automatically")
        
        logger.info("\n📝 SQL to Execute:")
        logger.info("-"*50)
        print(sql_query)
        logger.info("-"*50)
        
        logger.info("\n🚀 Instructions:")
        logger.info("1. The SQL editor should have opened in your browser")
        logger.info("2. Copy and paste the SQL shown above")
        logger.info("3. Click 'Run' to execute")
        logger.info("4. You should see 'Success' message")
        
        # Also save to file for convenience
        with open("auth_columns.sql", "w") as f:
            f.write(sql_query)
        logger.info("\n💾 SQL also saved to: auth_columns.sql")
        
    else:
        logger.info("\n⚠️ Could not generate Supabase URL")
        logger.info("Please go to your Supabase dashboard manually:")
        logger.info("1. Navigate to SQL Editor")
        logger.info("2. Create a new query")
        logger.info("3. Paste the contents of minimal_auth_fix.sql")
        logger.info("4. Click Run")
    
    logger.info("\n✅ After running the SQL, test with:")
    logger.info("   python integration_test.py")
    
    # Try to verify current state
    logger.info("\n🔍 Checking current database state...")
    try:
        supabase = create_client(supabase_url, supabase_key)
        
        # Check if columns exist
        required_columns = ['hashed_password', 'roles', 'permissions', 'is_active', 'is_verified']
        missing_columns = []
        
        for col in required_columns:
            try:
                result = supabase.table("users").select(col).limit(1).execute()
                logger.info(f"✅ Column '{col}' exists")
            except Exception as e:
                if 'column' in str(e).lower():
                    missing_columns.append(col)
                    logger.info(f"❌ Column '{col}' missing")
        
        if not missing_columns:
            logger.info("\n🎉 All required columns already exist!")
            logger.info("You can now run: python integration_test.py")
        else:
            logger.info(f"\n⚠️ Missing columns: {', '.join(missing_columns)}")
            logger.info("Please run the SQL above to add them")
            
    except Exception as e:
        logger.warning(f"Could not verify database state: {e}")
    
    return True

if __name__ == "__main__":
    main() 