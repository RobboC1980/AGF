"""
Advanced Security Framework
Provides comprehensive security features including encryption, input validation,
threat detection, and security monitoring
"""

import os
import re
import hmac
import hashlib
import secrets
import logging
import time
import json
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass
from enum import Enum
import structlog
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
import base64
import ipaddress
from fastapi import Request, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import bcrypt
import jwt
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

logger = structlog.get_logger(__name__)

class SecurityLevel(Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class ThreatType(Enum):
    BRUTE_FORCE = "brute_force"
    SQL_INJECTION = "sql_injection"
    XSS = "xss"
    CSRF = "csrf"
    PRIVILEGE_ESCALATION = "privilege_escalation"
    DATA_EXFILTRATION = "data_exfiltration"
    ANOMALOUS_BEHAVIOR = "anomalous_behavior"

@dataclass
class SecurityEvent:
    event_type: ThreatType
    severity: SecurityLevel
    source_ip: str
    user_id: Optional[str]
    endpoint: str
    details: Dict[str, Any]
    timestamp: datetime
    blocked: bool = False

@dataclass
class EncryptionConfig:
    encryption_key: bytes
    salt: bytes
    algorithm: str = "AES-256-GCM"

class AdvancedEncryption:
    """Advanced encryption and key management"""
    
    def __init__(self):
        self.master_key = self._get_or_create_master_key()
        self.fernet = Fernet(self.master_key)
        
    def _get_or_create_master_key(self) -> bytes:
        """Get or create master encryption key"""
        key_file = "security/master.key"
        
        if os.path.exists(key_file):
            with open(key_file, "rb") as f:
                return f.read()
        else:
            # Create new key
            key = Fernet.generate_key()
            os.makedirs("security", exist_ok=True)
            with open(key_file, "wb") as f:
                f.write(key)
            os.chmod(key_file, 0o600)  # Restrict permissions
            return key
    
    def encrypt_data(self, data: str, context: str = "") -> str:
        """Encrypt sensitive data with context"""
        try:
            # Add context for additional security
            data_with_context = f"{context}:{data}"
            encrypted = self.fernet.encrypt(data_with_context.encode())
            return base64.urlsafe_b64encode(encrypted).decode()
        except Exception as e:
            logger.error("Encryption failed", error=str(e))
            raise
    
    def decrypt_data(self, encrypted_data: str, context: str = "") -> str:
        """Decrypt sensitive data with context verification"""
        try:
            encrypted_bytes = base64.urlsafe_b64decode(encrypted_data.encode())
            decrypted = self.fernet.decrypt(encrypted_bytes).decode()
            
            # Verify context
            if context:
                if not decrypted.startswith(f"{context}:"):
                    raise ValueError("Invalid context for decryption")
                return decrypted[len(context) + 1:]
            
            return decrypted
        except Exception as e:
            logger.error("Decryption failed", error=str(e))
            raise
    
    def generate_secure_token(self, length: int = 32) -> str:
        """Generate cryptographically secure token"""
        return secrets.token_urlsafe(length)
    
    def hash_password(self, password: str, salt: Optional[bytes] = None) -> Tuple[str, str]:
        """Hash password with bcrypt"""
        if salt is None:
            salt = bcrypt.gensalt(rounds=12)
        
        hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
        return hashed.decode('utf-8'), salt.decode('utf-8')
    
    def verify_password(self, password: str, hashed: str) -> bool:
        """Verify password against hash"""
        try:
            return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))
        except Exception:
            return False

class InputValidator:
    """Advanced input validation and sanitization"""
    
    # Common attack patterns
    SQL_INJECTION_PATTERNS = [
        r"(\bUNION\b|\bSELECT\b|\bINSERT\b|\bUPDATE\b|\bDELETE\b|\bDROP\b)",
        r"(\bOR\b|\bAND\b)\s+\d+\s*=\s*\d+",
        r"[';\"]\s*;\s*--",
        r"\bEXEC\b|\bEXECUTE\b",
    ]
    
    XSS_PATTERNS = [
        r"<script[^>]*>",
        r"javascript:",
        r"on\w+\s*=",
        r"<iframe[^>]*>",
        r"<object[^>]*>",
        r"<embed[^>]*>",
    ]
    
    def __init__(self):
        self.sql_patterns = [re.compile(pattern, re.IGNORECASE) for pattern in self.SQL_INJECTION_PATTERNS]
        self.xss_patterns = [re.compile(pattern, re.IGNORECASE) for pattern in self.XSS_PATTERNS]
    
    def validate_input(self, data: Any, field_name: str = "") -> Tuple[bool, List[str]]:
        """Validate input for security threats"""
        issues = []
        
        if isinstance(data, str):
            # Check for SQL injection
            for pattern in self.sql_patterns:
                if pattern.search(data):
                    issues.append(f"Potential SQL injection in {field_name}")
                    break
            
            # Check for XSS
            for pattern in self.xss_patterns:
                if pattern.search(data):
                    issues.append(f"Potential XSS in {field_name}")
                    break
            
            # Check for excessively long input
            if len(data) > 10000:
                issues.append(f"Input too long in {field_name}")
        
        elif isinstance(data, dict):
            for key, value in data.items():
                is_valid, sub_issues = self.validate_input(value, f"{field_name}.{key}")
                issues.extend(sub_issues)
        
        elif isinstance(data, list):
            for i, item in enumerate(data):
                is_valid, sub_issues = self.validate_input(item, f"{field_name}[{i}]")
                issues.extend(sub_issues)
        
        return len(issues) == 0, issues
    
    def sanitize_input(self, data: str) -> str:
        """Sanitize input to remove potentially dangerous content"""
        # Remove HTML tags
        data = re.sub(r'<[^>]+>', '', data)
        
        # Escape special characters
        data = data.replace('&', '&amp;')
        data = data.replace('<', '&lt;')
        data = data.replace('>', '&gt;')
        data = data.replace('"', '&quot;')
        data = data.replace("'", '&#x27;')
        
        return data
    
    def validate_email(self, email: str) -> bool:
        """Validate email format"""
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return re.match(pattern, email) is not None
    
    def validate_password_strength(self, password: str) -> Tuple[bool, List[str]]:
        """Validate password strength"""
        issues = []
        
        if len(password) < 8:
            issues.append("Password must be at least 8 characters long")
        
        if not re.search(r'[A-Z]', password):
            issues.append("Password must contain at least one uppercase letter")
        
        if not re.search(r'[a-z]', password):
            issues.append("Password must contain at least one lowercase letter")
        
        if not re.search(r'\d', password):
            issues.append("Password must contain at least one digit")
        
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
            issues.append("Password must contain at least one special character")
        
        # Check for common passwords
        common_passwords = ['password', '123456', 'qwerty', 'admin', 'letmein']
        if password.lower() in common_passwords:
            issues.append("Password is too common")
        
        return len(issues) == 0, issues

class ThreatDetector:
    """Advanced threat detection and monitoring"""
    
    def __init__(self):
        self.failed_attempts = {}  # IP -> count
        self.suspicious_ips = set()
        self.blocked_ips = set()
        self.security_events = []
        
        # Rate limiting configurations
        self.max_failed_attempts = 5
        self.lockout_duration = 300  # 5 minutes
        self.max_requests_per_minute = 60
        
    def detect_brute_force(self, ip: str, user_id: Optional[str] = None) -> bool:
        """Detect brute force attacks"""
        current_time = time.time()
        
        # Clean old attempts
        self._cleanup_old_attempts(current_time)
        
        # Track failed attempt
        if ip not in self.failed_attempts:
            self.failed_attempts[ip] = []
        
        self.failed_attempts[ip].append(current_time)
        
        # Check if threshold exceeded
        recent_attempts = [
            attempt for attempt in self.failed_attempts[ip]
            if current_time - attempt < self.lockout_duration
        ]
        
        if len(recent_attempts) >= self.max_failed_attempts:
            self.blocked_ips.add(ip)
            self._log_security_event(
                ThreatType.BRUTE_FORCE,
                SecurityLevel.HIGH,
                ip,
                user_id,
                "/auth/login",
                {"attempts": len(recent_attempts)},
                blocked=True
            )
            return True
        
        return False
    
    def is_ip_blocked(self, ip: str) -> bool:
        """Check if IP is blocked"""
        return ip in self.blocked_ips
    
    def detect_anomalous_behavior(self, request: Request, user_id: Optional[str] = None) -> bool:
        """Detect anomalous user behavior"""
        ip = self._get_client_ip(request)
        endpoint = request.url.path
        
        # Check for rapid requests from same IP
        current_time = time.time()
        if not hasattr(self, 'request_history'):
            self.request_history = {}
        
        if ip not in self.request_history:
            self.request_history[ip] = []
        
        # Add current request
        self.request_history[ip].append(current_time)
        
        # Check recent requests
        recent_requests = [
            req_time for req_time in self.request_history[ip]
            if current_time - req_time < 60  # Last minute
        ]
        
        if len(recent_requests) > self.max_requests_per_minute:
            self._log_security_event(
                ThreatType.ANOMALOUS_BEHAVIOR,
                SecurityLevel.MEDIUM,
                ip,
                user_id,
                endpoint,
                {"requests_per_minute": len(recent_requests)},
                blocked=True
            )
            return True
        
        return False
    
    def detect_privilege_escalation(self, user_id: str, requested_permission: str, current_permissions: List[str]) -> bool:
        """Detect privilege escalation attempts"""
        if requested_permission not in current_permissions:
            self._log_security_event(
                ThreatType.PRIVILEGE_ESCALATION,
                SecurityLevel.HIGH,
                "internal",
                user_id,
                "/api/admin",
                {
                    "requested_permission": requested_permission,
                    "current_permissions": current_permissions
                },
                blocked=True
            )
            return True
        
        return False
    
    def _cleanup_old_attempts(self, current_time: float):
        """Clean up old failed attempts"""
        for ip in list(self.failed_attempts.keys()):
            self.failed_attempts[ip] = [
                attempt for attempt in self.failed_attempts[ip]
                if current_time - attempt < self.lockout_duration
            ]
            
            if not self.failed_attempts[ip]:
                del self.failed_attempts[ip]
                self.blocked_ips.discard(ip)
    
    def _get_client_ip(self, request: Request) -> str:
        """Get client IP address"""
        # Check for forwarded IP first
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()
        
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip
        
        return request.client.host if request.client else "unknown"
    
    def _log_security_event(self, event_type: ThreatType, severity: SecurityLevel, 
                           source_ip: str, user_id: Optional[str], endpoint: str, 
                           details: Dict[str, Any], blocked: bool = False):
        """Log security event"""
        event = SecurityEvent(
            event_type=event_type,
            severity=severity,
            source_ip=source_ip,
            user_id=user_id,
            endpoint=endpoint,
            details=details,
            timestamp=datetime.utcnow(),
            blocked=blocked
        )
        
        self.security_events.append(event)
        
        # Log to structured logger
        logger.warning(
            "Security event detected",
            event_type=event_type.value,
            severity=severity.value,
            source_ip=source_ip,
            user_id=user_id,
            endpoint=endpoint,
            blocked=blocked,
            details=details
        )
    
    def get_security_summary(self, hours: int = 24) -> Dict[str, Any]:
        """Get security events summary"""
        cutoff_time = datetime.utcnow() - timedelta(hours=hours)
        recent_events = [
            event for event in self.security_events
            if event.timestamp > cutoff_time
        ]
        
        return {
            "total_events": len(recent_events),
            "blocked_attempts": len([e for e in recent_events if e.blocked]),
            "threat_types": {
                threat_type.value: len([e for e in recent_events if e.event_type == threat_type])
                for threat_type in ThreatType
            },
            "severity_levels": {
                severity.value: len([e for e in recent_events if e.severity == severity])
                for severity in SecurityLevel
            },
            "blocked_ips": list(self.blocked_ips),
            "suspicious_ips": list(self.suspicious_ips)
        }

class SecureSessionManager:
    """Secure session management"""
    
    def __init__(self, encryption: AdvancedEncryption):
        self.encryption = encryption
        self.active_sessions = {}  # token -> session_data
        self.session_timeout = 3600  # 1 hour
        
    def create_session(self, user_id: str, permissions: List[str], ip: str) -> str:
        """Create secure session"""
        session_data = {
            "user_id": user_id,
            "permissions": permissions,
            "ip": ip,
            "created_at": time.time(),
            "last_activity": time.time()
        }
        
        # Create secure token
        token = self.encryption.generate_secure_token()
        
        # Encrypt session data
        encrypted_session = self.encryption.encrypt_data(
            json.dumps(session_data),
            context="session"
        )
        
        self.active_sessions[token] = {
            "data": encrypted_session,
            "expires_at": time.time() + self.session_timeout
        }
        
        return token
    
    def validate_session(self, token: str, ip: str) -> Optional[Dict[str, Any]]:
        """Validate and refresh session"""
        if token not in self.active_sessions:
            return None
        
        session = self.active_sessions[token]
        current_time = time.time()
        
        # Check expiration
        if current_time > session["expires_at"]:
            del self.active_sessions[token]
            return None
        
        # Decrypt session data
        try:
            session_data = json.loads(
                self.encryption.decrypt_data(session["data"], context="session")
            )
        except Exception:
            del self.active_sessions[token]
            return None
        
        # Validate IP (optional, can be disabled for mobile users)
        if session_data["ip"] != ip:
            logger.warning("Session IP mismatch", 
                          original_ip=session_data["ip"], 
                          current_ip=ip)
            # Could optionally invalidate session here
        
        # Update last activity
        session_data["last_activity"] = current_time
        session["expires_at"] = current_time + self.session_timeout
        session["data"] = self.encryption.encrypt_data(
            json.dumps(session_data),
            context="session"
        )
        
        return session_data
    
    def invalidate_session(self, token: str):
        """Invalidate session"""
        if token in self.active_sessions:
            del self.active_sessions[token]
    
    def cleanup_expired_sessions(self):
        """Clean up expired sessions"""
        current_time = time.time()
        expired_tokens = [
            token for token, session in self.active_sessions.items()
            if current_time > session["expires_at"]
        ]
        
        for token in expired_tokens:
            del self.active_sessions[token]

# Global instances
encryption = AdvancedEncryption()
input_validator = InputValidator()
threat_detector = ThreatDetector()
session_manager = SecureSessionManager(encryption)

def get_encryption() -> AdvancedEncryption:
    return encryption

def get_input_validator() -> InputValidator:
    return input_validator

def get_threat_detector() -> ThreatDetector:
    return threat_detector

def get_session_manager() -> SecureSessionManager:
    return session_manager 