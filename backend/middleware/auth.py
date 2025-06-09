from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
import logging

logger = logging.getLogger(__name__)

class AuthMiddleware(BaseHTTPMiddleware):
    """Authentication middleware for processing requests"""
    
    async def dispatch(self, request: Request, call_next):
        # Skip auth for public endpoints
        public_paths = ["/health", "/", "/docs", "/redoc", "/openapi.json"]
        
        if request.url.path in public_paths:
            response = await call_next(request)
            return response
        
        # For auth endpoints, allow without token
        if request.url.path.startswith("/api/auth"):
            response = await call_next(request)
            return response
        
        # Process the request
        response = await call_next(request)
        return response 