#!/usr/bin/env python3
"""
Simple test to verify auth router works in FastAPI
"""

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Import auth router
from backend.auth.auth_endpoints import auth_router

# Create FastAPI app
app = FastAPI(title="Auth Test API")

# Add CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include auth router
app.include_router(auth_router)

@app.get("/")
async def root():
    return {"message": "Auth test API is running"}

@app.get("/test-routes")
async def test_routes():
    """List all routes"""
    routes = []
    for route in app.routes:
        if hasattr(route, 'methods') and hasattr(route, 'path'):
            routes.append({
                "methods": list(route.methods),
                "path": route.path
            })
    return {"routes": routes}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=9000) 