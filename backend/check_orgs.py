#!/usr/bin/env python3
import asyncio
import asyncpg
import os
from dotenv import load_dotenv
load_dotenv()

async def check_orgs():
    conn = await asyncpg.connect(os.getenv('DATABASE_URL'))
    orgs = await conn.fetch('SELECT id, name FROM organizations LIMIT 10')
    print('Organizations:')
    for org in orgs:
        print(f'  - {org["id"]}: {org.get("name", "N/A")}')
    await conn.close()

if __name__ == "__main__":
    asyncio.run(check_orgs()) 