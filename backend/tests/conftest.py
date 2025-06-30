"""
Pytest configuration and fixtures for backend testing
"""

import pytest
import asyncio
import os
import sys
from typing import AsyncGenerator, Generator
from unittest.mock import Mock, patch
from fastapi.testclient import TestClient
from httpx import AsyncClient
import redis
from supabase import create_client, Client

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest.fixture
def mock_supabase():
    """Mock Supabase client for testing"""
    mock_client = Mock(spec=Client)
    
    # Mock table operations
    mock_table = Mock()
    mock_table.select.return_value = mock_table
    mock_table.insert.return_value = mock_table
    mock_table.update.return_value = mock_table
    mock_table.delete.return_value = mock_table
    mock_table.eq.return_value = mock_table
    mock_table.neq.return_value = mock_table
    mock_table.in_.return_value = mock_table
    mock_table.lt.return_value = mock_table
    mock_table.gt.return_value = mock_table
    mock_table.limit.return_value = mock_table
    mock_table.order.return_value = mock_table
    mock_table.execute.return_value = Mock(data=[], count=0)
    
    mock_client.table.return_value = mock_table
    
    # Mock auth operations
    mock_auth = Mock()
    mock_auth.sign_up.return_value = Mock(user=Mock(id="test-user-id", email="test@example.com"))
    mock_auth.sign_in_with_password.return_value = Mock(user=Mock(id="test-user-id", email="test@example.com"))
    mock_client.auth = mock_auth
    
    return mock_client

@pytest.fixture
def mock_redis():
    """Mock Redis client for testing"""
    mock_client = Mock(spec=redis.Redis)
    mock_client.ping.return_value = True
    mock_client.get.return_value = None
    mock_client.set.return_value = True
    mock_client.delete.return_value = 1
    mock_client.exists.return_value = False
    mock_client.expire.return_value = True
    mock_client.keys.return_value = []
    mock_client.flushdb.return_value = True
    return mock_client

@pytest.fixture
def test_app():
    """Create test FastAPI application"""
    # Set test environment
    os.environ.update({
        "ENVIRONMENT": "test",
        "JWT_SECRET": "test-jwt-secret",
        "SUPABASE_URL": "https://test.supabase.co",
        "SUPABASE_SERVICE_KEY": "test-key",
        "REDIS_URL": "redis://localhost:6379/1"
    })
    
    # Import after setting environment
    from main import app
    return app

@pytest.fixture
def client(test_app):
    """Test client for FastAPI application"""
    return TestClient(test_app)

@pytest.fixture
async def async_client(test_app) -> AsyncGenerator[AsyncClient, None]:
    """Async test client for FastAPI application"""
    async with AsyncClient(app=test_app, base_url="http://test") as client:
        yield client

@pytest.fixture
def test_user_data():
    """Sample user data for testing"""
    return {
        "id": "test-user-id",
        "email": "test@example.com",
        "name": "Test User",
        "roles": ["developer"],
        "permissions": ["view_project", "create_story"],
        "is_active": True,
        "is_verified": True
    }

@pytest.fixture
def test_project_data():
    """Sample project data for testing"""
    return {
        "id": "test-project-id",
        "name": "Test Project",
        "description": "A test project",
        "status": "active",
        "created_by": "test-user-id"
    }

@pytest.fixture
def test_epic_data():
    """Sample epic data for testing"""
    return {
        "id": "test-epic-id",
        "name": "Test Epic",
        "description": "A test epic",
        "project_id": "test-project-id",
        "status": "active",
        "priority": "high"
    }

@pytest.fixture
def test_story_data():
    """Sample story data for testing"""
    return {
        "id": "test-story-id",
        "name": "Test Story",
        "description": "A test story",
        "epic_id": "test-epic-id",
        "status": "backlog",
        "priority": "medium",
        "story_points": 5,
        "assignee_id": "test-user-id"
    }

@pytest.fixture
def auth_headers():
    """Authentication headers for API testing"""
    return {
        "Authorization": "Bearer test-jwt-token",
        "Content-Type": "application/json"
    }

@pytest.fixture
def mock_openai():
    """Mock OpenAI client for testing"""
    with patch('openai.OpenAI') as mock:
        mock_client = Mock()
        mock_response = Mock()
        mock_response.choices = [Mock(message=Mock(content="Test AI response"))]
        mock_client.chat.completions.create.return_value = mock_response
        mock.return_value = mock_client
        yield mock_client

@pytest.fixture
def mock_anthropic():
    """Mock Anthropic client for testing"""
    with patch('anthropic.Anthropic') as mock:
        mock_client = Mock()
        mock_response = Mock()
        mock_response.content = [Mock(text="Test AI response")]
        mock_client.messages.create.return_value = mock_response
        mock.return_value = mock_client
        yield mock_client

@pytest.fixture(autouse=True)
def setup_test_environment():
    """Setup test environment variables"""
    test_env = {
        "ENVIRONMENT": "test",
        "JWT_SECRET": "test-jwt-secret-for-testing-only",
        "SUPABASE_URL": "https://test.supabase.co",
        "SUPABASE_SERVICE_KEY": "test-service-key",
        "SUPABASE_JWT_SECRET": "test-jwt-secret",
        "REDIS_URL": "redis://localhost:6379/1",
        "OPENAI_API_KEY": "test-openai-key",
        "ANTHROPIC_API_KEY": "test-anthropic-key"
    }
    
    # Store original values
    original_env = {}
    for key, value in test_env.items():
        original_env[key] = os.environ.get(key)
        os.environ[key] = value
    
    yield
    
    # Restore original values
    for key, value in original_env.items():
        if value is None:
            os.environ.pop(key, None)
        else:
            os.environ[key] = value

@pytest.fixture
async def mock_database_operations(mock_supabase):
    """Mock database operations for testing"""
    
    # Mock successful responses
    mock_supabase.table.return_value.execute.return_value = Mock(
        data=[{
            "id": "test-id",
            "name": "Test Item",
            "created_at": "2024-01-01T00:00:00Z"
        }],
        count=1
    )
    
    return mock_supabase

@pytest.fixture
def sample_analytics_data():
    """Sample analytics data for testing"""
    return {
        "project_id": "test-project-id",
        "total_stories": 10,
        "completed_stories": 7,
        "in_progress_stories": 2,
        "backlog_stories": 1,
        "completion_rate": 0.7,
        "velocity": 15,
        "burndown_data": [
            {"date": "2024-01-01", "remaining_points": 50},
            {"date": "2024-01-02", "remaining_points": 45},
            {"date": "2024-01-03", "remaining_points": 40}
        ]
    }

@pytest.fixture
def mock_ai_service():
    """Mock AI service for testing"""
    with patch('services.ai_service.AIService') as mock:
        mock_instance = Mock()
        mock_instance.generate_completion.return_value = Mock(
            success=True,
            content="Test AI generated content",
            error=None
        )
        mock.return_value = mock_instance
        yield mock_instance

@pytest.fixture
async def cleanup_test_data():
    """Cleanup test data after tests"""
    yield
    # Cleanup logic here if needed
    pass

# Performance testing fixtures
@pytest.fixture
def performance_thresholds():
    """Performance thresholds for testing"""
    return {
        "api_response_time": 2.0,  # seconds
        "database_query_time": 1.0,  # seconds
        "ai_generation_time": 30.0,  # seconds
        "memory_usage": 512,  # MB
    }

# Security testing fixtures
@pytest.fixture
def security_test_data():
    """Security test data"""
    return {
        "sql_injection_payloads": [
            "'; DROP TABLE users; --",
            "' OR '1'='1",
            "' UNION SELECT * FROM users --"
        ],
        "xss_payloads": [
            "<script>alert('XSS')</script>",
            "javascript:alert('XSS')",
            "<img src=x onerror=alert('XSS')>"
        ],
        "invalid_tokens": [
            "invalid-token",
            "expired.token.here",
            "",
            None
        ]
    }

# Database connection testing
@pytest.fixture
async def test_database_connection():
    """Test database connection"""
    # This would be a real database connection in a full implementation
    # For now, we'll use the mock
    yield "connected" 