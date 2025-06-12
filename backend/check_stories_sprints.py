#!/usr/bin/env python3
import asyncio
import asyncpg
import os
from dotenv import load_dotenv
load_dotenv()

async def check_stories_sprints():
    conn = await asyncpg.connect(os.getenv('DATABASE_URL'))
    
    # Check stories table schema
    stories_schema = await conn.fetch("""
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = 'stories' 
        ORDER BY ordinal_position
    """)
    print('Stories columns:')
    for col in stories_schema:
        print(f'  - {col["column_name"]}: {col["data_type"]}')
    
    # Check sprints table schema  
    sprints_schema = await conn.fetch("""
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = 'sprints' 
        ORDER BY ordinal_position
    """)
    print('\nSprints columns:')
    for col in sprints_schema:
        print(f'  - {col["column_name"]}: {col["data_type"]}')
    
    await conn.close()

if __name__ == "__main__":
    asyncio.run(check_stories_sprints()) 