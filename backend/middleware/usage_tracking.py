"""
AgileForge Usage Tracking Middleware
Automatically tracks usage for billing and feature gating
"""

import logging
from datetime import datetime
from typing import Optional, Dict, Any
from fastapi import Request, Response, HTTPException, status
from functools import wraps
import json

from ..services.billing_service import billing_service
from ..database.connection import get_db_connection

logger = logging.getLogger(__name__)

class UsageTracker:
    def __init__(self):
        self.tracked_endpoints = {
            "/api/stories/generate": {
                "usage_type": "ai_story_generation",
                "description": "AI Story Generation"
            },
            "/ai/generate-story": {
                "usage_type": "ai_story_generation", 
                "description": "AI Story Generation"
            }
        }
    
    async def track_endpoint_usage(
        self, 
        request: Request, 
        user_id: str, 
        endpoint: str,
        quantity: int = 1,
        resource_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Track usage for a specific endpoint"""
        try:
            if endpoint not in self.tracked_endpoints:
                return {"success": True, "tracked": False}
            
            config = self.tracked_endpoints[endpoint]
            
            # Track the usage
            result = await billing_service.track_usage(
                user_id=user_id,
                usage_type=config["usage_type"],
                quantity=quantity,
                resource_id=resource_id,
                metadata={
                    "endpoint": endpoint,
                    "timestamp": datetime.utcnow().isoformat(),
                    "user_agent": request.headers.get("user-agent"),
                    "ip_address": request.client.host if request.client else None
                }
            )
            
            logger.info(f"Tracked usage for user {user_id}: {config['description']} x{quantity}")
            return result
            
        except Exception as e:
            logger.error(f"Failed to track usage for {endpoint}: {e}")
            # Don't fail the request if usage tracking fails
            return {"success": False, "error": str(e)}
    
    async def check_usage_limit(
        self, 
        user_id: str, 
        usage_type: str,
        quantity: int = 1
    ) -> Dict[str, Any]:
        """Check if user is within usage limits"""
        try:
            # Get current usage
            usage_data = await billing_service.get_user_usage(user_id)
            
            if usage_type not in usage_data:
                # No limits found, might be unlimited plan
                return {"allowed": True, "unlimited": True}
            
            limit_info = usage_data[usage_type]
            current_usage = limit_info["current_usage"]
            monthly_limit = limit_info["monthly_limit"]
            
            # Check if unlimited
            if monthly_limit < 0:
                return {"allowed": True, "unlimited": True}
            
            # Check if within limit
            if current_usage + quantity <= monthly_limit:
                return {
                    "allowed": True,
                    "current_usage": current_usage,
                    "monthly_limit": monthly_limit,
                    "remaining": monthly_limit - current_usage
                }
            
            # Check if overage is allowed
            subscription = await billing_service.get_user_subscription(user_id)
            
            # For Professional plan, allow overage with charge
            if subscription and subscription["plan_type"] == "professional":
                overage_amount = (current_usage + quantity) - monthly_limit
                overage_cost = overage_amount * 0.05  # £0.05 per story
                
                return {
                    "allowed": True,
                    "overage": True,
                    "overage_amount": overage_amount,
                    "overage_cost": overage_cost,
                    "current_usage": current_usage,
                    "monthly_limit": monthly_limit
                }
            
            # For Free plan, hard limit
            return {
                "allowed": False,
                "current_usage": current_usage,
                "monthly_limit": monthly_limit,
                "upgrade_required": True
            }
            
        except Exception as e:
            logger.error(f"Failed to check usage limit: {e}")
            # In case of error, allow the request to prevent service disruption
            return {"allowed": True, "error": str(e)}
    
    async def get_user_plan_features(self, user_id: str) -> Dict[str, Any]:
        """Get user's plan features for feature gating"""
        try:
            subscription = await billing_service.get_user_subscription(user_id)
            
            if not subscription:
                # Default to free plan features
                return {
                    "plan_type": "free",
                    "max_team_members": 3,
                    "ai_stories_monthly": 25,
                    "advanced_ai_features": False,
                    "priority_support": False,
                    "custom_integrations": False,
                    "advanced_analytics": False,
                    "api_access": False,
                    "sso_enabled": False,
                    "custom_branding": False
                }
            
            async with get_db_connection() as conn:
                plan = await conn.fetchrow("""
                    SELECT * FROM subscription_plans 
                    WHERE id = (
                        SELECT plan_id FROM user_subscriptions 
                        WHERE user_id = $1 AND status IN ('active', 'trialing')
                        ORDER BY created_at DESC LIMIT 1
                    )
                """, user_id)
                
                if not plan:
                    # Fallback to free plan
                    return await self.get_user_plan_features(user_id)
                
                return {
                    "plan_type": plan["plan_type"],
                    "max_team_members": plan["max_team_members"],
                    "ai_stories_monthly": plan["ai_stories_monthly"],
                    "advanced_ai_features": plan["advanced_ai_features"],
                    "priority_support": plan["priority_support"],
                    "custom_integrations": plan["custom_integrations"],
                    "advanced_analytics": plan["advanced_analytics"],
                    "api_access": plan["api_access"],
                    "sso_enabled": plan["sso_enabled"],
                    "custom_branding": plan["custom_branding"]
                }
                
        except Exception as e:
            logger.error(f"Failed to get user plan features: {e}")
            # Return free plan features as fallback
            return {
                "plan_type": "free",
                "max_team_members": 3,
                "ai_stories_monthly": 25,
                "advanced_ai_features": False,
                "priority_support": False,
                "custom_integrations": False,
                "advanced_analytics": False,
                "api_access": False,
                "sso_enabled": False,
                "custom_branding": False
            }

# Global usage tracker instance
usage_tracker = UsageTracker()

def track_usage(usage_type: str, quantity: int = 1):
    """Decorator to track usage for endpoints"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Extract user_id from kwargs or request
            user_id = None
            request = None
            
            # Look for user_id in kwargs
            if 'current_user' in kwargs:
                user_id = kwargs['current_user'].id
            elif 'user_id' in kwargs:
                user_id = kwargs['user_id']
            
            # Look for request object
            for arg in args:
                if isinstance(arg, Request):
                    request = arg
                    break
            
            if not user_id:
                logger.warning("No user_id found for usage tracking")
                return await func(*args, **kwargs)
            
            # Check usage limits before processing
            limit_check = await usage_tracker.check_usage_limit(user_id, usage_type, quantity)
            
            if not limit_check["allowed"]:
                raise HTTPException(
                    status_code=status.HTTP_402_PAYMENT_REQUIRED,
                    detail={
                        "error": "Usage limit exceeded",
                        "current_usage": limit_check.get("current_usage", 0),
                        "monthly_limit": limit_check.get("monthly_limit", 0),
                        "upgrade_required": limit_check.get("upgrade_required", False),
                        "message": "You've reached your monthly AI story generation limit. Upgrade to Professional for higher limits and overage options."
                    }
                )
            
            # Process the request
            try:
                result = await func(*args, **kwargs)
                
                # Track successful usage
                if request:
                    resource_id = None
                    if hasattr(result, 'get') and result.get('story', {}).get('id'):
                        resource_id = result['story']['id']
                    
                    await usage_tracker.track_endpoint_usage(
                        request=request,
                        user_id=user_id,
                        endpoint=request.url.path,
                        quantity=quantity,
                        resource_id=resource_id
                    )
                
                # Add usage info to response
                if isinstance(result, dict):
                    result['usage_info'] = {
                        "tracked": True,
                        "overage": limit_check.get("overage", False),
                        "overage_cost": limit_check.get("overage_cost", 0),
                        "remaining": limit_check.get("remaining")
                    }
                
                return result
                
            except Exception as e:
                logger.error(f"Error in tracked function: {e}")
                raise
        
        return wrapper
    return decorator

def require_feature(feature_name: str):
    """Decorator to require specific plan features"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Extract user_id
            user_id = None
            if 'current_user' in kwargs:
                user_id = kwargs['current_user'].id
            elif 'user_id' in kwargs:
                user_id = kwargs['user_id']
            
            if not user_id:
                logger.warning("No user_id found for feature gating")
                return await func(*args, **kwargs)
            
            # Check feature access
            features = await usage_tracker.get_user_plan_features(user_id)
            
            if not features.get(feature_name, False):
                # Get plan type for upgrade suggestion
                plan_type = features.get("plan_type", "free")
                
                upgrade_suggestion = {
                    "free": "professional",
                    "professional": "business",
                    "business": "enterprise"
                }.get(plan_type, "professional")
                
                raise HTTPException(
                    status_code=status.HTTP_402_PAYMENT_REQUIRED,
                    detail={
                        "error": "Feature not available",
                        "feature": feature_name,
                        "current_plan": plan_type,
                        "upgrade_to": upgrade_suggestion,
                        "message": f"This feature requires {upgrade_suggestion.title()} plan or higher."
                    }
                )
            
            return await func(*args, **kwargs)
        
        return wrapper
    return decorator

async def get_usage_middleware(request: Request, call_next):
    """Middleware to add usage information to requests"""
    try:
        # Skip non-API requests
        if not request.url.path.startswith('/api/'):
            return await call_next(request)
        
        # Skip auth endpoints
        if request.url.path.startswith('/api/auth/'):
            return await call_next(request)
        
        # Process request
        response = await call_next(request)
        
        # Add usage headers for authenticated requests
        if hasattr(request.state, 'user_id'):
            try:
                usage_data = await billing_service.get_user_usage(request.state.user_id)
                subscription = await billing_service.get_user_subscription(request.state.user_id)
                
                if usage_data and 'ai_story_generation' in usage_data:
                    ai_usage = usage_data['ai_story_generation']
                    response.headers['X-Usage-AI-Stories'] = str(ai_usage['current_usage'])
                    response.headers['X-Usage-AI-Stories-Limit'] = str(ai_usage['monthly_limit'])
                    response.headers['X-Usage-AI-Stories-Percentage'] = str(round(ai_usage['percentage_used'], 1))
                
                if subscription:
                    response.headers['X-Plan-Type'] = subscription['plan_type']
                    response.headers['X-Plan-Status'] = subscription['status']
                    
            except Exception as e:
                logger.warning(f"Failed to add usage headers: {e}")
        
        return response
        
    except Exception as e:
        logger.error(f"Usage middleware error: {e}")
        return await call_next(request) 