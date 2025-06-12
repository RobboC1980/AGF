import asyncio
import asyncpg
import os
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL')

async def test_connection():
    try:
        conn = await asyncpg.connect(DATABASE_URL)
        result = await conn.fetchval('SELECT 1')
        await conn.close()
        print(f'✅ Database connection successful: {result}')
        return True
    except Exception as e:
        print(f'❌ Database connection failed: {e}')
        return False

if __name__ == "__main__":
    asyncio.run(test_connection()) 