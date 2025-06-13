import requests
import json
import logging
import uuid

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

BASE_URL = "http://localhost:8000"

def get_auth_token():
    """Get authentication token for testing"""
    login_data = {
        "email": "test@example.com",
        "password": "testpassword123"
    }
    
    response = requests.post(f"{BASE_URL}/api/auth/login", json=login_data)
    if response.status_code == 200:
        return response.json()["access_token"]
    else:
        logger.error(f"Failed to get auth token: {response.text}")
        return None

def test_crud_operations():
    """Test CRUD operations for all entities"""
    
    # Get auth token
    auth_token = get_auth_token()
    if not auth_token:
        return
    
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    # 1. Test Project CRUD
    logger.info("Testing Project CRUD operations...")
    
    # Create project
    project_data = {
        "name": "Test Project",
        "description": "A test project for CRUD validation"
    }
    
    create_project_response = requests.post(
        f"{BASE_URL}/api/projects",
        headers=headers,
        json=project_data
    )
    
    if create_project_response.status_code == 201:
        logger.info("✅ Project creation successful")
        project = create_project_response.json()
        project_id = project["id"]
    else:
        logger.error(f"❌ Project creation failed: {create_project_response.text}")
        return
    
    # 2. Test Epic CRUD
    logger.info("Testing Epic CRUD operations...")
    
    # Create epic
    epic_data = {
        "name": "Test Epic",
        "description": "A test epic for CRUD validation",
        "project_id": project_id,
        "color": "#3B82F6"
    }
    
    create_epic_response = requests.post(
        f"{BASE_URL}/api/epics",
        headers=headers,
        json=epic_data
    )
    
    if create_epic_response.status_code == 201:
        logger.info("✅ Epic creation successful")
        epic = create_epic_response.json()
        epic_id = epic["id"]
    else:
        logger.error(f"❌ Epic creation failed: {create_epic_response.text}")
        return
    
    # 3. Test Story CRUD
    logger.info("Testing Story CRUD operations...")
    
    # Create story
    story_data = {
        "name": "Test Story",
        "description": "A test story for CRUD validation",
        "acceptance_criteria": "1. Test passes\n2. All validations work",
        "story_points": 3,
        "priority": "medium",
        "epic_id": epic_id,
        "tags": ["test", "validation"]
    }
    
    create_story_response = requests.post(
        f"{BASE_URL}/api/stories",
        headers=headers,
        json=story_data
    )
    
    if create_story_response.status_code == 201:
        logger.info("✅ Story creation successful")
        story = create_story_response.json()
        story_id = story["id"]
    else:
        logger.error(f"❌ Story creation failed: {create_story_response.text}")
        return
    
    # 4. Test Task CRUD
    logger.info("Testing Task CRUD operations...")
    
    # Create task
    task_data = {
        "title": "Test Task",
        "description": "A test task for CRUD validation",
        "story_id": story_id,
        "status": "todo"
    }
    
    create_task_response = requests.post(
        f"{BASE_URL}/api/tasks",
        headers=headers,
        json=task_data
    )
    
    if create_task_response.status_code == 201:
        logger.info("✅ Task creation successful")
        task = create_task_response.json()
        task_id = task["id"]
    else:
        logger.error(f"❌ Task creation failed: {create_task_response.text}")
        return
    
    # 5. Test AI Integration
    logger.info("Testing AI Integration...")
    
    # Test story generation
    ai_story_data = {
        "description": "As a user, I want to be able to create and manage projects",
        "priority": "high",
        "includeAcceptanceCriteria": True,
        "includeTags": True
    }
    
    ai_story_response = requests.post(
        f"{BASE_URL}/api/ai/generate-story",
        headers=headers,
        json=ai_story_data
    )
    
    if ai_story_response.status_code == 200:
        logger.info("✅ AI story generation successful")
        ai_story = ai_story_response.json()
        logger.info(f"Generated story: {json.dumps(ai_story, indent=2)}")
    else:
        logger.error(f"❌ AI story generation failed: {ai_story_response.text}")
    
    # Clean up test data
    logger.info("Cleaning up test data...")
    
    # Delete task
    requests.delete(f"{BASE_URL}/api/tasks/{task_id}", headers=headers)
    # Delete story
    requests.delete(f"{BASE_URL}/api/stories/{story_id}", headers=headers)
    # Delete epic
    requests.delete(f"{BASE_URL}/api/epics/{epic_id}", headers=headers)
    # Delete project
    requests.delete(f"{BASE_URL}/api/projects/{project_id}", headers=headers)
    
    logger.info("🎉 All CRUD tests completed successfully!")

if __name__ == "__main__":
    test_crud_operations() 