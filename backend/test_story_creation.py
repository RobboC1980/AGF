#!/usr/bin/env python3
import asyncio
import asyncpg
import uuid
from datetime import datetime, timedelta
from dotenv import load_dotenv
import os

load_dotenv()

async def test_story_creation():
    conn = await asyncpg.connect(os.getenv('DATABASE_URL'))
    
    # Get one epic to test with
    epic = await conn.fetchrow("SELECT id FROM epics LIMIT 1")
    if not epic:
        print("No epics found")
        return
    
    # Get one user to test with
    user = await conn.fetchrow("SELECT id FROM users LIMIT 1")
    if not user:
        print("No users found")
        return
    
    print(f"Testing with epic: {epic['id']}, user: {user['id']}")
    
    # Try to create a simple story
    try:
        story_id = await conn.fetchval("""
            INSERT INTO stories (id, epic_id, title, story_key, as_a, i_want, so_that,
                               acceptance_criteria, story_points, priority, status, 
                               assignee_id, reporter_id, due_date, created_by, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
            RETURNING id
        """, str(uuid.uuid4()), epic['id'], "Test Story", "TEST-1",
             "test user", "to test the system", "I can verify it works",
             "Simple test criteria", 5, "medium", "backlog", 
             user['id'], user['id'], datetime.now() + timedelta(days=7), user['id'], datetime.now(), datetime.now())
        
        print(f"✅ Successfully created story: {story_id}")
        
        # Clean up
        await conn.execute("DELETE FROM stories WHERE id = $1", story_id)
        print("✅ Cleaned up test story")
        
    except Exception as e:
        print(f"❌ Failed to create story: {e}")
    
    await conn.close()

if __name__ == "__main__":
    asyncio.run(test_story_creation()) 