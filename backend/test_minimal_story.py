#!/usr/bin/env python3
import asyncio
import asyncpg
import uuid
from datetime import datetime
from dotenv import load_dotenv
import os

load_dotenv()

async def test_minimal_story():
    conn = await asyncpg.connect(os.getenv('DATABASE_URL'))
    
    # Get required columns (NOT NULL)
    schema = await conn.fetch("""
        SELECT column_name, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'stories' AND is_nullable = 'NO'
        ORDER BY ordinal_position
    """)
    
    print("Required (NOT NULL) columns in stories table:")
    for col in schema:
        print(f"  - {col['column_name']}: default = {col['column_default']}")
    
    # Get one epic and user to test with
    epic = await conn.fetchrow("SELECT id FROM epics LIMIT 1")
    user = await conn.fetchrow("SELECT id FROM users LIMIT 1")
    
    if not epic or not user:
        print("Need epic and user for test")
        await conn.close()
        return
    
    # Try minimal story with just required fields
    try:
        story_id = await conn.fetchval("""
            INSERT INTO public.stories (id, epic_id, title, story_key, acceptance_criteria, status, created_at, created_by)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING id
        """, str(uuid.uuid4()), epic['id'], "Minimal Test Story", "MIN-1", 
             "Test acceptance criteria", "backlog", datetime.now(), user['id'])
        
        print(f"✅ Successfully created minimal story: {story_id}")
        
        # Clean up
        await conn.execute("DELETE FROM stories WHERE id = $1", story_id)
        print("✅ Cleaned up test story")
        
    except Exception as e:
        print(f"❌ Failed to create minimal story: {e}")
    
    await conn.close()

if __name__ == "__main__":
    asyncio.run(test_minimal_story()) 