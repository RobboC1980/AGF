#!/usr/bin/env python3
import asyncio
import asyncpg
import uuid
from datetime import datetime
from dotenv import load_dotenv
import os

load_dotenv()

async def test_with_disabled_triggers():
    conn = await asyncpg.connect(os.getenv('DATABASE_URL'))
    
    epic = await conn.fetchrow("SELECT id FROM epics LIMIT 1")
    user = await conn.fetchrow("SELECT id FROM users LIMIT 1")
    
    if not epic or not user:
        print("Need epic and user for test")
        await conn.close()
        return
    
    try:
        # Temporarily disable triggers
        await conn.execute("ALTER TABLE stories DISABLE TRIGGER ALL")
        print("✅ Disabled all triggers on stories table")
        
        # Try creating a story
        story_id = await conn.fetchval("""
            INSERT INTO stories (id, epic_id, title, story_key, acceptance_criteria, status, created_at, created_by)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING id
        """, str(uuid.uuid4()), epic['id'], "Test Story Without Triggers", "NO-TRIG-1", 
             "Test acceptance criteria", "backlog", datetime.now(), user['id'])
        
        print(f"✅ Successfully created story without triggers: {story_id}")
        
        # Clean up
        await conn.execute("DELETE FROM stories WHERE id = $1", story_id)
        print("✅ Cleaned up test story")
        
    except Exception as e:
        print(f"❌ Failed even without triggers: {e}")
    finally:
        # Re-enable triggers
        await conn.execute("ALTER TABLE stories ENABLE TRIGGER ALL")
        print("✅ Re-enabled all triggers on stories table")
    
    await conn.close()

if __name__ == "__main__":
    asyncio.run(test_with_disabled_triggers()) 