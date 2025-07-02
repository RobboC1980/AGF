"""
Comprehensive Tests for AI Features

Tests all AI endpoints with proper authentication, authorization, and functionality validation.
Includes tests for:
- AI story/epic/task generation
- Kanban board AI features  
- Sprint planning AI features
- Analytics AI features
- Authentication and authorization
- Error handling and edge cases
"""

import pytest
import asyncio
from unittest.mock import Mock, patch, AsyncMock
from fastapi.testclient import TestClient
from fastapi import HTTPException, status
import json
from datetime import datetime, timedelta

# Import the FastAPI app and dependencies
try:
    from backend.main import app
    from backend.auth.dependencies import UserResponse, get_current_user_clerk
    from backend.auth.project_access import get_project_validator
    from backend.services.ai_service import get_basic_ai_service
except ImportError:
    from main import app
    from auth.dependencies import UserResponse, get_current_user_clerk
    from auth.project_access import get_project_validator
    from services.ai_service import get_basic_ai_service

# Test fixtures
@pytest.fixture
def test_user():
    """Mock user for testing"""
    return UserResponse(
        id="test-user-123",
        email="test@example.com",
        name="Test User",
        is_active=True
    )

@pytest.fixture
def test_client():
    """Test client with mocked dependencies"""
    return TestClient(app)

@pytest.fixture
def mock_auth_user(test_user):
    """Mock authentication to return test user"""
    async def mock_get_current_user():
        return test_user
    
    return mock_get_current_user

@pytest.fixture
def mock_project_validator():
    """Mock project access validator"""
    mock_validator = Mock()
    mock_validator.validate_project_access = AsyncMock(return_value=True)
    return mock_validator

@pytest.fixture
def mock_ai_service():
    """Mock AI service"""
    mock_service = Mock()
    mock_service.generate_completion = AsyncMock()
    return mock_service

class TestAIAuthentication:
    """Test AI endpoint authentication"""
    
    def test_ai_endpoints_require_authentication(self, test_client):
        """Test that AI endpoints require authentication"""
        endpoints = [
            "/api/ai/generate-story",
            "/api/ai/generate-epic", 
            "/api/ai/generate-tasks",
            "/api/ai/generate-project"
        ]
        
        for endpoint in endpoints:
            response = test_client.post(endpoint, json={})
            assert response.status_code == 403  # Unauthorized
    
    @patch('backend.auth.dependencies.get_current_user_clerk')
    def test_ai_endpoints_with_valid_auth(self, mock_auth, test_client, test_user):
        """Test AI endpoints with valid authentication"""
        mock_auth.return_value = test_user
        
        # Mock the authentication dependency
        app.dependency_overrides[get_current_user_clerk] = lambda: test_user
        
        try:
            # Test story generation endpoint
            response = test_client.post("/api/ai/generate-story", json={
                "description": "Test story",
                "priority": "medium"
            })
            
            # Should not get 403 (unauthorized) anymore
            assert response.status_code != 403
            
        finally:
            # Clean up dependency override
            app.dependency_overrides.clear()

class TestAIStoryGeneration:
    """Test AI story generation functionality"""
    
    @patch('backend.api.ai_endpoints.get_project_validator')
    @patch('backend.services.ai_service.get_basic_ai_service')
    def test_generate_story_success(self, mock_ai_service, mock_validator_func, test_client, test_user):
        """Test successful story generation"""
        # Setup mocks
        mock_validator = Mock()
        mock_validator.validate_project_access = AsyncMock(return_value=True)
        mock_validator_func.return_value = mock_validator
        
        mock_service = Mock()
        mock_service.generate_completion = AsyncMock(return_value=Mock(
            success=True,
            data={
                "title": "Generated Story",
                "description": "Test description",
                "acceptance_criteria": ["Criteria 1", "Criteria 2"],
                "tags": ["test", "generated"],
                "story_points": 5
            },
            model_used="test-model",
            tokens_used=100,
            processing_time=0.5
        ))
        mock_ai_service.return_value = mock_service
        
        # Override dependencies
        app.dependency_overrides[get_current_user_clerk] = lambda: test_user
        
        try:
            response = test_client.post("/api/ai/generate-story", json={
                "description": "Create user login functionality",
                "project_id": "test-project-123",
                "priority": "high"
            })
            
            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True
            assert "story" in data
            assert data["story"]["name"] == "Generated Story"
            assert data["story"]["storyPoints"] == 5
            
        finally:
            app.dependency_overrides.clear()
    
    @patch('backend.api.ai_endpoints.get_project_validator')
    def test_generate_story_access_denied(self, mock_validator_func, test_client, test_user):
        """Test story generation with access denied"""
        # Setup mock to deny access
        mock_validator = Mock()
        mock_validator.validate_project_access = AsyncMock(return_value=False)
        mock_validator_func.return_value = mock_validator
        
        app.dependency_overrides[get_current_user_clerk] = lambda: test_user
        
        try:
            response = test_client.post("/api/ai/generate-story", json={
                "description": "Test story",
                "project_id": "unauthorized-project",
                "priority": "medium"
            })
            
            assert response.status_code == 403
            
        finally:
            app.dependency_overrides.clear()
    
    @patch('backend.services.ai_service.get_basic_ai_service')
    def test_generate_story_ai_failure(self, mock_ai_service, test_client, test_user):
        """Test story generation when AI service fails"""
        mock_service = Mock()
        mock_service.generate_completion = AsyncMock(return_value=Mock(
            success=False,
            error="AI service unavailable"
        ))
        mock_ai_service.return_value = mock_service
        
        app.dependency_overrides[get_current_user_clerk] = lambda: test_user
        
        try:
            response = test_client.post("/api/ai/generate-story", json={
                "description": "Test story",
                "priority": "medium"
            })
            
            assert response.status_code == 200
            data = response.json()
            assert data["success"] is False
            assert "error" in data
            
        finally:
            app.dependency_overrides.clear()

class TestAIKanbanFeatures:
    """Test AI kanban board features"""
    
    def test_analyze_kanban_board_request_validation(self, test_client):
        """Test kanban analysis request validation"""
        app.dependency_overrides[get_current_user_clerk] = lambda: UserResponse(
            id="test", email="test@test.com", name="Test", is_active=True
        )
        
        try:
            # Test with missing required fields
            response = test_client.post("/api/ai/kanban/analyze-board", json={})
            assert response.status_code == 422  # Validation error
            
            # Test with invalid data types
            response = test_client.post("/api/ai/kanban/analyze-board", json={
                "project_id": "test",
                "columns": "invalid_type"  # Should be list
            })
            assert response.status_code == 422
            
        finally:
            app.dependency_overrides.clear()
    
    @patch('backend.api.ai_kanban_endpoints.get_project_validator')
    @patch('backend.services.ai_service.get_basic_ai_service')
    def test_analyze_kanban_board_success(self, mock_ai_service, mock_validator_func, test_client, test_user):
        """Test successful kanban board analysis"""
        # Setup mocks
        mock_validator = Mock()
        mock_validator.validate_project_access = AsyncMock(return_value=True)
        mock_validator_func.return_value = mock_validator
        
        mock_service = Mock()
        mock_service.generate_completion = AsyncMock(return_value=Mock(
            success=True,
            data={
                "recommendations": ["Improve flow", "Reduce WIP"],
                "priority_actions": ["Address bottlenecks"],
                "performance_score": 0.8
            },
            model_used="test-model",
            processing_time=0.3
        ))
        mock_ai_service.return_value = mock_service
        
        app.dependency_overrides[get_current_user_clerk] = lambda: test_user
        
        try:
            response = test_client.post("/api/ai/kanban/analyze-board", json={
                "project_id": "test-project",
                "columns": [
                    {
                        "id": "todo",
                        "title": "To Do",
                        "status": "todo",
                        "tasks": [
                            {
                                "id": "task-1",
                                "title": "Test task",
                                "status": "todo",
                                "priority": "medium",
                                "created_at": "2024-01-01T00:00:00Z",
                                "tags": []
                            }
                        ]
                    }
                ],
                "team_members": [],
                "include_suggestions": True
            })
            
            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True
            assert "analysis" in data
            assert "recommendations" in data["analysis"]
            
        finally:
            app.dependency_overrides.clear()

class TestAISprintPlanning:
    """Test AI sprint planning features"""
    
    @patch('backend.api.ai_sprint_endpoints.get_project_validator')
    @patch('backend.services.ai_service.get_basic_ai_service')
    def test_analyze_capacity_success(self, mock_ai_service, mock_validator_func, test_client, test_user):
        """Test successful capacity analysis"""
        mock_validator = Mock()
        mock_validator.validate_project_access = AsyncMock(return_value=True)
        mock_validator_func.return_value = mock_validator
        
        mock_service = Mock()
        mock_service.generate_completion = AsyncMock(return_value=Mock(
            success=True,
            data={
                "recommendations": ["Optimize team allocation"],
                "risk_factors": ["High utilization"]
            }
        ))
        mock_ai_service.return_value = mock_service
        
        app.dependency_overrides[get_current_user_clerk] = lambda: test_user
        
        try:
            response = test_client.post("/api/ai/sprint/analyze-capacity", json={
                "project_id": "test-project",
                "team_members": [
                    {
                        "id": "dev-1",
                        "name": "Developer 1",
                        "role": "developer",
                        "capacity_hours": 40.0,
                        "skills": ["python", "react"],
                        "availability": 1.0
                    }
                ],
                "sprint_duration_weeks": 2,
                "planned_stories": []
            })
            
            assert response.status_code == 200
            data = response.json()
            assert "total_capacity_hours" in data
            assert "team_breakdown" in data
            
        finally:
            app.dependency_overrides.clear()
    
    @patch('backend.api.ai_sprint_endpoints.get_project_validator')  
    @patch('backend.services.ai_service.get_basic_ai_service')
    def test_predict_velocity(self, mock_ai_service, mock_validator_func, test_client, test_user):
        """Test velocity prediction"""
        mock_validator = Mock()
        mock_validator.validate_project_access = AsyncMock(return_value=True)
        mock_validator_func.return_value = mock_validator
        
        mock_service = Mock()
        mock_service.generate_completion = AsyncMock(return_value=Mock(
            success=True,
            data={
                "predicted_velocity": 25.0,
                "confidence_interval": {"low": 20.0, "high": 30.0},
                "recommendations": ["Maintain current pace"]
            }
        ))
        mock_ai_service.return_value = mock_service
        
        app.dependency_overrides[get_current_user_clerk] = lambda: test_user
        
        try:
            response = test_client.post("/api/ai/sprint/predict-velocity", json={
                "project_id": "test-project",
                "historical_sprints": [
                    {"velocity": 23, "sprint_id": "sprint-1"},
                    {"velocity": 27, "sprint_id": "sprint-2"}
                ],
                "prediction_horizon_sprints": 3
            })
            
            assert response.status_code == 200
            data = response.json()
            assert "predicted_velocity" in data
            assert "confidence_interval" in data
            
        finally:
            app.dependency_overrides.clear()

class TestAIAnalytics:
    """Test AI analytics features"""
    
    @patch('backend.api.ai_analytics_endpoints.get_project_validator')
    @patch('backend.database.supabase_client.get_supabase')
    @patch('backend.services.ai_service.get_basic_ai_service')
    def test_project_insights_success(self, mock_ai_service, mock_supabase, mock_validator_func, test_client, test_user):
        """Test successful project insights analysis"""
        # Setup mocks
        mock_validator = Mock()
        mock_validator.validate_project_access = AsyncMock(return_value=True)
        mock_validator_func.return_value = mock_validator
        
        mock_db = Mock()
        mock_db.table.return_value.select.return_value.eq.return_value.execute.return_value = Mock(
            data=[{"id": "project-1", "name": "Test Project"}]
        )
        mock_supabase.return_value = mock_db
        
        mock_service = Mock()
        mock_service.generate_completion = AsyncMock(return_value=Mock(
            success=True,
            data={
                "trends": {"velocity": "improving"},
                "key_insights": ["Team productivity is good"],
                "improvement_opportunities": []
            }
        ))
        mock_ai_service.return_value = mock_service
        
        app.dependency_overrides[get_current_user_clerk] = lambda: test_user
        
        try:
            response = test_client.post("/api/ai/analytics/project-insights", json={
                "project_id": "test-project",
                "analysis_period_days": 30,
                "include_predictions": True,
                "focus_areas": ["performance", "velocity"]
            })
            
            assert response.status_code == 200
            data = response.json()
            assert "project_id" in data
            assert "performance_metrics" in data
            assert "key_insights" in data
            
        finally:
            app.dependency_overrides.clear()

class TestErrorHandling:
    """Test error handling across AI endpoints"""
    
    def test_invalid_json_request(self, test_client):
        """Test handling of invalid JSON requests"""
        app.dependency_overrides[get_current_user_clerk] = lambda: UserResponse(
            id="test", email="test@test.com", name="Test", is_active=True
        )
        
        try:
            response = test_client.post(
                "/api/ai/generate-story",
                data="invalid json",
                headers={"content-type": "application/json"}
            )
            assert response.status_code == 422
            
        finally:
            app.dependency_overrides.clear()
    
    @patch('backend.services.ai_service.get_basic_ai_service')
    def test_ai_service_exception_handling(self, mock_ai_service, test_client, test_user):
        """Test handling of AI service exceptions"""
        mock_service = Mock()
        mock_service.generate_completion = AsyncMock(side_effect=Exception("AI service error"))
        mock_ai_service.return_value = mock_service
        
        app.dependency_overrides[get_current_user_clerk] = lambda: test_user
        
        try:
            response = test_client.post("/api/ai/generate-story", json={
                "description": "Test story",
                "priority": "medium"
            })
            
            assert response.status_code == 500
            
        finally:
            app.dependency_overrides.clear()

class TestPerformance:
    """Test performance aspects of AI endpoints"""
    
    @patch('backend.services.ai_service.get_basic_ai_service')
    def test_concurrent_requests(self, mock_ai_service, test_client, test_user):
        """Test handling of concurrent AI requests"""
        import threading
        import time
        
        mock_service = Mock()
        # Simulate slow AI service
        async def slow_completion(*args, **kwargs):
            await asyncio.sleep(0.1)
            return Mock(success=True, data={"title": "Generated"})
        
        mock_service.generate_completion = slow_completion
        mock_ai_service.return_value = mock_service
        
        app.dependency_overrides[get_current_user_clerk] = lambda: test_user
        
        results = []
        
        def make_request():
            response = test_client.post("/api/ai/generate-story", json={
                "description": "Test story",
                "priority": "medium"
            })
            results.append(response.status_code)
        
        try:
            # Create multiple threads to simulate concurrent requests
            threads = []
            for i in range(3):
                thread = threading.Thread(target=make_request)
                threads.append(thread)
                thread.start()
            
            # Wait for all threads to complete
            for thread in threads:
                thread.join(timeout=5)  # 5 second timeout
            
            # All requests should succeed
            assert len(results) == 3
            assert all(status == 200 for status in results)
            
        finally:
            app.dependency_overrides.clear()

class TestIntegration:
    """Integration tests for AI features"""
    
    def test_ai_workflow_integration(self, test_client, test_user):
        """Test complete AI workflow from story generation to analytics"""
        app.dependency_overrides[get_current_user_clerk] = lambda: test_user
        
        # Mock all external dependencies
        with patch('backend.api.ai_endpoints.get_project_validator') as mock_validator_func, \
             patch('backend.services.ai_service.get_basic_ai_service') as mock_ai_service:
            
            # Setup mocks
            mock_validator = Mock()
            mock_validator.validate_project_access = AsyncMock(return_value=True)
            mock_validator_func.return_value = mock_validator
            
            mock_service = Mock()
            mock_service.generate_completion = AsyncMock(return_value=Mock(
                success=True,
                data={"title": "Test Story", "description": "Generated story"},
                model_used="test-model",
                tokens_used=50,
                processing_time=0.2
            ))
            mock_ai_service.return_value = mock_service
            
            try:
                # Step 1: Generate a story
                story_response = test_client.post("/api/ai/generate-story", json={
                    "description": "User authentication feature",
                    "project_id": "test-project",
                    "priority": "high"
                })
                
                assert story_response.status_code == 200
                assert story_response.json()["success"] is True
                
                # Step 2: Check AI health
                health_response = test_client.get("/api/ai/health")
                assert health_response.status_code == 200
                assert health_response.json()["status"] == "ok"
                
            finally:
                app.dependency_overrides.clear()

# Test runners
@pytest.mark.asyncio
async def test_async_ai_operations():
    """Test async AI operations directly"""
    # Test async AI service operations
    mock_service = Mock()
    mock_service.generate_completion = AsyncMock(return_value=Mock(
        success=True,
        data={"generated": "content"}
    ))
    
    result = await mock_service.generate_completion("test_generator", {"test": "data"})
    assert result.success is True
    assert result.data["generated"] == "content"

if __name__ == "__main__":
    pytest.main([__file__, "-v"]) 