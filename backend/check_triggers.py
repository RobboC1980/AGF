#!/usr/bin/env python3
import asyncio
import asyncpg
import os
from dotenv import load_dotenv
load_dotenv()

async def check_triggers():
    conn = await asyncpg.connect(os.getenv('DATABASE_URL'))
    
    # Check triggers
    triggers = await conn.fetch("""
        SELECT trigger_name, event_manipulation, action_statement 
        FROM information_schema.triggers 
        WHERE event_object_table = 'stories'
    """)
    print('Triggers on stories table:')
    for t in triggers:
        print(f'  - {t["trigger_name"]}: {t["event_manipulation"]}')
        print(f'    Action: {t["action_statement"]}')
    
    # Check constraints  
    constraints = await conn.fetch("""
        SELECT constraint_name, constraint_type 
        FROM information_schema.table_constraints 
        WHERE table_name = 'stories'
    """)
    print('\nConstraints on stories table:')
    for c in constraints:
        print(f'  - {c["constraint_name"]}: {c["constraint_type"]}')
    
    await conn.close()

if __name__ == "__main__":
    asyncio.run(check_triggers()) 