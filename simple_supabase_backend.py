from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
import logging
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Supabase configuration
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

# Print environment info for debugging
logger.info(f"SUPABASE_URL: {SUPABASE_URL}")
logger.info(f"SUPABASE_ANON_KEY: {SUPABASE_ANON_KEY is not None}")
logger.info(f"SUPABASE_SERVICE_ROLE_KEY: {SUPABASE_SERVICE_ROLE_KEY is not None}")

# Create FastAPI app
app = FastAPI(
    title="AgileForge API",
    description="Supabase-powered API Server",
    version="1.0.0",
)

# CORS configuration
allowed_origins = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"]
)

# Health check endpoint
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "environment": "development",
        "version": "1.0.0",
        "supabase_url": SUPABASE_URL,
        "supabase_keys_configured": bool(SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY)
    }

@app.get("/")
async def root():
    return {
        "message": "AgileForge API - Supabase-powered Development Server",
        "version": "1.0.0",
        "docs": "/docs"
    }

# Simple endpoints for testing
@app.get("/api/projects")
async def get_projects():
    # Just return dummy data for now
    return {
        "projects": [
            {"id": "1", "name": "Sample Project", "description": "A sample project"},
        ]
    }

@app.get("/api/stories")
async def get_stories():
    # Just return dummy data for now
    return {
        "stories": [
            {"id": "1", "title": "Sample Story", "description": "A sample story"},
        ]
    }

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8001))
    logger.info(f"Starting server on port {port}")
    uvicorn.run(
        "simple_supabase_backend:app",
        host="0.0.0.0",
        port=port,
        reload=True
    ) 