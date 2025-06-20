#!/usr/bin/env python3
"""
Script to create Stripe products and prices for AgileForge
Run this once to set up your Stripe products and get the price IDs
"""

import stripe
import os
import json
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def setup_stripe_products():
    """Create Stripe products and prices for AgileForge"""
    
    # Initialize Stripe
    stripe.api_key = os.getenv('STRIPE_SECRET_KEY')
    
    if not stripe.api_key:
        print("❌ STRIPE_SECRET_KEY not found in environment variables")
        print("Make sure you have set STRIPE_SECRET_KEY in your .env file")
        return
    
    print("🚀 Setting up Stripe products for AgileForge...")
    
    # Product configurations
    products_config = [
        {
            'name': 'AgileForge Pro',
            'description': 'Professional project management with AI-powered features',
            'price': 2900,  # $29.00 in cents
            'interval': 'month'
        },
        {
            'name': 'AgileForge Enterprise', 
            'description': 'Enterprise-grade project management with advanced security and compliance',
            'price': 9900,  # $99.00 in cents
            'interval': 'month'
        }
    ]
    
    created_products = {}
    
    try:
        for config in products_config:
            print(f"\n📦 Creating product: {config['name']}")
            
            # Create product
            product = stripe.Product.create(
                name=config['name'],
                description=config['description'],
                metadata={
                    'app': 'agileforge',
                    'tier': config['name'].lower().replace('agileforge ', '')
                }
            )
            
            print(f"✅ Product created: {product.id}")
            
            # Create price
            price = stripe.Price.create(
                unit_amount=config['price'],
                currency='usd',
                recurring={'interval': config['interval']},
                product=product.id,
                metadata={
                    'app': 'agileforge',
                    'tier': config['name'].lower().replace('agileforge ', '')
                }
            )
            
            print(f"✅ Price created: {price.id}")
            
            # Store the results
            tier_name = config['name'].lower().replace('agileforge ', '')
            created_products[tier_name] = {
                'product_id': product.id,
                'price_id': price.id,
                'name': config['name'],
                'price_amount': config['price'],
                'interval': config['interval']
            }
        
        # Print results
        print("\n" + "="*50)
        print("🎉 Stripe Products Created Successfully!")
        print("="*50)
        
        for tier, details in created_products.items():
            print(f"\n{tier.upper()}:")
            print(f"  Product ID: {details['product_id']}")
            print(f"  Price ID: {details['price_id']}")
            print(f"  Amount: ${details['price_amount']/100:.2f}/{details['interval']}")
        
        # Generate code to update lib/stripe.ts
        print("\n" + "="*50)
        print("📝 Update your lib/stripe.ts file:")
        print("="*50)
        print("Replace the placeholder price IDs with these real ones:")
        print(f"priceId: '{created_products['pro']['price_id']}', // Pro plan")
        print(f"priceId: '{created_products['enterprise']['price_id']}', // Enterprise plan")
        
        # Save to JSON file for reference
        with open('stripe-products.json', 'w') as f:
            json.dump(created_products, f, indent=2)
        
        print(f"\n💾 Product details saved to stripe-products.json")
        
        return created_products
        
    except stripe.error.StripeError as e:
        print(f"❌ Stripe error: {e}")
        return None
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return None

def list_existing_products():
    """List existing Stripe products"""
    
    stripe.api_key = os.getenv('STRIPE_SECRET_KEY')
    
    if not stripe.api_key:
        print("❌ STRIPE_SECRET_KEY not found")
        return
    
    try:
        print("📋 Existing Stripe Products:")
        print("="*40)
        
        products = stripe.Product.list(limit=10, active=True)
        
        if not products.data:
            print("No products found")
            return
        
        for product in products.data:
            print(f"\n📦 {product.name}")
            print(f"   ID: {product.id}")
            print(f"   Description: {product.description or 'No description'}")
            
            # Get prices for this product
            prices = stripe.Price.list(product=product.id, active=True)
            for price in prices.data:
                print(f"   💰 Price: ${price.unit_amount/100:.2f}/{price.recurring.interval if price.recurring else 'one-time'}")
                print(f"      Price ID: {price.id}")
    
    except stripe.error.StripeError as e:
        print(f"❌ Stripe error: {e}")

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == "--list":
        list_existing_products()
    else:
        setup_stripe_products() 