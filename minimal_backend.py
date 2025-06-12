from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import uvicorn

app = FastAPI(title="AgileForge API", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models for request/response
class StoryGenerateRequest(BaseModel):
    description: str
    priority: Optional[str] = "medium"
    epicId: Optional[str] = None
    includeAcceptanceCriteria: bool = True
    includeTags: bool = True

class GeneratedStoryResponse(BaseModel):
    success: bool
    story: dict
    provider: str
    model: str
    confidence: Optional[float] = None
    suggestions: Optional[List[str]] = None

@app.get("/health")
async def health():
    return {"status": "healthy", "message": "Backend is running!"}

@app.post("/api/stories/generate", response_model=GeneratedStoryResponse)
async def generate_story(request: StoryGenerateRequest):
    """Generate a user story using AI based on description (mock implementation)"""
    try:
        # Mock AI story generation - in a real implementation this would call an AI service
        description_lower = request.description.lower()
        
        # Generate a title based on the description
        if "login" in description_lower or "auth" in description_lower:
            title = "User Authentication System"
            enhanced_description = f"As a user, I want to {request.description.lower()} so that I can securely access the application and protect my account."
            acceptance_criteria = [
                "Given I am on the login page, when I enter valid credentials, then I should be logged in successfully",
                "Given I am on the login page, when I enter invalid credentials, then I should see an error message",
                "Given I am logged in, when I click logout, then I should be logged out and redirected to the login page"
            ]
            tags = ["authentication", "security", "user-management"]
            story_points = 5
        elif "search" in description_lower:
            title = "Search Functionality"
            enhanced_description = f"As a user, I want to {request.description.lower()} so that I can quickly find the information I need."
            acceptance_criteria = [
                "Given I am on the search page, when I enter a search term, then I should see relevant results",
                "Given I perform a search, when no results are found, then I should see a 'no results' message",
                "Given I perform a search, when results are found, then they should be sorted by relevance"
            ]
            tags = ["search", "functionality", "user-experience"]
            story_points = 3
        elif "dashboard" in description_lower:
            title = "Dashboard Overview"
            enhanced_description = f"As a user, I want to {request.description.lower()} so that I can get a quick overview of important information."
            acceptance_criteria = [
                "Given I am logged in, when I navigate to the dashboard, then I should see key metrics",
                "Given I am on the dashboard, when data is loading, then I should see loading indicators",
                "Given I am on the dashboard, when data fails to load, then I should see error messages"
            ]
            tags = ["dashboard", "analytics", "overview"]
            story_points = 5
        else:
            title = f"User Story: {request.description[:50]}..."
            enhanced_description = f"As a user, I want to {request.description.lower()} so that I can achieve my goals efficiently."
            acceptance_criteria = [
                f"Given I am a user, when I {request.description.lower()}, then the system should respond appropriately",
                "Given the feature is working correctly, when I use it, then I should see the expected outcome",
                "Given there are edge cases, when they occur, then the system should handle them gracefully"
            ]
            tags = ["feature", "user-story", "functionality"]
            story_points = 3

        # Only include acceptance criteria and tags if requested
        final_acceptance_criteria = acceptance_criteria if request.includeAcceptanceCriteria else []
        final_tags = tags if request.includeTags else []

        story_data = {
            "name": title,
            "description": enhanced_description,
            "acceptanceCriteria": final_acceptance_criteria,
            "tags": final_tags,
            "storyPoints": story_points
        }

        return GeneratedStoryResponse(
            success=True,
            story=story_data,
            provider="AgileForge AI (Mock)",
            model="story-generator-v1",
            confidence=0.75,
            suggestions=[
                "Consider adding more specific acceptance criteria",
                "Review the story points estimation based on your team's velocity",
                "Add relevant tags for better organization"
            ]
        )

    except Exception as e:
        return GeneratedStoryResponse(
            success=False,
            story={},
            provider="AgileForge AI (Mock)",
            model="story-generator-v1",
            confidence=0.0,
            suggestions=[]
        )

@app.get("/api/stories")
async def get_stories():
    return [
        {
            "id": "story-1",
            "epic_id": "epic-1",
            "title": "User Authentication",
            "description": "Implement user login and registration",
            "story_key": "AGF-1",
            "as_a": "user",
            "i_want": "to authenticate",
            "so_that": "I can access the system",
            "acceptance_criteria": "User can register and login successfully",
            "status": "in-progress",
            "priority": "high",
            "story_points": 5,
            "assignee_id": "user-1",
            "due_date": None,
            "created_by": "user-1",
            "created_at": "2024-01-01T00:00:00Z",
            "updated_at": "2024-01-01T00:00:00Z"
        },
        {
            "id": "story-2",
            "epic_id": "epic-1",
            "title": "Data Persistence",
            "description": "Save user data and preferences",
            "story_key": "AGF-2",
            "as_a": "user",
            "i_want": "my data to be saved",
            "so_that": "I don't lose my work",
            "acceptance_criteria": "User data persists across sessions",
            "status": "backlog",
            "priority": "medium",
            "story_points": 3,
            "assignee_id": "user-2",
            "due_date": None,
            "created_by": "user-1",
            "created_at": "2024-01-01T00:00:00Z",
            "updated_at": "2024-01-01T00:00:00Z"
        }
    ]

@app.get("/api/epics")
async def get_epics():
    return [
        {
            "id": "epic-1",
            "project_id": "proj-1",
            "title": "User Management",
            "description": "Complete user management system",
            "epic_key": "AGF-E1",
            "status": "in-progress",
            "priority": "high",
            "start_date": None,
            "target_end_date": None,
            "estimated_story_points": 20,
            "actual_story_points": 8,
            "progress": 40,
            "created_by": "user-1",
            "created_at": "2024-01-01T00:00:00Z",
            "updated_at": "2024-01-01T00:00:00Z"
        }
    ]

@app.get("/api/projects")
async def get_projects():
    return [
        {
            "id": "proj-1",
            "name": "AgileForge Platform",
            "key": "AGF",
            "description": "Complete project management platform",
            "status": "in-progress",
            "priority": "high",
            "start_date": None,
            "target_end_date": None,
            "progress": 35,
            "created_by": "user-1",
            "created_at": "2024-01-01T00:00:00Z",
            "updated_at": "2024-01-01T00:00:00Z"
        }
    ]

@app.get("/api/users")
async def get_users():
    return [
        {
            "id": "user-1",
            "username": "john.doe",
            "email": "john.doe@example.com",
            "first_name": "John",
            "last_name": "Doe",
            "avatar_url": "/placeholder.svg?height=32&width=32",
            "is_active": True,
            "created_at": "2024-01-01T00:00:00Z"
        },
        {
            "id": "user-2",
            "username": "jane.smith",
            "email": "jane.smith@example.com",
            "first_name": "Jane",
            "last_name": "Smith",
            "avatar_url": "/placeholder.svg?height=32&width=32",
            "is_active": True,
            "created_at": "2024-01-01T00:00:00Z"
        }
    ]

@app.get("/api/tasks")
async def get_tasks():
    return [
        {
            "id": "task-1",
            "story_id": "story-1",
            "title": "Set up authentication backend",
            "description": "Create API endpoints for login and registration",
            "status": "todo",
            "priority": "high",
            "assignee_id": "user-1",
            "story_points": 3,
            "tags": ["backend", "auth"],
            "created_at": "2024-01-01T00:00:00Z",
            "updated_at": "2024-01-01T00:00:00Z"
        },
        {
            "id": "task-2",
            "story_id": "story-1",
            "title": "Create login UI",
            "description": "Design and implement login form with validation",
            "status": "in_progress",
            "priority": "high",
            "assignee_id": "user-2",
            "story_points": 2,
            "tags": ["frontend", "ui"],
            "created_at": "2024-01-01T00:00:00Z",
            "updated_at": "2024-01-02T00:00:00Z"
        },
        {
            "id": "task-3",
            "story_id": "story-2",
            "title": "Database schema design",
            "description": "Design database schema for user preferences",
            "status": "done",
            "priority": "medium",
            "assignee_id": "user-1",
            "story_points": 1,
            "tags": ["database", "design"],
            "created_at": "2024-01-01T00:00:00Z",
            "updated_at": "2024-01-03T00:00:00Z"
        },
        {
            "id": "task-4",
            "story_id": "story-1",
            "title": "Add JWT token handling",
            "description": "Implement JWT token generation and validation",
            "status": "todo",
            "priority": "high",
            "assignee_id": None,
            "story_points": 2,
            "tags": ["backend", "security"],
            "created_at": "2024-01-02T00:00:00Z",
            "updated_at": "2024-01-02T00:00:00Z"
        },
        {
            "id": "task-5",
            "story_id": "story-2",
            "title": "Implement data persistence",
            "description": "Create service layer for saving user data",
            "status": "in_progress",
            "priority": "medium",
            "assignee_id": "user-2",
            "story_points": 3,
            "tags": ["backend", "database"],
            "created_at": "2024-01-02T00:00:00Z",
            "updated_at": "2024-01-03T00:00:00Z"
        }
    ]

@app.get("/api/analytics/overview")
async def get_analytics_overview():
    return {
        "overview": {
            "total_projects": 1,
            "total_epics": 1,
            "total_stories": 2,
            "total_users": 2,
            "completed_stories": 0,
            "in_progress_stories": 1,
            "backlog_stories": 1,
            "velocity": 8,
            "burndown": [
                {"date": "2024-01-01", "remaining": 20},
                {"date": "2024-01-02", "remaining": 18},
                {"date": "2024-01-03", "remaining": 15},
                {"date": "2024-01-04", "remaining": 12},
                {"date": "2024-01-05", "remaining": 8}
            ]
        }
    }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=4000) 