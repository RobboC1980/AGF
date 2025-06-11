-- AgileForge Stripe Products & Packages Schema
-- Database tables for managing Stripe products, packages, and purchases

-- Stripe Products table - stores all available packages/products
CREATE TABLE IF NOT EXISTS stripe_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    package_id VARCHAR(100) UNIQUE NOT NULL,
    stripe_product_id VARCHAR(100) UNIQUE,
    stripe_price_id VARCHAR(100),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL, -- subscription, one_time, add_on, credit_pack
    billing_interval VARCHAR(20) NOT NULL, -- month, year, one_time
    price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    currency VARCHAR(3) NOT NULL DEFAULT 'gbp',
    features JSONB,
    feature_list TEXT[],
    trial_days INTEGER DEFAULT 0,
    popular BOOLEAN DEFAULT FALSE,
    active BOOLEAN DEFAULT TRUE,
    requires_subscription BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Checkout Sessions table - tracks Stripe checkout sessions
CREATE TABLE IF NOT EXISTS checkout_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    package_id VARCHAR(100) NOT NULL,
    stripe_session_id VARCHAR(200) UNIQUE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, completed, expired, cancelled
    amount DECIMAL(10,2),
    currency VARCHAR(3) DEFAULT 'gbp',
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE
);

-- User Purchases table - tracks completed purchases
CREATE TABLE IF NOT EXISTS user_purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    package_id VARCHAR(100) NOT NULL,
    stripe_payment_intent_id VARCHAR(200),
    stripe_invoice_id VARCHAR(200),
    purchase_type VARCHAR(50) NOT NULL, -- subscription, one_time, add_on, credit_pack
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'gbp',
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, completed, failed, refunded
    credits_granted INTEGER DEFAULT 0,
    credits_used INTEGER DEFAULT 0,
    expires_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Credits table - tracks credit balances and usage
CREATE TABLE IF NOT EXISTS user_credits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    credit_type VARCHAR(50) NOT NULL, -- ai_stories, storage, integrations
    total_credits INTEGER NOT NULL DEFAULT 0,
    used_credits INTEGER NOT NULL DEFAULT 0,
    remaining_credits INTEGER GENERATED ALWAYS AS (total_credits - used_credits) STORED,
    expires_at TIMESTAMP WITH TIME ZONE,
    source_purchase_id UUID REFERENCES user_purchases(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, credit_type, source_purchase_id)
);

-- Credit Usage Log table - detailed tracking of credit usage
CREATE TABLE IF NOT EXISTS credit_usage_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    credit_id UUID NOT NULL REFERENCES user_credits(id) ON DELETE CASCADE,
    credit_type VARCHAR(50) NOT NULL,
    credits_used INTEGER NOT NULL,
    resource_id UUID, -- ID of the resource that consumed credits (story, project, etc.)
    resource_type VARCHAR(50), -- story, project, integration, etc.
    description TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Subscription Add-ons table - tracks add-ons attached to subscriptions
CREATE TABLE IF NOT EXISTS subscription_addons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID NOT NULL REFERENCES user_subscriptions(id) ON DELETE CASCADE,
    package_id VARCHAR(100) NOT NULL,
    stripe_subscription_item_id VARCHAR(200),
    status VARCHAR(50) NOT NULL DEFAULT 'active', -- active, cancelled, paused
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'gbp',
    features JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    cancelled_at TIMESTAMP WITH TIME ZONE
);

-- Package Analytics table - tracks package performance
CREATE TABLE IF NOT EXISTS package_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    package_id VARCHAR(100) NOT NULL,
    date DATE NOT NULL,
    views INTEGER DEFAULT 0,
    checkout_starts INTEGER DEFAULT 0,
    purchases INTEGER DEFAULT 0,
    revenue DECIMAL(10,2) DEFAULT 0.00,
    refunds INTEGER DEFAULT 0,
    refund_amount DECIMAL(10,2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(package_id, date)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_stripe_products_package_id ON stripe_products(package_id);
CREATE INDEX IF NOT EXISTS idx_stripe_products_type ON stripe_products(type);
CREATE INDEX IF NOT EXISTS idx_stripe_products_active ON stripe_products(active);

CREATE INDEX IF NOT EXISTS idx_checkout_sessions_user_id ON checkout_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_checkout_sessions_status ON checkout_sessions(status);
CREATE INDEX IF NOT EXISTS idx_checkout_sessions_stripe_session_id ON checkout_sessions(stripe_session_id);

CREATE INDEX IF NOT EXISTS idx_user_purchases_user_id ON user_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_user_purchases_package_id ON user_purchases(package_id);
CREATE INDEX IF NOT EXISTS idx_user_purchases_status ON user_purchases(status);
CREATE INDEX IF NOT EXISTS idx_user_purchases_created_at ON user_purchases(created_at);

CREATE INDEX IF NOT EXISTS idx_user_credits_user_id ON user_credits(user_id);
CREATE INDEX IF NOT EXISTS idx_user_credits_credit_type ON user_credits(credit_type);
CREATE INDEX IF NOT EXISTS idx_user_credits_expires_at ON user_credits(expires_at);

CREATE INDEX IF NOT EXISTS idx_credit_usage_log_user_id ON credit_usage_log(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_usage_log_credit_id ON credit_usage_log(credit_id);
CREATE INDEX IF NOT EXISTS idx_credit_usage_log_created_at ON credit_usage_log(created_at);

CREATE INDEX IF NOT EXISTS idx_subscription_addons_subscription_id ON subscription_addons(subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_addons_package_id ON subscription_addons(package_id);

CREATE INDEX IF NOT EXISTS idx_package_analytics_package_id ON package_analytics(package_id);
CREATE INDEX IF NOT EXISTS idx_package_analytics_date ON package_analytics(date);

-- Functions for credit management
CREATE OR REPLACE FUNCTION update_user_credits_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_credits_timestamp
    BEFORE UPDATE ON user_credits
    FOR EACH ROW
    EXECUTE FUNCTION update_user_credits_timestamp();

-- Function to automatically log credit usage
CREATE OR REPLACE FUNCTION log_credit_usage()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.used_credits > OLD.used_credits THEN
        INSERT INTO credit_usage_log (
            user_id, credit_id, credit_type, credits_used, description
        ) VALUES (
            NEW.user_id, 
            NEW.id, 
            NEW.credit_type, 
            NEW.used_credits - OLD.used_credits,
            'Automatic usage tracking'
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_log_credit_usage
    AFTER UPDATE ON user_credits
    FOR EACH ROW
    EXECUTE FUNCTION log_credit_usage();

-- Views for easy querying
CREATE OR REPLACE VIEW user_credit_summary AS
SELECT 
    uc.user_id,
    uc.credit_type,
    SUM(uc.total_credits) as total_credits,
    SUM(uc.used_credits) as used_credits,
    SUM(uc.remaining_credits) as remaining_credits,
    MIN(uc.expires_at) as earliest_expiry,
    COUNT(*) as credit_sources
FROM user_credits uc
WHERE uc.expires_at IS NULL OR uc.expires_at > NOW()
GROUP BY uc.user_id, uc.credit_type;

CREATE OR REPLACE VIEW package_performance AS
SELECT 
    sp.package_id,
    sp.name,
    sp.type,
    sp.price,
    COUNT(up.id) as total_purchases,
    SUM(up.amount) as total_revenue,
    AVG(up.amount) as avg_purchase_value,
    COUNT(CASE WHEN up.created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as purchases_last_30_days,
    SUM(CASE WHEN up.created_at >= NOW() - INTERVAL '30 days' THEN up.amount ELSE 0 END) as revenue_last_30_days
FROM stripe_products sp
LEFT JOIN user_purchases up ON sp.package_id = up.package_id AND up.status = 'completed'
WHERE sp.active = true
GROUP BY sp.package_id, sp.name, sp.type, sp.price
ORDER BY total_revenue DESC; 