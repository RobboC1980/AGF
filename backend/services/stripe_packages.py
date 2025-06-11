"""
AgileForge Stripe Packages & Products
Comprehensive package definitions for subscription plans, one-time purchases, and add-ons
"""

import os
import stripe
import logging
from datetime import datetime
from typing import Dict, List, Optional, Any
from enum import Enum
import uuid

from ..database.connection import get_db_connection

logger = logging.getLogger(__name__)

# Configure Stripe
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

class PackageType(Enum):
    SUBSCRIPTION = "subscription"
    ONE_TIME = "one_time"
    ADD_ON = "add_on"
    CREDIT_PACK = "credit_pack"

class BillingInterval(Enum):
    MONTHLY = "month"
    ANNUAL = "year"
    ONE_TIME = "one_time"

class StripePackageManager:
    def __init__(self):
        self.stripe_api_key = os.getenv("STRIPE_SECRET_KEY")
        self.webhook_secret = os.getenv("STRIPE_WEBHOOK_SECRET")
        
        if not self.stripe_api_key:
            logger.warning("STRIPE_SECRET_KEY not configured")
        
        # Define all available packages
        self.packages = {
            # SUBSCRIPTION PLANS
            "starter_monthly": {
                "id": "starter_monthly",
                "name": "Starter Team - Monthly",
                "description": "Perfect for small teams getting started with agile project management",
                "type": PackageType.SUBSCRIPTION,
                "billing_interval": BillingInterval.MONTHLY,
                "price": 0.00,
                "currency": "gbp",
                "features": {
                    "max_team_members": 3,
                    "ai_stories_monthly": 25,
                    "projects": 5,
                    "storage_gb": 1,
                    "integrations": ["basic"],
                    "support": "community"
                },
                "feature_list": [
                    "Up to 3 team members",
                    "25 AI-generated stories monthly",
                    "5 projects",
                    "1GB storage",
                    "Basic kanban boards",
                    "Simple sprint planning",
                    "Community support",
                    "Mobile app access"
                ],
                "trial_days": 14,
                "popular": False
            },
            
            "professional_monthly": {
                "id": "professional_monthly",
                "name": "Professional - Monthly",
                "description": "Advanced features for growing teams and enhanced productivity",
                "type": PackageType.SUBSCRIPTION,
                "billing_interval": BillingInterval.MONTHLY,
                "price": 10.00,
                "currency": "gbp",
                "features": {
                    "max_team_members": -1,
                    "ai_stories_monthly": 200,
                    "projects": -1,
                    "storage_gb": 50,
                    "integrations": ["slack", "teams", "github", "jira"],
                    "support": "email_24h"
                },
                "feature_list": [
                    "Unlimited team members",
                    "200 AI-generated stories monthly per user",
                    "Unlimited projects",
                    "50GB storage",
                    "Advanced AI story generation",
                    "Comprehensive sprint planning",
                    "Slack, Teams, GitHub integrations",
                    "Custom fields and workflow automation",
                    "Email support (24h response)",
                    "Advanced reporting"
                ],
                "trial_days": 14,
                "popular": True
            },
            
            "professional_annual": {
                "id": "professional_annual",
                "name": "Professional - Annual",
                "description": "Professional plan with 2 months free when billed annually",
                "type": PackageType.SUBSCRIPTION,
                "billing_interval": BillingInterval.ANNUAL,
                "price": 100.00,  # 2 months free
                "currency": "gbp",
                "features": {
                    "max_team_members": -1,
                    "ai_stories_monthly": 200,
                    "projects": -1,
                    "storage_gb": 50,
                    "integrations": ["slack", "teams", "github", "jira"],
                    "support": "email_24h"
                },
                "feature_list": [
                    "Everything in Professional Monthly",
                    "2 months free (save 17%)",
                    "Priority feature requests"
                ],
                "trial_days": 14,
                "popular": False,
                "savings": "Save 17% vs monthly"
            },
            
            "business_monthly": {
                "id": "business_monthly",
                "name": "Business - Monthly",
                "description": "Enterprise-grade features with unlimited AI and advanced insights",
                "type": PackageType.SUBSCRIPTION,
                "billing_interval": BillingInterval.MONTHLY,
                "price": 18.00,
                "currency": "gbp",
                "features": {
                    "max_team_members": -1,
                    "ai_stories_monthly": -1,
                    "projects": -1,
                    "storage_gb": 200,
                    "integrations": ["all"],
                    "support": "priority"
                },
                "feature_list": [
                    "Everything in Professional",
                    "Unlimited AI story generation",
                    "AI-powered project insights",
                    "200GB storage",
                    "Custom dashboards",
                    "Priority support",
                    "SSO and advanced security",
                    "API access",
                    "Guest access for stakeholders",
                    "Advanced analytics"
                ],
                "trial_days": 14,
                "popular": False
            },
            
            "business_annual": {
                "id": "business_annual",
                "name": "Business - Annual",
                "description": "Business plan with 2 months free when billed annually",
                "type": PackageType.SUBSCRIPTION,
                "billing_interval": BillingInterval.ANNUAL,
                "price": 180.00,  # 2 months free
                "currency": "gbp",
                "features": {
                    "max_team_members": -1,
                    "ai_stories_monthly": -1,
                    "projects": -1,
                    "storage_gb": 200,
                    "integrations": ["all"],
                    "support": "priority"
                },
                "feature_list": [
                    "Everything in Business Monthly",
                    "2 months free (save 17%)",
                    "Quarterly business reviews"
                ],
                "trial_days": 14,
                "popular": False,
                "savings": "Save 17% vs monthly"
            },
            
            # ONE-TIME PURCHASES
            "ai_story_pack_50": {
                "id": "ai_story_pack_50",
                "name": "AI Story Pack - 50 Stories",
                "description": "50 additional AI-generated user stories",
                "type": PackageType.CREDIT_PACK,
                "billing_interval": BillingInterval.ONE_TIME,
                "price": 5.00,
                "currency": "gbp",
                "features": {
                    "ai_stories": 50,
                    "expires_days": 90
                },
                "feature_list": [
                    "50 AI-generated user stories",
                    "Valid for 90 days",
                    "Works with any plan",
                    "Instant activation"
                ],
                "popular": True
            },
            
            "ai_story_pack_100": {
                "id": "ai_story_pack_100",
                "name": "AI Story Pack - 100 Stories",
                "description": "100 additional AI-generated user stories with bonus",
                "type": PackageType.CREDIT_PACK,
                "billing_interval": BillingInterval.ONE_TIME,
                "price": 9.00,
                "currency": "gbp",
                "features": {
                    "ai_stories": 100,
                    "expires_days": 90
                },
                "feature_list": [
                    "100 AI-generated user stories",
                    "10% discount vs 50-pack",
                    "Valid for 90 days",
                    "Works with any plan",
                    "Instant activation"
                ],
                "popular": False,
                "savings": "Save 10% vs 2x 50-packs"
            },
            
            "ai_story_pack_250": {
                "id": "ai_story_pack_250",
                "name": "AI Story Pack - 250 Stories",
                "description": "250 additional AI-generated user stories with maximum savings",
                "type": PackageType.CREDIT_PACK,
                "billing_interval": BillingInterval.ONE_TIME,
                "price": 20.00,
                "currency": "gbp",
                "features": {
                    "ai_stories": 250,
                    "expires_days": 120
                },
                "feature_list": [
                    "250 AI-generated user stories",
                    "20% discount vs 50-packs",
                    "Valid for 120 days",
                    "Works with any plan",
                    "Instant activation",
                    "Priority AI processing"
                ],
                "popular": False,
                "savings": "Save 20% vs 5x 50-packs"
            },
            
            # ADD-ONS
            "extra_storage_10gb": {
                "id": "extra_storage_10gb",
                "name": "Extra Storage - 10GB",
                "description": "Additional 10GB storage for your projects and files",
                "type": PackageType.ADD_ON,
                "billing_interval": BillingInterval.MONTHLY,
                "price": 2.00,
                "currency": "gbp",
                "features": {
                    "storage_gb": 10
                },
                "feature_list": [
                    "10GB additional storage",
                    "File versioning",
                    "Automatic backups",
                    "99.9% uptime SLA"
                ],
                "requires_subscription": True
            },
            
            "priority_support": {
                "id": "priority_support",
                "name": "Priority Support",
                "description": "Get priority email and chat support with faster response times",
                "type": PackageType.ADD_ON,
                "billing_interval": BillingInterval.MONTHLY,
                "price": 5.00,
                "currency": "gbp",
                "features": {
                    "support_priority": True,
                    "response_time_hours": 4
                },
                "feature_list": [
                    "Priority email support",
                    "4-hour response time",
                    "Direct access to senior support",
                    "Phone support during business hours"
                ],
                "requires_subscription": True
            },
            
            "advanced_integrations": {
                "id": "advanced_integrations",
                "name": "Advanced Integrations",
                "description": "Unlock premium integrations with enterprise tools",
                "type": PackageType.ADD_ON,
                "billing_interval": BillingInterval.MONTHLY,
                "price": 8.00,
                "currency": "gbp",
                "features": {
                    "integrations": ["salesforce", "azure_devops", "confluence", "notion"]
                },
                "feature_list": [
                    "Salesforce integration",
                    "Azure DevOps sync",
                    "Confluence documentation",
                    "Notion workspace sync",
                    "Custom webhook endpoints"
                ],
                "requires_subscription": True
            },
            
            # ENTERPRISE CUSTOM
            "enterprise_custom": {
                "id": "enterprise_custom",
                "name": "Enterprise Custom",
                "description": "Custom enterprise solution with dedicated support",
                "type": PackageType.SUBSCRIPTION,
                "billing_interval": BillingInterval.MONTHLY,
                "price": 0.00,  # Custom pricing
                "currency": "gbp",
                "features": {
                    "max_team_members": -1,
                    "ai_stories_monthly": -1,
                    "projects": -1,
                    "storage_gb": -1,  # unlimited
                    "integrations": ["all", "custom"],
                    "support": "dedicated"
                },
                "feature_list": [
                    "Everything in Business",
                    "Custom AI model training",
                    "Advanced compliance (GDPR, SOC 2)",
                    "Dedicated infrastructure",
                    "Professional services",
                    "Volume discounts",
                    "Flexible billing",
                    "Dedicated account manager",
                    "Custom integrations",
                    "On-premise deployment options"
                ],
                "custom_pricing": True,
                "contact_sales": True
            }
        }
    
    async def initialize_stripe_products(self):
        """Initialize all products and prices in Stripe"""
        if not self.stripe_api_key:
            logger.warning("Stripe not configured, skipping product initialization")
            return
        
        try:
            for package_id, package_config in self.packages.items():
                if package_config.get("custom_pricing"):
                    continue  # Skip custom pricing packages
                
                await self.create_stripe_product(package_id, package_config)
            
            logger.info("All Stripe products initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize Stripe products: {e}")
            raise
    
    async def create_stripe_product(self, package_id: str, config: Dict[str, Any]):
        """Create a single product and its prices in Stripe"""
        try:
            # Check if product already exists
            async with get_db_connection() as conn:
                existing = await conn.fetchrow(
                    "SELECT stripe_product_id FROM stripe_products WHERE package_id = $1",
                    package_id
                )
                
                if existing:
                    logger.info(f"Product {package_id} already exists in Stripe")
                    return existing['stripe_product_id']
            
            # Create Stripe product
            stripe_product = stripe.Product.create(
                id=f"agileforge_{package_id}",
                name=config["name"],
                description=config["description"],
                metadata={
                    "package_id": package_id,
                    "type": config["type"].value,
                    "features": str(config["features"])
                }
            )
            
            # Create price
            stripe_price = None
            if config["price"] > 0:
                price_data = {
                    "product": stripe_product.id,
                    "unit_amount": int(config["price"] * 100),  # Convert to pence
                    "currency": config["currency"],
                    "metadata": {"package_id": package_id}
                }
                
                if config["billing_interval"] != BillingInterval.ONE_TIME:
                    price_data["recurring"] = {"interval": config["billing_interval"].value}
                
                stripe_price = stripe.Price.create(**price_data)
            
            # Store in database
            async with get_db_connection() as conn:
                await conn.execute("""
                    INSERT INTO stripe_products (
                        id, package_id, stripe_product_id, stripe_price_id,
                        name, description, type, billing_interval, price, currency,
                        features, feature_list, trial_days, popular, active
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
                    ON CONFLICT (package_id) DO UPDATE SET
                        stripe_product_id = $3,
                        stripe_price_id = $4,
                        name = $5,
                        description = $6,
                        price = $9,
                        features = $11,
                        feature_list = $12,
                        updated_at = NOW()
                """, 
                    str(uuid.uuid4()), package_id, stripe_product.id,
                    stripe_price.id if stripe_price else None,
                    config["name"], config["description"],
                    config["type"].value, config["billing_interval"].value,
                    config["price"], config["currency"],
                    config["features"], config["feature_list"],
                    config.get("trial_days", 0), config.get("popular", False), True
                )
            
            logger.info(f"Created Stripe product {stripe_product.id} for package {package_id}")
            return stripe_product.id
            
        except Exception as e:
            logger.error(f"Failed to create Stripe product for {package_id}: {e}")
            raise
    
    async def get_all_packages(self, package_type: Optional[PackageType] = None) -> List[Dict[str, Any]]:
        """Get all available packages, optionally filtered by type"""
        try:
            packages = []
            for package_id, config in self.packages.items():
                if package_type and config["type"] != package_type:
                    continue
                
                package_data = config.copy()
                package_data["id"] = package_id
                
                # Add Stripe information if available
                async with get_db_connection() as conn:
                    stripe_info = await conn.fetchrow(
                        "SELECT stripe_product_id, stripe_price_id FROM stripe_products WHERE package_id = $1",
                        package_id
                    )
                    if stripe_info:
                        package_data["stripe_product_id"] = stripe_info["stripe_product_id"]
                        package_data["stripe_price_id"] = stripe_info["stripe_price_id"]
                
                packages.append(package_data)
            
            return packages
            
        except Exception as e:
            logger.error(f"Failed to get packages: {e}")
            return []
    
    async def get_package(self, package_id: str) -> Optional[Dict[str, Any]]:
        """Get a specific package by ID"""
        if package_id not in self.packages:
            return None
        
        try:
            package_data = self.packages[package_id].copy()
            package_data["id"] = package_id
            
            # Add Stripe information
            async with get_db_connection() as conn:
                stripe_info = await conn.fetchrow(
                    "SELECT stripe_product_id, stripe_price_id FROM stripe_products WHERE package_id = $1",
                    package_id
                )
                if stripe_info:
                    package_data["stripe_product_id"] = stripe_info["stripe_product_id"]
                    package_data["stripe_price_id"] = stripe_info["stripe_price_id"]
            
            return package_data
            
        except Exception as e:
            logger.error(f"Failed to get package {package_id}: {e}")
            return None
    
    async def create_checkout_session(
        self, 
        package_id: str, 
        user_id: str,
        success_url: str,
        cancel_url: str,
        trial_days: Optional[int] = None
    ) -> Dict[str, Any]:
        """Create a Stripe checkout session for a package"""
        try:
            package = await self.get_package(package_id)
            if not package:
                raise ValueError(f"Package {package_id} not found")
            
            if not package.get("stripe_price_id"):
                raise ValueError(f"Package {package_id} has no Stripe price configured")
            
            # Get or create customer
            async with get_db_connection() as conn:
                user = await conn.fetchrow("SELECT * FROM users WHERE id = $1", user_id)
                if not user:
                    raise ValueError("User not found")
            
            # Create checkout session
            session_data = {
                "payment_method_types": ["card"],
                "line_items": [{
                    "price": package["stripe_price_id"],
                    "quantity": 1
                }],
                "mode": "subscription" if package["type"] == PackageType.SUBSCRIPTION else "payment",
                "success_url": success_url,
                "cancel_url": cancel_url,
                "customer_email": user["email"],
                "metadata": {
                    "user_id": user_id,
                    "package_id": package_id
                }
            }
            
            # Add trial if applicable
            if trial_days and package["type"] == PackageType.SUBSCRIPTION:
                session_data["subscription_data"] = {
                    "trial_period_days": trial_days
                }
            
            session = stripe.checkout.Session.create(**session_data)
            
            # Store session in database
            async with get_db_connection() as conn:
                await conn.execute("""
                    INSERT INTO checkout_sessions (
                        id, user_id, package_id, stripe_session_id, status, created_at
                    ) VALUES ($1, $2, $3, $4, $5, $6)
                """, 
                    str(uuid.uuid4()), user_id, package_id, session.id, "pending", datetime.utcnow()
                )
            
            return {
                "session_id": session.id,
                "url": session.url,
                "package": package
            }
            
        except Exception as e:
            logger.error(f"Failed to create checkout session: {e}")
            raise
    
    async def get_subscription_packages(self) -> List[Dict[str, Any]]:
        """Get all subscription packages grouped by plan type"""
        packages = await self.get_all_packages(PackageType.SUBSCRIPTION)
        
        # Group by plan type
        grouped = {}
        for package in packages:
            if package.get("custom_pricing"):
                plan_type = "enterprise"
            else:
                plan_type = package["id"].split("_")[0]  # starter, professional, business
            
            if plan_type not in grouped:
                grouped[plan_type] = {
                    "name": package["name"].split(" - ")[0],  # Remove billing interval
                    "plans": []
                }
            
            grouped[plan_type]["plans"].append(package)
        
        return grouped
    
    async def get_addon_packages(self) -> List[Dict[str, Any]]:
        """Get all add-on packages"""
        return await self.get_all_packages(PackageType.ADD_ON)
    
    async def get_credit_packages(self) -> List[Dict[str, Any]]:
        """Get all credit pack packages"""
        return await self.get_all_packages(PackageType.CREDIT_PACK)

# Global instance
stripe_package_manager = StripePackageManager() 