#!/usr/bin/env python3
"""
Script to run the comprehensive auth schema against the PostgreSQL database.
This will create all the necessary tables, indexes, functions, and initial data.
"""

import os
import sys
import asyncio
import asyncpg
import logging
from pathlib import Path

# Add the backend directory to the Python path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

async def run_auth_schema():
    """Run the comprehensive auth schema SQL file"""
    
    # Get database URL from environment
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        logger.error("DATABASE_URL environment variable is required")
        return False
    
    # Path to the auth schema SQL file
    schema_file = backend_dir / "database" / "auth_schema.sql"
    
    if not schema_file.exists():
        logger.error(f"Auth schema file not found: {schema_file}")
        return False
    
    try:
        # Read the SQL file
        logger.info(f"Reading auth schema from: {schema_file}")
        with open(schema_file, 'r', encoding='utf-8') as f:
            sql_content = f.read()
        
        # Connect to the database
        logger.info("Connecting to PostgreSQL database...")
        conn = await asyncpg.connect(database_url)
        
        try:
            # Execute the schema
            logger.info("Executing auth schema...")
            await conn.execute(sql_content)
            logger.info("✅ Auth schema executed successfully!")
            
            # Verify some key tables were created
            logger.info("Verifying table creation...")
            
            tables_to_check = [
                'users', 'roles', 'permissions', 'user_roles', 'user_permissions',
                'organizations', 'teams', 'projects', 'epics', 'stories', 'tasks',
                'sprints', 'comments', 'time_logs', 'activity_logs', 'notifications'
            ]
            
            for table in tables_to_check:
                result = await conn.fetchval(
                    "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = $1)",
                    table
                )
                if result:
                    logger.info(f"✅ Table '{table}' created successfully")
                else:
                    logger.warning(f"⚠️  Table '{table}' not found")
            
            # Check if initial data was inserted
            role_count = await conn.fetchval("SELECT COUNT(*) FROM roles")
            permission_count = await conn.fetchval("SELECT COUNT(*) FROM permissions")
            
            logger.info(f"✅ Initial data loaded: {role_count} roles, {permission_count} permissions")
            
            return True
            
        finally:
            await conn.close()
            logger.info("Database connection closed")
            
    except Exception as e:
        logger.error(f"❌ Error executing auth schema: {e}")
        return False

async def main():
    """Main function"""
    logger.info("🚀 Starting auth schema deployment...")
    
    success = await run_auth_schema()
    
    if success:
        logger.info("🎉 Auth schema deployment completed successfully!")
        sys.exit(0)
    else:
        logger.error("💥 Auth schema deployment failed!")
        sys.exit(1)

if __name__ == "__main__":
    # Load environment variables from .env file
    env_file = backend_dir / ".env"
    if env_file.exists():
        with open(env_file, 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    os.environ[key] = value
    
    asyncio.run(main()) 