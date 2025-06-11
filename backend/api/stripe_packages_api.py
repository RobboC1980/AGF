"""
AgileForge Stripe Packages API
API endpoints for managing Stripe packages, checkout sessions, and purchases
"""

from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.responses import JSONResponse
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
import logging
import stripe
from datetime import datetime, timedelta

from ..services.stripe_packages import stripe_package_manager, PackageType
from ..auth.auth_service import get_current_user
from ..database.connection import get_db_connection

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/packages", tags=["packages"])

# Pydantic models
class CheckoutSessionRequest(BaseModel):
    package_id: str
    success_url: str
    cancel_url: str
    trial_days: Optional[int] = None

class PackageResponse(BaseModel):
    id: str
    name: str
    description: str
    type: str
    billing_interval: str
    price: float
    currency: str
    features: Dict[str, Any]
    feature_list: List[str]
    trial_days: Optional[int] = 0
    popular: Optional[bool] = False
    savings: Optional[str] = None
    requires_subscription: Optional[bool] = False

class CheckoutSessionResponse(BaseModel):
    session_id: str
    url: str
    package: PackageResponse

class PurchaseHistoryResponse(BaseModel):
    id: str
    package_id: str
    package_name: str
    purchase_type: str
    amount: float
    currency: str
    status: str
    credits_granted: int
    credits_used: int
    expires_at: Optional[datetime]
    created_at: datetime

@router.get("/", response_model=List[PackageResponse])
async def get_all_packages(
    package_type: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get all available packages, optionally filtered by type"""
    try:
        # Convert string to enum if provided
        filter_type = None
        if package_type:
            try:
                filter_type = PackageType(package_type)
            except ValueError:
                raise HTTPException(status_code=400, detail=f"Invalid package type: {package_type}")
        
        packages = await stripe_package_manager.get_all_packages(filter_type)
        
        return [PackageResponse(**package) for package in packages]
        
    except Exception as e:
        logger.error(f"Failed to get packages: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve packages")

@router.get("/subscriptions", response_model=Dict[str, Any])
async def get_subscription_packages(current_user: dict = Depends(get_current_user)):
    """Get all subscription packages grouped by plan type"""
    try:
        packages = await stripe_package_manager.get_subscription_packages()
        return packages
        
    except Exception as e:
        logger.error(f"Failed to get subscription packages: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve subscription packages")

@router.get("/addons", response_model=List[PackageResponse])
async def get_addon_packages(current_user: dict = Depends(get_current_user)):
    """Get all add-on packages"""
    try:
        packages = await stripe_package_manager.get_addon_packages()
        return [PackageResponse(**package) for package in packages]
        
    except Exception as e:
        logger.error(f"Failed to get addon packages: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve addon packages")

@router.get("/credits", response_model=List[PackageResponse])
async def get_credit_packages(current_user: dict = Depends(get_current_user)):
    """Get all credit pack packages"""
    try:
        packages = await stripe_package_manager.get_credit_packages()
        return [PackageResponse(**package) for package in packages]
        
    except Exception as e:
        logger.error(f"Failed to get credit packages: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve credit packages")

@router.get("/{package_id}", response_model=PackageResponse)
async def get_package(
    package_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get a specific package by ID"""
    try:
        package = await stripe_package_manager.get_package(package_id)
        if not package:
            raise HTTPException(status_code=404, detail="Package not found")
        
        return PackageResponse(**package)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get package {package_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve package")

@router.post("/checkout", response_model=CheckoutSessionResponse)
async def create_checkout_session(
    request: CheckoutSessionRequest,
    current_user: dict = Depends(get_current_user)
):
    """Create a Stripe checkout session for a package"""
    try:
        # Validate package exists
        package = await stripe_package_manager.get_package(request.package_id)
        if not package:
            raise HTTPException(status_code=404, detail="Package not found")
        
        # Check if user already has an active subscription for subscription packages
        if package["type"] == PackageType.SUBSCRIPTION.value:
            async with get_db_connection() as conn:
                existing_sub = await conn.fetchrow("""
                    SELECT * FROM user_subscriptions 
                    WHERE user_id = $1 AND status IN ('active', 'trialing')
                """, current_user["id"])
                
                if existing_sub:
                    raise HTTPException(
                        status_code=400, 
                        detail="User already has an active subscription"
                    )
        
        # Check if add-on requires subscription
        if package.get("requires_subscription", False):
            async with get_db_connection() as conn:
                active_sub = await conn.fetchrow("""
                    SELECT * FROM user_subscriptions 
                    WHERE user_id = $1 AND status IN ('active', 'trialing')
                """, current_user["id"])
                
                if not active_sub:
                    raise HTTPException(
                        status_code=400, 
                        detail="This add-on requires an active subscription"
                    )
        
        # Create checkout session
        session_data = await stripe_package_manager.create_checkout_session(
            package_id=request.package_id,
            user_id=current_user["id"],
            success_url=request.success_url,
            cancel_url=request.cancel_url,
            trial_days=request.trial_days
        )
        
        return CheckoutSessionResponse(**session_data)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to create checkout session: {e}")
        raise HTTPException(status_code=500, detail="Failed to create checkout session")

@router.get("/user/purchases", response_model=List[PurchaseHistoryResponse])
async def get_user_purchases(
    current_user: dict = Depends(get_current_user),
    limit: int = 50,
    offset: int = 0
):
    """Get user's purchase history"""
    try:
        async with get_db_connection() as conn:
            purchases = await conn.fetch("""
                SELECT 
                    up.*,
                    sp.name as package_name
                FROM user_purchases up
                LEFT JOIN stripe_products sp ON up.package_id = sp.package_id
                WHERE up.user_id = $1
                ORDER BY up.created_at DESC
                LIMIT $2 OFFSET $3
            """, current_user["id"], limit, offset)
            
            return [
                PurchaseHistoryResponse(
                    id=str(purchase["id"]),
                    package_id=purchase["package_id"],
                    package_name=purchase["package_name"] or purchase["package_id"],
                    purchase_type=purchase["purchase_type"],
                    amount=float(purchase["amount"]),
                    currency=purchase["currency"],
                    status=purchase["status"],
                    credits_granted=purchase["credits_granted"],
                    credits_used=purchase["credits_used"],
                    expires_at=purchase["expires_at"],
                    created_at=purchase["created_at"]
                )
                for purchase in purchases
            ]
            
    except Exception as e:
        logger.error(f"Failed to get user purchases: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve purchase history")

@router.get("/user/credits")
async def get_user_credits(current_user: dict = Depends(get_current_user)):
    """Get user's current credit balances"""
    try:
        async with get_db_connection() as conn:
            credits = await conn.fetch("""
                SELECT * FROM user_credit_summary
                WHERE user_id = $1
            """, current_user["id"])
            
            result = {}
            for credit in credits:
                result[credit["credit_type"]] = {
                    "total_credits": credit["total_credits"],
                    "used_credits": credit["used_credits"],
                    "remaining_credits": credit["remaining_credits"],
                    "earliest_expiry": credit["earliest_expiry"],
                    "credit_sources": credit["credit_sources"]
                }
            
            return result
            
    except Exception as e:
        logger.error(f"Failed to get user credits: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve credit information")

@router.post("/webhook")
async def stripe_webhook(request: Request):
    """Handle Stripe webhooks"""
    try:
        payload = await request.body()
        sig_header = request.headers.get("stripe-signature")
        
        if not sig_header:
            raise HTTPException(status_code=400, detail="Missing Stripe signature")
        
        # Verify webhook signature
        webhook_secret = stripe_package_manager.webhook_secret
        if webhook_secret:
            try:
                event = stripe.Webhook.construct_event(
                    payload, sig_header, webhook_secret
                )
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid payload")
            except stripe.error.SignatureVerificationError:
                raise HTTPException(status_code=400, detail="Invalid signature")
        else:
            # For development without webhook secret
            import json
            event = json.loads(payload)
        
        # Handle different event types
        if event["type"] == "checkout.session.completed":
            await handle_checkout_completed(event["data"]["object"])
        elif event["type"] == "payment_intent.succeeded":
            await handle_payment_succeeded(event["data"]["object"])
        elif event["type"] == "invoice.payment_succeeded":
            await handle_subscription_payment(event["data"]["object"])
        elif event["type"] == "customer.subscription.deleted":
            await handle_subscription_cancelled(event["data"]["object"])
        
        return {"status": "success"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Webhook error: {e}")
        raise HTTPException(status_code=500, detail="Webhook processing failed")

async def handle_checkout_completed(session):
    """Handle completed checkout session"""
    try:
        async with get_db_connection() as conn:
            # Update checkout session status
            await conn.execute("""
                UPDATE checkout_sessions 
                SET status = 'completed', completed_at = NOW()
                WHERE stripe_session_id = $1
            """, session["id"])
            
            # Get session details
            checkout_session = await conn.fetchrow("""
                SELECT * FROM checkout_sessions 
                WHERE stripe_session_id = $1
            """, session["id"])
            
            if not checkout_session:
                logger.error(f"Checkout session not found: {session['id']}")
                return
            
            # Get package details
            package = await stripe_package_manager.get_package(checkout_session["package_id"])
            if not package:
                logger.error(f"Package not found: {checkout_session['package_id']}")
                return
            
            # Create purchase record
            purchase_id = await conn.fetchval("""
                INSERT INTO user_purchases (
                    user_id, package_id, purchase_type, amount, currency,
                    status, credits_granted, stripe_payment_intent_id
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING id
            """, 
                checkout_session["user_id"],
                checkout_session["package_id"],
                package["type"],
                package["price"],
                package["currency"],
                "completed",
                package["features"].get("ai_stories", 0),
                session.get("payment_intent")
            )
            
            # Grant credits if applicable
            if package["type"] == PackageType.CREDIT_PACK.value:
                await grant_credits(
                    checkout_session["user_id"],
                    "ai_stories",
                    package["features"]["ai_stories"],
                    purchase_id,
                    package["features"].get("expires_days")
                )
            
            logger.info(f"Processed checkout completion for session {session['id']}")
            
    except Exception as e:
        logger.error(f"Failed to handle checkout completion: {e}")

async def handle_payment_succeeded(payment_intent):
    """Handle successful payment"""
    logger.info(f"Payment succeeded: {payment_intent['id']}")

async def handle_subscription_payment(invoice):
    """Handle subscription payment"""
    logger.info(f"Subscription payment: {invoice['id']}")

async def handle_subscription_cancelled(subscription):
    """Handle subscription cancellation"""
    logger.info(f"Subscription cancelled: {subscription['id']}")

async def grant_credits(user_id: str, credit_type: str, amount: int, purchase_id: str, expires_days: Optional[int] = None):
    """Grant credits to a user"""
    try:
        async with get_db_connection() as conn:
            expires_at = None
            if expires_days:
                expires_at = datetime.utcnow() + timedelta(days=expires_days)
            
            await conn.execute("""
                INSERT INTO user_credits (
                    user_id, credit_type, total_credits, used_credits,
                    expires_at, source_purchase_id
                ) VALUES ($1, $2, $3, $4, $5, $6)
            """, user_id, credit_type, amount, 0, expires_at, purchase_id)
            
            logger.info(f"Granted {amount} {credit_type} credits to user {user_id}")
            
    except Exception as e:
        logger.error(f"Failed to grant credits: {e}")

# Analytics endpoints (admin only)
@router.get("/analytics/performance")
async def get_package_performance(current_user: dict = Depends(get_current_user)):
    """Get package performance analytics (admin only)"""
    # Add admin check here
    try:
        async with get_db_connection() as conn:
            performance = await conn.fetch("SELECT * FROM package_performance")
            
            return [dict(row) for row in performance]
            
    except Exception as e:
        logger.error(f"Failed to get package performance: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve analytics") 