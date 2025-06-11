"""
AgileForge Billing Service
Complete Stripe integration for subscription management, payments, and usage tracking
"""

import os
import stripe
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from decimal import Decimal
import uuid
from enum import Enum

from ..database.connection import get_db_connection

logger = logging.getLogger(__name__)

# Configure Stripe
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

class BillingService:
    def __init__(self):
        self.stripe_api_key = os.getenv("STRIPE_SECRET_KEY")
        self.webhook_secret = os.getenv("STRIPE_WEBHOOK_SECRET")
        
        if not self.stripe_api_key:
            logger.warning("STRIPE_SECRET_KEY not configured")
        
        # Plan configurations based on the strategy
        self.plan_configs = {
            "free": {
                "name": "Starter Team",
                "price_monthly": 0.00,
                "price_annual": 0.00,
                "max_team_members": 3,
                "ai_stories_monthly": 25,
                "features": [
                    "Up to 3 team members",
                    "25 AI-generated stories monthly", 
                    "Basic kanban boards",
                    "Simple sprint planning",
                    "Community support",
                    "Mobile app access"
                ]
            },
            "professional": {
                "name": "Growing Teams",
                "price_monthly": 10.00,
                "price_annual": 100.00,  # 2 months free
                "max_team_members": -1,  # unlimited
                "ai_stories_monthly": 200,
                "features": [
                    "Unlimited team members",
                    "200 AI-generated stories monthly per user",
                    "Advanced AI story generation",
                    "Comprehensive sprint planning",
                    "Slack, Teams, GitHub integrations",
                    "Custom fields and workflow automation",
                    "Email support (24h response)",
                    "Advanced reporting"
                ]
            },
            "business": {
                "name": "Scale & Insights",
                "price_monthly": 18.00,
                "price_annual": 180.00,  # 2 months free
                "max_team_members": -1,  # unlimited
                "ai_stories_monthly": -1,  # unlimited
                "features": [
                    "Everything in Professional",
                    "Unlimited AI story generation",
                    "AI-powered project insights",
                    "Custom dashboards",
                    "Priority support",
                    "SSO and advanced security",
                    "API access",
                    "Guest access for stakeholders"
                ]
            },
            "enterprise": {
                "name": "Custom Solutions",
                "price_monthly": 0.00,  # Custom pricing
                "price_annual": 0.00,   # Custom pricing
                "max_team_members": -1,
                "ai_stories_monthly": -1,
                "features": [
                    "Everything in Business",
                    "Custom AI model training",
                    "Advanced compliance (GDPR, SOC 2)",
                    "Dedicated infrastructure",
                    "Professional services",
                    "Volume discounts",
                    "Flexible billing"
                ]
            }
        }
    
    async def initialize_plans(self):
        """Initialize subscription plans in Stripe and database"""
        try:
            async with get_db_connection() as conn:
                for plan_type, config in self.plan_configs.items():
                    if plan_type == "enterprise":
                        continue  # Skip enterprise - custom pricing
                    
                    # Check if plan exists in database
                    existing_plan = await conn.fetchrow(
                        "SELECT * FROM subscription_plans WHERE plan_type = $1",
                        plan_type
                    )
                    
                    if existing_plan:
                        logger.info(f"Plan {plan_type} already exists")
                        continue
                    
                    # Create Stripe product and prices
                    stripe_product = None
                    stripe_price_monthly = None
                    stripe_price_annual = None
                    
                    if self.stripe_api_key and config["price_monthly"] > 0:
                        try:
                            # Create Stripe product
                            stripe_product = stripe.Product.create(
                                name=config["name"],
                                description=f"AgileForge {config['name']} Plan"
                            )
                            
                            # Create monthly price
                            if config["price_monthly"] > 0:
                                stripe_price_monthly = stripe.Price.create(
                                    product=stripe_product.id,
                                    unit_amount=int(config["price_monthly"] * 100),  # Convert to pence
                                    currency="gbp",
                                    recurring={"interval": "month"}
                                )
                            
                            # Create annual price
                            if config["price_annual"] > 0:
                                stripe_price_annual = stripe.Price.create(
                                    product=stripe_product.id,
                                    unit_amount=int(config["price_annual"] * 100),  # Convert to pence
                                    currency="gbp",
                                    recurring={"interval": "year"}
                                )
                            
                            logger.info(f"Created Stripe product and prices for {plan_type}")
                            
                        except Exception as e:
                            logger.error(f"Failed to create Stripe product for {plan_type}: {e}")
                    
                    # Create plan in database
                    plan_id = str(uuid.uuid4())
                    await conn.execute("""
                        INSERT INTO subscription_plans (
                            id, name, plan_type, price_monthly, price_annual,
                            stripe_product_id, stripe_price_id_monthly, stripe_price_id_annual,
                            max_team_members, ai_stories_monthly, features_list,
                            advanced_ai_features, priority_support, custom_integrations,
                            advanced_analytics, api_access, sso_enabled
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
                    """, 
                        plan_id, config["name"], plan_type,
                        config["price_monthly"], config["price_annual"],
                        stripe_product.id if stripe_product else None,
                        stripe_price_monthly.id if stripe_price_monthly else None,
                        stripe_price_annual.id if stripe_price_annual else None,
                        config["max_team_members"], config["ai_stories_monthly"],
                        config["features"],
                        plan_type in ["business", "enterprise"],  # advanced_ai_features
                        plan_type in ["professional", "business", "enterprise"],  # priority_support
                        plan_type in ["business", "enterprise"],  # custom_integrations
                        plan_type in ["professional", "business", "enterprise"],  # advanced_analytics
                        plan_type in ["business", "enterprise"],  # api_access
                        plan_type in ["business", "enterprise"]   # sso_enabled
                    )
                    
                    logger.info(f"Created {plan_type} plan in database")
            
            logger.info("All subscription plans initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize plans: {e}")
            raise
    
    async def create_customer(self, user_id: str, email: str, name: str) -> str:
        """Create a Stripe customer"""
        try:
            if not self.stripe_api_key:
                return f"cus_local_{user_id}"  # Local customer ID for development
            
            customer = stripe.Customer.create(
                email=email,
                name=name,
                metadata={"user_id": user_id}
            )
            
            logger.info(f"Created Stripe customer {customer.id} for user {user_id}")
            return customer.id
            
        except Exception as e:
            logger.error(f"Failed to create Stripe customer for user {user_id}: {e}")
            raise
    
    async def create_subscription(
        self, 
        user_id: str, 
        plan_type: str, 
        billing_cycle: str = "monthly",
        trial_days: int = 14
    ) -> Dict[str, Any]:
        """Create a new subscription"""
        try:
            async with get_db_connection() as conn:
                # Get user details
                user = await conn.fetchrow(
                    "SELECT * FROM users WHERE id = $1", user_id
                )
                if not user:
                    raise ValueError("User not found")
                
                # Get plan details
                plan = await conn.fetchrow(
                    "SELECT * FROM subscription_plans WHERE plan_type = $1", plan_type
                )
                if not plan:
                    raise ValueError("Plan not found")
                
                # Check if user already has an active subscription
                existing_sub = await conn.fetchrow("""
                    SELECT * FROM user_subscriptions 
                    WHERE user_id = $1 AND status IN ('active', 'trialing')
                """, user_id)
                
                if existing_sub:
                    raise ValueError("User already has an active subscription")
                
                # Create or get Stripe customer
                customer_id = await self.create_customer(
                    user_id, user['email'], user['name']
                )
                
                # Create subscription
                subscription_id = str(uuid.uuid4())
                start_date = datetime.utcnow()
                trial_end = start_date + timedelta(days=trial_days) if trial_days > 0 else None
                
                stripe_subscription = None
                if self.stripe_api_key and plan['price_monthly'] > 0:
                    try:
                        price_id = (plan['stripe_price_id_annual'] if billing_cycle == "annual" 
                                  else plan['stripe_price_id_monthly'])
                        
                        stripe_subscription = stripe.Subscription.create(
                            customer=customer_id,
                            items=[{"price": price_id}],
                            trial_period_days=trial_days if trial_days > 0 else None,
                            metadata={"user_id": user_id, "subscription_id": subscription_id}
                        )
                        
                        logger.info(f"Created Stripe subscription {stripe_subscription.id}")
                        
                    except Exception as e:
                        logger.error(f"Failed to create Stripe subscription: {e}")
                        # Continue with local subscription for development
                
                # Create subscription in database
                amount = (plan['price_annual'] if billing_cycle == "annual" 
                         else plan['price_monthly'])
                
                await conn.execute("""
                    INSERT INTO user_subscriptions (
                        id, user_id, plan_id, stripe_subscription_id, stripe_customer_id,
                        status, billing_cycle, start_date, trial_end, amount, currency
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                """, 
                    subscription_id, user_id, plan['id'],
                    stripe_subscription.id if stripe_subscription else None,
                    customer_id, "trialing" if trial_days > 0 else "active",
                    billing_cycle, start_date, trial_end, amount, "GBP"
                )
                
                # Initialize usage limits
                await self.initialize_usage_limits(user_id, plan['ai_stories_monthly'])
                
                logger.info(f"Created subscription {subscription_id} for user {user_id}")
                
                return {
                    "subscription_id": subscription_id,
                    "status": "trialing" if trial_days > 0 else "active",
                    "trial_end": trial_end.isoformat() if trial_end else None,
                    "plan": plan_type,
                    "billing_cycle": billing_cycle,
                    "amount": float(amount)
                }
                
        except Exception as e:
            logger.error(f"Failed to create subscription: {e}")
            raise
    
    async def initialize_usage_limits(self, user_id: str, ai_stories_limit: int):
        """Initialize monthly usage limits for a user"""
        try:
            async with get_db_connection() as conn:
                now = datetime.utcnow()
                period_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
                period_end = (period_start + timedelta(days=32)).replace(day=1) - timedelta(seconds=1)
                
                # Create AI story usage limit
                await conn.execute("""
                    INSERT INTO usage_limits (
                        id, user_id, usage_type, monthly_limit, current_usage,
                        period_start, period_end, overage_allowed, overage_rate
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                    ON CONFLICT (user_id, usage_type, period_start) 
                    DO UPDATE SET monthly_limit = $4
                """, 
                    str(uuid.uuid4()), user_id, "ai_story_generation", 
                    ai_stories_limit, 0, period_start, period_end, 
                    True, 0.05  # £0.05 per overage story
                )
                
                logger.info(f"Initialized usage limits for user {user_id}")
                
        except Exception as e:
            logger.error(f"Failed to initialize usage limits: {e}")
            raise
    
    async def track_usage(
        self, 
        user_id: str, 
        usage_type: str, 
        quantity: int = 1,
        resource_id: Optional[str] = None,
        metadata: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """Track usage and check limits"""
        try:
            async with get_db_connection() as conn:
                now = datetime.utcnow()
                period_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
                
                # Get current usage limit
                usage_limit = await conn.fetchrow("""
                    SELECT * FROM usage_limits 
                    WHERE user_id = $1 AND usage_type = $2 AND period_start = $3
                """, user_id, usage_type, period_start)
                
                if not usage_limit:
                    # Initialize default limits if not found
                    await self.initialize_usage_limits(user_id, 25)  # Default to free plan
                    usage_limit = await conn.fetchrow("""
                        SELECT * FROM usage_limits 
                        WHERE user_id = $1 AND usage_type = $2 AND period_start = $3
                    """, user_id, usage_type, period_start)
                
                new_usage = usage_limit['current_usage'] + quantity
                overage = 0
                overage_cost = 0
                
                # Check for overage
                if usage_limit['monthly_limit'] > 0 and new_usage > usage_limit['monthly_limit']:
                    overage = new_usage - usage_limit['monthly_limit']
                    overage_cost = overage * float(usage_limit['overage_rate'])
                
                # Update usage
                await conn.execute("""
                    UPDATE usage_limits 
                    SET current_usage = $1, overage_usage = $2, overage_cost = $3,
                        updated_at = $4
                    WHERE id = $5
                """, new_usage, overage, overage_cost, now, usage_limit['id'])
                
                # Record usage
                subscription = await conn.fetchrow("""
                    SELECT * FROM user_subscriptions 
                    WHERE user_id = $1 AND status IN ('active', 'trialing')
                    ORDER BY created_at DESC LIMIT 1
                """, user_id)
                
                if subscription:
                    await conn.execute("""
                        INSERT INTO usage_records (
                            id, user_id, subscription_id, usage_type, quantity,
                            unit_cost, total_cost, period_start, period_end,
                            resource_id, metadata
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                    """, 
                        str(uuid.uuid4()), user_id, subscription['id'], 
                        usage_type, quantity, usage_limit['overage_rate'], 
                        overage_cost, period_start, usage_limit['period_end'],
                        resource_id, metadata
                    )
                
                # Send warnings if approaching limits
                await self.check_usage_warnings(user_id, usage_limit['id'], new_usage, usage_limit['monthly_limit'])
                
                return {
                    "success": True,
                    "current_usage": new_usage,
                    "limit": usage_limit['monthly_limit'],
                    "overage": overage,
                    "overage_cost": overage_cost,
                    "within_limit": usage_limit['monthly_limit'] < 0 or new_usage <= usage_limit['monthly_limit']
                }
                
        except Exception as e:
            logger.error(f"Failed to track usage: {e}")
            raise
    
    async def check_usage_warnings(self, user_id: str, limit_id: str, current_usage: int, monthly_limit: int):
        """Check and send usage warnings"""
        if monthly_limit <= 0:  # Unlimited
            return
        
        try:
            async with get_db_connection() as conn:
                percentage = (current_usage / monthly_limit) * 100
                
                # 75% warning
                if percentage >= 75 and not await self.warning_sent(limit_id, "warning_sent_75"):
                    await self.send_usage_warning(user_id, "75%", current_usage, monthly_limit)
                    await conn.execute(
                        "UPDATE usage_limits SET warning_sent_75 = TRUE WHERE id = $1", 
                        limit_id
                    )
                
                # 90% warning
                if percentage >= 90 and not await self.warning_sent(limit_id, "warning_sent_90"):
                    await self.send_usage_warning(user_id, "90%", current_usage, monthly_limit)
                    await conn.execute(
                        "UPDATE usage_limits SET warning_sent_90 = TRUE WHERE id = $1", 
                        limit_id
                    )
                
                # Limit reached
                if current_usage >= monthly_limit and not await self.warning_sent(limit_id, "limit_reached_notification"):
                    await self.send_limit_reached_notification(user_id, current_usage, monthly_limit)
                    await conn.execute(
                        "UPDATE usage_limits SET limit_reached_notification = TRUE WHERE id = $1", 
                        limit_id
                    )
                    
        except Exception as e:
            logger.error(f"Failed to check usage warnings: {e}")
    
    async def warning_sent(self, limit_id: str, warning_type: str) -> bool:
        """Check if warning was already sent"""
        try:
            async with get_db_connection() as conn:
                result = await conn.fetchval(
                    f"SELECT {warning_type} FROM usage_limits WHERE id = $1", 
                    limit_id
                )
                return result or False
        except:
            return False
    
    async def send_usage_warning(self, user_id: str, percentage: str, current: int, limit: int):
        """Send usage warning notification"""
        # In production, this would send email/in-app notifications
        logger.info(f"Usage warning for user {user_id}: {percentage} ({current}/{limit})")
    
    async def send_limit_reached_notification(self, user_id: str, current: int, limit: int):
        """Send limit reached notification"""
        # In production, this would send email/in-app notifications
        logger.info(f"Usage limit reached for user {user_id}: {current}/{limit}")
    
    async def get_user_usage(self, user_id: str) -> Dict[str, Any]:
        """Get current usage for a user"""
        try:
            async with get_db_connection() as conn:
                now = datetime.utcnow()
                period_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
                
                usage_limits = await conn.fetch("""
                    SELECT * FROM usage_limits 
                    WHERE user_id = $1 AND period_start = $2
                """, user_id, period_start)
                
                result = {}
                for limit in usage_limits:
                    result[limit['usage_type']] = {
                        "current_usage": limit['current_usage'],
                        "monthly_limit": limit['monthly_limit'],
                        "overage_usage": limit['overage_usage'],
                        "overage_cost": float(limit['overage_cost']),
                        "percentage_used": (
                            (limit['current_usage'] / limit['monthly_limit']) * 100
                            if limit['monthly_limit'] > 0 else 0
                        )
                    }
                
                return result
                
        except Exception as e:
            logger.error(f"Failed to get user usage: {e}")
            return {}
    
    async def get_user_subscription(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user's current subscription"""
        try:
            async with get_db_connection() as conn:
                subscription = await conn.fetchrow("""
                    SELECT s.*, p.name as plan_name, p.plan_type, p.features_list
                    FROM user_subscriptions s
                    JOIN subscription_plans p ON s.plan_id = p.id
                    WHERE s.user_id = $1 AND s.status IN ('active', 'trialing', 'past_due')
                    ORDER BY s.created_at DESC LIMIT 1
                """, user_id)
                
                if not subscription:
                    return None
                
                return {
                    "id": subscription['id'],
                    "plan_type": subscription['plan_type'],
                    "plan_name": subscription['plan_name'],
                    "status": subscription['status'],
                    "billing_cycle": subscription['billing_cycle'],
                    "amount": float(subscription['amount']),
                    "trial_end": subscription['trial_end'].isoformat() if subscription['trial_end'] else None,
                    "features": subscription['features_list']
                }
                
        except Exception as e:
            logger.error(f"Failed to get user subscription: {e}")
            return None
    
    async def handle_stripe_webhook(self, payload: str, signature: str) -> Dict[str, Any]:
        """Handle Stripe webhook events"""
        try:
            if not self.webhook_secret:
                logger.warning("Stripe webhook secret not configured")
                return {"status": "ignored"}
            
            event = stripe.Webhook.construct_event(
                payload, signature, self.webhook_secret
            )
            
            logger.info(f"Received Stripe webhook: {event['type']}")
            
            if event['type'] == 'customer.subscription.created':
                await self.handle_subscription_created(event['data']['object'])
            elif event['type'] == 'customer.subscription.updated':
                await self.handle_subscription_updated(event['data']['object'])
            elif event['type'] == 'customer.subscription.deleted':
                await self.handle_subscription_deleted(event['data']['object'])
            elif event['type'] == 'invoice.payment_succeeded':
                await self.handle_payment_succeeded(event['data']['object'])
            elif event['type'] == 'invoice.payment_failed':
                await self.handle_payment_failed(event['data']['object'])
            
            return {"status": "processed"}
            
        except Exception as e:
            logger.error(f"Failed to handle Stripe webhook: {e}")
            raise
    
    async def handle_subscription_created(self, subscription):
        """Handle subscription created webhook"""
        logger.info(f"Subscription created: {subscription['id']}")
    
    async def handle_subscription_updated(self, subscription):
        """Handle subscription updated webhook"""
        try:
            async with get_db_connection() as conn:
                await conn.execute("""
                    UPDATE user_subscriptions 
                    SET status = $1, updated_at = $2
                    WHERE stripe_subscription_id = $3
                """, subscription['status'], datetime.utcnow(), subscription['id'])
                
            logger.info(f"Updated subscription {subscription['id']} status to {subscription['status']}")
            
        except Exception as e:
            logger.error(f"Failed to handle subscription update: {e}")
    
    async def handle_subscription_deleted(self, subscription):
        """Handle subscription deleted webhook"""
        try:
            async with get_db_connection() as conn:
                await conn.execute("""
                    UPDATE user_subscriptions 
                    SET status = 'canceled', canceled_at = $1, updated_at = $1
                    WHERE stripe_subscription_id = $2
                """, datetime.utcnow(), subscription['id'])
                
            logger.info(f"Canceled subscription {subscription['id']}")
            
        except Exception as e:
            logger.error(f"Failed to handle subscription deletion: {e}")
    
    async def handle_payment_succeeded(self, invoice):
        """Handle successful payment webhook"""
        logger.info(f"Payment succeeded for invoice {invoice['id']}")
    
    async def handle_payment_failed(self, invoice):
        """Handle failed payment webhook"""
        logger.info(f"Payment failed for invoice {invoice['id']}")

# Global billing service instance
billing_service = BillingService() 