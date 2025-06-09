import os
import asyncpg
import logging
from typing import Optional
from contextlib import asynccontextmanager

logger = logging.getLogger(__name__)

class DatabaseManager:
    def __init__(self):
        self.pool: Optional[asyncpg.Pool] = None
        self.database_url = os.getenv("DATABASE_URL")
        
        if not self.database_url:
            raise ValueError("DATABASE_URL environment variable is required")
    
    async def init_pool(self):
        """Initialize the connection pool"""
        try:
            # Parse the database URL for Render PostgreSQL
            self.pool = await asyncpg.create_pool(
                self.database_url,
                min_size=1,
                max_size=10,
                command_timeout=60,
                server_settings={
                    'jit': 'off'  # Disable JIT for better compatibility
                }
            )
            logger.info("Database connection pool initialized")
            
            # Test the connection
            async with self.pool.acquire() as conn:
                await conn.execute("SELECT 1")
                logger.info("Database connection test successful")
                
        except Exception as e:
            logger.error(f"Failed to initialize database pool: {e}")
            raise
    
    async def close_pool(self):
        """Close the connection pool"""
        if self.pool:
            await self.pool.close()
            logger.info("Database connection pool closed")
    
    @asynccontextmanager
    async def get_connection(self):
        """Get a database connection from the pool"""
        if not self.pool:
            raise RuntimeError("Database pool not initialized")
        
        async with self.pool.acquire() as connection:
            yield connection

# Global database manager instance
db_manager = DatabaseManager()

async def init_db():
    """Initialize database connection"""
    await db_manager.init_pool()
    await run_migrations()

async def close_db():
    """Close database connection"""
    await db_manager.close_pool()

async def get_db_connection():
    """Dependency to get database connection"""
    async with db_manager.get_connection() as conn:
        yield conn

async def run_migrations():
    """Run database migrations"""
    try:
        async with db_manager.get_connection() as conn:
            # Create tables if they don't exist
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    email VARCHAR(255) UNIQUE NOT NULL,
                    name VARCHAR(255) NOT NULL,
                    avatar_url TEXT,
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW()
                );
                
                CREATE TABLE IF NOT EXISTS projects (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    name VARCHAR(255) NOT NULL,
                    description TEXT,
                    status VARCHAR(50) DEFAULT 'active',
                    created_by UUID REFERENCES users(id),
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW()
                );
                
                CREATE TABLE IF NOT EXISTS epics (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    name VARCHAR(255) NOT NULL,
                    description TEXT,
                    project_id UUID REFERENCES projects(id),
                    color VARCHAR(7) DEFAULT '#3B82F6',
                    status VARCHAR(50) DEFAULT 'active',
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW()
                );
                
                CREATE TABLE IF NOT EXISTS stories (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    name VARCHAR(255) NOT NULL,
                    description TEXT,
                    acceptance_criteria TEXT,
                    story_points INTEGER,
                    priority VARCHAR(20) DEFAULT 'medium',
                    status VARCHAR(50) DEFAULT 'backlog',
                    epic_id UUID REFERENCES epics(id),
                    assignee_id UUID REFERENCES users(id),
                    tags TEXT[],
                    due_date TIMESTAMP,
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW()
                );
                
                CREATE TABLE IF NOT EXISTS sprints (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    name VARCHAR(255) NOT NULL,
                    project_id UUID REFERENCES projects(id),
                    start_date DATE,
                    end_date DATE,
                    goal TEXT,
                    status VARCHAR(50) DEFAULT 'planning',
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW()
                );
                
                CREATE TABLE IF NOT EXISTS tasks (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    title VARCHAR(255) NOT NULL,
                    description TEXT,
                    story_id UUID REFERENCES stories(id),
                    assignee_id UUID REFERENCES users(id),
                    status VARCHAR(50) DEFAULT 'todo',
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW()
                );
                
                -- Create indexes for better performance
                CREATE INDEX IF NOT EXISTS idx_stories_epic_id ON stories(epic_id);
                CREATE INDEX IF NOT EXISTS idx_stories_assignee_id ON stories(assignee_id);
                CREATE INDEX IF NOT EXISTS idx_stories_status ON stories(status);
                CREATE INDEX IF NOT EXISTS idx_tasks_story_id ON tasks(story_id);
                CREATE INDEX IF NOT EXISTS idx_epics_project_id ON epics(project_id);
            """)
            
            logger.info("Database migrations completed successfully")
            
    except Exception as e:
        logger.error(f"Migration failed: {e}")
        raise
