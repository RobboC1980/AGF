"""
Observability Middleware
Implements OpenTelemetry tracing, structured logging, and metrics collection
"""

import time
import uuid
import structlog
from typing import Callable, Dict, Any
from fastapi import Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp
from opentelemetry import trace, metrics
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.exporter.jaeger.thrift import JaegerExporter
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.exporter.prometheus import PrometheusMetricReader
from prometheus_client import Counter, Histogram, Gauge
import os

# Configure structured logging
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
        structlog.processors.JSONRenderer()
    ],
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger()

# Prometheus metrics
REQUEST_COUNT = Counter(
    'http_requests_total',
    'Total HTTP requests',
    ['method', 'endpoint', 'status_code']
)

REQUEST_DURATION = Histogram(
    'http_request_duration_seconds',
    'HTTP request duration in seconds',
    ['method', 'endpoint']
)

ACTIVE_REQUESTS = Gauge(
    'http_requests_active',
    'Number of active HTTP requests'
)

AI_TASK_COUNT = Counter(
    'ai_tasks_total',
    'Total AI tasks processed',
    ['task_type', 'status']
)

CACHE_OPERATIONS = Counter(
    'cache_operations_total',
    'Total cache operations',
    ['operation', 'result']
)

def setup_telemetry():
    """Setup OpenTelemetry tracing and metrics"""
    
    # Setup tracing
    if os.getenv("JAEGER_ENDPOINT"):
        jaeger_exporter = JaegerExporter(
            agent_host_name=os.getenv("JAEGER_HOST", "localhost"),
            agent_port=int(os.getenv("JAEGER_PORT", "14268")),
        )
        
        trace.set_tracer_provider(TracerProvider())
        tracer = trace.get_tracer(__name__)
        
        span_processor = BatchSpanProcessor(jaeger_exporter)
        trace.get_tracer_provider().add_span_processor(span_processor)
        
        logger.info("OpenTelemetry tracing configured", jaeger_host=os.getenv("JAEGER_HOST"))
    
    # Setup metrics
    prometheus_reader = PrometheusMetricReader()
    metrics.set_meter_provider(MeterProvider(metric_readers=[prometheus_reader]))
    
    logger.info("OpenTelemetry metrics configured")

class ObservabilityMiddleware(BaseHTTPMiddleware):
    """
    Middleware for observability, tracing, and structured logging
    """
    
    def __init__(self, app: ASGIApp):
        super().__init__(app)
        self.tracer = trace.get_tracer(__name__)
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Generate request ID
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id
        
        # Start timing
        start_time = time.time()
        ACTIVE_REQUESTS.inc()
        
        # Create trace span
        with self.tracer.start_as_current_span(
            f"{request.method} {request.url.path}",
            attributes={
                "http.method": request.method,
                "http.url": str(request.url),
                "http.user_agent": request.headers.get("user-agent", ""),
                "request.id": request_id,
            }
        ) as span:
            
            # Structured logging
            logger.info(
                "HTTP request started",
                request_id=request_id,
                method=request.method,
                path=request.url.path,
                query_params=dict(request.query_params),
                user_agent=request.headers.get("user-agent", ""),
                client_ip=self._get_client_ip(request)
            )
            
            try:
                # Process request
                response = await call_next(request)
                
                # Calculate duration
                duration = time.time() - start_time
                
                # Update metrics
                REQUEST_COUNT.labels(
                    method=request.method,
                    endpoint=request.url.path,
                    status_code=response.status_code
                ).inc()
                
                REQUEST_DURATION.labels(
                    method=request.method,
                    endpoint=request.url.path
                ).observe(duration)
                
                # Add tracing attributes
                span.set_attribute("http.status_code", response.status_code)
                span.set_attribute("http.response_size", 
                                 len(response.body) if hasattr(response, 'body') else 0)
                
                # Structured logging for success
                logger.info(
                    "HTTP request completed",
                    request_id=request_id,
                    method=request.method,
                    path=request.url.path,
                    status_code=response.status_code,
                    duration_ms=round(duration * 1000, 2),
                    response_size=len(response.body) if hasattr(response, 'body') else 0
                )
                
                # Add request ID to response headers
                response.headers["X-Request-ID"] = request_id
                return response
                
            except Exception as e:
                duration = time.time() - start_time
                
                # Update error metrics
                REQUEST_COUNT.labels(
                    method=request.method,
                    endpoint=request.url.path,
                    status_code=500
                ).inc()
                
                # Add error to span
                span.record_exception(e)
                span.set_status(trace.Status(trace.StatusCode.ERROR, str(e)))
                
                # Structured error logging
                logger.error(
                    "HTTP request failed",
                    request_id=request_id,
                    method=request.method,
                    path=request.url.path,
                    duration_ms=round(duration * 1000, 2),
                    error=str(e),
                    error_type=type(e).__name__
                )
                
                # Return error response
                return JSONResponse(
                    status_code=500,
                    content={
                        "error": "Internal server error",
                        "request_id": request_id,
                        "timestamp": time.time()
                    },
                    headers={"X-Request-ID": request_id}
                )
                
            finally:
                ACTIVE_REQUESTS.dec()
    
    def _get_client_ip(self, request: Request) -> str:
        """Extract client IP from request"""
        # Check for forwarded IP (common in load balancers)
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()
        
        # Check for real IP (nginx proxy)
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip
        
        # Fall back to direct client
        if hasattr(request, "client") and request.client:
            return request.client.host
        
        return "unknown"

def instrument_fastapi_app(app):
    """Instrument FastAPI application with OpenTelemetry"""
    FastAPIInstrumentor.instrument_app(app)
    logger.info("FastAPI application instrumented with OpenTelemetry")

# Utility functions for manual tracing
def trace_async_function(func_name: str):
    """Decorator for tracing async functions"""
    def decorator(func):
        async def wrapper(*args, **kwargs):
            tracer = trace.get_tracer(__name__)
            with tracer.start_as_current_span(func_name) as span:
                try:
                    result = await func(*args, **kwargs)
                    span.set_status(trace.Status(trace.StatusCode.OK))
                    return result
                except Exception as e:
                    span.record_exception(e)
                    span.set_status(trace.Status(trace.StatusCode.ERROR, str(e)))
                    raise
        return wrapper
    return decorator

def trace_ai_task(task_type: str, task_id: str):
    """Context manager for tracing AI tasks"""
    class AITaskTracer:
        def __init__(self, task_type: str, task_id: str):
            self.task_type = task_type
            self.task_id = task_id
            self.tracer = trace.get_tracer(__name__)
            self.span = None
        
        def __enter__(self):
            self.span = self.tracer.start_span(
                f"ai_task_{self.task_type}",
                attributes={
                    "ai.task.type": self.task_type,
                    "ai.task.id": self.task_id,
                }
            )
            return self.span
        
        def __exit__(self, exc_type, exc_val, exc_tb):
            if exc_type is None:
                AI_TASK_COUNT.labels(task_type=self.task_type, status="success").inc()
                self.span.set_status(trace.Status(trace.StatusCode.OK))
            else:
                AI_TASK_COUNT.labels(task_type=self.task_type, status="error").inc()
                self.span.record_exception(exc_val)
                self.span.set_status(trace.Status(trace.StatusCode.ERROR, str(exc_val)))
            
            self.span.end()
    
    return AITaskTracer(task_type, task_id) 