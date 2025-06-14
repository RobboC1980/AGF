#!/usr/bin/env python3
"""Quick verification that columns were added"""

import os
from supabase import create_client
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_KEY"))

columns = ['hashed_password', 'roles', 'permissions', 'is_active', 'is_verified']
success = True

for col in columns:
    try:
        result = supabase.table("users").select(col).limit(1).execute()
        logger.info(f"✅ {col} - Added successfully!")
    except Exception:
        logger.error(f"❌ {col} - Still missing")
        success = False

if success:
    logger.info("\n🎉 All columns added! Run: python integration_test.py")
else:
    logger.info("\n⚠️ Some columns still missing. Please run the SQL in Supabase.") 