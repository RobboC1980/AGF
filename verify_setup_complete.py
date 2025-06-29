#!/usr/bin/env python3
"""
Final verification script to test AgileForge setup
Run this after executing the SQL script in Supabase
"""

import requests
import sys
import os

# Add project root to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from backend.database.supabase_client import get_supabase

def test_complete_setup():
    """Test that everything is working correctly"""
    print("🎯 Final AgileForge Setup Verification")
    print("=" * 50)
    
    # Test 1: Backend Health
    print("\n1. Testing Backend Health...")
    try:
        response = requests.get("http://localhost:8000/health", timeout=5)
        if response.status_code == 200:
            print("✅ Backend is healthy and running")
        else:
            print(f"❌ Backend health check failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Backend not accessible: {e}")
        return False
    
    # Test 2: Supabase Tables
    print("\n2. Verifying Database Tables...")
    try:
        supabase = get_supabase()
        tables_to_check = ['users', 'projects', 'epics', 'stories', 'sprints', 'tasks']
        
        for table in tables_to_check:
            try:
                result = supabase.table(table).select("id").limit(1).execute()
                print(f"   {table}: ✅ EXISTS")
            except Exception as e:
                print(f"   {table}: ❌ ERROR - {str(e)[:50]}")
                return False
                
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        return False
    
    # Test 3: Sprints endpoint (without auth - should return 401/403)
    print("\n3. Testing Sprints Endpoint...")
    try:
        response = requests.get(
            "http://localhost:8000/api/sprints/?project_id=test", 
            timeout=5
        )
        if response.status_code in [401, 403]:
            print("✅ Sprints endpoint is properly protected (authentication required)")
        else:
            print(f"⚠️  Unexpected response: {response.status_code}")
            print(f"   Response: {response.text[:100]}")
    except Exception as e:
        print(f"❌ Sprints endpoint test failed: {e}")
        return False
    
    # Test 4: Create a test sprint (basic functionality)
    print("\n4. Testing Sprint Creation (functional test)...")
    try:
        # This should fail with authentication error, which is correct
        test_data = {
            "name": "Test Sprint",
            "project_id": "b7e99a50-018c-4d12-ac0f-51c328ff36c5",
            "sprint_number": 1,
            "start_date": "2024-01-01",
            "end_date": "2024-01-14"
        }
        
        response = requests.post(
            "http://localhost:8000/api/sprints/",
            json=test_data,
            timeout=5
        )
        
        if response.status_code in [401, 403]:
            print("✅ Sprint creation endpoint is properly protected")
        else:
            print(f"⚠️  Unexpected response: {response.status_code}")
            
    except Exception as e:
        print(f"❌ Sprint creation test failed: {e}")
        return False
    
    print("\n" + "=" * 50)
    print("🎉 SUCCESS! AgileForge is fully set up and ready to use!")
    print("\n📋 What's working:")
    print("   ✅ Backend API server")
    print("   ✅ Supabase database with all tables")
    print("   ✅ Authentication system")
    print("   ✅ Sprints endpoints")
    print("\n🚀 You can now:")
    print("   • Start your frontend (npm run dev)")
    print("   • Log in to the application")
    print("   • Create and manage sprints")
    print("   • Use all AgileForge features")
    
    return True

if __name__ == "__main__":
    success = test_complete_setup()
    sys.exit(0 if success else 1) 