"""
AgileForge Billing API
Complete billing and subscription management endpoints
"""

from fastapi import APIRouter, HTTPException, Depends, Request, status, Header
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
import logging
import stripe

from ..services.billing_service import billing_service
from ..middleware.usage_tracking import usage_tracker, require_feature
from ..database.connection import get_db_connection
from .auth import get_current_user, UserResponse

logger = logging.getLogger(__name__)
router = APIRouter()

# =====================================
# PYDANTIC MODELS
# =====================================

class PlanResponse(BaseModel):
    id: str
    name: str
    plan_type: str
    price_monthly: float
    price_annual: float
    currency: str
    features: List[str]
    max_team_members: int
    ai_stories_monthly: int
    is_featured: bool = False

class SubscriptionResponse(BaseModel):
    id: str
    plan_type: str
    plan_name: str
    status: str
    billing_cycle: str
    amount: float
    trial_end: Optional[str] = None
    features: List[str]
    next_billing_date: Optional[str] = None

class UsageResponse(BaseModel):
    ai_story_generation: Dict[str, Any]
    period_start: str
    period_end: str

class CreateSubscriptionRequest(BaseModel):
    plan_type: str = Field(..., description="Plan type: free, professional, business")
    billing_cycle: str = Field(default="monthly", description="monthly or annual")
    payment_method_id: Optional[str] = Field(None, description="Stripe payment method ID")

class UpgradeRequest(BaseModel):
    new_plan_type: str
    billing_cycle: Optional[str] = "monthly"

class PaymentIntentResponse(BaseModel):
    client_secret: str
    subscription_id: str

class WebhookRequest(BaseModel):
    type: str
    data: Dict[str, Any]

# =====================================
# SUBSCRIPTION PLANS
# =====================================

@router.get("/plans", response_model=List[PlanResponse])
async def get_subscription_plans():
    """Get all available subscription plans"""
    try:
        async with get_db_connection() as conn:
            plans = await conn.fetch("""
                SELECT * FROM subscription_plans 
                WHERE is_active = TRUE 
                ORDER BY price_monthly ASC
            """)
            
            result = []
            for plan in plans:
                result.append(PlanResponse(
                    id=plan['id'],
                    name=plan['name'],
                    plan_type=plan['plan_type'],
                    price_monthly=float(plan['price_monthly']),
                    price_annual=float(plan['price_annual']),
                    currency=plan['currency'],
                    features=plan['features_list'] or [],
                    max_team_members=plan['max_team_members'],
                    ai_stories_monthly=plan['ai_stories_monthly'],
                    is_featured=plan['is_featured']
                ))
            
            return result
            
    except Exception as e:
        logger.error(f"Failed to get subscription plans: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve subscription plans"
        )

@router.get("/plans/{plan_type}", response_model=PlanResponse)
async def get_plan_details(plan_type: str):
    """Get details for a specific plan"""
    try:
        async with get_db_connection() as conn:
            plan = await conn.fetchrow("""
                SELECT * FROM subscription_plans 
                WHERE plan_type = $1 AND is_active = TRUE
            """, plan_type)
            
            if not plan:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Plan not found"
                )
            
            return PlanResponse(
                id=plan['id'],
                name=plan['name'],
                plan_type=plan['plan_type'],
                price_monthly=float(plan['price_monthly']),
                price_annual=float(plan['price_annual']),
                currency=plan['currency'],
                features=plan['features_list'] or [],
                max_team_members=plan['max_team_members'],
                ai_stories_monthly=plan['ai_stories_monthly'],
                is_featured=plan['is_featured']
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get plan details: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve plan details"
        )

# =====================================
# SUBSCRIPTION MANAGEMENT
# =====================================

@router.get("/subscription", response_model=Optional[SubscriptionResponse])
async def get_current_subscription(current_user: UserResponse = Depends(get_current_user)):
    """Get user's current subscription"""
    try:
        subscription = await billing_service.get_user_subscription(current_user.id)
        
        if not subscription:
            return None
        
        return SubscriptionResponse(**subscription)
        
    except Exception as e:
        logger.error(f"Failed to get subscription for user {current_user.id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve subscription"
        )

@router.post("/subscription", response_model=SubscriptionResponse)
async def create_subscription(
    request: CreateSubscriptionRequest,
    current_user: UserResponse = Depends(get_current_user)
):
    """Create a new subscription"""
    try:
        # Check if user already has an active subscription
        existing_sub = await billing_service.get_user_subscription(current_user.id)
        if existing_sub and existing_sub['status'] in ['active', 'trialing']:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User already has an active subscription"
            )
        
        # Create subscription
        subscription = await billing_service.create_subscription(
            user_id=current_user.id,
            plan_type=request.plan_type,
            billing_cycle=request.billing_cycle,
            trial_days=14 if request.plan_type != "free" else 0
        )
        
        return SubscriptionResponse(**subscription)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to create subscription: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create subscription"
        )

@router.post("/subscription/upgrade", response_model=SubscriptionResponse)
async def upgrade_subscription(
    request: UpgradeRequest,
    current_user: UserResponse = Depends(get_current_user)
):
    """Upgrade or change subscription plan"""
    try:
        # Get current subscription
        current_sub = await billing_service.get_user_subscription(current_user.id)
        if not current_sub:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No active subscription found"
            )
        
        # For now, create a new subscription (in production, this would modify existing)
        # This is a simplified implementation
        subscription = await billing_service.create_subscription(
            user_id=current_user.id,
            plan_type=request.new_plan_type,
            billing_cycle=request.billing_cycle or "monthly",
            trial_days=0  # No trial for upgrades
        )
        
        return SubscriptionResponse(**subscription)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to upgrade subscription: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to upgrade subscription"
        )

@router.delete("/subscription")
async def cancel_subscription(current_user: UserResponse = Depends(get_current_user)):
    """Cancel current subscription"""
    try:
        async with get_db_connection() as conn:
            # Update subscription to cancel at period end
            await conn.execute("""
                UPDATE user_subscriptions 
                SET cancel_at_period_end = TRUE, updated_at = $1
                WHERE user_id = $2 AND status IN ('active', 'trialing')
            """, datetime.utcnow(), current_user.id)
        
        return {"message": "Subscription will be canceled at the end of the current billing period"}
        
    except Exception as e:
        logger.error(f"Failed to cancel subscription: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to cancel subscription"
        )

# =====================================
# USAGE TRACKING
# =====================================

@router.get("/usage", response_model=UsageResponse)
async def get_current_usage(current_user: UserResponse = Depends(get_current_user)):
    """Get user's current usage statistics"""
    try:
        usage_data = await billing_service.get_user_usage(current_user.id)
        
        # Get current period dates
        now = datetime.utcnow()
        period_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        period_end = (period_start.replace(month=period_start.month + 1) 
                     if period_start.month < 12 
                     else period_start.replace(year=period_start.year + 1, month=1))
        
        return UsageResponse(
            ai_story_generation=usage_data.get('ai_story_generation', {
                "current_usage": 0,
                "monthly_limit": 25,
                "percentage_used": 0,
                "overage_usage": 0,
                "overage_cost": 0
            }),
            period_start=period_start.isoformat(),
            period_end=period_end.isoformat()
        )
        
    except Exception as e:
        logger.error(f"Failed to get usage for user {current_user.id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve usage data"
        )

@router.get("/features")
async def get_user_features(current_user: UserResponse = Depends(get_current_user)):
    """Get user's available features based on their plan"""
    try:
        features = await usage_tracker.get_user_plan_features(current_user.id)
        return features
        
    except Exception as e:
        logger.error(f"Failed to get features for user {current_user.id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve user features"
        )

# =====================================
# PAYMENT PROCESSING
# =====================================

@router.post("/create-payment-intent", response_model=PaymentIntentResponse)
async def create_payment_intent(
    request: CreateSubscriptionRequest,
    current_user: UserResponse = Depends(get_current_user)
):
    """Create a Stripe payment intent for subscription"""
    try:
        if not billing_service.stripe_api_key:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Payment processing not configured"
            )
        
        # Get plan details
        async with get_db_connection() as conn:
            plan = await conn.fetchrow("""
                SELECT * FROM subscription_plans 
                WHERE plan_type = $1 AND is_active = TRUE
            """, request.plan_type)
            
            if not plan:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Plan not found"
                )
        
        # Calculate amount
        amount = (plan['price_annual'] if request.billing_cycle == "annual" 
                 else plan['price_monthly'])
        
        if amount <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot create payment intent for free plan"
            )
        
        # Create or get Stripe customer
        customer_id = await billing_service.create_customer(
            current_user.id, current_user.email, current_user.name
        )
        
        # Create payment intent
        intent = stripe.PaymentIntent.create(
            amount=int(amount * 100),  # Convert to pence
            currency="gbp",
            customer=customer_id,
            metadata={
                "user_id": current_user.id,
                "plan_type": request.plan_type,
                "billing_cycle": request.billing_cycle
            }
        )
        
        return PaymentIntentResponse(
            client_secret=intent.client_secret,
            subscription_id="pending"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to create payment intent: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create payment intent"
        )

@router.post("/webhooks/stripe")
async def handle_stripe_webhook(
    request: Request,
    stripe_signature: str = Header(None, alias="stripe-signature")
):
    """Handle Stripe webhook events"""
    try:
        payload = await request.body()
        
        result = await billing_service.handle_stripe_webhook(
            payload.decode('utf-8'), 
            stripe_signature
        )
        
        return result
        
    except Exception as e:
        logger.error(f"Failed to handle Stripe webhook: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to process webhook"
        )

# =====================================
# BILLING ANALYTICS (Admin Only)
# =====================================

@router.get("/analytics/revenue")
@require_feature("advanced_analytics")
async def get_revenue_analytics(
    period: str = "monthly",
    current_user: UserResponse = Depends(get_current_user)
):
    """Get revenue analytics (admin feature)"""
    try:
        # This would include comprehensive revenue analytics
        # For now, return basic metrics
        async with get_db_connection() as conn:
            # Get subscription counts by plan
            plan_counts = await conn.fetch("""
                SELECT sp.plan_type, COUNT(us.id) as count
                FROM subscription_plans sp
                LEFT JOIN user_subscriptions us ON sp.id = us.plan_id 
                    AND us.status IN ('active', 'trialing')
                GROUP BY sp.plan_type
                ORDER BY sp.price_monthly ASC
            """)
            
            # Get total revenue (simplified)
            total_revenue = await conn.fetchval("""
                SELECT COALESCE(SUM(amount), 0) 
                FROM user_subscriptions 
                WHERE status = 'active'
            """)
            
            return {
                "period": period,
                "total_revenue": float(total_revenue or 0),
                "plan_distribution": [
                    {"plan_type": row['plan_type'], "count": row['count']}
                    for row in plan_counts
                ],
                "currency": "GBP"
            }
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get revenue analytics: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve analytics"
        )

# =====================================
# INITIALIZATION
# =====================================

@router.post("/initialize-plans")
async def initialize_subscription_plans():
    """Initialize subscription plans (admin endpoint)"""
    try:
        await billing_service.initialize_plans()
        return {"message": "Subscription plans initialized successfully"}
        
    except Exception as e:
        logger.error(f"Failed to initialize plans: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to initialize subscription plans"
        ) 