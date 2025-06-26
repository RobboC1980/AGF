"""
Redis Caching Service
Implements read-through cache pattern for high-performance data access
"""

import redis
import json
import logging
from typing import Any, Optional, Dict, List, Callable
from datetime import datetime, timedelta
import hashlib
from functools import wraps
import asyncio
import pickle

logger = logging.getLogger(__name__)

class CacheService:
    """
    Redis-based caching service with read-through pattern
    """
    
    def __init__(self, redis_url: str = "redis://localhost:6379/2"):
        try:
            self.redis_client = redis.from_url(redis_url, decode_responses=False)
            self.redis_client.ping()
            logger.info("Redis cache client initialized successfully")
        except Exception as e:
            logger.error(f"Failed to connect to Redis: {e}")
            self.redis_client = None
    
    def _generate_key(self, prefix: str, identifier: str, params: Dict = None) -> str:
        """Generate cache key with optional parameter hash"""
        if params:
            param_hash = hashlib.md5(json.dumps(params, sort_keys=True).encode()).hexdigest()[:8]
            return f"{prefix}:{identifier}:{param_hash}"
        return f"{prefix}:{identifier}"
    
    def _serialize(self, data: Any) -> bytes:
        """Serialize data for Redis storage"""
        try:
            return pickle.dumps(data)
        except Exception as e:
            logger.error(f"Serialization error: {e}")
            return b""
    
    def _deserialize(self, data: bytes) -> Any:
        """Deserialize data from Redis"""
        try:
            return pickle.loads(data)
        except Exception as e:
            logger.error(f"Deserialization error: {e}")
            return None
    
    async def get(self, key: str) -> Optional[Any]:
        """Get value from cache"""
        if not self.redis_client:
            return None
            
        try:
            data = self.redis_client.get(key)
            if data:
                return self._deserialize(data)
            return None
        except Exception as e:
            logger.error(f"Cache get error for key {key}: {e}")
            return None
    
    async def set(self, key: str, value: Any, ttl: int = 3600) -> bool:
        """Set value in cache with TTL"""
        if not self.redis_client:
            return False
            
        try:
            serialized = self._serialize(value)
            if serialized:
                self.redis_client.setex(key, ttl, serialized)
                return True
            return False
        except Exception as e:
            logger.error(f"Cache set error for key {key}: {e}")
            return False
    
    async def delete(self, key: str) -> bool:
        """Delete key from cache"""
        if not self.redis_client:
            return False
            
        try:
            return bool(self.redis_client.delete(key))
        except Exception as e:
            logger.error(f"Cache delete error for key {key}: {e}")
            return False
    
    async def delete_pattern(self, pattern: str) -> int:
        """Delete all keys matching pattern"""
        if not self.redis_client:
            return 0
            
        try:
            keys = self.redis_client.keys(pattern)
            if keys:
                return self.redis_client.delete(*keys)
            return 0
        except Exception as e:
            logger.error(f"Cache delete pattern error for {pattern}: {e}")
            return 0
    
    async def get_or_set(
        self, 
        key: str, 
        fetch_func: Callable, 
        ttl: int = 3600,
        *args, 
        **kwargs
    ) -> Any:
        """Read-through cache pattern"""
        # Try to get from cache first
        cached_value = await self.get(key)
        if cached_value is not None:
            logger.debug(f"Cache hit for key: {key}")
            return cached_value
        
        # Cache miss - fetch from source
        logger.debug(f"Cache miss for key: {key}, fetching from source")
        try:
            if asyncio.iscoroutinefunction(fetch_func):
                value = await fetch_func(*args, **kwargs)
            else:
                value = fetch_func(*args, **kwargs)
            
            # Store in cache
            if value is not None:
                await self.set(key, value, ttl)
            
            return value
            
        except Exception as e:
            logger.error(f"Error fetching data for cache key {key}: {e}")
            return None

class ProjectCacheService:
    """
    Project-specific caching with automatic invalidation
    """
    
    def __init__(self, cache_service: CacheService):
        self.cache = cache_service
        
        # Cache TTL configurations
        self.ttl_config = {
            'user': 3600,  # 1 hour
            'project': 1800,  # 30 minutes
            'epic': 900,   # 15 minutes
            'story': 600,  # 10 minutes
            'team': 1800,  # 30 minutes
            'analytics': 300,  # 5 minutes
        }
    
    async def get_user(self, user_id: str, fetch_func: Callable) -> Optional[Dict]:
        """Cache user data"""
        key = self.cache._generate_key("user", user_id)
        return await self.cache.get_or_set(
            key, fetch_func, self.ttl_config['user'], user_id
        )
    
    async def get_project(self, project_id: str, fetch_func: Callable) -> Optional[Dict]:
        """Cache project data"""
        key = self.cache._generate_key("project", project_id)
        return await self.cache.get_or_set(
            key, fetch_func, self.ttl_config['project'], project_id
        )
    
    async def get_project_epics(self, project_id: str, fetch_func: Callable) -> Optional[List]:
        """Cache project epics"""
        key = self.cache._generate_key("project_epics", project_id)
        return await self.cache.get_or_set(
            key, fetch_func, self.ttl_config['epic'], project_id
        )
    
    async def get_epic_stories(self, epic_id: str, fetch_func: Callable) -> Optional[List]:
        """Cache epic stories"""
        key = self.cache._generate_key("epic_stories", epic_id)
        return await self.cache.get_or_set(
            key, fetch_func, self.ttl_config['story'], epic_id
        )
    
    async def get_analytics_dashboard(
        self, 
        project_id: str, 
        days: int, 
        fetch_func: Callable
    ) -> Optional[Dict]:
        """Cache analytics dashboard data"""
        params = {"days": days}
        key = self.cache._generate_key("analytics_dashboard", project_id, params)
        return await self.cache.get_or_set(
            key, fetch_func, self.ttl_config['analytics'], project_id, days
        )
    
    async def invalidate_project(self, project_id: str):
        """Invalidate all project-related cache entries"""
        patterns = [
            f"project:{project_id}*",
            f"project_epics:{project_id}*",
            f"analytics_dashboard:{project_id}*"
        ]
        
        for pattern in patterns:
            await self.cache.delete_pattern(pattern)
            logger.info(f"Invalidated cache pattern: {pattern}")
    
    async def invalidate_epic(self, epic_id: str, project_id: str = None):
        """Invalidate epic-related cache entries"""
        patterns = [
            f"epic_stories:{epic_id}*",
        ]
        
        if project_id:
            patterns.append(f"project_epics:{project_id}*")
        
        for pattern in patterns:
            await self.cache.delete_pattern(pattern)
            logger.info(f"Invalidated cache pattern: {pattern}")
    
    async def invalidate_story(self, story_id: str, epic_id: str = None):
        """Invalidate story-related cache entries"""
        patterns = []
        
        if epic_id:
            patterns.append(f"epic_stories:{epic_id}*")
        
        for pattern in patterns:
            await self.cache.delete_pattern(pattern)
            logger.info(f"Invalidated cache pattern: {pattern}")

def cache_response(prefix: str, ttl: int = 3600, key_func: Callable = None):
    """
    Decorator for caching function responses
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            cache_service = get_cache_service()
            
            # Generate cache key
            if key_func:
                cache_key = key_func(*args, **kwargs)
            else:
                # Default key generation
                key_parts = [str(arg) for arg in args]
                key_parts.extend([f"{k}:{v}" for k, v in sorted(kwargs.items())])
                identifier = hashlib.md5(":".join(key_parts).encode()).hexdigest()[:12]
                cache_key = f"{prefix}:{identifier}"
            
            return await cache_service.get_or_set(
                cache_key, func, ttl, *args, **kwargs
            )
        return wrapper
    return decorator

# Example usage decorators
def cache_user_data(ttl: int = 3600):
    """Cache user data with custom TTL"""
    return cache_response("user_data", ttl, lambda user_id: f"user_data:{user_id}")

def cache_project_data(ttl: int = 1800):
    """Cache project data with custom TTL"""
    return cache_response("project_data", ttl, lambda project_id: f"project_data:{project_id}")

def cache_analytics_data(ttl: int = 300):
    """Cache analytics data with custom TTL"""
    def key_func(*args, **kwargs):
        # Extract project_id and days from args/kwargs
        project_id = args[0] if args else kwargs.get('project_id', 'unknown')
        days = args[1] if len(args) > 1 else kwargs.get('days', 30)
        return f"analytics_data:{project_id}:{days}"
    
    return cache_response("analytics_data", ttl, key_func)

# Global cache service instance
cache_service = CacheService()
project_cache = ProjectCacheService(cache_service)

def get_cache_service() -> CacheService:
    """Get cache service instance"""
    return cache_service

def get_project_cache() -> ProjectCacheService:
    """Get project cache service instance"""
    return project_cache 