"""
Enterprise Authorization Middleware
Provides comprehensive route protection, permission checking, and security features.
"""

from fastapi import Request, HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.middleware.base import BaseHTTPMiddleware
from typing import List, Optional, Dict, Any, Callable, Union
from functools import wraps
import logging
import time
import asyncio
from datetime import datetime, timedelta
import re
from collections import defaultdict

from auth.rbac import rbac_manager, Permission, ResourceType, Role
from auth.jwt_manager import jwt_manager, TokenType, TokenClaims

logger = logging.getLogger(__name__)

# Security configuration
RATE_LIMIT_REQUESTS = 100  # requests per window
RATE_LIMIT_WINDOW = 60  # seconds
MAX_LOGIN_ATTEMPTS = 5
LOGIN_LOCKOUT_DURATION = 300  # seconds

class SecurityMiddleware(BaseHTTPMiddleware):
    """Security middleware for request processing"""
    
    def __init__(self, app):
        super().__init__(app)
        self.rate_limiter = RateLimiter()
        self.failed_login_attempts = defaultdict(list)
        
    async def dispatch(self, request: Request, call_next):
        start_time = time.time()
        
        try:
            # Rate limiting
            client_ip = self._get_client_ip(request)
            if not self.rate_limiter.is_allowed(client_ip):
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Rate limit exceeded"
                )
            
            # Security headers
            response = await call_next(request)
            self._add_security_headers(response)
            
            # Log request
            process_time = time.time() - start_time
            logger.info(f"{request.method} {request.url.path} - {response.status_code} - {process_time:.3f}s")
            
            return response
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Security middleware error: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Internal server error"
            )
    
    def _get_client_ip(self, request: Request) -> str:
        """Get client IP address"""
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()
        return request.client.host if request.client else "unknown"
    
    def _add_security_headers(self, response):
        """Add security headers to response"""
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

class RateLimiter:
    """Rate limiting implementation"""
    
    def __init__(self):
        self.requests = defaultdict(list)
        self.cleanup_interval = 60
        self.last_cleanup = time.time()
    
    def is_allowed(self, identifier: str) -> bool:
        """Check if request is allowed based on rate limit"""
        now = time.time()
        
        # Cleanup old entries periodically
        if now - self.last_cleanup > self.cleanup_interval:
            self._cleanup_old_entries(now)
            self.last_cleanup = now
        
        # Get recent requests for this identifier
        recent_requests = self.requests[identifier]
        
        # Remove requests outside the window
        cutoff_time = now - RATE_LIMIT_WINDOW
        recent_requests[:] = [req_time for req_time in recent_requests if req_time > cutoff_time]
        
        # Check if limit exceeded
        if len(recent_requests) >= RATE_LIMIT_REQUESTS:
            return False
        
        # Add current request
        recent_requests.append(now)
        return True
    
    def _cleanup_old_entries(self, now: float):
        """Clean up old rate limit entries"""
        cutoff_time = now - RATE_LIMIT_WINDOW
        for identifier in list(self.requests.keys()):
            self.requests[identifier][:] = [
                req_time for req_time in self.requests[identifier] 
                if req_time > cutoff_time
            ]
            if not self.requests[identifier]:
                del self.requests[identifier]

class AuthenticationManager:
    """Authentication and authorization manager"""
    
    def __init__(self):
        self.security = HTTPBearer(auto_error=False)
    
    async def get_current_user(self, credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False))) -> Optional[TokenClaims]:
        """Get current authenticated user"""
        if not credentials:
            return None
        
        try:
            token = credentials.credentials
            claims = jwt_manager.verify_token(token, TokenType.ACCESS)
            return claims
        except Exception as e:
            logger.warning(f"Authentication failed: {e}")
            return None
    
    async def get_current_user_required(self, credentials: HTTPAuthorizationCredentials = Depends(HTTPBearer())) -> TokenClaims:
        """Get current authenticated user (required)"""
        try:
            token = credentials.credentials
            claims = jwt_manager.verify_token(token, TokenType.ACCESS)
            if not claims:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid or expired token",
                    headers={"WWW-Authenticate": "Bearer"}
                )
            return claims
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Authentication error: {e}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication failed",
                headers={"WWW-Authenticate": "Bearer"}
            )
    
    async def get_api_key_user(self, credentials: HTTPAuthorizationCredentials = Depends(HTTPBearer())) -> TokenClaims:
        """Get user from API key"""
        try:
            api_key = credentials.credentials
            claims = jwt_manager.verify_api_key(api_key)
            if not claims:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid API key",
                    headers={"WWW-Authenticate": "Bearer"}
                )
            return claims
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"API key authentication error: {e}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="API key authentication failed",
                headers={"WWW-Authenticate": "Bearer"}
            )

# Global authentication manager
auth_manager = AuthenticationManager()

def require_permissions(*permissions: Permission):
    """Decorator to require specific permissions"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Get current user from dependency injection
            current_user = None
            for arg in args:
                if isinstance(arg, TokenClaims):
                    current_user = arg
                    break
            
            if not current_user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Authentication required"
                )
            
            # Check permissions
            user_permissions = rbac_manager.get_user_permissions(current_user.user_id)
            missing_permissions = [perm for perm in permissions if perm not in user_permissions]
            
            if missing_permissions:
                logger.warning(f"User {current_user.user_id} missing permissions: {missing_permissions}")
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Missing required permissions: {', '.join(missing_permissions)}"
                )
            
            return await func(*args, **kwargs)
        return wrapper
    return decorator

def require_roles(*roles: Role):
    """Decorator to require specific roles"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Get current user from dependency injection
            current_user = None
            for arg in args:
                if isinstance(arg, TokenClaims):
                    current_user = arg
                    break
            
            if not current_user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Authentication required"
                )
            
            # Check roles
            user_roles = rbac_manager.get_user_roles(current_user.user_id)
            user_role_names = [role.role for role in user_roles]
            
            if not any(role in user_role_names for role in roles):
                logger.warning(f"User {current_user.user_id} missing required roles: {roles}")
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Missing required roles: {', '.join(roles)}"
                )
            
            return await func(*args, **kwargs)
        return wrapper
    return decorator

def require_resource_access(resource_type: ResourceType, permission: Permission, resource_id_param: str = "resource_id"):
    """Decorator to require access to a specific resource"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Get current user from dependency injection
            current_user = None
            for arg in args:
                if isinstance(arg, TokenClaims):
                    current_user = arg
                    break
            
            if not current_user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Authentication required"
                )
            
            # Get resource ID from kwargs
            resource_id = kwargs.get(resource_id_param)
            if not resource_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Missing {resource_id_param} parameter"
                )
            
            # Check resource access
            if not rbac_manager.can_access_resource(current_user.user_id, resource_type, resource_id, permission):
                logger.warning(f"User {current_user.user_id} denied access to {resource_type}:{resource_id}")
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Access denied to {resource_type}"
                )
            
            return await func(*args, **kwargs)
        return wrapper
    return decorator

def admin_required(func):
    """Decorator to require admin privileges"""
    @wraps(func)
    async def wrapper(*args, **kwargs):
        # Get current user from dependency injection
        current_user = None
        for arg in args:
            if isinstance(arg, TokenClaims):
                current_user = arg
                break
        
        if not current_user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication required"
            )
        
        # Check admin privileges
        if not rbac_manager.is_admin(current_user.user_id):
            logger.warning(f"User {current_user.user_id} attempted admin action without privileges")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin privileges required"
            )
        
        return await func(*args, **kwargs)
    return wrapper

class PermissionChecker:
    """Helper class for permission checking"""
    
    @staticmethod
    def check_user_permission(user_id: str, permission: Permission, 
                            resource_type: Optional[ResourceType] = None,
                            resource_id: Optional[str] = None) -> bool:
        """Check if user has permission"""
        return rbac_manager.has_permission(user_id, permission, resource_type, resource_id)
    
    @staticmethod
    def check_user_role(user_id: str, role: Role,
                       resource_type: Optional[ResourceType] = None,
                       resource_id: Optional[str] = None) -> bool:
        """Check if user has role"""
        user_roles = rbac_manager.get_user_roles(user_id)
        for user_role in user_roles:
            if (user_role.role == role and
                user_role.resource_type == resource_type and
                user_role.resource_id == resource_id):
                return True
        return False
    
    @staticmethod
    def get_accessible_projects(user_id: str) -> List[str]:
        """Get list of projects user can access"""
        return rbac_manager.get_accessible_resources(user_id, ResourceType.PROJECT, Permission.PROJECT_READ)
    
    @staticmethod
    def can_manage_user(manager_id: str, target_user_id: str) -> bool:
        """Check if manager can manage target user"""
        # System admins can manage anyone
        if rbac_manager.has_permission(manager_id, Permission.SYSTEM_ADMIN):
            return True
        
        # Org admins can manage users in their org
        if rbac_manager.has_permission(manager_id, Permission.ORG_ADMIN):
            # Would need to check if both users are in same org
            return True
        
        # Team leads can manage team members
        if rbac_manager.has_permission(manager_id, Permission.TEAM_MANAGE_MEMBERS):
            # Would need to check if both users are in same team
            return True
        
        return False

# Route protection utilities
class RouteProtection:
    """Route protection utilities"""
    
    PUBLIC_ROUTES = [
        "/health",
        "/docs",
        "/redoc", 
        "/openapi.json",
        "/api/auth/login",
        "/api/auth/register",
        "/api/auth/forgot-password",
        "/api/auth/reset-password"
    ]
    
    ADMIN_ROUTES = [
        "/api/admin/.*",
        "/api/system/.*",
        "/api/users/.*/roles",
        "/api/organizations/.*/settings"
    ]
    
    @classmethod
    def is_public_route(cls, path: str) -> bool:
        """Check if route is public"""
        return any(re.match(route, path) for route in cls.PUBLIC_ROUTES)
    
    @classmethod
    def is_admin_route(cls, path: str) -> bool:
        """Check if route requires admin access"""
        return any(re.match(route, path) for route in cls.ADMIN_ROUTES)
    
    @classmethod
    def get_required_permission(cls, method: str, path: str) -> Optional[Permission]:
        """Get required permission for a route"""
        # Map HTTP methods and paths to permissions
        permission_map = {
            ("GET", "/api/users"): Permission.USER_READ,
            ("POST", "/api/users"): Permission.USER_CREATE,
            ("PUT", "/api/users/.*"): Permission.USER_UPDATE,
            ("DELETE", "/api/users/.*"): Permission.USER_DELETE,
            
            ("GET", "/api/projects"): Permission.PROJECT_READ,
            ("POST", "/api/projects"): Permission.PROJECT_CREATE,
            ("PUT", "/api/projects/.*"): Permission.PROJECT_UPDATE,
            ("DELETE", "/api/projects/.*"): Permission.PROJECT_DELETE,
            
            ("GET", "/api/stories"): Permission.STORY_READ,
            ("POST", "/api/stories"): Permission.STORY_CREATE,
            ("PUT", "/api/stories/.*"): Permission.STORY_UPDATE,
            ("DELETE", "/api/stories/.*"): Permission.STORY_DELETE,
            
            ("GET", "/api/tasks"): Permission.TASK_READ,
            ("POST", "/api/tasks"): Permission.TASK_CREATE,
            ("PUT", "/api/tasks/.*"): Permission.TASK_UPDATE,
            ("DELETE", "/api/tasks/.*"): Permission.TASK_DELETE,
        }
        
        for (route_method, route_pattern), permission in permission_map.items():
            if method == route_method and re.match(route_pattern, path):
                return permission
        
        return None

# Audit logging
class AuditLogger:
    """Audit logging for security events"""
    
    @staticmethod
    def log_login_attempt(user_id: str, ip_address: str, success: bool, user_agent: str = ""):
        """Log login attempt"""
        logger.info(f"Login attempt - User: {user_id}, IP: {ip_address}, Success: {success}, UA: {user_agent}")
    
    @staticmethod
    def log_permission_denied(user_id: str, permission: str, resource: str, ip_address: str):
        """Log permission denied event"""
        logger.warning(f"Permission denied - User: {user_id}, Permission: {permission}, Resource: {resource}, IP: {ip_address}")
    
    @staticmethod
    def log_admin_action(user_id: str, action: str, target: str, ip_address: str):
        """Log admin action"""
        logger.info(f"Admin action - User: {user_id}, Action: {action}, Target: {target}, IP: {ip_address}")
    
    @staticmethod
    def log_security_event(event_type: str, details: Dict[str, Any]):
        """Log security event"""
        logger.warning(f"Security event - Type: {event_type}, Details: {details}")

# Global instances
permission_checker = PermissionChecker()
audit_logger = AuditLogger() 