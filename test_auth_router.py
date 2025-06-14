#!/usr/bin/env python3
"""
Test script to verify auth router inclusion
"""

from fastapi import FastAPI
from backend.auth.auth_endpoints import auth_router

# Create a simple test app
app = FastAPI()

# Include the auth router
app.include_router(auth_router)

# Print all routes
print("All routes in the app:")
for route in app.routes:
    if hasattr(route, 'methods') and hasattr(route, 'path'):
        print(f"  {route.methods} {route.path}")

# Check if auth routes are included
auth_routes = [route for route in app.routes if hasattr(route, 'path') and route.path.startswith('/auth')]
print(f"\nFound {len(auth_routes)} auth routes:")
for route in auth_routes:
    if hasattr(route, 'methods'):
        print(f"  {route.methods} {route.path}") 