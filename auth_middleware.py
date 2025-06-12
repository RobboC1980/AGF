from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
import os
import jwt
import logging
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)

class SupabaseAuthMiddleware(BaseHTTPMiddleware):
    """
    Middleware for handling Supabase authentication tokens.
    This middleware will:
    1. Extract the JWT token from the Authorization header
    2. Verify the token with the Supabase JWT secret
    3. Add the user information to the request state
    """

    def __init__(self, app, public_routes=None):
        super().__init__(app)
        self.jwt_secret = os.getenv("SUPABASE_JWT_SECRET")
        if not self.jwt_secret:
            logger.warning("SUPABASE_JWT_SECRET not set. Authentication will fail.")
            
        # Routes that don't require authentication
        self.public_routes = public_routes or [
            "/",
            "/health",
            "/docs",
            "/openapi.json",
            "/redoc"
        ]

    async def dispatch(self, request: Request, call_next):
        # Skip authentication for public routes
        for route in self.public_routes:
            if request.url.path.startswith(route):
                return await call_next(request)
                
        # For OPTIONS requests (CORS preflight)
        if request.method == "OPTIONS":
            return await call_next(request)
        
        # Skip authentication for API routes intended to be public
        if request.url.path.startswith("/api/"):
            return await call_next(request)
            
        token = self._extract_token(request)
        if not token:
            return JSONResponse(
                status_code=401,
                content={"detail": "Bearer token missing or invalid"}
            )
            
        try:
            payload = self._verify_token(token)
            # Add user info to request state for use in endpoint handlers
            request.state.user = payload
            return await call_next(request)
        except jwt.PyJWTError as e:
            logger.warning(f"JWT validation error: {str(e)}")
            return JSONResponse(
                status_code=401,
                content={"detail": f"Invalid authentication token: {str(e)}"}
            )
        except Exception as e:
            logger.error(f"Auth error: {str(e)}")
            return JSONResponse(
                status_code=500,
                content={"detail": "Internal server error during authentication"}
            )
            
    def _extract_token(self, request: Request) -> Optional[str]:
        """Extract bearer token from Authorization header"""
        auth_header = request.headers.get("Authorization")
        if not auth_header:
            return None
            
        parts = auth_header.split()
        if len(parts) != 2 or parts[0].lower() != "bearer":
            return None
            
        return parts[1]
        
    def _verify_token(self, token: str) -> Dict[str, Any]:
        """Verify JWT token using Supabase JWT secret"""
        if not self.jwt_secret:
            raise ValueError("SUPABASE_JWT_SECRET not set")
            
        # Decode and verify the token
        payload = jwt.decode(
            token,
            self.jwt_secret,
            algorithms=["HS256"],
            options={"verify_signature": True}
        )
        
        # Check required claims
        if "sub" not in payload:
            raise ValueError("Missing sub claim in token")
            
        return payload 