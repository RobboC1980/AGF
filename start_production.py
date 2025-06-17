#!/usr/bin/env python3
"""
Production startup script for AgileForge
Handles graceful startup and shutdown with proper resource management
"""

import os
import sys
import signal
import logging
import uvicorn
from pathlib import Path

# Add the project root to Python path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler("production.log")
    ]
)
logger = logging.getLogger(__name__)

def signal_handler(signum, frame):
    """Handle shutdown signals gracefully"""
    logger.info(f"Received signal {signum}, shutting down gracefully...")
    sys.exit(0)

def main():
    """Main startup function"""
    # Set up signal handlers
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    # Set environment variables
    os.environ.setdefault("ENVIRONMENT", "production")
    os.environ.setdefault("LOG_LEVEL", "INFO")
    
    # Get configuration
    port = int(os.getenv("PORT", 8000))
    host = os.getenv("HOST", "0.0.0.0")
    workers = int(os.getenv("WORKERS", 1))
    
    logger.info(f"Starting AgileForge Production Server on {host}:{port}")
    logger.info(f"Workers: {workers}")
    logger.info(f"Environment: {os.getenv('ENVIRONMENT')}")
    
    try:
        # Start the server
        uvicorn.run(
            "production_backend:app",
            host=host,
            port=port,
            workers=workers,
            log_level="info",
            access_log=True,
            reload=False,
            loop="uvloop" if sys.platform != "win32" else "asyncio"
        )
    except Exception as e:
        logger.error(f"Failed to start server: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main() 