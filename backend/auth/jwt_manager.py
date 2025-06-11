"""
Enterprise JWT Token Management System
Provides secure token generation, validation, refresh, and session management.
"""

import jwt
import os
import secrets
import hashlib
from datetime import datetime, timedelta
from typing import Dict, Optional, Any, List
from dataclasses import dataclass
from enum import Enum
import logging
import asyncio
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
import base64

logger = logging.getLogger(__name__)

class TokenType(str, Enum):
    ACCESS = "access"
    REFRESH = "refresh"
    RESET_PASSWORD = "reset_password"
    EMAIL_VERIFICATION = "email_verification"
    API_KEY = "api_key"

@dataclass
class TokenClaims:
    """JWT token claims"""
    user_id: str
    email: str
    roles: List[str]
    permissions: List[str]
    session_id: str
    token_type: TokenType
    issued_at: datetime
    expires_at: datetime
    issuer: str = "agileforge"
    audience: str = "agileforge-api"
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "sub": self.user_id,
            "email": self.email,
            "roles": self.roles,
            "permissions": self.permissions,
            "session_id": self.session_id,
            "token_type": self.token_type.value,
            "iat": int(self.issued_at.timestamp()),
            "exp": int(self.expires_at.timestamp()),
            "iss": self.issuer,
            "aud": self.audience
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'TokenClaims':
        return cls(
            user_id=data["sub"],
            email=data["email"],
            roles=data.get("roles", []),
            permissions=data.get("permissions", []),
            session_id=data["session_id"],
            token_type=TokenType(data["token_type"]),
            issued_at=datetime.fromtimestamp(data["iat"]),
            expires_at=datetime.fromtimestamp(data["exp"]),
            issuer=data.get("iss", "agileforge"),
            audience=data.get("aud", "agileforge-api")
        )

@dataclass
class SessionInfo:
    """User session information"""
    session_id: str
    user_id: str
    device_info: Dict[str, Any]
    ip_address: str
    user_agent: str
    created_at: datetime
    last_used: datetime
    expires_at: datetime
    is_active: bool = True
    refresh_token_hash: Optional[str] = None

class JWTManager:
    """Enterprise JWT Token Manager"""
    
    def __init__(self):
        self.secret_key = os.getenv("JWT_SECRET", self._generate_secret_key())
        self.algorithm = "HS256"
        self.access_token_expire_minutes = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "15"))
        self.refresh_token_expire_days = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "30"))
        self.max_sessions_per_user = int(os.getenv("MAX_SESSIONS_PER_USER", "5"))
        
        # In-memory session store (in production, use Redis or database)
        self._sessions: Dict[str, SessionInfo] = {}
        self._user_sessions: Dict[str, List[str]] = {}  # user_id -> session_ids
        self._blacklisted_tokens: set = set()
        
        # Token rotation settings
        self.rotate_refresh_tokens = True
        self.refresh_token_reuse_window = timedelta(seconds=30)
        
    def _generate_secret_key(self) -> str:
        """Generate a secure secret key"""
        return secrets.token_urlsafe(64)
    
    def _hash_token(self, token: str) -> str:
        """Hash a token for secure storage"""
        return hashlib.sha256(token.encode()).hexdigest()
    
    def _generate_session_id(self) -> str:
        """Generate a unique session ID"""
        return secrets.token_urlsafe(32)
    
    def create_access_token(self, user_id: str, email: str, roles: List[str], 
                           permissions: List[str], session_id: str) -> str:
        """Create an access token"""
        now = datetime.utcnow()
        expires_at = now + timedelta(minutes=self.access_token_expire_minutes)
        
        claims = TokenClaims(
            user_id=user_id,
            email=email,
            roles=roles,
            permissions=permissions,
            session_id=session_id,
            token_type=TokenType.ACCESS,
            issued_at=now,
            expires_at=expires_at
        )
        
        token = jwt.encode(claims.to_dict(), self.secret_key, algorithm=self.algorithm)
        logger.info(f"Created access token for user {user_id}, session {session_id}")
        return token
    
    def create_refresh_token(self, user_id: str, session_id: str) -> str:
        """Create a refresh token"""
        now = datetime.utcnow()
        expires_at = now + timedelta(days=self.refresh_token_expire_days)
        
        claims = TokenClaims(
            user_id=user_id,
            email="",  # Refresh tokens don't need email
            roles=[],
            permissions=[],
            session_id=session_id,
            token_type=TokenType.REFRESH,
            issued_at=now,
            expires_at=expires_at
        )
        
        token = jwt.encode(claims.to_dict(), self.secret_key, algorithm=self.algorithm)
        
        # Store hash of refresh token in session
        if session_id in self._sessions:
            self._sessions[session_id].refresh_token_hash = self._hash_token(token)
        
        logger.info(f"Created refresh token for user {user_id}, session {session_id}")
        return token
    
    def verify_token(self, token: str, expected_type: TokenType = TokenType.ACCESS) -> Optional[TokenClaims]:
        """Verify and decode a JWT token"""
        try:
            # Check if token is blacklisted
            token_hash = self._hash_token(token)
            if token_hash in self._blacklisted_tokens:
                logger.warning("Attempted to use blacklisted token")
                return None
            
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
            claims = TokenClaims.from_dict(payload)
            
            # Verify token type
            if claims.token_type != expected_type:
                logger.warning(f"Token type mismatch: expected {expected_type}, got {claims.token_type}")
                return None
            
            # Check if token is expired
            if claims.expires_at < datetime.utcnow():
                logger.warning("Token has expired")
                return None
            
            # Verify session is still active
            if claims.session_id not in self._sessions:
                logger.warning(f"Session {claims.session_id} not found")
                return None
            
            session = self._sessions[claims.session_id]
            if not session.is_active:
                logger.warning(f"Session {claims.session_id} is inactive")
                return None
            
            # Update session last used time
            session.last_used = datetime.utcnow()
            
            return claims
            
        except jwt.ExpiredSignatureError:
            logger.warning("Token signature has expired")
            return None
        except jwt.InvalidTokenError as e:
            logger.warning(f"Invalid token: {e}")
            return None
        except Exception as e:
            logger.error(f"Token verification error: {e}")
            return None
    
    def refresh_access_token(self, refresh_token: str, user_data: Dict[str, Any]) -> Optional[Dict[str, str]]:
        """Refresh an access token using a refresh token"""
        try:
            # Verify refresh token
            claims = self.verify_token(refresh_token, TokenType.REFRESH)
            if not claims:
                return None
            
            session = self._sessions.get(claims.session_id)
            if not session:
                logger.warning(f"Session {claims.session_id} not found for refresh")
                return None
            
            # Verify refresh token hash matches stored hash
            refresh_token_hash = self._hash_token(refresh_token)
            if session.refresh_token_hash != refresh_token_hash:
                logger.warning("Refresh token hash mismatch - possible token reuse attack")
                # Invalidate all sessions for this user as security measure
                self.invalidate_user_sessions(claims.user_id)
                return None
            
            # Create new access token
            new_access_token = self.create_access_token(
                user_id=claims.user_id,
                email=user_data.get("email", ""),
                roles=user_data.get("roles", []),
                permissions=user_data.get("permissions", []),
                session_id=claims.session_id
            )
            
            # Optionally rotate refresh token
            new_refresh_token = refresh_token
            if self.rotate_refresh_tokens:
                new_refresh_token = self.create_refresh_token(claims.user_id, claims.session_id)
                # Blacklist old refresh token
                self._blacklisted_tokens.add(refresh_token_hash)
            
            logger.info(f"Refreshed tokens for user {claims.user_id}, session {claims.session_id}")
            
            return {
                "access_token": new_access_token,
                "refresh_token": new_refresh_token,
                "token_type": "bearer"
            }
            
        except Exception as e:
            logger.error(f"Token refresh error: {e}")
            return None
    
    def create_session(self, user_id: str, device_info: Dict[str, Any], 
                      ip_address: str, user_agent: str) -> str:
        """Create a new user session"""
        # Check session limit
        user_sessions = self._user_sessions.get(user_id, [])
        if len(user_sessions) >= self.max_sessions_per_user:
            # Remove oldest session
            oldest_session_id = user_sessions[0]
            self.invalidate_session(oldest_session_id)
        
        session_id = self._generate_session_id()
        now = datetime.utcnow()
        expires_at = now + timedelta(days=self.refresh_token_expire_days)
        
        session = SessionInfo(
            session_id=session_id,
            user_id=user_id,
            device_info=device_info,
            ip_address=ip_address,
            user_agent=user_agent,
            created_at=now,
            last_used=now,
            expires_at=expires_at
        )
        
        self._sessions[session_id] = session
        
        if user_id not in self._user_sessions:
            self._user_sessions[user_id] = []
        self._user_sessions[user_id].append(session_id)
        
        logger.info(f"Created session {session_id} for user {user_id}")
        return session_id
    
    def invalidate_session(self, session_id: str) -> bool:
        """Invalidate a specific session"""
        try:
            if session_id not in self._sessions:
                return False
            
            session = self._sessions[session_id]
            session.is_active = False
            
            # Remove from user sessions list
            user_sessions = self._user_sessions.get(session.user_id, [])
            if session_id in user_sessions:
                user_sessions.remove(session_id)
            
            # Blacklist refresh token if exists
            if session.refresh_token_hash:
                self._blacklisted_tokens.add(session.refresh_token_hash)
            
            logger.info(f"Invalidated session {session_id}")
            return True
            
        except Exception as e:
            logger.error(f"Session invalidation error: {e}")
            return False
    
    def invalidate_user_sessions(self, user_id: str) -> int:
        """Invalidate all sessions for a user"""
        try:
            user_sessions = self._user_sessions.get(user_id, [])
            invalidated_count = 0
            
            for session_id in user_sessions.copy():
                if self.invalidate_session(session_id):
                    invalidated_count += 1
            
            logger.info(f"Invalidated {invalidated_count} sessions for user {user_id}")
            return invalidated_count
            
        except Exception as e:
            logger.error(f"User sessions invalidation error: {e}")
            return 0
    
    def get_user_sessions(self, user_id: str) -> List[SessionInfo]:
        """Get all active sessions for a user"""
        user_sessions = self._user_sessions.get(user_id, [])
        active_sessions = []
        
        for session_id in user_sessions:
            session = self._sessions.get(session_id)
            if session and session.is_active and session.expires_at > datetime.utcnow():
                active_sessions.append(session)
        
        return active_sessions
    
    def cleanup_expired_sessions(self) -> int:
        """Clean up expired sessions"""
        try:
            now = datetime.utcnow()
            expired_sessions = []
            
            for session_id, session in self._sessions.items():
                if session.expires_at < now:
                    expired_sessions.append(session_id)
            
            for session_id in expired_sessions:
                self.invalidate_session(session_id)
            
            logger.info(f"Cleaned up {len(expired_sessions)} expired sessions")
            return len(expired_sessions)
            
        except Exception as e:
            logger.error(f"Session cleanup error: {e}")
            return 0
    
    def blacklist_token(self, token: str) -> bool:
        """Add a token to the blacklist"""
        try:
            token_hash = self._hash_token(token)
            self._blacklisted_tokens.add(token_hash)
            logger.info("Token added to blacklist")
            return True
        except Exception as e:
            logger.error(f"Token blacklisting error: {e}")
            return False
    
    def create_api_key(self, user_id: str, name: str, permissions: List[str], 
                      expires_days: Optional[int] = None) -> str:
        """Create an API key for programmatic access"""
        now = datetime.utcnow()
        expires_at = now + timedelta(days=expires_days) if expires_days else now + timedelta(days=365)
        
        claims = TokenClaims(
            user_id=user_id,
            email="",
            roles=[],
            permissions=permissions,
            session_id=f"api_key_{secrets.token_urlsafe(16)}",
            token_type=TokenType.API_KEY,
            issued_at=now,
            expires_at=expires_at
        )
        
        # Add API key specific claims
        api_claims = claims.to_dict()
        api_claims["api_key_name"] = name
        
        token = jwt.encode(api_claims, self.secret_key, algorithm=self.algorithm)
        logger.info(f"Created API key '{name}' for user {user_id}")
        return token
    
    def verify_api_key(self, api_key: str) -> Optional[TokenClaims]:
        """Verify an API key"""
        return self.verify_token(api_key, TokenType.API_KEY)

# Global JWT manager instance
jwt_manager = JWTManager() 