"""
Enterprise Authentication Service
Provides comprehensive user authentication, registration, password management, and security features.
"""

import bcrypt
import secrets
import hashlib
from datetime import datetime, timedelta
from typing import Dict, Optional, Any, List, Tuple
from dataclasses import dataclass
import logging
import re
import asyncio
from email.mime.text import MimeText
from email.mime.multipart import MimeMultipart
import smtplib
import os

from auth.jwt_manager import jwt_manager, TokenType
from auth.rbac import rbac_manager, Role, Permission
from database.connection import get_db_connection

logger = logging.getLogger(__name__)

@dataclass
class UserCredentials:
    """User credentials for authentication"""
    email: str
    password: str

@dataclass
class UserRegistration:
    """User registration data"""
    email: str
    password: str
    first_name: str
    last_name: str
    username: Optional[str] = None

@dataclass
class AuthResult:
    """Authentication result"""
    success: bool
    user_id: Optional[str] = None
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None
    user_data: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None
    requires_verification: bool = False

@dataclass
class PasswordResetRequest:
    """Password reset request"""
    email: str
    reset_token: str
    expires_at: datetime

class PasswordValidator:
    """Password validation and security"""
    
    MIN_LENGTH = 8
    MAX_LENGTH = 128
    
    @classmethod
    def validate_password(cls, password: str) -> Tuple[bool, List[str]]:
        """Validate password strength"""
        errors = []
        
        if len(password) < cls.MIN_LENGTH:
            errors.append(f"Password must be at least {cls.MIN_LENGTH} characters long")
        
        if len(password) > cls.MAX_LENGTH:
            errors.append(f"Password must be no more than {cls.MAX_LENGTH} characters long")
        
        if not re.search(r"[a-z]", password):
            errors.append("Password must contain at least one lowercase letter")
        
        if not re.search(r"[A-Z]", password):
            errors.append("Password must contain at least one uppercase letter")
        
        if not re.search(r"\d", password):
            errors.append("Password must contain at least one digit")
        
        if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", password):
            errors.append("Password must contain at least one special character")
        
        # Check for common patterns
        if re.search(r"(.)\1{2,}", password):
            errors.append("Password cannot contain repeated characters")
        
        # Check for sequential characters
        if cls._has_sequential_chars(password):
            errors.append("Password cannot contain sequential characters")
        
        return len(errors) == 0, errors
    
    @classmethod
    def _has_sequential_chars(cls, password: str) -> bool:
        """Check for sequential characters"""
        for i in range(len(password) - 2):
            if (ord(password[i]) + 1 == ord(password[i + 1]) and 
                ord(password[i + 1]) + 1 == ord(password[i + 2])):
                return True
        return False
    
    @classmethod
    def hash_password(cls, password: str) -> str:
        """Hash password using bcrypt"""
        salt = bcrypt.gensalt(rounds=12)
        return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')
    
    @classmethod
    def verify_password(cls, password: str, hashed: str) -> bool:
        """Verify password against hash"""
        try:
            return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))
        except Exception as e:
            logger.error(f"Password verification error: {e}")
            return False

class EmailValidator:
    """Email validation"""
    
    EMAIL_REGEX = re.compile(
        r"^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$"
    )
    
    @classmethod
    def validate_email(cls, email: str) -> bool:
        """Validate email format"""
        return bool(cls.EMAIL_REGEX.match(email))
    
    @classmethod
    def normalize_email(cls, email: str) -> str:
        """Normalize email address"""
        return email.lower().strip()

class AuthenticationService:
    """Enterprise authentication service"""
    
    def __init__(self):
        self.password_validator = PasswordValidator()
        self.email_validator = EmailValidator()
        self.max_login_attempts = 5
        self.lockout_duration = timedelta(minutes=15)
        self.verification_token_expiry = timedelta(hours=24)
        self.reset_token_expiry = timedelta(hours=1)
        
        # In-memory stores (in production, use Redis or database)
        self.failed_attempts = {}
        self.verification_tokens = {}
        self.reset_tokens = {}
    
    async def register_user(self, registration: UserRegistration, 
                           request_info: Dict[str, Any]) -> AuthResult:
        """Register a new user"""
        try:
            # Validate email
            if not self.email_validator.validate_email(registration.email):
                return AuthResult(success=False, error_message="Invalid email format")
            
            # Normalize email
            email = self.email_validator.normalize_email(registration.email)
            
            # Validate password
            is_valid, errors = self.password_validator.validate_password(registration.password)
            if not is_valid:
                return AuthResult(success=False, error_message="; ".join(errors))
            
            # Check if user already exists
            async with get_db_connection() as conn:
                existing_user = await conn.fetchrow(
                    "SELECT id FROM users WHERE email = $1", email
                )
                if existing_user:
                    return AuthResult(success=False, error_message="User already exists")
                
                # Generate username if not provided
                username = registration.username
                if not username:
                    username = await self._generate_username(email, conn)
                
                # Check username uniqueness
                existing_username = await conn.fetchrow(
                    "SELECT id FROM users WHERE username = $1", username
                )
                if existing_username:
                    return AuthResult(success=False, error_message="Username already taken")
                
                # Hash password
                password_hash = self.password_validator.hash_password(registration.password)
                
                # Create user
                user_id = secrets.token_urlsafe(16)
                verification_token = secrets.token_urlsafe(32)
                
                await conn.execute("""
                    INSERT INTO users (
                        id, email, username, password_hash, first_name, last_name,
                        is_active, is_verified, verification_token, created_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                """, user_id, email, username, password_hash, registration.first_name,
                    registration.last_name, True, False, verification_token, datetime.utcnow())
                
                # Assign default role
                rbac_manager.assign_role(user_id, Role.ORG_MEMBER, granted_by="system")
                
                # Store verification token
                self.verification_tokens[verification_token] = {
                    "user_id": user_id,
                    "email": email,
                    "expires_at": datetime.utcnow() + self.verification_token_expiry
                }
                
                # Send verification email
                await self._send_verification_email(email, verification_token)
                
                logger.info(f"User registered: {user_id} ({email})")
                
                return AuthResult(
                    success=True,
                    user_id=user_id,
                    requires_verification=True,
                    user_data={
                        "id": user_id,
                        "email": email,
                        "username": username,
                        "first_name": registration.first_name,
                        "last_name": registration.last_name,
                        "is_verified": False
                    }
                )
                
        except Exception as e:
            logger.error(f"User registration error: {e}")
            return AuthResult(success=False, error_message="Registration failed")
    
    async def authenticate_user(self, credentials: UserCredentials,
                               request_info: Dict[str, Any]) -> AuthResult:
        """Authenticate user with email and password"""
        try:
            email = self.email_validator.normalize_email(credentials.email)
            ip_address = request_info.get("ip_address", "unknown")
            user_agent = request_info.get("user_agent", "")
            
            # Check for account lockout
            if self._is_account_locked(email):
                return AuthResult(success=False, error_message="Account temporarily locked due to too many failed attempts")
            
            # Get user from database
            async with get_db_connection() as conn:
                user = await conn.fetchrow("""
                    SELECT id, email, username, password_hash, first_name, last_name,
                           is_active, is_verified, failed_login_attempts, locked_until
                    FROM users WHERE email = $1
                """, email)
                
                if not user:
                    self._record_failed_attempt(email)
                    return AuthResult(success=False, error_message="Invalid credentials")
                
                # Check if account is active
                if not user['is_active']:
                    return AuthResult(success=False, error_message="Account is disabled")
                
                # Verify password
                if not self.password_validator.verify_password(credentials.password, user['password_hash']):
                    self._record_failed_attempt(email)
                    await self._update_failed_attempts(user['id'], conn)
                    return AuthResult(success=False, error_message="Invalid credentials")
                
                # Check if email is verified
                if not user['is_verified']:
                    return AuthResult(
                        success=False, 
                        error_message="Email not verified",
                        requires_verification=True
                    )
                
                # Reset failed attempts on successful login
                await conn.execute(
                    "UPDATE users SET failed_login_attempts = 0, locked_until = NULL, last_login = $1 WHERE id = $2",
                    datetime.utcnow(), user['id']
                )
                
                # Create session
                device_info = {
                    "user_agent": user_agent,
                    "ip_address": ip_address
                }
                
                session_id = jwt_manager.create_session(
                    user_id=user['id'],
                    device_info=device_info,
                    ip_address=ip_address,
                    user_agent=user_agent
                )
                
                # Get user roles and permissions
                user_roles = rbac_manager.get_user_roles(user['id'])
                roles = [role.role.value for role in user_roles]
                permissions = list(rbac_manager.get_user_permissions(user['id']))
                permission_strings = [perm.value for perm in permissions]
                
                # Create tokens
                access_token = jwt_manager.create_access_token(
                    user_id=user['id'],
                    email=user['email'],
                    roles=roles,
                    permissions=permission_strings,
                    session_id=session_id
                )
                
                refresh_token = jwt_manager.create_refresh_token(
                    user_id=user['id'],
                    session_id=session_id
                )
                
                user_data = {
                    "id": user['id'],
                    "email": user['email'],
                    "username": user['username'],
                    "first_name": user['first_name'],
                    "last_name": user['last_name'],
                    "roles": roles,
                    "permissions": permission_strings
                }
                
                logger.info(f"User authenticated: {user['id']} ({email}) from {ip_address}")
                
                return AuthResult(
                    success=True,
                    user_id=user['id'],
                    access_token=access_token,
                    refresh_token=refresh_token,
                    user_data=user_data
                )
                
        except Exception as e:
            logger.error(f"Authentication error: {e}")
            return AuthResult(success=False, error_message="Authentication failed")
    
    async def refresh_token(self, refresh_token: str) -> AuthResult:
        """Refresh access token"""
        try:
            # Get user data for token refresh
            claims = jwt_manager.verify_token(refresh_token, TokenType.REFRESH)
            if not claims:
                return AuthResult(success=False, error_message="Invalid refresh token")
            
            # Get updated user data
            async with get_db_connection() as conn:
                user = await conn.fetchrow("""
                    SELECT id, email, username, first_name, last_name, is_active, is_verified
                    FROM users WHERE id = $1
                """, claims.user_id)
                
                if not user or not user['is_active'] or not user['is_verified']:
                    return AuthResult(success=False, error_message="User account invalid")
                
                # Get current roles and permissions
                user_roles = rbac_manager.get_user_roles(user['id'])
                roles = [role.role.value for role in user_roles]
                permissions = list(rbac_manager.get_user_permissions(user['id']))
                permission_strings = [perm.value for perm in permissions]
                
                user_data = {
                    "email": user['email'],
                    "roles": roles,
                    "permissions": permission_strings
                }
                
                # Refresh tokens
                tokens = jwt_manager.refresh_access_token(refresh_token, user_data)
                if not tokens:
                    return AuthResult(success=False, error_message="Token refresh failed")
                
                return AuthResult(
                    success=True,
                    user_id=user['id'],
                    access_token=tokens['access_token'],
                    refresh_token=tokens['refresh_token'],
                    user_data={
                        "id": user['id'],
                        "email": user['email'],
                        "username": user['username'],
                        "first_name": user['first_name'],
                        "last_name": user['last_name'],
                        "roles": roles,
                        "permissions": permission_strings
                    }
                )
                
        except Exception as e:
            logger.error(f"Token refresh error: {e}")
            return AuthResult(success=False, error_message="Token refresh failed")
    
    async def verify_email(self, verification_token: str) -> AuthResult:
        """Verify user email"""
        try:
            if verification_token not in self.verification_tokens:
                return AuthResult(success=False, error_message="Invalid verification token")
            
            token_data = self.verification_tokens[verification_token]
            if datetime.utcnow() > token_data['expires_at']:
                del self.verification_tokens[verification_token]
                return AuthResult(success=False, error_message="Verification token expired")
            
            # Update user verification status
            async with get_db_connection() as conn:
                await conn.execute(
                    "UPDATE users SET is_verified = TRUE, verification_token = NULL WHERE id = $1",
                    token_data['user_id']
                )
            
            # Remove token
            del self.verification_tokens[verification_token]
            
            logger.info(f"Email verified for user: {token_data['user_id']}")
            
            return AuthResult(success=True, user_id=token_data['user_id'])
            
        except Exception as e:
            logger.error(f"Email verification error: {e}")
            return AuthResult(success=False, error_message="Email verification failed")
    
    async def request_password_reset(self, email: str) -> bool:
        """Request password reset"""
        try:
            email = self.email_validator.normalize_email(email)
            
            async with get_db_connection() as conn:
                user = await conn.fetchrow("SELECT id, email FROM users WHERE email = $1", email)
                if not user:
                    # Don't reveal if email exists
                    return True
                
                # Generate reset token
                reset_token = secrets.token_urlsafe(32)
                expires_at = datetime.utcnow() + self.reset_token_expiry
                
                # Store reset token
                self.reset_tokens[reset_token] = PasswordResetRequest(
                    email=email,
                    reset_token=reset_token,
                    expires_at=expires_at
                )
                
                # Update user with reset token
                await conn.execute(
                    "UPDATE users SET password_reset_token = $1, password_reset_expires = $2 WHERE id = $3",
                    reset_token, expires_at, user['id']
                )
                
                # Send reset email
                await self._send_password_reset_email(email, reset_token)
                
                logger.info(f"Password reset requested for: {email}")
                
            return True
            
        except Exception as e:
            logger.error(f"Password reset request error: {e}")
            return False
    
    async def reset_password(self, reset_token: str, new_password: str) -> AuthResult:
        """Reset user password"""
        try:
            if reset_token not in self.reset_tokens:
                return AuthResult(success=False, error_message="Invalid reset token")
            
            reset_request = self.reset_tokens[reset_token]
            if datetime.utcnow() > reset_request.expires_at:
                del self.reset_tokens[reset_token]
                return AuthResult(success=False, error_message="Reset token expired")
            
            # Validate new password
            is_valid, errors = self.password_validator.validate_password(new_password)
            if not is_valid:
                return AuthResult(success=False, error_message="; ".join(errors))
            
            # Hash new password
            password_hash = self.password_validator.hash_password(new_password)
            
            # Update password
            async with get_db_connection() as conn:
                await conn.execute("""
                    UPDATE users 
                    SET password_hash = $1, password_reset_token = NULL, password_reset_expires = NULL,
                        failed_login_attempts = 0, locked_until = NULL
                    WHERE email = $2
                """, password_hash, reset_request.email)
            
            # Remove reset token
            del self.reset_tokens[reset_token]
            
            logger.info(f"Password reset completed for: {reset_request.email}")
            
            return AuthResult(success=True)
            
        except Exception as e:
            logger.error(f"Password reset error: {e}")
            return AuthResult(success=False, error_message="Password reset failed")
    
    async def logout_user(self, session_id: str) -> bool:
        """Logout user and invalidate session"""
        try:
            return jwt_manager.invalidate_session(session_id)
        except Exception as e:
            logger.error(f"Logout error: {e}")
            return False
    
    async def logout_all_sessions(self, user_id: str) -> int:
        """Logout user from all sessions"""
        try:
            return jwt_manager.invalidate_user_sessions(user_id)
        except Exception as e:
            logger.error(f"Logout all sessions error: {e}")
            return 0
    
    def _is_account_locked(self, email: str) -> bool:
        """Check if account is locked due to failed attempts"""
        if email not in self.failed_attempts:
            return False
        
        attempts = self.failed_attempts[email]
        if len(attempts) < self.max_login_attempts:
            return False
        
        # Check if lockout period has expired
        latest_attempt = max(attempts)
        if datetime.utcnow() - latest_attempt > self.lockout_duration:
            # Reset attempts
            del self.failed_attempts[email]
            return False
        
        return True
    
    def _record_failed_attempt(self, email: str):
        """Record failed login attempt"""
        if email not in self.failed_attempts:
            self.failed_attempts[email] = []
        
        self.failed_attempts[email].append(datetime.utcnow())
        
        # Keep only recent attempts
        cutoff = datetime.utcnow() - self.lockout_duration
        self.failed_attempts[email] = [
            attempt for attempt in self.failed_attempts[email] 
            if attempt > cutoff
        ]
    
    async def _update_failed_attempts(self, user_id: str, conn):
        """Update failed login attempts in database"""
        await conn.execute(
            "UPDATE users SET failed_login_attempts = failed_login_attempts + 1 WHERE id = $1",
            user_id
        )
    
    async def _generate_username(self, email: str, conn) -> str:
        """Generate unique username from email"""
        base_username = email.split('@')[0]
        username = base_username
        counter = 1
        
        while True:
            existing = await conn.fetchrow("SELECT id FROM users WHERE username = $1", username)
            if not existing:
                return username
            username = f"{base_username}{counter}"
            counter += 1
    
    async def _send_verification_email(self, email: str, token: str):
        """Send email verification email"""
        try:
            # In production, use proper email service
            logger.info(f"Verification email sent to {email} with token {token}")
        except Exception as e:
            logger.error(f"Failed to send verification email: {e}")
    
    async def _send_password_reset_email(self, email: str, token: str):
        """Send password reset email"""
        try:
            # In production, use proper email service
            logger.info(f"Password reset email sent to {email} with token {token}")
        except Exception as e:
            logger.error(f"Failed to send password reset email: {e}")

# Global authentication service instance
auth_service = AuthenticationService() 