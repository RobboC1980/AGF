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
    # Skip migrations since auth schema is already deployed
    logger.info("Database connection initialized - auth schema already deployed")

async def close_db():
    """Close database connection"""
    await db_manager.close_pool()

async def get_db_connection():
    """Dependency to get database connection"""
    async with db_manager.get_connection() as conn:
        yield conn

async def get_db_session():
    """Dependency to get database session (alias for connection)"""
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
                    password_hash VARCHAR(255),
                    avatar_url TEXT,
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW()
                );

                CREATE TABLE IF NOT EXISTS password_reset_tokens (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                    token VARCHAR(255) UNIQUE NOT NULL,
                    expires_at TIMESTAMP NOT NULL,
                    created_at TIMESTAMP DEFAULT NOW(),
                    UNIQUE(user_id)
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
                CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);
                CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at);
            """)
            
            # Run billing table migrations
            await run_billing_migrations(conn)
            
            logger.info("Database migrations completed successfully")
            
    except Exception as e:
        logger.error(f"Migration failed: {e}")
        raise

async def run_billing_migrations(conn):
    """Run billing and subscription table migrations"""
    try:
        await conn.execute("""
            -- Subscription Plans
            CREATE TABLE IF NOT EXISTS subscription_plans (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name VARCHAR(100) NOT NULL,
                plan_type VARCHAR(20) NOT NULL,
                price_monthly DECIMAL(10,2) NOT NULL DEFAULT 0,
                price_annual DECIMAL(10,2) NOT NULL DEFAULT 0,
                currency VARCHAR(3) DEFAULT 'GBP',
                stripe_price_id_monthly VARCHAR(100),
                stripe_price_id_annual VARCHAR(100),
                stripe_product_id VARCHAR(100),
                max_team_members INTEGER DEFAULT 3,
                max_projects INTEGER DEFAULT 5,
                ai_stories_monthly INTEGER DEFAULT 25,
                max_storage_gb INTEGER DEFAULT 1,
                advanced_ai_features BOOLEAN DEFAULT FALSE,
                priority_support BOOLEAN DEFAULT FALSE,
                custom_integrations BOOLEAN DEFAULT FALSE,
                advanced_analytics BOOLEAN DEFAULT FALSE,
                sso_enabled BOOLEAN DEFAULT FALSE,
                api_access BOOLEAN DEFAULT FALSE,
                custom_branding BOOLEAN DEFAULT FALSE,
                description TEXT,
                features_list JSONB,
                is_active BOOLEAN DEFAULT TRUE,
                is_featured BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );

            -- User Subscriptions
            CREATE TABLE IF NOT EXISTS user_subscriptions (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                plan_id UUID REFERENCES subscription_plans(id),
                stripe_subscription_id VARCHAR(100) UNIQUE,
                stripe_customer_id VARCHAR(100) NOT NULL,
                status VARCHAR(30) NOT NULL,
                billing_cycle VARCHAR(20) NOT NULL,
                start_date TIMESTAMP NOT NULL,
                end_date TIMESTAMP,
                trial_end TIMESTAMP,
                current_period_start TIMESTAMP,
                current_period_end TIMESTAMP,
                amount DECIMAL(10,2) NOT NULL,
                currency VARCHAR(3) DEFAULT 'GBP',
                cancel_at_period_end BOOLEAN DEFAULT FALSE,
                canceled_at TIMESTAMP,
                cancellation_reason TEXT,
                metadata JSONB,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );

            -- Usage Records
            CREATE TABLE IF NOT EXISTS usage_records (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                subscription_id UUID REFERENCES user_subscriptions(id),
                usage_type VARCHAR(50) NOT NULL,
                quantity INTEGER NOT NULL DEFAULT 1,
                unit_cost DECIMAL(8,5) DEFAULT 0,
                total_cost DECIMAL(10,2) DEFAULT 0,
                period_start TIMESTAMP NOT NULL,
                period_end TIMESTAMP NOT NULL,
                recorded_at TIMESTAMP DEFAULT NOW(),
                resource_id UUID,
                metadata JSONB
            );

            -- Usage Limits
            CREATE TABLE IF NOT EXISTS usage_limits (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                usage_type VARCHAR(50) NOT NULL,
                monthly_limit INTEGER NOT NULL,
                current_usage INTEGER DEFAULT 0,
                period_start TIMESTAMP NOT NULL,
                period_end TIMESTAMP NOT NULL,
                overage_allowed BOOLEAN DEFAULT TRUE,
                overage_rate DECIMAL(8,5) DEFAULT 0,
                overage_usage INTEGER DEFAULT 0,
                overage_cost DECIMAL(10,2) DEFAULT 0,
                warning_sent_75 BOOLEAN DEFAULT FALSE,
                warning_sent_90 BOOLEAN DEFAULT FALSE,
                limit_reached_notification BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW(),
                UNIQUE(user_id, usage_type, period_start)
            );

            -- Invoices
            CREATE TABLE IF NOT EXISTS invoices (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                subscription_id UUID REFERENCES user_subscriptions(id),
                stripe_invoice_id VARCHAR(100) UNIQUE,
                stripe_payment_intent_id VARCHAR(100),
                invoice_number VARCHAR(50) UNIQUE NOT NULL,
                status VARCHAR(30) NOT NULL,
                subtotal DECIMAL(10,2) NOT NULL,
                tax_amount DECIMAL(10,2) DEFAULT 0,
                discount_amount DECIMAL(10,2) DEFAULT 0,
                total_amount DECIMAL(10,2) NOT NULL,
                currency VARCHAR(3) DEFAULT 'GBP',
                invoice_date TIMESTAMP NOT NULL,
                due_date TIMESTAMP NOT NULL,
                paid_at TIMESTAMP,
                description TEXT,
                notes TEXT,
                metadata JSONB,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );

            -- Invoice Line Items
            CREATE TABLE IF NOT EXISTS invoice_line_items (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
                description VARCHAR(500) NOT NULL,
                quantity INTEGER NOT NULL DEFAULT 1,
                unit_price DECIMAL(10,2) NOT NULL,
                total_price DECIMAL(10,2) NOT NULL,
                item_type VARCHAR(50),
                usage_type VARCHAR(50),
                period_start TIMESTAMP,
                period_end TIMESTAMP,
                metadata JSONB
            );

            -- Payments
            CREATE TABLE IF NOT EXISTS payments (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                invoice_id UUID REFERENCES invoices(id),
                stripe_payment_intent_id VARCHAR(100) UNIQUE,
                stripe_charge_id VARCHAR(100),
                amount DECIMAL(10,2) NOT NULL,
                currency VARCHAR(3) DEFAULT 'GBP',
                status VARCHAR(30) NOT NULL,
                payment_method_type VARCHAR(50),
                last_four_digits VARCHAR(4),
                card_brand VARCHAR(20),
                processed_at TIMESTAMP,
                failed_at TIMESTAMP,
                refunded_at TIMESTAMP,
                failure_reason TEXT,
                receipt_url VARCHAR(500),
                metadata JSONB,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );

            -- Revenue Analytics
            CREATE TABLE IF NOT EXISTS revenue_analytics (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                period_start TIMESTAMP NOT NULL,
                period_end TIMESTAMP NOT NULL,
                period_type VARCHAR(20) NOT NULL,
                total_revenue DECIMAL(12,2) DEFAULT 0,
                subscription_revenue DECIMAL(12,2) DEFAULT 0,
                overage_revenue DECIMAL(12,2) DEFAULT 0,
                one_time_revenue DECIMAL(12,2) DEFAULT 0,
                new_subscriptions INTEGER DEFAULT 0,
                canceled_subscriptions INTEGER DEFAULT 0,
                active_subscriptions INTEGER DEFAULT 0,
                free_users INTEGER DEFAULT 0,
                professional_users INTEGER DEFAULT 0,
                business_users INTEGER DEFAULT 0,
                enterprise_users INTEGER DEFAULT 0,
                total_ai_stories_generated INTEGER DEFAULT 0,
                average_usage_per_user DECIMAL(8,2) DEFAULT 0,
                trial_conversions INTEGER DEFAULT 0,
                upgrade_conversions INTEGER DEFAULT 0,
                churn_rate DECIMAL(5,4) DEFAULT 0,
                created_at TIMESTAMP DEFAULT NOW(),
                UNIQUE(period_start, period_type)
            );

            -- Coupons
            CREATE TABLE IF NOT EXISTS coupons (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                code VARCHAR(50) UNIQUE NOT NULL,
                stripe_coupon_id VARCHAR(100),
                discount_type VARCHAR(20) NOT NULL,
                discount_value DECIMAL(10,2) NOT NULL,
                currency VARCHAR(3) DEFAULT 'GBP',
                max_redemptions INTEGER,
                redemptions_count INTEGER DEFAULT 0,
                valid_from TIMESTAMP NOT NULL,
                valid_until TIMESTAMP,
                applicable_plans JSONB,
                name VARCHAR(200),
                description TEXT,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT NOW(),
                created_by UUID REFERENCES users(id)
            );

            -- Coupon Redemptions
            CREATE TABLE IF NOT EXISTS coupon_redemptions (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                coupon_id UUID REFERENCES coupons(id) ON DELETE CASCADE,
                user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                subscription_id UUID REFERENCES user_subscriptions(id),
                discount_amount DECIMAL(10,2) NOT NULL,
                redeemed_at TIMESTAMP DEFAULT NOW(),
                UNIQUE(coupon_id, user_id)
            );

            -- Create billing indexes
            CREATE INDEX IF NOT EXISTS idx_user_subscription_status ON user_subscriptions(user_id, status);
            CREATE INDEX IF NOT EXISTS idx_stripe_subscription_id ON user_subscriptions(stripe_subscription_id);
            CREATE INDEX IF NOT EXISTS idx_usage_user_type_period ON usage_records(user_id, usage_type, period_start);
            CREATE INDEX IF NOT EXISTS idx_usage_subscription_period ON usage_records(subscription_id, period_start);
            CREATE INDEX IF NOT EXISTS idx_usage_limit_user_type ON usage_limits(user_id, usage_type);
            CREATE INDEX IF NOT EXISTS idx_invoice_user_status ON invoices(user_id, status);
            CREATE INDEX IF NOT EXISTS idx_invoice_date ON invoices(invoice_date);
            CREATE INDEX IF NOT EXISTS idx_payment_user_status ON payments(user_id, status);
            CREATE INDEX IF NOT EXISTS idx_payment_stripe_intent ON payments(stripe_payment_intent_id);
            CREATE INDEX IF NOT EXISTS idx_analytics_period ON revenue_analytics(period_start, period_type);
        """)
        
        logger.info("Billing migrations completed successfully")
        
    except Exception as e:
        logger.error(f"Billing migration failed: {e}")
        raise
