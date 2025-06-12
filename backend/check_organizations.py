#!/usr/bin/env python3
"""
Check what organizations exist in the database
"""

import asyncio
from dotenv import load_dotenv

# Load environment variables first
load_dotenv()

from database.connection import db_manager, init_db

async def check_organizations():
    """Check organizations in database"""
    try:
        await init_db()
        
        async with db_manager.get_connection() as conn:
            # Check if organizations table exists
            table_exists = await conn.fetchval("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = 'organizations'
                )
            """)
            print(f"Organizations table exists: {table_exists}")
            
            if table_exists:
                # Get all organizations
                orgs = await conn.fetch("SELECT * FROM organizations LIMIT 10")
                print(f"Found {len(orgs)} organizations:")
                for org in orgs:
                    print(f"  - ID: {org['id']}, Name: {org.get('name', 'N/A')}")
            
            # Also check if there are any projects and what org_ids they use
            projects = await conn.fetch("SELECT organization_id, COUNT(*) as count FROM projects GROUP BY organization_id LIMIT 10")
            print(f"\nExisting projects by organization_id:")
            for project in projects:
                print(f"  - Org ID: {project['organization_id']}, Count: {project['count']}")
                
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        await db_manager.close_pool()

if __name__ == "__main__":
    asyncio.run(check_organizations()) 