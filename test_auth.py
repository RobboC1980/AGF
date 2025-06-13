import requests
import json
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

BASE_URL = "http://localhost:8000"

def test_auth_flow():
    """Test the complete authentication flow"""
    
    # Test data
    test_user = {
        "email": "test@example.com",
        "name": "Test User",
        "password": "testpassword123"
    }
    
    # 1. Register new user
    logger.info("Testing user registration...")
    register_response = requests.post(
        f"{BASE_URL}/api/auth/register",
        json=test_user
    )
    
    if register_response.status_code == 200:
        logger.info("✅ Registration successful")
        auth_data = register_response.json()
        access_token = auth_data["access_token"]
    else:
        logger.error(f"❌ Registration failed: {register_response.text}")
        return
    
    # 2. Test login
    logger.info("Testing user login...")
    login_response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={
            "email": test_user["email"],
            "password": test_user["password"]
        }
    )
    
    if login_response.status_code == 200:
        logger.info("✅ Login successful")
    else:
        logger.error(f"❌ Login failed: {login_response.text}")
        return
    
    # 3. Test get current user
    logger.info("Testing get current user...")
    me_response = requests.get(
        f"{BASE_URL}/api/auth/me",
        headers={"Authorization": f"Bearer {access_token}"}
    )
    
    if me_response.status_code == 200:
        logger.info("✅ Get current user successful")
        user_data = me_response.json()
        logger.info(f"User data: {json.dumps(user_data, indent=2)}")
    else:
        logger.error(f"❌ Get current user failed: {me_response.text}")
        return
    
    # 4. Test logout
    logger.info("Testing logout...")
    logout_response = requests.post(
        f"{BASE_URL}/api/auth/logout",
        headers={"Authorization": f"Bearer {access_token}"}
    )
    
    if logout_response.status_code == 200:
        logger.info("✅ Logout successful")
    else:
        logger.error(f"❌ Logout failed: {logout_response.text}")
        return
    
    logger.info("🎉 All auth tests completed successfully!")

if __name__ == "__main__":
    test_auth_flow() 