from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os

# Create FastAPI app
app = FastAPI(
    title="AgileForge API",
    description="Development API Server",
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
        "version": "1.0.0"
    }

@app.get("/")
async def root():
    return {
        "message": "AgileForge API - Development Server",
        "version": "1.0.0",
        "docs": "/docs"
    }

# Simple endpoints for testing
@app.get("/api/projects")
async def get_projects():
    return {
        "projects": [
            {"id": 1, "name": "Sample Project", "description": "A sample project"},
        ]
    }

@app.get("/api/stories")
async def get_stories():
    return {
        "stories": [
            {"id": 1, "title": "Sample Story", "description": "A sample story"},
        ]
    }

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(
        "simple_backend:app",
        host="0.0.0.0",
        port=port,
        reload=True
    ) 