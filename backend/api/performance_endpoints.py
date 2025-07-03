"""
Performance Monitoring API Endpoints
Provides real-time performance metrics, optimization suggestions, and monitoring dashboards
"""

from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
import asyncio
import logging
import psutil
import structlog
from pydantic import BaseModel

from database.supabase_client import get_supabase
from database.query_optimizer import get_query_optimizer, ConnectionPoolOptimizer, connection_pool_optimizer
from auth.dependencies import get_current_user
from services.monitoring import get_system_monitor

logger = structlog.get_logger(__name__)
router = APIRouter()

# Request/Response Models
class PerformanceMetricsRequest(BaseModel):
    hours: int = 24
    include_details: bool = False

class OptimizationRequest(BaseModel):
    table_name: Optional[str] = None
    auto_apply: bool = False
    priority_threshold: str = "medium"

class QueryAnalysisRequest(BaseModel):
    query_hash: Optional[str] = None
    hours: int = 24
    limit: int = 20

class AlertThresholds(BaseModel):
    slow_query_threshold: float = 2.0
    error_rate_threshold: float = 5.0
    cache_hit_rate_threshold: float = 80.0
    cpu_threshold: float = 80.0
    memory_threshold: float = 85.0

# Performance Metrics Endpoints
@router.get("/performance/metrics")
async def get_performance_metrics(
    hours: int = Query(24, description="Hours to analyze"),
    include_details: bool = Query(False, description="Include detailed metrics"),
    current_user: dict = Depends(get_current_user)
):
    """Get comprehensive performance metrics"""
    try:
        optimizer = get_query_optimizer()
        
        # Get query performance metrics
        query_metrics = optimizer.get_performance_metrics(hours)
        
        # Get system metrics
        system_monitor = get_system_monitor()
        system_health = await system_monitor.get_system_health()
        
        # Get connection pool metrics
        pool_health = connection_pool_optimizer.get_pool_health()
        
        response = {
            "query_performance": query_metrics,
            "system_health": {
                "overall_status": _determine_overall_health(system_health),
                **system_health
            },
            "connection_pool": pool_health,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        return {
            "success": True,
            "data": response
        }
        
    except Exception as e:
        logger.error("Failed to get performance metrics", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/performance/dashboard")
async def get_performance_dashboard(
    current_user: dict = Depends(get_current_user)
):
    """Get performance dashboard data"""
    try:
        supabase = get_supabase()
        
        # Get recent optimization events
        optimization_events_result = supabase.table("optimization_events")\
            .select("*")\
            .order("created_at", desc=True)\
            .limit(10)\
            .execute()
        
        return {
            "success": True,
            "data": {
                "recent_optimizations": optimization_events_result.data,
                "generated_at": datetime.utcnow().isoformat()
            }
        }
        
    except Exception as e:
        logger.error("Failed to get performance dashboard", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/performance/slow-queries")
async def get_slow_queries(
    hours: int = Query(24, description="Hours to analyze"),
    limit: int = Query(50, description="Maximum number of results"),
    min_execution_time: float = Query(1.0, description="Minimum execution time in seconds"),
    current_user: dict = Depends(get_current_user)
):
    """Get slow queries analysis"""
    try:
        supabase = get_supabase()
        
        # Call stored function for query analysis
        analysis_result = supabase.rpc("analyze_query_performance", {"p_hours": hours}).execute()
        
        # Get detailed slow query information
        slow_queries_result = supabase.table("slow_queries")\
            .select("*")\
            .gte("created_at", (datetime.utcnow() - timedelta(hours=hours)).isoformat())\
            .gte("execution_time", min_execution_time)\
            .order("execution_time", desc=True)\
            .limit(limit)\
            .execute()
        
        return {
            "success": True,
            "data": {
                "query_analysis": analysis_result.data,
                "slow_queries": slow_queries_result.data,
                "analysis_period": f"{hours} hours",
                "threshold": f"{min_execution_time}s"
            }
        }
        
    except Exception as e:
        logger.error("Failed to get slow queries", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))

# Optimization Endpoints
@router.get("/performance/optimization/suggestions")
async def get_optimization_suggestions(
    table_name: Optional[str] = Query(None, description="Filter by table name"),
    current_user: dict = Depends(get_current_user)
):
    """Get database optimization suggestions"""
    try:
        # Get general performance recommendations
        optimizer = get_query_optimizer()
        general_recommendations = await optimizer._generate_performance_recommendations()
        
        return {
            "success": True,
            "data": {
                "general_recommendations": general_recommendations,
                "total_suggestions": len(general_recommendations)
            }
        }
        
    except Exception as e:
        logger.error("Failed to get optimization suggestions", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/performance/optimization/run")
async def run_optimization(
    request: OptimizationRequest,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user)
):
    """Run database optimization"""
    try:
        # Check user permissions (admin only for auto-apply)
        if request.auto_apply and 'admin' not in current_user.get('roles', []):
            raise HTTPException(status_code=403, detail="Admin access required for auto-apply")
        
        optimizer = get_query_optimizer()
        
        if request.auto_apply:
            # Run optimization in background
            background_tasks.add_task(_run_optimization_task, optimizer, request, current_user['id'])
            
            return {
                "success": True,
                "message": "Optimization started in background",
                "auto_apply": True
            }
        else:
            # Just return recommendations
            results = await optimizer.optimize_database()
            
            return {
                "success": True,
                "data": results,
                "auto_apply": False
            }
        
    except Exception as e:
        logger.error("Failed to run optimization", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/performance/alerts")
async def get_performance_alerts(
    current_user: dict = Depends(get_current_user)
):
    """Get performance alerts and warnings"""
    try:
        optimizer = get_query_optimizer()
        system_monitor = get_system_monitor()
        
        # Get current metrics
        query_metrics = optimizer.get_performance_metrics(1)  # Last hour
        system_health = await system_monitor.get_system_health()
        
        alerts = []
        warnings = []
        
        # Check query performance alerts
        if query_metrics["slow_query_percentage"] > 15:
            alerts.append({
                "type": "performance",
                "severity": "high",
                "message": f"High slow query rate: {query_metrics['slow_query_percentage']}%",
                "metric": "slow_query_percentage",
                "value": query_metrics["slow_query_percentage"],
                "threshold": 15
            })
        elif query_metrics["slow_query_percentage"] > 10:
            warnings.append({
                "type": "performance",
                "severity": "medium",
                "message": f"Elevated slow query rate: {query_metrics['slow_query_percentage']}%",
                "metric": "slow_query_percentage",
                "value": query_metrics["slow_query_percentage"],
                "threshold": 10
            })
        
        # Check cache hit rate
        if query_metrics["cache_hit_rate"] < 70:
            alerts.append({
                "type": "caching",
                "severity": "medium",
                "message": f"Low cache hit rate: {query_metrics['cache_hit_rate']}%",
                "metric": "cache_hit_rate",
                "value": query_metrics["cache_hit_rate"],
                "threshold": 70
            })
        
        # Check system health alerts
        for service, health in system_health.items():
            if isinstance(health, dict) and health.get("status") == "unhealthy":
                alerts.append({
                    "type": "system",
                    "severity": "high",
                    "message": f"Service {service} is unhealthy",
                    "service": service,
                    "details": health.get("details", {})
                })
            elif isinstance(health, dict) and health.get("status") == "degraded":
                warnings.append({
                    "type": "system",
                    "severity": "medium",
                    "message": f"Service {service} is degraded",
                    "service": service,
                    "details": health.get("details", {})
                })
        
        return {
            "success": True,
            "data": {
                "alerts": alerts,
                "warnings": warnings,
                "alert_count": len(alerts),
                "warning_count": len(warnings),
                "overall_status": "critical" if alerts else "warning" if warnings else "healthy",
                "checked_at": datetime.utcnow().isoformat()
            }
        }
        
    except Exception as e:
        logger.error("Failed to get performance alerts", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))

# Real-time Monitoring Endpoints
@router.get("/performance/realtime")
async def get_realtime_metrics(
    current_user: dict = Depends(get_current_user)
):
    """Get real-time performance metrics"""
    try:
        # Get current system resources
        cpu_percent = psutil.cpu_percent(interval=1)
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        
        # Get current application metrics
        optimizer = get_query_optimizer()
        recent_queries = len([m for m in optimizer.query_metrics 
                             if (datetime.utcnow() - m.timestamp).seconds < 60])
        
        # Get connection pool status
        pool_health = connection_pool_optimizer.get_pool_health()
        
        return {
            "success": True,
            "data": {
                "system": {
                    "cpu_usage": cpu_percent,
                    "memory_usage": memory.percent,
                    "memory_available_gb": round(memory.available / (1024**3), 2),
                    "disk_usage": (disk.used / disk.total) * 100,
                    "disk_free_gb": round(disk.free / (1024**3), 2)
                },
                "application": {
                    "queries_last_minute": recent_queries,
                    "connection_pool": pool_health,
                    "cache_entries": len(optimizer.query_cache)
                },
                "timestamp": datetime.utcnow().isoformat()
            }
        }
        
    except Exception as e:
        logger.error("Failed to get realtime metrics", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/performance/collect-metrics")
async def collect_metrics(
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user)
):
    """Trigger manual metrics collection"""
    try:
        background_tasks.add_task(_collect_metrics_task)
        
        return {
            "success": True,
            "message": "Metrics collection started"
        }
        
    except Exception as e:
        logger.error("Failed to start metrics collection", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))

# Helper Functions
def _determine_overall_health(system_health: Dict[str, Any]) -> str:
    """Determine overall system health status"""
    statuses = []
    for service, health in system_health.items():
        if isinstance(health, dict):
            statuses.append(health.get("status", "unknown"))
    
    if "unhealthy" in statuses:
        return "critical"
    elif "degraded" in statuses:
        return "warning"
    else:
        return "healthy"

def _aggregate_table_metrics(db_metrics: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Aggregate database table metrics"""
    if not db_metrics:
        return {"total_tables": 0, "total_size_mb": 0}
    
    table_sizes = {}
    for metric in db_metrics:
        table_name = metric["table_name"]
        if table_name not in table_sizes:
            table_sizes[table_name] = {
                "size_mb": metric.get("table_size_bytes", 0) / (1024 * 1024),
                "row_count": metric.get("row_count", 0)
            }
    
    total_size = sum(table["size_mb"] for table in table_sizes.values())
    total_rows = sum(table["row_count"] for table in table_sizes.values())
    
    return {
        "total_tables": len(table_sizes),
        "total_size_mb": round(total_size, 2),
        "total_rows": total_rows,
        "largest_tables": sorted(
            [{"name": name, **data} for name, data in table_sizes.items()],
            key=lambda x: x["size_mb"],
            reverse=True
        )[:5]
    }

def _aggregate_system_metrics(system_metrics: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Aggregate system resource metrics"""
    if not system_metrics:
        return {"avg_cpu": 0, "avg_memory": 0, "avg_response_time": 0}
    
    recent_metrics = system_metrics[-10:]  # Last 10 entries
    
    return {
        "avg_cpu": round(sum(m.get("cpu_usage", 0) for m in recent_metrics) / len(recent_metrics), 2),
        "avg_memory": round(sum(m.get("memory_usage", 0) for m in recent_metrics) / len(recent_metrics), 2),
        "avg_response_time_p95": round(sum(m.get("response_time_p95", 0) for m in recent_metrics) / len(recent_metrics), 3),
        "sample_count": len(recent_metrics)
    }

def _get_cache_stats(optimizer) -> Dict[str, Any]:
    """Get query cache statistics"""
    import time
    current_time = time.time()
    
    total_entries = len(optimizer.query_cache)
    valid_entries = len([
        k for k, v in optimizer.query_cache.items()
        if current_time - v['timestamp'] < optimizer.cache_ttl
    ])
    
    return {
        "total_entries": total_entries,
        "valid_entries": valid_entries,
        "expired_entries": total_entries - valid_entries,
        "cache_ttl_seconds": optimizer.cache_ttl
    }

async def _run_optimization_task(optimizer, request: OptimizationRequest, user_id: str):
    """Background task for running database optimization"""
    try:
        logger.info("Starting database optimization", user_id=user_id, request=request.dict())
        
        results = await optimizer.optimize_database()
        
        # Log optimization event
        supabase = get_supabase()
        supabase.table("optimization_events").insert({
            "event_type": "automated_optimization",
            "description": f"Automated optimization run by user {user_id}",
            "performance_impact": results,
            "executed_by": user_id,
            "status": "completed"
        }).execute()
        
        logger.info("Database optimization completed", results=results)
        
    except Exception as e:
        logger.error("Database optimization failed", error=str(e))
        
        # Log failed optimization event
        try:
            supabase = get_supabase()
            supabase.table("optimization_events").insert({
                "event_type": "automated_optimization",
                "description": f"Failed optimization run by user {user_id}: {str(e)}",
                "executed_by": user_id,
                "status": "failed"
            }).execute()
        except:
            pass

async def _collect_metrics_task():
    """Background task for collecting system metrics"""
    try:
        # Collect current system metrics
        cpu_percent = psutil.cpu_percent(interval=1)
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        
        # Store in database
        supabase = get_supabase()
        supabase.table("system_metrics").insert({
            "cpu_usage": cpu_percent,
            "memory_usage": memory.percent,
            "disk_usage": (disk.used / disk.total) * 100,
            "timestamp": datetime.utcnow().isoformat()
        }).execute()
        
        logger.info("System metrics collected", cpu=cpu_percent, memory=memory.percent)
        
    except Exception as e:
        logger.error("Failed to collect metrics", error=str(e)) 