#!/usr/bin/env python3
"""
Create a default organization for testing
"""

import asyncio
import uuid
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables first
load_dotenv()

from database.connection import db_manager, init_db

async def create_default_org():
    """Create default organization"""
    try:
        await init_db()
        
        async with db_manager.get_connection() as conn:
            # Check organizations table schema
            schema = await conn.fetch("""
                SELECT column_name, data_type, is_nullable, column_default
                FROM information_schema.columns 
                WHERE table_name = 'organizations'
                ORDER BY ordinal_position
            """)
            print("📋 Organizations table schema:")
            for row in schema:
                print(f"  - {row['column_name']}: {row['data_type']} (nullable: {row['is_nullable']})")
            
            # Try to create a default organization
            org_id = "default-org"
            now = datetime.now()
            
            print(f"\n🏢 Creating default organization...")
            
            # First, let's see what columns are required (NOT NULL)
            required_cols = [row['column_name'] for row in schema if row['is_nullable'] == 'NO']
            print(f"Required columns: {required_cols}")
            
            # Try a simple insert with minimal required fields
            try:
                await conn.execute("""
                    INSERT INTO organizations (id, name, created_at, created_by)
                    VALUES ($1, $2, $3, $4)
                """, org_id, "Default Organization", now, "system")
                print("✅ Default organization created successfully!")
                
                # Verify it was created
                org = await conn.fetchrow("SELECT * FROM organizations WHERE id = $1", org_id)
                if org:
                    print("✅ Organization verified:")
                    for key, value in org.items():
                        print(f"  - {key}: {value}")
                
            except Exception as e:
                print(f"❌ Failed to create organization: {e}")
                
                # Try with different required fields
                print("Trying alternative approach...")
                try:
                    await conn.execute("""
                        INSERT INTO organizations (id, name, slug, created_at, updated_at)
                        VALUES ($1, $2, $3, $4, $5)
                    """, org_id, "Default Organization", "default-org", now, now)
                    print("✅ Default organization created with alternative approach!")
                except Exception as e2:
                    print(f"❌ Alternative approach also failed: {e2}")
                
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        await db_manager.close_pool()

if __name__ == "__main__":
    asyncio.run(create_default_org()) 