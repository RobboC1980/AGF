#!/usr/bin/env python3
"""
Check current database schema
"""

import asyncio
import asyncpg
from dotenv import load_dotenv
import os

# Load environment variables first
load_dotenv()

async def check_schema():
    """Check current database schema"""
    try:
        database_url = os.getenv("DATABASE_URL")
        conn = await asyncpg.connect(database_url)
        
        # Get all tables
        tables = await conn.fetch("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name
        """)
        
        print(f"📋 Found {len(tables)} tables:")
        for table in tables:
            print(f"  - {table['table_name']}")
        
        # Check users table specifically
        if any(t['table_name'] == 'users' for t in tables):
            user_schema = await conn.fetch("""
                SELECT column_name, data_type, is_nullable, column_default
                FROM information_schema.columns 
                WHERE table_name = 'users'
                ORDER BY ordinal_position
            """)
            print(f"\n👥 Users table schema ({len(user_schema)} columns):")
            for col in user_schema:
                print(f"  - {col['column_name']}: {col['data_type']} (nullable: {col['is_nullable']})")
        
        # Check projects table
        if any(t['table_name'] == 'projects' for t in tables):
            project_schema = await conn.fetch("""
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns 
                WHERE table_name = 'projects'
                ORDER BY ordinal_position
            """)
            print(f"\n📁 Projects table schema ({len(project_schema)} columns):")
            for col in project_schema:
                print(f"  - {col['column_name']}: {col['data_type']} (nullable: {col['is_nullable']})")
        
        await conn.close()
        
    except Exception as e:
        print(f"❌ Error checking schema: {e}")
        raise

if __name__ == "__main__":
    asyncio.run(check_schema()) 