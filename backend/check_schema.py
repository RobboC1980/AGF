import asyncio
from database.connection import db_manager, init_db

async def check_schema():
    await init_db()
    async with db_manager.get_connection() as conn:
        # Check users table schema
        users_schema = await conn.fetch("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users' ORDER BY ordinal_position")
        print('Users table schema:')
        for col in users_schema:
            print(f'  {col["column_name"]}: {col["data_type"]}')
        
        # Check other table schemas
        for table in ['projects', 'epics', 'stories', 'tasks']:
            schema = await conn.fetch(f"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = '{table}' ORDER BY ordinal_position")
            print(f'\n{table.capitalize()} table schema:')
            for col in schema:
                print(f'  {col["column_name"]}: {col["data_type"]}')

if __name__ == "__main__":
    asyncio.run(check_schema()) 