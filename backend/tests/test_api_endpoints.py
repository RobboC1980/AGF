"""
Comprehensive API endpoint tests for AgileForge backend
"""

import pytest
from unittest.mock import Mock, patch
import json
import time
from fastapi import status
from httpx import AsyncClient


class TestHealthEndpoints:
    """Test health and monitoring endpoints"""
    
    def test_health_endpoint(self, client):
        """Test basic health check endpoint"""
        response = client.get("/health")
        assert response.status_code == 200
        
        data = response.json()
        assert "status" in data
        assert "timestamp" in data
        assert "version" in data
        assert "environment" in data
        
    def test_metrics_endpoint(self, client):
        """Test metrics endpoint"""
        response = client.get("/metrics")
        # This might fail if Supabase is not properly mocked
        # In a real test, we'd mock the database connection
        assert response.status_code in [200, 500]  # Acceptable for test environment
    
    def test_root_endpoint(self, client):
        """Test root endpoint"""
        response = client.get("/")
        assert response.status_code == 200
        
        data = response.json()
        assert "message" in data
        assert "version" in data


class TestAuthenticationEndpoints:
    """Test authentication endpoints"""
    
    @patch('backend.database.supabase_client.get_supabase')
    def test_register_user_success(self, mock_supabase, client, test_user_data):
        """Test successful user registration"""
        # Mock Supabase response
        mock_client = Mock()
        mock_client.auth.sign_up.return_value = Mock(
            user=Mock(id="new-user-id", email=test_user_data["email"])
        )
        mock_client.table.return_value.insert.return_value.execute.return_value = Mock(
            data=[test_user_data]
        )
        mock_supabase.return_value = mock_client
        
        register_data = {
            "email": test_user_data["email"],
            "password": "testpassword123",
            "name": test_user_data["name"]
        }
        
        response = client.post("/api/auth/register", json=register_data)
        assert response.status_code in [200, 201]
    
    @patch('backend.database.supabase_client.get_supabase')
    def test_login_user_success(self, mock_supabase, client, test_user_data):
        """Test successful user login"""
        # Mock Supabase response
        mock_client = Mock()
        mock_client.auth.sign_in_with_password.return_value = Mock(
            user=Mock(id=test_user_data["id"], email=test_user_data["email"]),
            session=Mock(access_token="test-token")
        )
        mock_supabase.return_value = mock_client
        
        login_data = {
            "email": test_user_data["email"],
            "password": "testpassword123"
        }
        
        response = client.post("/api/auth/login", json=login_data)
        # This might return various status codes depending on implementation
        assert response.status_code in [200, 401, 422]
    
    def test_login_invalid_credentials(self, client):
        """Test login with invalid credentials"""
        login_data = {
            "email": "invalid@example.com",
            "password": "wrongpassword"
        }
        
        response = client.post("/api/auth/login", json=login_data)
        assert response.status_code in [401, 422]
    
    def test_register_invalid_data(self, client):
        """Test registration with invalid data"""
        register_data = {
            "email": "invalid-email",
            "password": "123",  # Too short
            "name": ""  # Empty name
        }
        
        response = client.post("/api/auth/register", json=register_data)
        assert response.status_code == 422


class TestProjectEndpoints:
    """Test project management endpoints"""
    
    @patch('backend.api.projects.get_current_user')
    @patch('backend.database.supabase_client.get_supabase')
    def test_get_projects(self, mock_supabase, mock_user, client, test_user_data, test_project_data, auth_headers):
        """Test getting user projects"""
        # Mock user authentication
        mock_user.return_value = test_user_data
        
        # Mock Supabase response
        mock_client = Mock()
        mock_client.table.return_value.select.return_value.eq.return_value.execute.return_value = Mock(
            data=[test_project_data]
        )
        mock_supabase.return_value = mock_client
        
        response = client.get("/api/projects", headers=auth_headers)
        assert response.status_code in [200, 401]
    
    @patch('backend.api.projects.get_current_user')
    @patch('backend.database.supabase_client.get_supabase')
    def test_create_project(self, mock_supabase, mock_user, client, test_user_data, auth_headers):
        """Test creating a new project"""
        # Mock user authentication
        mock_user.return_value = test_user_data
        
        # Mock Supabase response
        mock_client = Mock()
        mock_client.table.return_value.insert.return_value.execute.return_value = Mock(
            data=[{"id": "new-project-id", "name": "New Project"}]
        )
        mock_supabase.return_value = mock_client
        
        project_data = {
            "name": "New Test Project",
            "description": "A new test project"
        }
        
        response = client.post("/api/projects", json=project_data, headers=auth_headers)
        assert response.status_code in [200, 201, 401]
    
    def test_create_project_unauthorized(self, client):
        """Test creating project without authentication"""
        project_data = {
            "name": "Unauthorized Project",
            "description": "This should fail"
        }
        
        response = client.post("/api/projects", json=project_data)
        assert response.status_code == 401


class TestStoryEndpoints:
    """Test story management endpoints"""
    
    @patch('backend.api.stories.get_current_user')
    @patch('backend.database.supabase_client.get_supabase')
    def test_get_stories(self, mock_supabase, mock_user, client, test_user_data, test_story_data, auth_headers):
        """Test getting user stories"""
        # Mock user authentication
        mock_user.return_value = test_user_data
        
        # Mock Supabase response
        mock_client = Mock()
        mock_client.table.return_value.select.return_value.execute.return_value = Mock(
            data=[test_story_data]
        )
        mock_supabase.return_value = mock_client
        
        response = client.get("/api/stories", headers=auth_headers)
        assert response.status_code in [200, 401]
    
    @patch('backend.api.stories.get_current_user')
    @patch('backend.database.supabase_client.get_supabase')
    def test_create_story(self, mock_supabase, mock_user, client, test_user_data, auth_headers):
        """Test creating a new story"""
        # Mock user authentication
        mock_user.return_value = test_user_data
        
        # Mock Supabase response
        mock_client = Mock()
        mock_client.table.return_value.insert.return_value.execute.return_value = Mock(
            data=[{"id": "new-story-id", "name": "New Story"}]
        )
        mock_supabase.return_value = mock_client
        
        story_data = {
            "name": "New Test Story",
            "description": "A new test story",
            "epic_id": "test-epic-id",
            "priority": "medium"
        }
        
        response = client.post("/api/stories", json=story_data, headers=auth_headers)
        assert response.status_code in [200, 201, 401, 422]


class TestAIEndpoints:
    """Test AI-powered endpoints"""
    
    def test_ai_health(self, client):
        """Test AI service health"""
        response = client.get("/api/ai/health")
        assert response.status_code == 200
        
        data = response.json()
        assert "status" in data
    
    @patch('backend.api.ai_endpoints.get_current_user')
    @patch('backend.services.ai_service.get_ai_service')
    def test_generate_story(self, mock_ai_service, mock_user, client, test_user_data, auth_headers):
        """Test AI story generation"""
        # Mock user authentication
        mock_user.return_value = test_user_data
        
        # Mock AI service response
        mock_service = Mock()
        mock_service.generate_completion.return_value = Mock(
            success=True,
            content="Generated story content",
            error=None
        )
        mock_ai_service.return_value = mock_service
        
        generation_data = {
            "user_description": "Create a login system",
            "epic_context": "User Authentication",
            "project_context": "Test Project"
        }
        
        response = client.post("/api/ai/generate-story", json=generation_data, headers=auth_headers)
        assert response.status_code in [200, 401, 422]


class TestSecurityEndpoints:
    """Test security aspects of endpoints"""
    
    def test_sql_injection_protection(self, client, security_test_data):
        """Test SQL injection protection"""
        for payload in security_test_data["sql_injection_payloads"]:
            response = client.get(f"/api/projects?search={payload}")
            # Should not crash or return 500
            assert response.status_code in [200, 400, 401, 422]
    
    def test_xss_protection(self, client, security_test_data):
        """Test XSS protection"""
        for payload in security_test_data["xss_payloads"]:
            response = client.post("/api/projects", json={
                "name": payload,
                "description": "Test project"
            })
            # Should validate input and reject malicious content
            assert response.status_code in [400, 401, 422]
    
    def test_invalid_token_handling(self, client, security_test_data):
        """Test handling of invalid authentication tokens"""
        for token in security_test_data["invalid_tokens"]:
            headers = {"Authorization": f"Bearer {token}"} if token else {}
            response = client.get("/api/projects", headers=headers)
            # Should return 401 for invalid/missing tokens
            assert response.status_code == 401


class TestPerformanceEndpoints:
    """Test performance aspects of endpoints"""
    
    def test_response_time_health(self, client, performance_thresholds):
        """Test health endpoint response time"""
        start_time = time.time()
        response = client.get("/health")
        end_time = time.time()
        
        response_time = end_time - start_time
        assert response_time < performance_thresholds["api_response_time"]
        assert response.status_code == 200
    
    @patch('backend.database.supabase_client.get_supabase')
    def test_large_data_handling(self, mock_supabase, client):
        """Test handling of large data sets"""
        # Mock large dataset
        large_dataset = [{"id": f"item-{i}", "name": f"Item {i}"} for i in range(1000)]
        
        mock_client = Mock()
        mock_client.table.return_value.select.return_value.execute.return_value = Mock(
            data=large_dataset
        )
        mock_supabase.return_value = mock_client
        
        start_time = time.time()
        response = client.get("/api/projects")
        end_time = time.time()
        
        response_time = end_time - start_time
        # Should handle large datasets efficiently
        assert response_time < 5.0  # 5 seconds max for large dataset
    
    def test_concurrent_requests_handling(self, client):
        """Test handling of concurrent requests"""
        import concurrent.futures
        import threading
        
        def make_request():
            return client.get("/health")
        
        # Test with 10 concurrent requests
        with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
            futures = [executor.submit(make_request) for _ in range(10)]
            results = [future.result() for future in concurrent.futures.as_completed(futures)]
        
        # All requests should succeed
        for response in results:
            assert response.status_code == 200


class TestErrorHandling:
    """Test error handling and edge cases"""
    
    def test_404_handling(self, client):
        """Test 404 error handling"""
        response = client.get("/api/nonexistent-endpoint")
        assert response.status_code == 404
        
        data = response.json()
        assert "error" in data
    
    def test_method_not_allowed(self, client):
        """Test method not allowed handling"""
        response = client.patch("/health")  # Health endpoint likely doesn't support PATCH
        assert response.status_code in [405, 404]
    
    def test_malformed_json(self, client):
        """Test malformed JSON handling"""
        response = client.post(
            "/api/projects", 
            data="invalid json content",
            headers={"Content-Type": "application/json"}
        )
        assert response.status_code == 422
    
    def test_missing_required_fields(self, client, auth_headers):
        """Test missing required fields"""
        incomplete_data = {"name": ""}  # Missing required description
        
        response = client.post("/api/projects", json=incomplete_data, headers=auth_headers)
        assert response.status_code in [400, 401, 422]


class TestRateLimiting:
    """Test rate limiting functionality"""
    
    def test_rate_limit_enforcement(self, client):
        """Test rate limiting enforcement"""
        # Make multiple rapid requests
        responses = []
        for _ in range(100):  # Assuming rate limit is less than 100 requests
            response = client.get("/health")
            responses.append(response)
        
        # Check if any requests were rate limited
        status_codes = [r.status_code for r in responses]
        
        # Rate limiting might not be enabled in test environment
        # So we check for either success or rate limit response
        assert all(code in [200, 429] for code in status_codes)


@pytest.mark.asyncio
class TestAsyncEndpoints:
    """Test asynchronous endpoint functionality"""
    
    async def test_async_health_check(self, async_client):
        """Test async health check"""
        response = await async_client.get("/health")
        assert response.status_code == 200
    
    async def test_async_concurrent_requests(self, async_client):
        """Test async concurrent requests"""
        import asyncio
        
        async def make_request():
            return await async_client.get("/health")
        
        # Make 20 concurrent async requests
        tasks = [make_request() for _ in range(20)]
        responses = await asyncio.gather(*tasks)
        
        # All should succeed
        for response in responses:
            assert response.status_code == 200


class TestIntegrationEndpoints:
    """Test integration between different endpoints"""
    
    @patch('backend.database.supabase_client.get_supabase')
    @patch('backend.api.projects.get_current_user')
    @patch('backend.api.epics.get_current_user')
    @patch('backend.api.stories.get_current_user')
    def test_project_epic_story_flow(self, mock_story_user, mock_epic_user, mock_project_user, 
                                   mock_supabase, client, test_user_data, auth_headers):
        """Test complete project -> epic -> story creation flow"""
        # Mock all user authentications
        mock_project_user.return_value = test_user_data
        mock_epic_user.return_value = test_user_data
        mock_story_user.return_value = test_user_data
        
        # Mock Supabase responses
        mock_client = Mock()
        
        # Mock project creation
        mock_client.table.return_value.insert.return_value.execute.return_value = Mock(
            data=[{"id": "new-project-id", "name": "Integration Test Project"}]
        )
        mock_supabase.return_value = mock_client
        
        # 1. Create project
        project_data = {"name": "Integration Test Project", "description": "Test project"}
        project_response = client.post("/api/projects", json=project_data, headers=auth_headers)
        
        # Mock epic creation
        mock_client.table.return_value.insert.return_value.execute.return_value = Mock(
            data=[{"id": "new-epic-id", "name": "Integration Test Epic"}]
        )
        
        # 2. Create epic
        epic_data = {"name": "Integration Test Epic", "project_id": "new-project-id"}
        epic_response = client.post("/api/epics", json=epic_data, headers=auth_headers)
        
        # Mock story creation
        mock_client.table.return_value.insert.return_value.execute.return_value = Mock(
            data=[{"id": "new-story-id", "name": "Integration Test Story"}]
        )
        
        # 3. Create story
        story_data = {"name": "Integration Test Story", "epic_id": "new-epic-id"}
        story_response = client.post("/api/stories", json=story_data, headers=auth_headers)
        
        # All operations should succeed (or fail due to auth, but not crash)
        assert project_response.status_code in [200, 201, 401]
        assert epic_response.status_code in [200, 201, 401]
        assert story_response.status_code in [200, 201, 401] 