#!/usr/bin/env python3
"""
Simple test version of the FastAPI app to debug startup issues
"""

import os
import sys

# Add the parent directory to Python path to enable proper imports
parent_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

print("🚀 Starting simple FastAPI test...")

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

print("✅ FastAPI imports successful")

# Create a simple FastAPI app without complex startup
app = FastAPI(
    title="AgileForge API Test",
    description="Simple test version",
    version="test",
    docs_url="/docs",
    redoc_url="/redoc"
)

print("✅ FastAPI app created")

# Add CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["*"],
)

print("✅ CORS middleware added")

@app.get("/")
def root():
    return {
        "message": "AgileForge API Test",
        "status": "running",
        "version": "test"
    }

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "environment": os.getenv("ENVIRONMENT", "development"),
        "version": "test"
    }

print("✅ Routes defined")

if __name__ == "__main__":
    print("🚀 Starting uvicorn server on port 8888...")
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8888, log_level="info") 