"""
Production-ready Clerk JWT Authentication Module

This module provides comprehensive Clerk JWT token verification for production use,
including proper signature verification, JWKS caching, and robust error handling.
"""

import json
import jwt
import requests
from typing import Dict, Any, Optional
from datetime import datetime, timedelta
from fastapi import HTTPException, status
from functools import lru_cache
import logging
import os

logger = logging.getLogger(__name__)

class ClerkTokenVerifier:
    """Production-ready Clerk JWT token verifier with JWKS support"""
    
    def __init__(self):
        # Get Clerk configuration from environment
        self.clerk_publishable_key = os.getenv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY")
        self.clerk_secret_key = os.getenv("CLERK_SECRET_KEY")
        self.environment = os.getenv("ENVIRONMENT", "development")
        
        if not self.clerk_publishable_key:
            logger.warning("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY not found in environment")
        
        # Extract instance ID from publishable key
        if self.clerk_publishable_key and self.clerk_publishable_key.startswith("pk_"):
            parts = self.clerk_publishable_key.split("_")
            if len(parts) >= 3:
                self.instance_id = parts[2]
            else:
                self.instance_id = "unknown"
        else:
            self.instance_id = "unknown"
        
        # Build JWKS URL and issuer
        self.jwks_url = f"https://{self.instance_id}.clerk.accounts.dev/.well-known/jwks.json"
        self.issuer = f"https://{self.instance_id}.clerk.accounts.dev"
        
        # Cache for JWKS keys (TTL: 1 hour)
        self._jwks_cache = {}
        self._jwks_cache_time = None
        self._jwks_cache_ttl = timedelta(hours=1)
    
    def _get_jwks_keys(self) -> Dict[str, Any]:
        """Fetch and cache JWKS keys from Clerk"""
        current_time = datetime.utcnow()
        
        # Check cache validity
        if (self._jwks_cache_time and 
            current_time - self._jwks_cache_time < self._jwks_cache_ttl and 
            self._jwks_cache):
            return self._jwks_cache
        
        try:
            logger.info(f"Fetching JWKS from {self.jwks_url}")
            response = requests.get(self.jwks_url, timeout=10)
            response.raise_for_status()
            
            jwks = response.json()
            self._jwks_cache = jwks
            self._jwks_cache_time = current_time
            
            logger.info(f"Successfully cached {len(jwks.get('keys', []))} JWKS keys")
            return jwks
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to fetch JWKS: {e}")
            if self._jwks_cache:
                logger.warning("Using cached JWKS due to fetch failure")
                return self._jwks_cache
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Unable to verify tokens: JWKS unavailable"
            )
    
    def _get_signing_key(self, token: str) -> str:
        """Get the signing key for a JWT token"""
        try:
            # Decode header without verification to get key ID
            unverified_header = jwt.get_unverified_header(token)
            kid = unverified_header.get("kid")
            
            if not kid:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Token missing key ID"
                )
            
            # Get JWKS and find matching key
            jwks = self._get_jwks_keys()
            keys = jwks.get("keys", [])
            
            for key in keys:
                if key.get("kid") == kid:
                    # Convert JWK to PEM format
                    return jwt.algorithms.RSAAlgorithm.from_jwk(json.dumps(key))
            
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Unable to find matching key for token"
            )
            
        except jwt.DecodeError as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token format"
            )
    
    def verify_token(self, token: str) -> Dict[str, Any]:
        """Verify and decode Clerk JWT token"""
        if self.environment == "development":
            # In development, allow skipping signature verification for testing
            return self._verify_token_development(token)
        
        return self._verify_token_production(token)
    
    def _verify_token_development(self, token: str) -> Dict[str, Any]:
        """Development token verification with controlled validation"""
        # Allow specific development tokens only
        if token == "dev-token":
            logger.debug("Development mode: Accepting dev-token")
            return {
                "sub": "dev-user-123",
                "email": "dev@example.com",
                "name": "Development User",
                "given_name": "Development",
                "family_name": "User",
                "iss": "clerk-dev",
                "email_verified": True,
                "exp": 9999999999,
                "iat": 1640000000
            }
        
        try:
            # Try to decode without verification for development tokens
            payload = jwt.decode(token, options={"verify_signature": False})
            
            # Check if it looks like a valid Clerk token structure
            issuer = payload.get("iss", "")
            sub = payload.get("sub", "")
            
            if ("clerk" in issuer.lower() and sub) or (payload.get("email") and sub):
                logger.debug("Development mode: Accepting valid-looking Clerk token without signature verification")
                
                # Extract user information from the token
                user_data = {
                    "sub": payload.get("sub"),
                    "email": payload.get("email"),
                    "name": payload.get("name") or payload.get("full_name"),
                    "given_name": payload.get("given_name"),
                    "family_name": payload.get("family_name"),
                    "picture": payload.get("picture"),
                    "email_verified": payload.get("email_verified", False),
                    "iss": payload.get("iss", "clerk-dev"),
                    "exp": payload.get("exp", 9999999999),
                    "iat": payload.get("iat", 1640000000)
                }
                
                # Ensure we have at least basic user info
                if not user_data["email"]:
                    user_data["email"] = f"user-{user_data['sub'][:8]}@dev.local"
                if not user_data["name"]:
                    user_data["name"] = f"User {user_data['sub'][:8]}"
                
                return user_data
            else:
                # Token doesn't look like a valid Clerk token
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid token format"
                )
            
        except jwt.DecodeError:
            # Token is not a valid JWT
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token format"
            )
        except HTTPException:
            # Re-raise HTTP exceptions
            raise
        except Exception as e:
            logger.debug(f"Development token verification failed: {e}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token verification failed"
            )
    
    def _verify_token_production(self, token: str) -> Dict[str, Any]:
        """Production token verification with full signature validation"""
        try:
            # Get signing key
            signing_key = self._get_signing_key(token)
            
            # Verify and decode token
            payload = jwt.decode(
                token,
                signing_key,
                algorithms=["RS256"],
                issuer=self.issuer,
                options={
                    "verify_signature": True,
                    "verify_exp": True,
                    "verify_iat": True,
                    "verify_iss": True
                }
            )
            
            logger.debug(f"Successfully verified token for user: {payload.get('sub')}")
            return payload
            
        except jwt.ExpiredSignatureError:
            logger.warning("Token has expired")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has expired"
            )
        except jwt.InvalidTokenError as e:
            logger.warning(f"Invalid token: {e}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token"
            )
        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to fetch JWKS for token verification: {e}")
            # In production, if JWKS is unavailable, we can't verify tokens
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Authentication service temporarily unavailable"
            )
        except Exception as e:
            logger.error(f"Token verification failed: {e}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication failed"
            )
    
    def extract_user_info(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Extract user information from verified token payload"""
        return {
            "id": payload.get("sub"),
            "email": payload.get("email", ""),
            "name": payload.get("name", payload.get("given_name", "") + " " + payload.get("family_name", "")).strip(),
            "first_name": payload.get("given_name", ""),
            "last_name": payload.get("family_name", ""),
            "image_url": payload.get("picture", ""),
            "clerk_user_id": payload.get("sub"),
            "verified_email": payload.get("email_verified", False),
            "created_at": payload.get("iat"),
            "updated_at": payload.get("updated_at")
        }

# Global verifier instance
_clerk_verifier: Optional[ClerkTokenVerifier] = None

def get_clerk_verifier() -> ClerkTokenVerifier:
    """Get or create global Clerk verifier instance"""
    global _clerk_verifier
    if _clerk_verifier is None:
        _clerk_verifier = ClerkTokenVerifier()
    return _clerk_verifier

def verify_clerk_token(token: str) -> Dict[str, Any]:
    """Verify Clerk token and return payload"""
    verifier = get_clerk_verifier()
    return verifier.verify_token(token)

def extract_user_from_token(token: str) -> Dict[str, Any]:
    """Verify token and extract user information"""
    verifier = get_clerk_verifier()
    payload = verifier.verify_token(token)
    return verifier.extract_user_info(payload) 