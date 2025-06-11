#!/usr/bin/env python3
"""
Initialize Stripe Packages
Script to set up all Stripe products and packages in the database
"""

import asyncio
import sys
import os
import logging

# Add the backend directory to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.stripe_packages import stripe_package_manager
from database.connection import get_db_connection

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def create_tables():
    """Create the necessary database tables"""
    try:
        async with get_db_connection() as conn:
            # Read and execute the schema file
            schema_path = os.path.join(os.path.dirname(__file__), '..', 'database', 'stripe_schema.sql')
            
            if os.path.exists(schema_path):
                with open(schema_path, 'r') as f:
                    schema_sql = f.read()
                
                # Execute the schema
                await conn.execute(schema_sql)
                logger.info("Database tables created successfully")
            else:
                logger.warning("Schema file not found, skipping table creation")
                
    except Exception as e:
        logger.error(f"Failed to create tables: {e}")
        raise

async def initialize_packages():
    """Initialize all Stripe packages"""
    try:
        # Create database tables first
        await create_tables()
        
        # Initialize Stripe products
        await stripe_package_manager.initialize_stripe_products()
        
        # Insert package data into database
        async with get_db_connection() as conn:
            for package_id, config in stripe_package_manager.packages.items():
                if config.get("custom_pricing"):
                    continue  # Skip custom pricing packages
                
                # Check if package already exists
                existing = await conn.fetchrow(
                    "SELECT id FROM stripe_products WHERE package_id = $1",
                    package_id
                )
                
                if existing:
                    logger.info(f"Package {package_id} already exists, updating...")
                    await conn.execute("""
                        UPDATE stripe_products SET
                            name = $2,
                            description = $3,
                            type = $4,
                            billing_interval = $5,
                            price = $6,
                            currency = $7,
                            features = $8,
                            feature_list = $9,
                            trial_days = $10,
                            popular = $11,
                            requires_subscription = $12,
                            updated_at = NOW()
                        WHERE package_id = $1
                    """, 
                        package_id,
                        config["name"],
                        config["description"],
                        config["type"].value,
                        config["billing_interval"].value,
                        config["price"],
                        config["currency"],
                        config["features"],
                        config["feature_list"],
                        config.get("trial_days", 0),
                        config.get("popular", False),
                        config.get("requires_subscription", False)
                    )
                else:
                    logger.info(f"Creating package {package_id}...")
                    await conn.execute("""
                        INSERT INTO stripe_products (
                            package_id, name, description, type, billing_interval,
                            price, currency, features, feature_list, trial_days,
                            popular, requires_subscription, active
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
                    """, 
                        package_id,
                        config["name"],
                        config["description"],
                        config["type"].value,
                        config["billing_interval"].value,
                        config["price"],
                        config["currency"],
                        config["features"],
                        config["feature_list"],
                        config.get("trial_days", 0),
                        config.get("popular", False),
                        config.get("requires_subscription", False),
                        True
                    )
        
        logger.info("All packages initialized successfully!")
        
        # Print summary
        packages = await stripe_package_manager.get_all_packages()
        logger.info(f"Total packages: {len(packages)}")
        
        for package_type in ["subscription", "credit_pack", "add_on"]:
            type_packages = [p for p in packages if p["type"] == package_type]
            logger.info(f"  {package_type}: {len(type_packages)} packages")
        
    except Exception as e:
        logger.error(f"Failed to initialize packages: {e}")
        raise

async def main():
    """Main function"""
    try:
        logger.info("Starting Stripe packages initialization...")
        await initialize_packages()
        logger.info("Initialization completed successfully!")
        
    except Exception as e:
        logger.error(f"Initialization failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main()) 