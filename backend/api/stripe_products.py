"""
Stripe Products Management API
Endpoints for creating and managing Stripe products and prices
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import stripe
import os
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/stripe", tags=["stripe-products"])

# Initialize Stripe
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

class ProductCreateRequest(BaseModel):
    name: str = Field(..., description="Product name")
    description: str = Field(..., description="Product description")
    price: int = Field(..., description="Price in cents")
    interval: str = Field(default="month", description="Billing interval")
    currency: str = Field(default="usd", description="Currency code")
    metadata: Optional[Dict[str, str]] = Field(default=None, description="Additional metadata")

class ProductResponse(BaseModel):
    product_id: str
    price_id: str
    name: str
    description: str
    price_amount: int
    currency: str
    interval: str
    active: bool
    created: datetime

@router.post("/products", response_model=ProductResponse)
async def create_product(product_data: ProductCreateRequest):
    """Create a new Stripe product with price"""
    
    if not stripe.api_key:
        raise HTTPException(status_code=500, detail="Stripe not configured")
    
    try:
        # Create product
        product = stripe.Product.create(
            name=product_data.name,
            description=product_data.description,
            metadata=product_data.metadata or {"app": "agileforge"}
        )
        
        # Create price
        price = stripe.Price.create(
            unit_amount=product_data.price,
            currency=product_data.currency,
            recurring={'interval': product_data.interval},
            product=product.id,
            metadata=product_data.metadata or {"app": "agileforge"}
        )
        
        logger.info(f"Created Stripe product {product.id} with price {price.id}")
        
        return ProductResponse(
            product_id=product.id,
            price_id=price.id,
            name=product.name,
            description=product.description,
            price_amount=price.unit_amount,
            currency=price.currency,
            interval=price.recurring.interval,
            active=product.active,
            created=datetime.fromtimestamp(product.created)
        )
        
    except stripe.error.StripeError as e:
        logger.error(f"Stripe error creating product: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating product: {e}")
        raise HTTPException(status_code=500, detail="Failed to create product")

@router.get("/products", response_model=List[ProductResponse])
async def list_products(limit: int = 10, active_only: bool = True):
    """List all Stripe products"""
    
    if not stripe.api_key:
        raise HTTPException(status_code=500, detail="Stripe not configured")
    
    try:
        products = stripe.Product.list(
            limit=limit,
            active=active_only
        )
        
        result = []
        for product in products.data:
            # Get the first active price for this product
            prices = stripe.Price.list(product=product.id, active=True, limit=1)
            
            if prices.data:
                price = prices.data[0]
                result.append(ProductResponse(
                    product_id=product.id,
                    price_id=price.id,
                    name=product.name,
                    description=product.description or "",
                    price_amount=price.unit_amount,
                    currency=price.currency,
                    interval=price.recurring.interval if price.recurring else "one_time",
                    active=product.active,
                    created=datetime.fromtimestamp(product.created)
                ))
        
        return result
        
    except stripe.error.StripeError as e:
        logger.error(f"Stripe error listing products: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error listing products: {e}")
        raise HTTPException(status_code=500, detail="Failed to list products")

@router.post("/setup-agileforge-products")
async def setup_agileforge_products():
    """Set up the default AgileForge products"""
    
    if not stripe.api_key:
        raise HTTPException(status_code=500, detail="Stripe not configured")
    
    # Default AgileForge products
    products_config = [
        {
            "name": "AgileForge Pro",
            "description": "Professional project management with AI-powered features",
            "price": 2900,  # $29.00
            "interval": "month",
            "metadata": {"app": "agileforge", "tier": "pro"}
        },
        {
            "name": "AgileForge Enterprise",
            "description": "Enterprise-grade project management with advanced security and compliance",
            "price": 9900,  # $99.00
            "interval": "month",
            "metadata": {"app": "agileforge", "tier": "enterprise"}
        }
    ]
    
    created_products = []
    
    try:
        for config in products_config:
            # Check if product already exists
            existing_products = stripe.Product.list(
                active=True,
                limit=100
            )
            
            existing_product = None
            for product in existing_products.data:
                if product.name == config["name"]:
                    existing_product = product
                    break
            
            if existing_product:
                # Get existing price
                prices = stripe.Price.list(product=existing_product.id, active=True, limit=1)
                if prices.data:
                    price = prices.data[0]
                    created_products.append({
                        "product_id": existing_product.id,
                        "price_id": price.id,
                        "name": existing_product.name,
                        "tier": config["metadata"]["tier"],
                        "already_existed": True
                    })
                continue
            
            # Create new product
            product = stripe.Product.create(
                name=config["name"],
                description=config["description"],
                metadata=config["metadata"]
            )
            
            # Create price
            price = stripe.Price.create(
                unit_amount=config["price"],
                currency="usd",
                recurring={'interval': config["interval"]},
                product=product.id,
                metadata=config["metadata"]
            )
            
            created_products.append({
                "product_id": product.id,
                "price_id": price.id,
                "name": product.name,
                "tier": config["metadata"]["tier"],
                "already_existed": False
            })
            
            logger.info(f"Created AgileForge product: {product.name} ({product.id})")
        
        return {
            "success": True,
            "products": created_products,
            "message": "AgileForge products setup complete",
            "update_instructions": {
                "file": "lib/stripe.ts",
                "updates": {
                    "pro_price_id": next((p["price_id"] for p in created_products if p["tier"] == "pro"), None),
                    "enterprise_price_id": next((p["price_id"] for p in created_products if p["tier"] == "enterprise"), None)
                }
            }
        }
        
    except stripe.error.StripeError as e:
        logger.error(f"Stripe error setting up products: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error setting up products: {e}")
        raise HTTPException(status_code=500, detail="Failed to setup products")

@router.delete("/products/{product_id}")
async def deactivate_product(product_id: str):
    """Deactivate a Stripe product"""
    
    if not stripe.api_key:
        raise HTTPException(status_code=500, detail="Stripe not configured")
    
    try:
        # Deactivate product
        product = stripe.Product.modify(product_id, active=False)
        
        # Deactivate all prices for this product
        prices = stripe.Price.list(product=product_id, active=True)
        for price in prices.data:
            stripe.Price.modify(price.id, active=False)
        
        logger.info(f"Deactivated Stripe product {product_id}")
        
        return {"success": True, "message": f"Product {product_id} deactivated"}
        
    except stripe.error.StripeError as e:
        logger.error(f"Stripe error deactivating product: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error deactivating product: {e}")
        raise HTTPException(status_code=500, detail="Failed to deactivate product") 