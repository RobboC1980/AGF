#!/usr/bin/env python3
"""
Backend startup script that properly loads environment variables
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables first
env_file = Path(__file__).parent / ".env"
if env_file.exists():
    load_dotenv(env_file)
    print(f"✅ Loaded environment variables from {env_file}")
else:
    print(f"⚠️  No .env file found at {env_file}")

# Verify critical environment variables
database_url = os.getenv("DATABASE_URL")
if database_url:
    print(f"✅ DATABASE_URL loaded: {database_url[:50]}...")
else:
    print("❌ DATABASE_URL not found in environment variables")
    exit(1)

# Now import and run the main application
if __name__ == "__main__":
    import uvicorn
    from complete_main import app
    
    print("🚀 Starting AgileForge Backend...")
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=4000,
        reload=False,  # Disable reload to avoid import issues
        log_level="info"
    ) 