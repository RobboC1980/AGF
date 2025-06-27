"""
Monitoring Service
Provides health checks, system metrics, and service status monitoring
"""

import asyncio
import psutil
import redis
import time
from typing import Dict, Any, List
from fastapi import APIRouter
from datetime import datetime, timedelta
import structlog
import os
from dataclasses import dataclass
from backend.database.supabase_client import get_supabase

logger = structlog.get_logger()

@dataclass
class HealthStatus:
    service: str
    status: str  # healthy, degraded, unhealthy
    response_time_ms: float
    details: Dict[str, Any]
    timestamp: datetime

class SystemMonitor:
    """
    System monitoring and health check service
    """
    
    def __init__(self):
        self.redis_client = None
        self.supabase_client = None
        self._initialize_clients()
    
    def _initialize_clients(self):
        """Initialize monitoring clients"""
        try:
            redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
            self.redis_client = redis.from_url(redis_url)
        except Exception as e:
            logger.error("Failed to initialize Redis client", error=str(e))
        
        try:
            self.supabase_client = get_supabase()
        except Exception as e:
            logger.error("Failed to initialize Supabase client", error=str(e))
    
    async def get_system_health(self) -> Dict[str, Any]:
        """Get comprehensive system health status"""
        health_checks = await asyncio.gather(
            self._check_api_health(),
            self._check_database_health(),
            self._check_redis_health(),
            self._check_celery_health(),
            self._check_system_resources(),
            return_exceptions=True
        )
        
        results = {}
        service_names = ["api", "database", "redis", "celery", "system"]
        
        overall_status = "healthy"
        
        for i, result in enumerate(health_checks):
            service_name = service_names[i]
            
            if isinstance(result, Exception):
                results[service_name] = HealthStatus(
                    service=service_name,
                    status="unhealthy",
                    response_time_ms=0,
                    details={"error": str(result)},
                    timestamp=datetime.utcnow()
                ).__dict__
                overall_status = "unhealthy"
            else:
                results[service_name] = result.__dict__
                if result.status in ["degraded", "unhealthy"]:
                    overall_status = "degraded" if overall_status == "healthy" else "unhealthy"
        
        return {
            "overall_status": overall_status,
            "timestamp": datetime.utcnow().isoformat(),
            "services": results,
            "uptime_seconds": self._get_uptime(),
            "version": "1.0.0"
        }
    
    async def _check_api_health(self) -> HealthStatus:
        """Check FastAPI application health"""
        start_time = time.time()
        
        try:
            # Simple health check - if we can execute this, API is responsive
            response_time = (time.time() - start_time) * 1000
            
            status = "healthy"
            if response_time > 1000:  # > 1 second
                status = "degraded"
            elif response_time > 5000:  # > 5 seconds
                status = "unhealthy"
            
            return HealthStatus(
                service="api",
                status=status,
                response_time_ms=response_time,
                details={
                    "response_time_ms": response_time,
                    "message": "API responding normally"
                },
                timestamp=datetime.utcnow()
            )
            
        except Exception as e:
            return HealthStatus(
                service="api",
                status="unhealthy",
                response_time_ms=(time.time() - start_time) * 1000,
                details={"error": str(e)},
                timestamp=datetime.utcnow()
            )
    
    async def _check_database_health(self) -> HealthStatus:
        """Check database connectivity and performance"""
        start_time = time.time()
        
        try:
            if not self.supabase_client:
                raise Exception("Supabase client not initialized")
            
            # Simple query to test connectivity
            response = self.supabase_client.table("projects").select("id").limit(1).execute()
            response_time = (time.time() - start_time) * 1000
            
            status = "healthy"
            if response_time > 500:  # > 500ms
                status = "degraded"
            elif response_time > 2000:  # > 2 seconds
                status = "unhealthy"
            
            return HealthStatus(
                service="database",
                status=status,
                response_time_ms=response_time,
                details={
                    "response_time_ms": response_time,
                    "connection_status": "connected",
                    "query_result": "success"
                },
                timestamp=datetime.utcnow()
            )
            
        except Exception as e:
            return HealthStatus(
                service="database",
                status="unhealthy", 
                response_time_ms=(time.time() - start_time) * 1000,
                details={"error": str(e)},
                timestamp=datetime.utcnow()
            )
    
    async def _check_redis_health(self) -> HealthStatus:
        """Check Redis connectivity and performance"""
        start_time = time.time()
        
        try:
            if not self.redis_client:
                raise Exception("Redis client not initialized")
            
            # Ping Redis
            pong = self.redis_client.ping()
            response_time = (time.time() - start_time) * 1000
            
            if not pong:
                raise Exception("Redis ping failed")
            
            # Get Redis info
            info = self.redis_client.info()
            
            status = "healthy"
            if response_time > 100:  # > 100ms
                status = "degraded"
            elif response_time > 1000:  # > 1 second
                status = "unhealthy"
            
            return HealthStatus(
                service="redis",
                status=status,
                response_time_ms=response_time,
                details={
                    "response_time_ms": response_time,
                    "connection_status": "connected",
                    "connected_clients": info.get("connected_clients", 0),
                    "used_memory_human": info.get("used_memory_human", "unknown")
                },
                timestamp=datetime.utcnow()
            )
            
        except Exception as e:
            return HealthStatus(
                service="redis",
                status="unhealthy",
                response_time_ms=(time.time() - start_time) * 1000,
                details={"error": str(e)},
                timestamp=datetime.utcnow()
            )
    
    async def _check_celery_health(self) -> HealthStatus:
        """Check Celery worker health"""
        start_time = time.time()
        
        try:
            if not self.redis_client:
                raise Exception("Redis client not available for Celery check")
            
            # Check if there are active Celery workers
            # This is a simple check - in production you might want more sophisticated monitoring
            celery_key_pattern = "celery-task-meta-*"
            keys = self.redis_client.keys(celery_key_pattern)
            
            response_time = (time.time() - start_time) * 1000
            
            # Check queue lengths
            queue_lengths = {}
            for queue in ["celery", "ai_queue", "analytics_queue"]:
                try:
                    length = self.redis_client.llen(queue)
                    queue_lengths[queue] = length
                except:
                    queue_lengths[queue] = 0
            
            total_queued = sum(queue_lengths.values())
            
            status = "healthy"
            if total_queued > 100:
                status = "degraded"
            elif total_queued > 1000:
                status = "unhealthy"
            
            return HealthStatus(
                service="celery",
                status=status,
                response_time_ms=response_time,
                details={
                    "response_time_ms": response_time,
                    "queue_lengths": queue_lengths,
                    "total_queued_tasks": total_queued,
                    "active_tasks": len(keys)
                },
                timestamp=datetime.utcnow()
            )
            
        except Exception as e:
            return HealthStatus(
                service="celery",
                status="unhealthy",
                response_time_ms=(time.time() - start_time) * 1000,
                details={"error": str(e)},
                timestamp=datetime.utcnow()
            )
    
    async def _check_system_resources(self) -> HealthStatus:
        """Check system resource usage"""
        start_time = time.time()
        
        try:
            # Get system metrics
            cpu_percent = psutil.cpu_percent(interval=0.1)
            memory = psutil.virtual_memory()
            disk = psutil.disk_usage('/')
            
            response_time = (time.time() - start_time) * 1000
            
            # Determine status based on resource usage
            status = "healthy"
            
            if (cpu_percent > 80 or memory.percent > 80 or 
                disk.percent > 80):
                status = "degraded"
            
            if (cpu_percent > 95 or memory.percent > 95 or 
                disk.percent > 95):
                status = "unhealthy"
            
            return HealthStatus(
                service="system",
                status=status,
                response_time_ms=response_time,
                details={
                    "cpu_percent": cpu_percent,
                    "memory_percent": memory.percent,
                    "memory_available_gb": round(memory.available / (1024**3), 2),
                    "disk_percent": disk.percent,
                    "disk_free_gb": round(disk.free / (1024**3), 2),
                    "load_average": os.getloadavg() if hasattr(os, 'getloadavg') else None
                },
                timestamp=datetime.utcnow()
            )
            
        except Exception as e:
            return HealthStatus(
                service="system",
                status="unhealthy",
                response_time_ms=(time.time() - start_time) * 1000,
                details={"error": str(e)},
                timestamp=datetime.utcnow()
            )
    
    def _get_uptime(self) -> float:
        """Get system uptime in seconds"""
        try:
            return time.time() - psutil.boot_time()
        except:
            return 0

# Global monitor instance
system_monitor = SystemMonitor()

# FastAPI router for health endpoints
health_router = APIRouter(prefix="/health", tags=["Health"])

@health_router.get("/")
async def health_check():
    """Simple health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "service": "agileforge-api"
    }

@health_router.get("/detailed")
async def detailed_health_check():
    """Detailed health check with all services"""
    return await system_monitor.get_system_health()

@health_router.get("/ready")
async def readiness_check():
    """Kubernetes readiness probe"""
    health = await system_monitor.get_system_health()
    
    if health["overall_status"] in ["healthy", "degraded"]:
        return {"status": "ready"}
    else:
        return JSONResponse(
            status_code=503,
            content={"status": "not ready", "details": health}
        )

@health_router.get("/live")
async def liveness_check():
    """Kubernetes liveness probe"""
    return {"status": "alive", "timestamp": datetime.utcnow().isoformat()}

def get_system_monitor() -> SystemMonitor:
    """Get system monitor instance"""
    return system_monitor 