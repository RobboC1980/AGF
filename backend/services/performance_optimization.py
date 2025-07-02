"""
Performance Optimization Services

Provides comprehensive performance optimization including:
- Intelligent caching strategies with TTL management
- Request/response optimization and compression
- Database query optimization and connection pooling
- API response caching and invalidation
- Memory usage optimization
- Background task optimization
"""

from typing import Dict, Any, Optional, Union, List, Callable
from datetime import datetime, timedelta
from functools import wraps, lru_cache
from dataclasses import dataclass
import asyncio
import json
import hashlib
import gzip
import logging
import time
import sys
from collections import defaultdict, OrderedDict
import weakref

try:
    import redis
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False

logger = logging.getLogger(__name__)

@dataclass
class CacheConfig:
    """Cache configuration settings"""
    default_ttl: int = 300  # 5 minutes
    max_memory_size: int = 100 * 1024 * 1024  # 100MB
    cleanup_interval: int = 60  # 1 minute
    enable_compression: bool = True
    compression_threshold: int = 1024  # Compress if data > 1KB

class MemoryCache:
    """High-performance in-memory cache with TTL and size limits"""
    
    def __init__(self, config: CacheConfig):
        self.config = config
        self.cache: OrderedDict = OrderedDict()
        self.expiry_times: Dict[str, float] = {}
        self.access_times: Dict[str, float] = {}
        self.memory_usage = 0
        self.stats = {
            "hits": 0,
            "misses": 0,
            "evictions": 0,
            "memory_cleanups": 0
        }
        
        # Start cleanup task
        self._cleanup_task = None
        self._start_cleanup_task()
    
    def _start_cleanup_task(self):
        """Start the cleanup background task"""
        if self._cleanup_task is None or self._cleanup_task.done():
            self._cleanup_task = asyncio.create_task(self._cleanup_loop())
    
    async def _cleanup_loop(self):
        """Background cleanup loop"""
        while True:
            try:
                await asyncio.sleep(self.config.cleanup_interval)
                self._cleanup_expired()
                self._cleanup_memory()
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Cache cleanup error: {e}")
    
    def _cleanup_expired(self):
        """Remove expired cache entries"""
        current_time = time.time()
        expired_keys = [
            key for key, expiry in self.expiry_times.items()
            if current_time > expiry
        ]
        
        for key in expired_keys:
            self._remove_key(key)
    
    def _cleanup_memory(self):
        """Remove old entries if memory limit exceeded"""
        if self.memory_usage <= self.config.max_memory_size:
            return
        
        # Remove least recently used items
        sorted_keys = sorted(
            self.access_times.items(),
            key=lambda x: x[1]
        )
        
        removed_count = 0
        for key, _ in sorted_keys:
            if self.memory_usage <= self.config.max_memory_size * 0.8:
                break
            self._remove_key(key)
            removed_count += 1
        
        if removed_count > 0:
            self.stats["memory_cleanups"] += 1
            logger.info(f"Memory cleanup: removed {removed_count} cache entries")
    
    def _remove_key(self, key: str):
        """Remove a key and update memory usage"""
        if key in self.cache:
            data = self.cache.pop(key)
            self.expiry_times.pop(key, None)
            self.access_times.pop(key, None)
            
            # Estimate memory usage
            self.memory_usage -= sys.getsizeof(key) + sys.getsizeof(data)
            self.stats["evictions"] += 1
    
    def _compress_data(self, data: Any) -> bytes:
        """Compress data if enabled and above threshold"""
        serialized = json.dumps(data, default=str).encode('utf-8')
        
        if (self.config.enable_compression and 
            len(serialized) > self.config.compression_threshold):
            return gzip.compress(serialized)
        
        return serialized
    
    def _decompress_data(self, data: bytes) -> Any:
        """Decompress data if compressed"""
        try:
            # Try to decompress
            decompressed = gzip.decompress(data)
            return json.loads(decompressed.decode('utf-8'))
        except:
            # Not compressed or different format
            try:
                return json.loads(data.decode('utf-8'))
            except:
                return data
    
    def get(self, key: str) -> Optional[Any]:
        """Get value from cache"""
        current_time = time.time()
        
        # Check if key exists and not expired
        if key not in self.cache:
            self.stats["misses"] += 1
            return None
        
        if key in self.expiry_times and current_time > self.expiry_times[key]:
            self._remove_key(key)
            self.stats["misses"] += 1
            return None
        
        # Update access time and move to end (most recently used)
        self.access_times[key] = current_time
        self.cache.move_to_end(key)
        
        self.stats["hits"] += 1
        return self._decompress_data(self.cache[key])
    
    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> bool:
        """Set value in cache"""
        try:
            compressed_data = self._compress_data(value)
            data_size = sys.getsizeof(key) + sys.getsizeof(compressed_data)
            
            # Check if we need to make space
            if self.memory_usage + data_size > self.config.max_memory_size:
                self._cleanup_memory()
                
                # If still not enough space, don't cache
                if self.memory_usage + data_size > self.config.max_memory_size:
                    logger.warning(f"Cache full, cannot store key: {key}")
                    return False
            
            # Remove existing key if present
            if key in self.cache:
                self._remove_key(key)
            
            # Set new value
            self.cache[key] = compressed_data
            self.access_times[key] = time.time()
            
            # Set expiry
            ttl = ttl or self.config.default_ttl
            self.expiry_times[key] = time.time() + ttl
            
            # Update memory usage
            self.memory_usage += data_size
            
            return True
            
        except Exception as e:
            logger.error(f"Cache set error: {e}")
            return False
    
    def delete(self, key: str) -> bool:
        """Delete key from cache"""
        if key in self.cache:
            self._remove_key(key)
            return True
        return False
    
    def clear(self):
        """Clear all cache"""
        self.cache.clear()
        self.expiry_times.clear()
        self.access_times.clear()
        self.memory_usage = 0
    
    def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        total_requests = self.stats["hits"] + self.stats["misses"]
        hit_rate = self.stats["hits"] / max(total_requests, 1)
        
        return {
            "hits": self.stats["hits"],
            "misses": self.stats["misses"],
            "hit_rate": hit_rate,
            "evictions": self.stats["evictions"],
            "memory_cleanups": self.stats["memory_cleanups"],
            "memory_usage_bytes": self.memory_usage,
            "memory_usage_mb": self.memory_usage / (1024 * 1024),
            "cache_size": len(self.cache),
            "max_memory_mb": self.config.max_memory_size / (1024 * 1024)
        }

class RedisCache:
    """Redis-based cache for distributed caching"""
    
    def __init__(self, redis_client, config: CacheConfig):
        self.redis = redis_client
        self.config = config
        self.stats = defaultdict(int)
    
    def _make_key(self, key: str) -> str:
        """Create Redis key with prefix"""
        return f"agileforge:cache:{key}"
    
    async def get(self, key: str) -> Optional[Any]:
        """Get value from Redis cache"""
        try:
            redis_key = self._make_key(key)
            data = await self.redis.get(redis_key)
            
            if data is None:
                self.stats["misses"] += 1
                return None
            
            self.stats["hits"] += 1
            
            # Deserialize data
            if isinstance(data, bytes):
                try:
                    # Try gzip decompression first
                    decompressed = gzip.decompress(data)
                    return json.loads(decompressed.decode('utf-8'))
                except:
                    # Not compressed
                    return json.loads(data.decode('utf-8'))
            
            return json.loads(data)
            
        except Exception as e:
            logger.error(f"Redis cache get error: {e}")
            self.stats["misses"] += 1
            return None
    
    async def set(self, key: str, value: Any, ttl: Optional[int] = None) -> bool:
        """Set value in Redis cache"""
        try:
            redis_key = self._make_key(key)
            ttl = ttl or self.config.default_ttl
            
            # Serialize and optionally compress
            serialized = json.dumps(value, default=str).encode('utf-8')
            
            if (self.config.enable_compression and 
                len(serialized) > self.config.compression_threshold):
                serialized = gzip.compress(serialized)
            
            await self.redis.setex(redis_key, ttl, serialized)
            return True
            
        except Exception as e:
            logger.error(f"Redis cache set error: {e}")
            return False
    
    async def delete(self, key: str) -> bool:
        """Delete key from Redis cache"""
        try:
            redis_key = self._make_key(key)
            result = await self.redis.delete(redis_key)
            return result > 0
        except Exception as e:
            logger.error(f"Redis cache delete error: {e}")
            return False
    
    def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        total_requests = self.stats["hits"] + self.stats["misses"]
        hit_rate = self.stats["hits"] / max(total_requests, 1)
        
        return {
            "hits": self.stats["hits"],
            "misses": self.stats["misses"],
            "hit_rate": hit_rate,
            "cache_type": "redis"
        }

class CacheManager:
    """Unified cache manager supporting multiple backends"""
    
    def __init__(self, config: CacheConfig = None, redis_client=None):
        self.config = config or CacheConfig()
        
        # Initialize cache backends
        self.memory_cache = MemoryCache(self.config)
        self.redis_cache = None
        
        if REDIS_AVAILABLE and redis_client:
            self.redis_cache = RedisCache(redis_client, self.config)
    
    async def get(self, key: str) -> Optional[Any]:
        """Get value from cache (try memory first, then Redis)"""
        # Try memory cache first
        value = self.memory_cache.get(key)
        if value is not None:
            return value
        
        # Try Redis cache
        if self.redis_cache:
            value = await self.redis_cache.get(key)
            if value is not None:
                # Store in memory cache for faster access
                self.memory_cache.set(key, value)
                return value
        
        return None
    
    async def set(self, key: str, value: Any, ttl: Optional[int] = None) -> bool:
        """Set value in cache (store in both memory and Redis)"""
        memory_success = self.memory_cache.set(key, value, ttl)
        
        redis_success = True
        if self.redis_cache:
            redis_success = await self.redis_cache.set(key, value, ttl)
        
        return memory_success or redis_success
    
    async def delete(self, key: str) -> bool:
        """Delete key from all caches"""
        memory_result = self.memory_cache.delete(key)
        
        redis_result = True
        if self.redis_cache:
            redis_result = await self.redis_cache.delete(key)
        
        return memory_result or redis_result
    
    def get_stats(self) -> Dict[str, Any]:
        """Get comprehensive cache statistics"""
        stats = {
            "memory_cache": self.memory_cache.get_stats()
        }
        
        if self.redis_cache:
            stats["redis_cache"] = self.redis_cache.get_stats()
        
        return stats

# Global cache manager instance
_cache_manager: Optional[CacheManager] = None

def get_cache_manager() -> CacheManager:
    """Get or create global cache manager"""
    global _cache_manager
    if _cache_manager is None:
        _cache_manager = CacheManager()
    return _cache_manager

def init_cache_manager(redis_client=None, config: CacheConfig = None) -> CacheManager:
    """Initialize global cache manager with custom configuration"""
    global _cache_manager
    _cache_manager = CacheManager(config, redis_client)
    return _cache_manager

# Caching decorators
def cache_result(ttl: int = 300, key_func: Optional[Callable] = None):
    """Decorator to cache function results"""
    def decorator(func: Callable):
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            cache_manager = get_cache_manager()
            
            # Generate cache key
            if key_func:
                cache_key = key_func(*args, **kwargs)
            else:
                # Default key generation
                key_parts = [func.__name__]
                key_parts.extend(str(arg) for arg in args)
                key_parts.extend(f"{k}:{v}" for k, v in sorted(kwargs.items()))
                cache_key = hashlib.md5(":".join(key_parts).encode()).hexdigest()
            
            # Try to get from cache
            cached_result = await cache_manager.get(cache_key)
            if cached_result is not None:
                return cached_result
            
            # Execute function and cache result
            if asyncio.iscoroutinefunction(func):
                result = await func(*args, **kwargs)
            else:
                result = func(*args, **kwargs)
            
            await cache_manager.set(cache_key, result, ttl)
            return result
        
        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            # For sync functions, use sync cache operations
            cache_manager = get_cache_manager()
            
            if key_func:
                cache_key = key_func(*args, **kwargs)
            else:
                key_parts = [func.__name__]
                key_parts.extend(str(arg) for arg in args)
                key_parts.extend(f"{k}:{v}" for k, v in sorted(kwargs.items()))
                cache_key = hashlib.md5(":".join(key_parts).encode()).hexdigest()
            
            cached_result = cache_manager.memory_cache.get(cache_key)
            if cached_result is not None:
                return cached_result
            
            result = func(*args, **kwargs)
            cache_manager.memory_cache.set(cache_key, result, ttl)
            return result
        
        return async_wrapper if asyncio.iscoroutinefunction(func) else sync_wrapper
    return decorator

def invalidate_cache_pattern(pattern: str):
    """Invalidate cache entries matching a pattern"""
    cache_manager = get_cache_manager()
    
    # For memory cache, iterate through keys
    keys_to_delete = [
        key for key in cache_manager.memory_cache.cache.keys()
        if pattern in key
    ]
    
    for key in keys_to_delete:
        cache_manager.memory_cache.delete(key)

# Performance monitoring
class PerformanceMonitor:
    """Monitor performance metrics"""
    
    def __init__(self):
        self.metrics = defaultdict(list)
        self.request_times = defaultdict(list)
        self.memory_usage = []
    
    def record_request_time(self, endpoint: str, duration: float):
        """Record request processing time"""
        self.request_times[endpoint].append({
            "duration": duration,
            "timestamp": time.time()
        })
        
        # Keep only last 1000 entries per endpoint
        if len(self.request_times[endpoint]) > 1000:
            self.request_times[endpoint] = self.request_times[endpoint][-1000:]
    
    def record_memory_usage(self, usage_bytes: int):
        """Record memory usage"""
        self.memory_usage.append({
            "usage": usage_bytes,
            "timestamp": time.time()
        })
        
        # Keep only last 1000 entries
        if len(self.memory_usage) > 1000:
            self.memory_usage = self.memory_usage[-1000:]
    
    def get_endpoint_stats(self, endpoint: str) -> Dict[str, Any]:
        """Get performance stats for an endpoint"""
        times = self.request_times.get(endpoint, [])
        if not times:
            return {"endpoint": endpoint, "request_count": 0}
        
        recent_times = [
            t["duration"] for t in times
            if time.time() - t["timestamp"] < 3600  # Last hour
        ]
        
        if not recent_times:
            return {"endpoint": endpoint, "request_count": 0}
        
        return {
            "endpoint": endpoint,
            "request_count": len(recent_times),
            "avg_response_time": sum(recent_times) / len(recent_times),
            "min_response_time": min(recent_times),
            "max_response_time": max(recent_times),
            "p95_response_time": sorted(recent_times)[int(len(recent_times) * 0.95)] if recent_times else 0
        }
    
    def get_overall_stats(self) -> Dict[str, Any]:
        """Get overall performance statistics"""
        all_endpoints = list(self.request_times.keys())
        endpoint_stats = [self.get_endpoint_stats(ep) for ep in all_endpoints]
        
        # Memory stats
        recent_memory = [
            m["usage"] for m in self.memory_usage
            if time.time() - m["timestamp"] < 3600
        ]
        
        memory_stats = {}
        if recent_memory:
            memory_stats = {
                "avg_memory_mb": sum(recent_memory) / len(recent_memory) / (1024 * 1024),
                "max_memory_mb": max(recent_memory) / (1024 * 1024),
                "current_memory_mb": recent_memory[-1] / (1024 * 1024) if recent_memory else 0
            }
        
        return {
            "endpoint_stats": endpoint_stats,
            "memory_stats": memory_stats,
            "cache_stats": get_cache_manager().get_stats(),
            "monitoring_window": "1 hour"
        }

# Global performance monitor
_performance_monitor = PerformanceMonitor()

def get_performance_monitor() -> PerformanceMonitor:
    """Get global performance monitor"""
    return _performance_monitor

# Performance timing decorator
def monitor_performance(endpoint_name: Optional[str] = None):
    """Decorator to monitor function performance"""
    def decorator(func: Callable):
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            start_time = time.time()
            try:
                if asyncio.iscoroutinefunction(func):
                    result = await func(*args, **kwargs)
                else:
                    result = func(*args, **kwargs)
                return result
            finally:
                duration = time.time() - start_time
                endpoint = endpoint_name or func.__name__
                _performance_monitor.record_request_time(endpoint, duration)
        
        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            start_time = time.time()
            try:
                result = func(*args, **kwargs)
                return result
            finally:
                duration = time.time() - start_time
                endpoint = endpoint_name or func.__name__
                _performance_monitor.record_request_time(endpoint, duration)
        
        return async_wrapper if asyncio.iscoroutinefunction(func) else sync_wrapper
    return decorator

# Response compression
def compress_response(data: Union[str, bytes], threshold: int = 1024) -> bytes:
    """Compress response data if above threshold"""
    if isinstance(data, str):
        data = data.encode('utf-8')
    
    if len(data) > threshold:
        return gzip.compress(data)
    
    return data 