#!/usr/bin/env python3
"""
Test script to verify database connection
"""

import os
import asyncio
import asyncpg
import logging
from pathlib import Path

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def test_connection():
    """Test database connection"""
    
    # Load environment variables
    backend_dir = Path(__file__).parent.parent
    env_file = backend_dir / ".env"
    if env_file.exists():
        with open(env_file, 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    os.environ[key] = value
    
    database_url = os.getenv("DATABASE_URL")
    logger.info(f"Database URL: {database_url[:50]}...")
    
    try:
        logger.info("Attempting to connect to database...")
        conn = await asyncpg.connect(database_url)
        
        # Test query
        result = await conn.fetchval("SELECT version()")
        logger.info(f"✅ Connection successful! PostgreSQL version: {result}")
        
        # Check existing tables
        tables = await conn.fetch("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name
        """)
        
        logger.info(f"Existing tables ({len(tables)}):")
        for table in tables:
            logger.info(f"  - {table['table_name']}")
        
        await conn.close()
        return True
        
    except Exception as e:
        logger.error(f"❌ Connection failed: {e}")
        return False

if __name__ == "__main__":
    asyncio.run(test_connection()) 