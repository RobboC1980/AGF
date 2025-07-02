"""
Enhanced Error Handling Middleware

Provides comprehensive error handling with:
- User-friendly error messages
- Consistent error response format
- Detailed logging for debugging
- Security-conscious error disclosure
- Rate limiting for error responses
- Error categorization and tracking
"""

from fastapi import HTTPException, Request, Response, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError, ResponseValidationError
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.exceptions import HTTPException as StarletteHTTPException
from typing import Dict, Any, Optional
from datetime import datetime
import logging
import traceback
import json
import uuid
from collections import defaultdict
import time

logger = logging.getLogger(__name__)

class ErrorCategory:
    """Error categories for better error tracking and handling"""
    AUTHENTICATION = "authentication"
    AUTHORIZATION = "authorization"
    VALIDATION = "validation"
    NOT_FOUND = "not_found"
    RATE_LIMIT = "rate_limit"
    SERVER_ERROR = "server_error"
    DATABASE = "database"
    EXTERNAL_SERVICE = "external_service"
    AI_SERVICE = "ai_service"
    BUSINESS_LOGIC = "business_logic"

class ErrorMessage:
    """User-friendly error messages"""
    
    # Authentication errors
    INVALID_CREDENTIALS = "Invalid email or password. Please check your credentials and try again."
    SESSION_EXPIRED = "Your session has expired. Please log in again."
    TOKEN_INVALID = "Authentication token is invalid. Please log in again."
    ACCOUNT_DISABLED = "Your account has been disabled. Please contact support."
    
    # Authorization errors
    ACCESS_DENIED = "Access denied. You don't have permission to perform this action."
    INSUFFICIENT_PERMISSIONS = "You don't have sufficient permissions for this operation."
    PROJECT_ACCESS_DENIED = "You don't have access to this project."
    
    # Validation errors
    INVALID_INPUT = "Invalid input data. Please check your request and try again."
    MISSING_REQUIRED_FIELD = "Required field is missing: {field}"
    INVALID_FORMAT = "Invalid format for field: {field}"
    
    # Resource errors
    RESOURCE_NOT_FOUND = "The requested resource was not found."
    PROJECT_NOT_FOUND = "Project not found."
    USER_NOT_FOUND = "User not found."
    
    # Rate limiting
    RATE_LIMIT_EXCEEDED = "Too many requests. Please wait {retry_after} seconds before trying again."
    
    # Server errors
    INTERNAL_ERROR = "An internal error occurred. Our team has been notified."
    SERVICE_UNAVAILABLE = "Service is temporarily unavailable. Please try again later."
    DATABASE_ERROR = "Database operation failed. Please try again."
    
    # AI service errors
    AI_SERVICE_ERROR = "AI service is temporarily unavailable. Please try again later."
    AI_QUOTA_EXCEEDED = "AI service quota exceeded. Please try again later or upgrade your plan."
    
    # External service errors
    EXTERNAL_SERVICE_ERROR = "External service is temporarily unavailable."

class ErrorResponse:
    """Standardized error response format"""
    
    @staticmethod
    def create(
        error_code: str,
        message: str,
        details: Optional[Dict[str, Any]] = None,
        request_id: Optional[str] = None,
        category: Optional[str] = None,
        status_code: int = 500,
        timestamp: Optional[datetime] = None
    ) -> Dict[str, Any]:
        response = {
            "success": False,
            "error": {
                "code": error_code,
                "message": message,
                "category": category or ErrorCategory.SERVER_ERROR,
                "timestamp": (timestamp or datetime.utcnow()).isoformat(),
                "request_id": request_id
            }
        }
        
        if details:
            response["error"]["details"] = details
            
        return response

class ErrorTracker:
    """Track error patterns and rates"""
    
    def __init__(self):
        self.error_counts = defaultdict(int)
        self.error_timestamps = defaultdict(list)
        self.last_cleanup = time.time()
    
    def track_error(self, category: str, error_code: str, user_id: Optional[str] = None):
        """Track an error occurrence"""
        current_time = time.time()
        
        # Clean up old timestamps (older than 1 hour)
        if current_time - self.last_cleanup > 300:  # Clean every 5 minutes
            self._cleanup_old_timestamps(current_time - 3600)
            self.last_cleanup = current_time
        
        # Track the error
        key = f"{category}:{error_code}"
        if user_id:
            key = f"{key}:user:{user_id}"
        
        self.error_counts[key] += 1
        self.error_timestamps[key].append(current_time)
    
    def _cleanup_old_timestamps(self, cutoff_time: float):
        """Remove timestamps older than cutoff_time"""
        for key in list(self.error_timestamps.keys()):
            self.error_timestamps[key] = [
                ts for ts in self.error_timestamps[key] 
                if ts > cutoff_time
            ]
            if not self.error_timestamps[key]:
                del self.error_timestamps[key]
                if key in self.error_counts:
                    del self.error_counts[key]
    
    def get_error_rate(self, category: str, time_window: int = 300) -> int:
        """Get error rate for a category in the given time window (seconds)"""
        current_time = time.time()
        cutoff_time = current_time - time_window
        
        count = 0
        for key, timestamps in self.error_timestamps.items():
            if key.startswith(f"{category}:"):
                count += len([ts for ts in timestamps if ts > cutoff_time])
        
        return count

# Global error tracker instance
error_tracker = ErrorTracker()

class EnhancedErrorHandlingMiddleware(BaseHTTPMiddleware):
    """Enhanced error handling middleware with comprehensive error processing"""
    
    def __init__(self, app, include_debug_info: bool = False):
        super().__init__(app)
        self.include_debug_info = include_debug_info
    
    async def dispatch(self, request: Request, call_next):
        """Process requests and handle errors"""
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id
        
        try:
            response = await call_next(request)
            return response
            
        except HTTPException as exc:
            return await self._handle_http_exception(request, exc, request_id)
        except RequestValidationError as exc:
            return await self._handle_validation_error(request, exc, request_id)
        except Exception as exc:
            return await self._handle_unexpected_error(request, exc, request_id)
    
    async def _handle_http_exception(
        self, 
        request: Request, 
        exc: HTTPException, 
        request_id: str
    ) -> JSONResponse:
        """Handle FastAPI HTTP exceptions"""
        
        status_code = exc.status_code
        detail = exc.detail
        
        # Categorize the error
        if status_code == 401:
            category = ErrorCategory.AUTHENTICATION
            if "expired" in str(detail).lower():
                message = ErrorMessage.SESSION_EXPIRED
                error_code = "SESSION_EXPIRED"
            elif "invalid" in str(detail).lower():
                message = ErrorMessage.TOKEN_INVALID
                error_code = "INVALID_TOKEN"
            else:
                message = ErrorMessage.INVALID_CREDENTIALS
                error_code = "INVALID_CREDENTIALS"
                
        elif status_code == 403:
            category = ErrorCategory.AUTHORIZATION
            if "project" in str(detail).lower():
                message = ErrorMessage.PROJECT_ACCESS_DENIED
                error_code = "PROJECT_ACCESS_DENIED"
            else:
                message = ErrorMessage.ACCESS_DENIED
                error_code = "ACCESS_DENIED"
                
        elif status_code == 404:
            category = ErrorCategory.NOT_FOUND
            message = ErrorMessage.RESOURCE_NOT_FOUND
            error_code = "RESOURCE_NOT_FOUND"
            
        elif status_code == 429:
            category = ErrorCategory.RATE_LIMIT
            retry_after = getattr(exc, "retry_after", 60)
            message = ErrorMessage.RATE_LIMIT_EXCEEDED.format(retry_after=retry_after)
            error_code = "RATE_LIMIT_EXCEEDED"
            
        elif status_code >= 500:
            category = ErrorCategory.SERVER_ERROR
            message = ErrorMessage.INTERNAL_ERROR
            error_code = "INTERNAL_ERROR"
            
        else:
            category = ErrorCategory.BUSINESS_LOGIC
            message = str(detail) if isinstance(detail, str) else ErrorMessage.INTERNAL_ERROR
            error_code = f"HTTP_{status_code}"
        
        # Track the error
        user_id = getattr(request.state, 'user_id', None)
        error_tracker.track_error(category, error_code, user_id)
        
        # Log the error
        logger.warning(
            f"HTTP {status_code} error",
            extra={
                "request_id": request_id,
                "status_code": status_code,
                "error_code": error_code,
                "category": category,
                "path": str(request.url.path),
                "method": request.method,
                "user_id": user_id,
                "detail": str(detail)
            }
        )
        
        # Create error response
        error_response = ErrorResponse.create(
            error_code=error_code,
            message=message,
            request_id=request_id,
            category=category,
            status_code=status_code,
            details={"original_detail": str(detail)} if self.include_debug_info else None
        )
        
        return JSONResponse(
            content=error_response,
            status_code=status_code,
            headers={"X-Request-ID": request_id}
        )
    
    async def _handle_validation_error(
        self, 
        request: Request, 
        exc: RequestValidationError, 
        request_id: str
    ) -> JSONResponse:
        """Handle request validation errors"""
        
        category = ErrorCategory.VALIDATION
        error_code = "VALIDATION_ERROR"
        
        # Extract validation details
        validation_errors = []
        for error in exc.errors():
            field = ".".join(str(loc) for loc in error["loc"])
            validation_errors.append({
                "field": field,
                "message": error["msg"],
                "type": error["type"]
            })
        
        # Track the error
        user_id = getattr(request.state, 'user_id', None)
        error_tracker.track_error(category, error_code, user_id)
        
        # Log the error
        logger.warning(
            "Validation error",
            extra={
                "request_id": request_id,
                "error_code": error_code,
                "category": category,
                "path": str(request.url.path),
                "method": request.method,
                "user_id": user_id,
                "validation_errors": validation_errors
            }
        )
        
        # Create error response
        error_response = ErrorResponse.create(
            error_code=error_code,
            message=ErrorMessage.INVALID_INPUT,
            request_id=request_id,
            category=category,
            status_code=422,
            details={
                "validation_errors": validation_errors
            }
        )
        
        return JSONResponse(
            content=error_response,
            status_code=422,
            headers={"X-Request-ID": request_id}
        )
    
    async def _handle_unexpected_error(
        self, 
        request: Request, 
        exc: Exception, 
        request_id: str
    ) -> JSONResponse:
        """Handle unexpected errors"""
        
        # Determine error category and message based on exception type
        exc_type = type(exc).__name__
        exc_message = str(exc)
        
        if "database" in exc_message.lower() or "supabase" in exc_message.lower():
            category = ErrorCategory.DATABASE
            message = ErrorMessage.DATABASE_ERROR
            error_code = "DATABASE_ERROR"
            
        elif "ai" in exc_message.lower() or "openai" in exc_message.lower() or "anthropic" in exc_message.lower():
            category = ErrorCategory.AI_SERVICE
            if "quota" in exc_message.lower() or "limit" in exc_message.lower():
                message = ErrorMessage.AI_QUOTA_EXCEEDED
                error_code = "AI_QUOTA_EXCEEDED"
            else:
                message = ErrorMessage.AI_SERVICE_ERROR
                error_code = "AI_SERVICE_ERROR"
                
        elif "connection" in exc_message.lower() or "timeout" in exc_message.lower():
            category = ErrorCategory.EXTERNAL_SERVICE
            message = ErrorMessage.EXTERNAL_SERVICE_ERROR
            error_code = "EXTERNAL_SERVICE_ERROR"
            
        else:
            category = ErrorCategory.SERVER_ERROR
            message = ErrorMessage.INTERNAL_ERROR
            error_code = "INTERNAL_ERROR"
        
        # Track the error
        user_id = getattr(request.state, 'user_id', None)
        error_tracker.track_error(category, error_code, user_id)
        
        # Log the error with full traceback
        logger.error(
            f"Unexpected error: {exc_type}",
            extra={
                "request_id": request_id,
                "error_code": error_code,
                "category": category,
                "path": str(request.url.path),
                "method": request.method,
                "user_id": user_id,
                "exception_type": exc_type,
                "exception_message": exc_message,
                "traceback": traceback.format_exc()
            }
        )
        
        # Create error response
        error_response = ErrorResponse.create(
            error_code=error_code,
            message=message,
            request_id=request_id,
            category=category,
            status_code=500,
            details={
                "exception_type": exc_type,
                "traceback": traceback.format_exc()
            } if self.include_debug_info else None
        )
        
        return JSONResponse(
            content=error_response,
            status_code=500,
            headers={"X-Request-ID": request_id}
        )

# Error handling utilities
def create_error_response(
    error_code: str,
    message: str,
    status_code: int = 400,
    details: Optional[Dict[str, Any]] = None,
    category: Optional[str] = None
) -> HTTPException:
    """Create a standardized HTTPException"""
    
    error_detail = {
        "code": error_code,
        "message": message,
        "category": category or ErrorCategory.BUSINESS_LOGIC,
        "timestamp": datetime.utcnow().isoformat()
    }
    
    if details:
        error_detail["details"] = details
    
    return HTTPException(
        status_code=status_code,
        detail=error_detail
    )

def create_validation_error(field: str, message: str) -> HTTPException:
    """Create a validation error"""
    return create_error_response(
        error_code="VALIDATION_ERROR",
        message=ErrorMessage.INVALID_FORMAT.format(field=field),
        status_code=422,
        details={"field": field, "validation_message": message},
        category=ErrorCategory.VALIDATION
    )

def create_not_found_error(resource: str) -> HTTPException:
    """Create a not found error"""
    return create_error_response(
        error_code=f"{resource.upper()}_NOT_FOUND",
        message=f"{resource} not found.",
        status_code=404,
        category=ErrorCategory.NOT_FOUND
    )

def create_access_denied_error(resource: str = "resource") -> HTTPException:
    """Create an access denied error"""
    return create_error_response(
        error_code="ACCESS_DENIED",
        message=f"You don't have permission to access this {resource}.",
        status_code=403,
        category=ErrorCategory.AUTHORIZATION
    )

def create_rate_limit_error(retry_after: int = 60) -> HTTPException:
    """Create a rate limit error"""
    error = create_error_response(
        error_code="RATE_LIMIT_EXCEEDED",
        message=ErrorMessage.RATE_LIMIT_EXCEEDED.format(retry_after=retry_after),
        status_code=429,
        category=ErrorCategory.RATE_LIMIT
    )
    error.retry_after = retry_after
    return error

# Error monitoring functions
def get_error_stats(time_window: int = 3600) -> Dict[str, Any]:
    """Get error statistics for monitoring"""
    stats = {}
    for category in [ErrorCategory.AUTHENTICATION, ErrorCategory.AUTHORIZATION, 
                    ErrorCategory.VALIDATION, ErrorCategory.SERVER_ERROR,
                    ErrorCategory.AI_SERVICE, ErrorCategory.DATABASE]:
        stats[category] = error_tracker.get_error_rate(category, time_window)
    
    return {
        "time_window_seconds": time_window,
        "error_counts_by_category": stats,
        "total_errors": sum(stats.values()),
        "timestamp": datetime.utcnow().isoformat()
    } 