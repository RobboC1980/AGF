#!/usr/bin/env python3
"""
Test script for Clerk-Supabase authentication integration
This script tests the unified authentication system end-to-end
"""

import os
import sys
import asyncio
import requests
from datetime import datetime

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

def test_backend_health():
    """Test if backend is running and healthy"""
    try:
        response = requests.get("http://localhost:8000/health", timeout=5)
        if response.status_code == 200:
            data = response.json()
            print("✅ Backend is healthy")
            print(f"   Status: {data.get('status')}")
            print(f"   Environment: {data.get('environment')}")
            print(f"   Version: {data.get('version')}")
            return True
        else:
            print(f"❌ Backend health check failed: {response.status_code}")
            return False
    except requests.exceptions.RequestException as e:
        print(f"❌ Backend is not accessible: {e}")
        return False

def test_auth_endpoints():
    """Test authentication endpoints"""
    print("\n🔐 Testing Authentication Endpoints...")
    
    # Test /api/auth/me without token (should fail)
    try:
        response = requests.get("http://localhost:8000/api/auth/me", timeout=5)
        if response.status_code == 401:
            print("✅ /api/auth/me correctly rejects unauthenticated requests")
        else:
            print(f"⚠️  /api/auth/me returned unexpected status: {response.status_code}")
    except requests.exceptions.RequestException as e:
        print(f"❌ Error testing /api/auth/me: {e}")
    
    # Test with dev token (development mode)
    headers = {"Authorization": "Bearer dev-token"}
    try:
        response = requests.get("http://localhost:8000/api/auth/me", headers=headers, timeout=5)
        if response.status_code == 200:
            data = response.json()
            print("✅ Development token authentication works")
            print(f"   User ID: {data.get('id')}")
            print(f"   Email: {data.get('email')}")
            print(f"   Name: {data.get('name')}")
        else:
            print(f"⚠️  Dev token authentication failed: {response.status_code}")
            print(f"   Response: {response.text}")
    except requests.exceptions.RequestException as e:
        print(f"❌ Error testing dev token: {e}")

def test_analytics_endpoints():
    """Test analytics endpoints with authentication"""
    print("\n📊 Testing Analytics Endpoints...")
    
    headers = {"Authorization": "Bearer dev-token"}
    
    # Test analytics overview
    try:
        response = requests.get("http://localhost:8000/api/analytics/overview", headers=headers, timeout=10)
        if response.status_code == 200:
            data = response.json()
            print("✅ Analytics overview endpoint works")
            print(f"   Total stories: {data.get('total_stories', 0)}")
            print(f"   Completion rate: {data.get('completion_rate', 0):.2%}")
        else:
            print(f"⚠️  Analytics overview failed: {response.status_code}")
            print(f"   Response: {response.text}")
    except requests.exceptions.RequestException as e:
        print(f"❌ Error testing analytics overview: {e}")

def test_ai_endpoints():
    """Test AI endpoints"""
    print("\n🤖 Testing AI Endpoints...")
    
    # Test AI status
    try:
        response = requests.get("http://localhost:8000/api/ai/status", timeout=5)
        if response.status_code == 200:
            data = response.json()
            print("✅ AI status endpoint works")
            print(f"   Status: {data.get('status')}")
            print(f"   Provider: {data.get('provider')}")
        else:
            print(f"⚠️  AI status failed: {response.status_code}")
    except requests.exceptions.RequestException as e:
        print(f"❌ Error testing AI status: {e}")

def test_clerk_token_parsing():
    """Test Clerk token parsing logic"""
    print("\n🎫 Testing Clerk Token Parsing...")
    
    try:
        from backend.auth.clerk_auth import ClerkTokenVerifier
        
        verifier = ClerkTokenVerifier()
        print(f"✅ Clerk verifier initialized")
        print(f"   Environment: {verifier.environment}")
        print(f"   Instance ID: {verifier.instance_id}")
        print(f"   JWKS URL: {verifier.jwks_url}")
        print(f"   Issuer: {verifier.issuer}")
        
    except ImportError as e:
        print(f"❌ Could not import Clerk verifier: {e}")
    except Exception as e:
        print(f"❌ Error initializing Clerk verifier: {e}")

def test_unified_auth():
    """Test unified authentication system"""
    print("\n🔄 Testing Unified Authentication...")
    
    try:
        from backend.auth.unified_auth import UnifiedAuthService
        
        auth_service = UnifiedAuthService()
        print(f"✅ Unified auth service initialized")
        print(f"   Environment: {auth_service.environment}")
        print(f"   Has Clerk key: {bool(auth_service.clerk_publishable_key)}")
        print(f"   Has Supabase secret: {bool(auth_service.supabase_jwt_secret)}")
        
        # Test dev user creation
        dev_user = auth_service.create_dev_user()
        print(f"✅ Development user creation works")
        print(f"   Dev user ID: {dev_user.id}")
        print(f"   Dev user email: {dev_user.email}")
        
    except ImportError as e:
        print(f"❌ Could not import unified auth: {e}")
    except Exception as e:
        print(f"❌ Error testing unified auth: {e}")

def check_environment_variables():
    """Check required environment variables"""
    print("\n🌍 Checking Environment Variables...")
    
    required_vars = [
        "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
        "CLERK_SECRET_KEY", 
        "NEXT_PUBLIC_SUPABASE_URL",
        "NEXT_PUBLIC_SUPABASE_ANON_KEY",
        "SUPABASE_SERVICE_ROLE_KEY"
    ]
    
    optional_vars = [
        "SUPABASE_JWT_SECRET",
        "OPENAI_API_KEY",
        "ANTHROPIC_API_KEY"
    ]
    
    for var in required_vars:
        value = os.getenv(var)
        if value:
            # Mask sensitive values
            if "KEY" in var or "SECRET" in var:
                masked_value = value[:8] + "..." + value[-4:] if len(value) > 12 else "***"
                print(f"✅ {var}: {masked_value}")
            else:
                print(f"✅ {var}: {value}")
        else:
            print(f"❌ {var}: Not set")
    
    print("\nOptional variables:")
    for var in optional_vars:
        value = os.getenv(var)
        if value:
            if "KEY" in var or "SECRET" in var:
                masked_value = value[:8] + "..." + value[-4:] if len(value) > 12 else "***"
                print(f"✅ {var}: {masked_value}")
            else:
                print(f"✅ {var}: {value}")
        else:
            print(f"⚠️  {var}: Not set (optional)")

def main():
    """Run all tests"""
    print("🧪 AgileForge Authentication Integration Test")
    print("=" * 50)
    print(f"Test started at: {datetime.now().isoformat()}")
    
    # Check environment
    check_environment_variables()
    
    # Test backend health
    if not test_backend_health():
        print("\n❌ Backend is not running. Please start it with: python backend/main.py")
        return False
    
    # Test authentication components
    test_clerk_token_parsing()
    test_unified_auth()
    
    # Test API endpoints
    test_auth_endpoints()
    test_analytics_endpoints()
    test_ai_endpoints()
    
    print("\n" + "=" * 50)
    print("🎉 Test completed!")
    print("\nNext steps:")
    print("1. Set up your Clerk application and get real API keys")
    print("2. Configure Supabase JWT settings")
    print("3. Run the frontend with: npm run dev")
    print("4. Test the full authentication flow in the browser")
    
    return True

if __name__ == "__main__":
    main() 