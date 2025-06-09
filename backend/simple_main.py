from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os

# Create FastAPI app
app = FastAPI(
    title="AgileForge API",
    description="AI-Powered Agile Project Management Platform",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS configuration
allowed_origins = [
    "http://localhost:3000",  # Next.js dev server
    "http://localhost:3001",  # Alternative port
    "https://v0-agile-forge-40higfdur-clariq.vercel.app",  # Deployed frontend
    "https://*.vercel.app",  # Vercel preview deployments
]

# Add environment-specific origins
if os.getenv("FRONTEND_URL"):
    allowed_origins.append(os.getenv("FRONTEND_URL"))

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
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
        "environment": os.getenv("ENVIRONMENT", "development"),
        "version": "1.0.0",
        "message": "Backend is running successfully!"
    }

@app.get("/")
async def root():
    return {
        "message": "AgileForge API is running!",
        "version": "1.0.0",
        "status": "operational",
        "docs": "/docs"
    }

# Basic API endpoints for testing
@app.get("/api/status")
async def api_status():
    return {
        "api": "operational",
        "database": "connected",
        "services": "running"
    }

@app.get("/api/stories")
async def get_stories():
    # Mock data for now
    return {
        "stories": [
            {
                "id": "1",
                "title": "Sample User Story",
                "description": "This is a sample story for testing",
                "status": "in-progress",
                "priority": "high"
            }
        ]
    }

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 4000))
    uvicorn.run(
        "simple_main:app",
        host="0.0.0.0",
        port=port,
        reload=True
    ) 