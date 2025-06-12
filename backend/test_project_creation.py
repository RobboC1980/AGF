#!/usr/bin/env python3
"""
Test script to debug project creation issues
"""

import asyncio
import os
import uuid
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Import database connection
from database.connection import db_manager, init_db

async def test_project_creation():
    """Test project creation directly"""
    try:
        # Initialize database
        await init_db()
        print("✅ Database initialized successfully")
        
        # Test basic connection
        async with db_manager.get_connection() as conn:
            result = await conn.fetchval("SELECT 1")
            print(f"✅ Database connection test: {result}")
            
            # Check if projects table exists and its schema
            try:
                schema = await conn.fetch("""
                    SELECT column_name, data_type, is_nullable, column_default
                    FROM information_schema.columns 
                    WHERE table_name = 'projects'
                    ORDER BY ordinal_position
                """)
                print("📋 Projects table schema:")
                for row in schema:
                    print(f"  - {row['column_name']}: {row['data_type']} (nullable: {row['is_nullable']})")
                
                # Try to insert a test project
                project_id = str(uuid.uuid4())
                project_key = "TEST-001"
                now = datetime.now()
                
                print(f"\n🧪 Testing project insertion...")
                print(f"Project ID: {project_id}")
                print(f"Project Key: {project_key}")
                
                await conn.execute("""
                    INSERT INTO projects (id, organization_id, name, key, description, status, priority, start_date, target_end_date, progress, created_by, created_at)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                """, project_id, "default-org", "Test Project", project_key, "Test description",
                    "backlog", "medium", None, None, 0, "test-user", now)
                
                print("✅ Project inserted successfully!")
                
                # Verify the insertion
                project = await conn.fetchrow("SELECT * FROM projects WHERE id = $1", project_id)
                if project:
                    print("✅ Project retrieved successfully:")
                    for key, value in project.items():
                        print(f"  - {key}: {value}")
                else:
                    print("❌ Project not found after insertion")
                
                # Clean up
                await conn.execute("DELETE FROM projects WHERE id = $1", project_id)
                print("🧹 Test project cleaned up")
                
            except Exception as e:
                print(f"❌ Error with projects table: {e}")
                
                # Check if table exists at all
                table_exists = await conn.fetchval("""
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_name = 'projects'
                    )
                """)
                print(f"Projects table exists: {table_exists}")
                
    except Exception as e:
        print(f"❌ Database error: {e}")
        import traceback
        traceback.print_exc()
    
    finally:
        await db_manager.close_pool()

if __name__ == "__main__":
    asyncio.run(test_project_creation()) 