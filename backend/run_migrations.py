#!/usr/bin/env python3
"""
Run database migrations
"""

import asyncio
from dotenv import load_dotenv

# Load environment variables first
load_dotenv()

from database.connection import run_migrations, init_db

async def main():
    """Run migrations"""
    try:
        await init_db()
        await run_migrations()
        print("✅ Database migrations completed successfully!")
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        raise

if __name__ == "__main__":
    asyncio.run(main()) 