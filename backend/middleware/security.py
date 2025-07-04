"""
Advanced Security Middleware
Implements rate limiting, circuit breakers, and security headers
"""

import time
import hashlib
from datetime import datetime, timedelta
from typing import Dict, Optional, Callable
from fastapi import Request, Response, HTTPException
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from pybreaker import CircuitBreaker, CircuitBreakerError
import structlog
import redis
import os

logger = structlog.get_logger()

# Redis for rate limiting
redis_client = redis.Redis.from_url(os.getenv("REDIS_URL", "redis://localhost:6379/0"))

# Initialize rate limiter
limiter = Limiter(
    key_func=get_remote_address,
    storage_uri=os.getenv("REDIS_URL", "redis://localhost:6379/0"),
    default_limits=["100/minute"]
)

# Circuit breakers for external services
ai_service_breaker = CircuitBreaker(
    fail_max=5,
    reset_timeout=60,
    exclude=[HTTPException]
)

database_breaker = CircuitBreaker(
    fail_max=3,
    reset_timeout=30,
    exclude=[HTTPException]
)

class SecurityMiddleware(BaseHTTPMiddleware):
    """
    Advanced security middleware with multiple protection layers
    """
    
    def __init__(self, app: ASGIApp):
        super().__init__(app)
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Apply security headers
        response = await call_next(request)
        
        # Security headers
        response.headers.update({
            "X-Content-Type-Options": "nosniff",
            "X-Frame-Options": "DENY", 
            "X-XSS-Protection": "1; mode=block",
            "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
            "Content-Security-Policy": "default-src 'self'",
            "Referrer-Policy": "strict-origin-when-cross-origin",
            "Permissions-Policy": "geolocation=(), microphone=(), camera=()"
        })
        
        return response

# Note: JWT token management is now handled by the authentication dependencies
# This prevents conflicts with Clerk's RS256 JWT tokens

class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Advanced rate limiting with different rules for different endpoints
    """
    
    def __init__(self, app: ASGIApp):
        super().__init__(app)
        self.redis_client = redis_client
        
        # Rate limiting rules
        self.rate_limits = {
            "/api/auth/login": (5, 300),  # 5 attempts per 5 minutes
            "/api/auth/register": (3, 3600),  # 3 attempts per hour
            "/api/ai/": (10, 60),  # 10 AI requests per minute
            "/api/analytics/": (30, 60),  # 30 analytics requests per minute
            "default": (100, 60)  # 100 requests per minute default
        }
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        client_ip = self._get_client_ip(request)
        path = request.url.path
        
        # Get rate limit for this endpoint
        limit, window = self._get_rate_limit(path)
        
        # Check rate limit
        if await self._is_rate_limited(client_ip, path, limit, window):
            logger.warning(
                "Rate limit exceeded",
                client_ip=client_ip,
                path=path,
                limit=limit,
                window=window
            )
            
            return JSONResponse(
                status_code=429,
                content={
                    "error": "Rate limit exceeded",
                    "message": f"Too many requests. Limit: {limit} per {window} seconds",
                    "retry_after": window
                },
                headers={"Retry-After": str(window)}
            )
        
        # Process request
        response = await call_next(request)
        
        # Add rate limit headers
        remaining = await self._get_remaining_requests(client_ip, path, limit, window)
        response.headers.update({
            "X-RateLimit-Limit": str(limit),
            "X-RateLimit-Remaining": str(remaining),
            "X-RateLimit-Reset": str(int(time.time()) + window)
        })
        
        return response
    
    def _get_client_ip(self, request: Request) -> str:
        """Get client IP address"""
        # Check for forwarded headers
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()
        
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip
        
        return request.client.host if request.client else "unknown"
    
    def _get_rate_limit(self, path: str) -> tuple[int, int]:
        """Get rate limit for a specific path"""
        for pattern, (limit, window) in self.rate_limits.items():
            if path.startswith(pattern):
                return limit, window
        return self.rate_limits["default"]
    
    async def _is_rate_limited(self, client_ip: str, path: str, limit: int, window: int) -> bool:
        """Check if client is rate limited"""
        try:
            key = f"rate_limit:{client_ip}:{path}"
            current_time = int(time.time())
            window_start = current_time - window
            
            # Use Redis sorted set for sliding window
            pipe = self.redis_client.pipeline()
            
            # Remove old entries
            pipe.zremrangebyscore(key, 0, window_start)
            
            # Count current requests
            pipe.zcard(key)
            
            # Add current request
            pipe.zadd(key, {str(current_time): current_time})
            
            # Set expiration
            pipe.expire(key, window)
            
            results = pipe.execute()
            current_requests = results[1]
            
            return current_requests >= limit
            
        except Exception as e:
            logger.error(f"Rate limiting error: {e}")
            # On error, allow request to proceed
            return False
    
    async def _get_remaining_requests(self, client_ip: str, path: str, limit: int, window: int) -> int:
        """Get remaining requests for client"""
        try:
            key = f"rate_limit:{client_ip}:{path}"
            current_time = int(time.time())
            window_start = current_time - window
            
            # Remove old entries and count current
            pipe = self.redis_client.pipeline()
            pipe.zremrangebyscore(key, 0, window_start)
            pipe.zcard(key)
            results = pipe.execute()
            
            current_requests = results[1]
            return max(0, limit - current_requests)
            
        except Exception as e:
            logger.error(f"Error getting remaining requests: {e}")
            return limit

# Circuit breaker decorators
def with_ai_circuit_breaker(func):
    """Decorator to apply circuit breaker to AI service calls"""
    async def wrapper(*args, **kwargs):
        try:
            return await ai_service_breaker(func)(*args, **kwargs)
        except CircuitBreakerError:
            logger.error("AI service circuit breaker open")
            raise HTTPException(
                status_code=503,
                detail="AI service temporarily unavailable"
            )
    return wrapper

def with_database_circuit_breaker(func):
    """Decorator to apply circuit breaker to database calls"""
    async def wrapper(*args, **kwargs):
        try:
            return await database_breaker(func)(*args, **kwargs)
        except CircuitBreakerError:
            logger.error("Database circuit breaker open")
            raise HTTPException(
                status_code=503,
                detail="Database temporarily unavailable"
            )
    return wrapper

# Note: JWT refresh functionality removed to prevent conflicts with Clerk authentication
# All JWT token management is now handled by the Clerk authentication system 