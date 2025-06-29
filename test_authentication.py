#!/usr/bin/env python3
"""
Test Authentication Script for AgileForge
This script tests the authentication flow and API endpoints
"""

import os
import requests
import json
from supabase import create_client, Client

# Configuration
API_BASE_URL = "http://localhost:8000"
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

def test_backend_health():
    """Test if backend is running"""
    try:
        response = requests.get(f"{API_BASE_URL}/health", timeout=5)
        if response.status_code == 200:
            print("✅ Backend health check passed")
            print(f"   Status: {response.json().get('status')}")
            return True
        else:
            print(f"❌ Backend health check failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Backend connection failed: {e}")
        return False

def test_supabase_connection():
    """Test Supabase connection and table existence"""
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        
        # Test tables
        tables_to_test = ['users', 'projects', 'epics', 'stories', 'sprints', 'tasks']
        results = {}
        
        for table in tables_to_test:
            try:
                result = supabase.table(table).select('*').limit(1).execute()
                results[table] = f"✅ EXISTS ({len(result.data)} rows)"
            except Exception as e:
                results[table] = f"❌ ERROR: {str(e)[:50]}"
        
        print("\n📊 Supabase Table Status:")
        for table, status in results.items():
            print(f"   {table}: {status}")
        
        # Check if all required tables exist
        missing_tables = [table for table, status in results.items() if "ERROR" in status]
        if missing_tables:
            print(f"\n⚠️  Missing tables: {missing_tables}")
            return False
        else:
            print("\n✅ All required tables exist")
            return True
            
    except Exception as e:
        print(f"❌ Supabase connection failed: {e}")
        return False

def test_auth_endpoint():
    """Test authentication endpoint"""
    try:
        # Test login endpoint exists
        response = requests.post(f"{API_BASE_URL}/api/auth/login", 
                               json={"email": "test@example.com", "password": "invalid"},
                               timeout=5)
        
        if response.status_code in [400, 401, 422]:  # Expected for invalid credentials
            print("✅ Auth endpoint is accessible")
            return True
        else:
            print(f"⚠️  Auth endpoint returned unexpected status: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Auth endpoint test failed: {e}")
        return False

def test_sprints_endpoint_auth():
    """Test sprints endpoint (should fail without auth)"""
    try:
        response = requests.get(f"{API_BASE_URL}/api/sprints", timeout=5)
        
        if response.status_code == 401:
            print("✅ Sprints endpoint properly requires authentication")
            return True
        elif response.status_code == 500:
            print("⚠️  Sprints endpoint has server error (likely missing table)")
            return False
        else:
            print(f"⚠️  Sprints endpoint returned unexpected status: {response.status_code}")
            print(f"   Response: {response.text[:100]}")
            return False
            
    except Exception as e:
        print(f"❌ Sprints endpoint test failed: {e}")
        return False

def main():
    print("🧪 Testing AgileForge Authentication & Setup")
    print("=" * 50)
    
    # Test 1: Backend Health
    print("\n1. Testing Backend Health...")
    backend_ok = test_backend_health()
    
    # Test 2: Supabase Connection
    print("\n2. Testing Supabase Connection...")
    supabase_ok = test_supabase_connection()
    
    # Test 3: Auth Endpoint
    print("\n3. Testing Authentication Endpoint...")
    auth_ok = test_auth_endpoint()
    
    # Test 4: Sprints Endpoint (auth required)
    print("\n4. Testing Sprints Endpoint Authentication...")
    sprints_auth_ok = test_sprints_endpoint_auth()
    
    # Summary
    print("\n" + "=" * 50)
    print("📋 TEST SUMMARY:")
    print(f"   Backend Health: {'✅ PASS' if backend_ok else '❌ FAIL'}")
    print(f"   Supabase Connection: {'✅ PASS' if supabase_ok else '❌ FAIL'}")
    print(f"   Auth Endpoint: {'✅ PASS' if auth_ok else '❌ FAIL'}")
    print(f"   Sprints Auth: {'✅ PASS' if sprints_auth_ok else '❌ FAIL'}")
    
    all_tests_passed = all([backend_ok, supabase_ok, auth_ok, sprints_auth_ok])
    
    if all_tests_passed:
        print("\n🎉 ALL TESTS PASSED! Your setup is working correctly.")
    else:
        print("\n⚠️  Some tests failed. Please check the issues above.")
        
        if not supabase_ok:
            print("\n💡 TIP: Make sure you've run the SQL schema in Supabase SQL Editor")
            print("   The sprints table is likely missing.")
    
    return all_tests_passed

if __name__ == "__main__":
    main() 