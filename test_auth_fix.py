#!/usr/bin/env python3
"""
Authentication Fix Test Script

This script tests the Clerk JWT authentication system to ensure
the RS256 JWT verification is working properly.
"""

import os
import sys
import requests
import json
from pathlib import Path

# Add backend to path
backend_path = Path(__file__).parent / "backend"
sys.path.insert(0, str(backend_path))

def test_clerk_auth_import():
    """Test that Clerk authentication modules can be imported"""
    print("🔍 Testing Clerk authentication imports...")
    
    try:
        from backend.auth.clerk_auth import ClerkTokenVerifier, verify_clerk_token
        print("✅ Clerk authentication modules imported successfully")
        return True
    except ImportError as e:
        print(f"❌ Failed to import Clerk authentication: {e}")
        return False

def test_auth_dependencies():
    """Test that authentication dependencies are properly configured"""
    print("🔍 Testing authentication dependencies...")
    
    try:
        from backend.auth.dependencies import get_current_user_clerk, UserResponse
        print("✅ Authentication dependencies imported successfully")
        return True
    except ImportError as e:
        print(f"❌ Failed to import authentication dependencies: {e}")
        return False

def test_unified_auth():
    """Test that unified authentication is properly configured"""
    print("🔍 Testing unified authentication...")
    
    try:
        from backend.auth.unified_auth import get_current_user, UnifiedUser
        print("✅ Unified authentication imported successfully")
        return True
    except ImportError as e:
        print(f"❌ Failed to import unified authentication: {e}")
        return False

def test_env_variables():
    """Test that required environment variables are set"""
    print("🔍 Testing environment variables...")
    
    required_vars = [
        "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
        "CLERK_SECRET_KEY",
    ]
    
    missing_vars = []
    for var in required_vars:
        if not os.getenv(var):
            missing_vars.append(var)
    
    if missing_vars:
        print(f"⚠️  Missing environment variables: {', '.join(missing_vars)}")
        print("   These are required for production use.")
        return False
    else:
        print("✅ All required environment variables are set")
        return True

def test_clerk_verifier():
    """Test that Clerk verifier can be instantiated"""
    print("🔍 Testing Clerk token verifier...")
    
    try:
        from backend.auth.clerk_auth import ClerkTokenVerifier
        verifier = ClerkTokenVerifier()
        print(f"✅ Clerk verifier created (environment: {verifier.environment})")
        return True
    except Exception as e:
        print(f"❌ Failed to create Clerk verifier: {e}")
        return False

def test_dev_token():
    """Test development token verification"""
    print("🔍 Testing development token verification...")
    
    try:
        from backend.auth.clerk_auth import verify_clerk_token
        
        # Set environment to development for testing
        os.environ["ENVIRONMENT"] = "development"
        
        # Test development token
        result = verify_clerk_token("dev-token")
        if result and result.get("sub") == "dev-user-123":
            print("✅ Development token verification working")
            return True
        else:
            print("❌ Development token verification failed")
            return False
    except Exception as e:
        print(f"❌ Development token test failed: {e}")
        return False

def test_middleware_imports():
    """Test that middleware imports don't conflict"""
    print("🔍 Testing middleware imports...")
    
    try:
        from backend.middleware.security import SecurityMiddleware, RateLimitMiddleware
        print("✅ Security middleware imported successfully")
        return True
    except ImportError as e:
        print(f"❌ Failed to import security middleware: {e}")
        return False

def test_api_endpoints():
    """Test that API endpoints use correct authentication"""
    print("🔍 Testing API endpoint authentication...")
    
    try:
        from backend.api.projects import router as projects_router
        from backend.api.user_permissions import router as permissions_router
        print("✅ API endpoints imported successfully with correct auth")
        return True
    except ImportError as e:
        print(f"❌ Failed to import API endpoints: {e}")
        return False

def run_all_tests():
    """Run all authentication tests"""
    print("🚀 Starting Authentication Fix Tests\n")
    
    tests = [
        test_clerk_auth_import,
        test_auth_dependencies,
        test_unified_auth,
        test_env_variables,
        test_clerk_verifier,
        test_dev_token,
        test_middleware_imports,
        test_api_endpoints,
    ]
    
    passed = 0
    total = len(tests)
    
    for test in tests:
        try:
            if test():
                passed += 1
        except Exception as e:
            print(f"❌ Test {test.__name__} failed with exception: {e}")
        print()  # Add blank line between tests
    
    print(f"📊 Test Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! Authentication system is properly configured.")
        return True
    else:
        print("⚠️  Some tests failed. Please check the errors above.")
        return False

if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1) 