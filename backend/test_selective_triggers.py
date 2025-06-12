#!/usr/bin/env python3
import asyncio
import asyncpg
import uuid
from datetime import datetime
from dotenv import load_dotenv
import os

load_dotenv()

async def test_selective_trigger_disable():
    conn = await asyncpg.connect(os.getenv('DATABASE_URL'))
    
    epic = await conn.fetchrow("SELECT id FROM epics LIMIT 1")
    user = await conn.fetchrow("SELECT id FROM users LIMIT 1")
    
    if not epic or not user:
        print("Need epic and user for test")
        await conn.close()
        return
    
    # Custom triggers to disable temporarily
    custom_triggers = [
        'trigger_log_story_activity',
        'trigger_story_assignment_notification', 
        'trigger_update_project_progress'
    ]
    
    try:
        # Disable custom triggers
        for trigger in custom_triggers:
            await conn.execute(f"ALTER TABLE stories DISABLE TRIGGER {trigger}")
            print(f"✅ Disabled {trigger}")
        
        # Try creating a story
        story_id = await conn.fetchval("""
            INSERT INTO stories (id, epic_id, title, story_key, acceptance_criteria, status, created_at, created_by)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING id
        """, str(uuid.uuid4()), epic['id'], "Test Story Selective", "SEL-1", 
             "Test acceptance criteria", "backlog", datetime.now(), user['id'])
        
        print(f"✅ Successfully created story: {story_id}")
        
        # Clean up
        await conn.execute("DELETE FROM stories WHERE id = $1", story_id)
        print("✅ Cleaned up test story")
        
    except Exception as e:
        print(f"❌ Failed with selective trigger disable: {e}")
    finally:
        # Re-enable custom triggers
        for trigger in custom_triggers:
            try:
                await conn.execute(f"ALTER TABLE stories ENABLE TRIGGER {trigger}")
                print(f"✅ Re-enabled {trigger}")
            except Exception as e:
                print(f"⚠️  Failed to re-enable {trigger}: {e}")
    
    await conn.close()

if __name__ == "__main__":
    asyncio.run(test_selective_trigger_disable()) 