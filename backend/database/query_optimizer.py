"""
Database Query Optimizer and Performance Monitor
Provides query optimization, performance tracking, and automatic indexing suggestions
"""

import time
import logging
import asyncio
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta
from functools import wraps
import json
import hashlib
from contextlib import contextmanager
import structlog
from supabase import Client

logger = structlog.get_logger(__name__)

@dataclass
class QueryMetrics:
    """Query performance metrics"""
    query_hash: str
    query_text: str
    execution_time: float
    rows_returned: int
    timestamp: datetime
    user_id: Optional[str] = None
    endpoint: Optional[str] = None
    parameters: Optional[Dict] = None
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            **asdict(self),
            'timestamp': self.timestamp.isoformat()
        }

@dataclass
class IndexSuggestion:
    """Database index suggestion"""
    table_name: str
    columns: List[str]
    index_type: str
    estimated_impact: float
    query_patterns: List[str]
    priority: str  # high, medium, low

class QueryOptimizer:
    """Advanced query optimizer with performance monitoring"""
    
    def __init__(self, supabase_client: Client):
        self.supabase = supabase_client
        self.query_cache = {}
        self.query_metrics = []
        self.slow_query_threshold = 1.0  # seconds
        self.cache_ttl = 300  # 5 minutes
        
    def monitor_query(self, endpoint: str = None, cache_key: str = None):
        """Decorator to monitor query performance"""
        def decorator(func):
            @wraps(func)
            async def wrapper(*args, **kwargs):
                start_time = time.time()
                query_hash = self._generate_query_hash(func.__name__, args, kwargs)
                
                try:
                    # Check cache first
                    if cache_key and cache_key in self.query_cache:
                        cache_entry = self.query_cache[cache_key]
                        if time.time() - cache_entry['timestamp'] < self.cache_ttl:
                            logger.info("Query served from cache", cache_key=cache_key)
                            return cache_entry['result']
                    
                    # Execute query
                    result = await func(*args, **kwargs) if asyncio.iscoroutinefunction(func) else func(*args, **kwargs)
                    
                    execution_time = time.time() - start_time
                    
                    # Cache result if cache_key provided
                    if cache_key:
                        self.query_cache[cache_key] = {
                            'result': result,
                            'timestamp': time.time()
                        }
                    
                    # Record metrics
                    metrics = QueryMetrics(
                        query_hash=query_hash,
                        query_text=func.__name__,
                        execution_time=execution_time,
                        rows_returned=self._count_rows(result),
                        timestamp=datetime.utcnow(),
                        endpoint=endpoint,
                        parameters=kwargs
                    )
                    
                    self.query_metrics.append(metrics)
                    
                    # Log slow queries
                    if execution_time > self.slow_query_threshold:
                        logger.warning(
                            "Slow query detected",
                            function=func.__name__,
                            execution_time=execution_time,
                            endpoint=endpoint
                        )
                        await self._analyze_slow_query(metrics)
                    
                    return result
                    
                except Exception as e:
                    execution_time = time.time() - start_time
                    logger.error(
                        "Query failed",
                        function=func.__name__,
                        error=str(e),
                        execution_time=execution_time
                    )
                    raise
                    
            return wrapper
        return decorator
    
    def _generate_query_hash(self, func_name: str, args: tuple, kwargs: dict) -> str:
        """Generate unique hash for query pattern"""
        query_signature = f"{func_name}:{str(args)}:{str(sorted(kwargs.items()))}"
        return hashlib.md5(query_signature.encode()).hexdigest()
    
    def _count_rows(self, result: Any) -> int:
        """Count rows in query result"""
        if hasattr(result, 'data') and isinstance(result.data, list):
            return len(result.data)
        elif isinstance(result, list):
            return len(result)
        elif isinstance(result, dict) and 'data' in result:
            return len(result['data']) if isinstance(result['data'], list) else 1
        return 1
    
    async def _analyze_slow_query(self, metrics: QueryMetrics):
        """Analyze slow query and generate optimization suggestions"""
        try:
            # Store slow query for analysis
            slow_query_data = {
                "query_hash": metrics.query_hash,
                "query_text": metrics.query_text,
                "execution_time": metrics.execution_time,
                "rows_returned": metrics.rows_returned,
                "timestamp": metrics.timestamp.isoformat(),
                "endpoint": metrics.endpoint,
                "parameters": metrics.parameters,
                "analysis_status": "pending"
            }
            
            # Insert into slow_queries table for tracking
            self.supabase.table("slow_queries").insert(slow_query_data).execute()
            
            # Generate optimization suggestions
            suggestions = await self._generate_optimization_suggestions(metrics)
            
            for suggestion in suggestions:
                await self._store_index_suggestion(suggestion)
                
        except Exception as e:
            logger.error("Failed to analyze slow query", error=str(e))
    
    async def _generate_optimization_suggestions(self, metrics: QueryMetrics) -> List[IndexSuggestion]:
        """Generate optimization suggestions based on query patterns"""
        suggestions = []
        
        # Analyze query patterns and suggest indexes
        if "stories" in metrics.query_text.lower():
            if metrics.execution_time > 2.0:
                suggestions.append(IndexSuggestion(
                    table_name="stories",
                    columns=["epic_id", "status"],
                    index_type="composite",
                    estimated_impact=0.7,
                    query_patterns=[metrics.query_text],
                    priority="high"
                ))
                
                suggestions.append(IndexSuggestion(
                    table_name="stories",
                    columns=["assignee_id"],
                    index_type="btree",
                    estimated_impact=0.5,
                    query_patterns=[metrics.query_text],
                    priority="medium"
                ))
        
        if "projects" in metrics.query_text.lower():
            if metrics.execution_time > 1.5:
                suggestions.append(IndexSuggestion(
                    table_name="projects",
                    columns=["created_by", "status"],
                    index_type="composite",
                    estimated_impact=0.6,
                    query_patterns=[metrics.query_text],
                    priority="high"
                ))
        
        return suggestions
    
    async def _store_index_suggestion(self, suggestion: IndexSuggestion):
        """Store index suggestion in database"""
        try:
            suggestion_data = {
                "table_name": suggestion.table_name,
                "columns": suggestion.columns,
                "index_type": suggestion.index_type,
                "estimated_impact": suggestion.estimated_impact,
                "query_patterns": suggestion.query_patterns,
                "priority": suggestion.priority,
                "status": "pending",
                "created_at": datetime.utcnow().isoformat()
            }
            
            self.supabase.table("index_suggestions").insert(suggestion_data).execute()
            
        except Exception as e:
            logger.error("Failed to store index suggestion", error=str(e))
    
    def get_performance_metrics(self, hours: int = 24) -> Dict[str, Any]:
        """Get performance metrics for the last N hours"""
        cutoff_time = datetime.utcnow() - timedelta(hours=hours)
        recent_metrics = [
            m for m in self.query_metrics 
            if m.timestamp > cutoff_time
        ]
        
        if not recent_metrics:
            return {
                "total_queries": 0,
                "average_time": 0,
                "slow_queries": 0,
                "cache_hit_rate": 0
            }
        
        total_queries = len(recent_metrics)
        average_time = sum(m.execution_time for m in recent_metrics) / total_queries
        slow_queries = len([m for m in recent_metrics if m.execution_time > self.slow_query_threshold])
        
        # Calculate cache hit rate (simplified)
        cache_hits = len([k for k, v in self.query_cache.items() 
                         if time.time() - v['timestamp'] < self.cache_ttl])
        cache_hit_rate = cache_hits / max(total_queries, 1)
        
        return {
            "total_queries": total_queries,
            "average_time": round(average_time, 3),
            "slow_queries": slow_queries,
            "slow_query_percentage": round((slow_queries / total_queries) * 100, 2),
            "cache_hit_rate": round(cache_hit_rate * 100, 2),
            "p95_time": self._calculate_percentile(recent_metrics, 95),
            "p99_time": self._calculate_percentile(recent_metrics, 99)
        }
    
    def _calculate_percentile(self, metrics: List[QueryMetrics], percentile: int) -> float:
        """Calculate percentile execution time"""
        times = sorted([m.execution_time for m in metrics])
        if not times:
            return 0
        
        index = int((percentile / 100) * len(times))
        index = min(index, len(times) - 1)
        return round(times[index], 3)
    
    async def optimize_database(self) -> Dict[str, Any]:
        """Run database optimization routines"""
        results = {
            "indexes_created": 0,
            "queries_optimized": 0,
            "cache_cleared": 0,
            "recommendations": []
        }
        
        try:
            # Get pending index suggestions
            suggestions_result = self.supabase.table("index_suggestions")\
                .select("*")\
                .eq("status", "pending")\
                .eq("priority", "high")\
                .execute()
            
            high_priority_suggestions = suggestions_result.data
            
            for suggestion in high_priority_suggestions:
                # Create index (this would be done carefully in production)
                index_created = await self._create_index_if_beneficial(suggestion)
                if index_created:
                    results["indexes_created"] += 1
                    
                    # Mark suggestion as implemented
                    self.supabase.table("index_suggestions")\
                        .update({"status": "implemented"})\
                        .eq("id", suggestion["id"])\
                        .execute()
            
            # Clear old cache entries
            current_time = time.time()
            old_keys = [
                k for k, v in self.query_cache.items()
                if current_time - v['timestamp'] > self.cache_ttl
            ]
            
            for key in old_keys:
                del self.query_cache[key]
                results["cache_cleared"] += 1
            
            # Generate recommendations
            results["recommendations"] = await self._generate_performance_recommendations()
            
        except Exception as e:
            logger.error("Database optimization failed", error=str(e))
            results["error"] = str(e)
        
        return results
    
    async def _create_index_if_beneficial(self, suggestion: Dict[str, Any]) -> bool:
        """Create index if it would be beneficial (simplified for safety)"""
        # In production, this would:
        # 1. Analyze query plans
        # 2. Check index size impact
        # 3. Test on staging first
        # 4. Create index during low-traffic periods
        
        logger.info(
            "Index creation recommended",
            table=suggestion["table_name"],
            columns=suggestion["columns"],
            estimated_impact=suggestion["estimated_impact"]
        )
        
        # For now, just log the recommendation
        # In production, you'd execute: CREATE INDEX CONCURRENTLY...
        return False  # Set to True when actually creating indexes
    
    async def _generate_performance_recommendations(self) -> List[Dict[str, Any]]:
        """Generate performance improvement recommendations"""
        recommendations = []
        
        metrics = self.get_performance_metrics(24)
        
        if metrics["slow_query_percentage"] > 10:
            recommendations.append({
                "type": "query_optimization",
                "priority": "high",
                "message": f"{metrics['slow_query_percentage']}% of queries are slow",
                "action": "Review and optimize slow queries"
            })
        
        if metrics["cache_hit_rate"] < 50:
            recommendations.append({
                "type": "caching",
                "priority": "medium", 
                "message": f"Cache hit rate is only {metrics['cache_hit_rate']}%",
                "action": "Increase cache TTL or improve cache key strategy"
            })
        
        if metrics["p99_time"] > 5.0:
            recommendations.append({
                "type": "performance",
                "priority": "high",
                "message": f"99th percentile query time is {metrics['p99_time']}s",
                "action": "Investigate and optimize slowest queries"
            })
        
        return recommendations


class ConnectionPoolOptimizer:
    """Optimize database connection pooling"""
    
    def __init__(self):
        self.pool_stats = {
            "active_connections": 0,
            "idle_connections": 0,
            "total_connections": 0,
            "connection_errors": 0,
            "average_connection_time": 0
        }
    
    @contextmanager
    def monitored_connection(self):
        """Context manager to monitor connection usage"""
        start_time = time.time()
        self.pool_stats["active_connections"] += 1
        
        try:
            yield
        except Exception as e:
            self.pool_stats["connection_errors"] += 1
            logger.error("Database connection error", error=str(e))
            raise
        finally:
            connection_time = time.time() - start_time
            self.pool_stats["active_connections"] -= 1
            
            # Update average connection time
            current_avg = self.pool_stats["average_connection_time"]
            self.pool_stats["average_connection_time"] = (current_avg + connection_time) / 2
    
    def get_pool_health(self) -> Dict[str, Any]:
        """Get connection pool health metrics"""
        total = self.pool_stats["total_connections"]
        active = self.pool_stats["active_connections"]
        
        return {
            **self.pool_stats,
            "utilization_rate": (active / max(total, 1)) * 100,
            "error_rate": (self.pool_stats["connection_errors"] / max(total, 1)) * 100,
            "health_status": self._determine_pool_health()
        }
    
    def _determine_pool_health(self) -> str:
        """Determine overall pool health"""
        stats = self.pool_stats
        
        if stats["connection_errors"] > 10:
            return "critical"
        elif stats["average_connection_time"] > 2.0:
            return "degraded"
        elif stats["active_connections"] / max(stats["total_connections"], 1) > 0.8:
            return "warning"
        else:
            return "healthy"


# Global instances
query_optimizer = None
connection_pool_optimizer = ConnectionPoolOptimizer()

def init_query_optimizer(supabase_client: Client):
    """Initialize global query optimizer"""
    global query_optimizer
    query_optimizer = QueryOptimizer(supabase_client)
    return query_optimizer

def get_query_optimizer() -> QueryOptimizer:
    """Get global query optimizer instance"""
    if query_optimizer is None:
        raise RuntimeError("Query optimizer not initialized")
    return query_optimizer 