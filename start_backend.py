#!/usr/bin/env python3
"""
AgileForge Backend Startup Script
Properly handles module imports and starts the FastAPI server
"""

import os
import sys
import logging

# Add project root to Python path
project_root = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, project_root)

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def main():
    """Start the AgileForge backend server"""
    try:
        # Import after path setup
        from backend.main import app
        import uvicorn
        
        # Get configuration
        host = os.getenv("HOST", "0.0.0.0")
        port = int(os.getenv("PORT", 8000))
        environment = os.getenv("ENVIRONMENT", "development")
        
        logger.info(f"Starting AgileForge API server on {host}:{port}")
        logger.info(f"Environment: {environment}")
        
        # Start server
        uvicorn.run(
            "backend.main:app",
            host=host,
            port=port,
            reload=environment == "development",
            log_level="info" if environment == "production" else "debug"
        )
        
    except ImportError as e:
        logger.error(f"Import error: {e}")
        logger.error("Make sure you're running from the project root directory")
        sys.exit(1)
    except Exception as e:
        logger.error(f"Failed to start server: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main() 