"""
Advanced Security Middleware
Implements rate limiting, circuit breakers, JWT refresh, and security headers
"""

import time
import hashlib
import jwt
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
        self.jwt_secret = os.getenv("JWT_SECRET_KEY", "your-secret-key")
        self.jwt_algorithm = "HS256"
        self.access_token_expire = timedelta(minutes=30)
        self.refresh_token_expire = timedelta(days=7)
    
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

class JWTRefreshManager:
    """
    JWT token refresh and rotation management
    """
    
    def __init__(self):
        self.secret_key = os.getenv("JWT_SECRET_KEY", "your-secret-key")
        self.algorithm = "HS256"
        self.access_token_expire = timedelta(minutes=30)
        self.refresh_token_expire = timedelta(days=7)
        self.redis_client = redis_client
    
    def create_access_token(self, data: Dict) -> str:
        """Create JWT access token"""
        to_encode = data.copy()
        expire = datetime.utcnow() + self.access_token_expire
        to_encode.update({"exp": expire, "type": "access"})
        
        return jwt.encode(to_encode, self.secret_key, algorithm=self.algorithm)
    
    def create_refresh_token(self, data: Dict) -> str:
        """Create JWT refresh token"""
        to_encode = data.copy()
        expire = datetime.utcnow() + self.refresh_token_expire
        to_encode.update({"exp": expire, "type": "refresh"})
        
        token = jwt.encode(to_encode, self.secret_key, algorithm=self.algorithm)
        
        # Store refresh token in Redis with expiration
        user_id = data.get("sub")
        if user_id:
            self.redis_client.setex(
                f"refresh_token:{user_id}",
                int(self.refresh_token_expire.total_seconds()),
                token
            )
        
        return token
    
    def verify_token(self, token: str, token_type: str = "access") -> Optional[Dict]:
        """Verify JWT token"""
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
            
            if payload.get("type") != token_type:
                return None
            
            return payload
            
        except jwt.ExpiredSignatureError:
            logger.warning("Token expired", token_type=token_type)
            return None
        except jwt.InvalidTokenError:
            logger.warning("Invalid token", token_type=token_type)
            return None
    
    def refresh_access_token(self, refresh_token: str) -> Optional[Dict[str, str]]:
        """Refresh access token using refresh token"""
        
        # Verify refresh token
        payload = self.verify_token(refresh_token, "refresh")
        if not payload:
            return None
        
        user_id = payload.get("sub")
        if not user_id:
            return None
        
        # Check if refresh token exists in Redis
        stored_token = self.redis_client.get(f"refresh_token:{user_id}")
        if not stored_token or stored_token.decode() != refresh_token:
            logger.warning("Refresh token not found or invalid", user_id=user_id)
            return None
        
        # Create new tokens
        user_data = {"sub": user_id, "email": payload.get("email")}
        new_access_token = self.create_access_token(user_data)
        new_refresh_token = self.create_refresh_token(user_data)
        
        # Invalidate old refresh token
        self.redis_client.delete(f"refresh_token:{user_id}")
        
        logger.info("Tokens refreshed successfully", user_id=user_id)
        
        return {
            "access_token": new_access_token,
            "refresh_token": new_refresh_token,
            "token_type": "bearer"
        }
    
    def revoke_refresh_token(self, user_id: str):
        """Revoke refresh token for user"""
        self.redis_client.delete(f"refresh_token:{user_id}")
        logger.info("Refresh token revoked", user_id=user_id)

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
    
    def _get_rate_limit(self, path: str) -> tuple:
        """Get rate limit for specific path"""
        for pattern, (limit, window) in self.rate_limits.items():
            if pattern in path:
                return limit, window
        return self.rate_limits["default"]
    
    async def _is_rate_limited(self, client_ip: str, path: str, limit: int, window: int) -> bool:
        """Check if client is rate limited"""
        key = f"rate_limit:{client_ip}:{path}"
        
        try:
            current = self.redis_client.get(key)
            if current is None:
                # First request
                self.redis_client.setex(key, window, 1)
                return False
            
            current_count = int(current)
            if current_count >= limit:
                return True
            
            # Increment counter
            self.redis_client.incr(key)
            return False
            
        except Exception as e:
            logger.error("Rate limiting error", error=str(e))
            return False
    
    async def _get_remaining_requests(self, client_ip: str, path: str, limit: int, window: int) -> int:
        """Get remaining requests for client"""
        key = f"rate_limit:{client_ip}:{path}"
        
        try:
            current = self.redis_client.get(key)
            if current is None:
                return limit
            
            return max(0, limit - int(current))
            
        except Exception:
            return limit
    
    def _get_client_ip(self, request: Request) -> str:
        """Extract client IP from request"""
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()
        
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip
        
        if hasattr(request, "client") and request.client:
            return request.client.host
        
        return "unknown"

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

# Global instances
jwt_manager = JWTRefreshManager()

def get_jwt_manager() -> JWTRefreshManager:
    """Get JWT refresh manager instance"""
    return jwt_manager 