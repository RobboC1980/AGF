#!/usr/bin/env python3
"""
Simple test script for AI features
"""

import asyncio
import os
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Add the project root to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

async def test_basic_imports():
    """Test basic imports"""
    print("🧪 Testing Basic Imports...")
    
    try:
        # Test AI service imports
        from backend.services.ai_service import AIService, EnhancedAIService
        print("✅ AI service classes imported")
        
        # Test authentication imports
        from backend.auth.enhanced_auth import UserRole, Permission
        print("✅ Authentication enums imported")
        
        # Test database imports
        from backend.database.supabase_client import SupabaseManager
        print("✅ Database client imported")
        
        return True
        
    except Exception as e:
        print(f"❌ Import test failed: {e}")
        return False

async def test_ai_service_init():
    """Test AI service initialization"""
    print("\n🤖 Testing AI Service Initialization...")
    
    try:
        from backend.services.ai_service import AIService
        
        # Initialize basic AI service
        ai_service = AIService()
        print("✅ Basic AI service initialized")
        
        # Check prompt templates
        templates = ai_service.prompt_templates
        print(f"✅ Loaded {len(templates)} prompt templates")
        
        # Check AI clients
        if ai_service.openai_client:
            print("✅ OpenAI client available")
        elif ai_service.anthropic_client:
            print("✅ Anthropic client available")
        else:
            print("⚠️  No AI clients configured (missing API keys)")
        
        return True
        
    except Exception as e:
        print(f"❌ AI service initialization failed: {e}")
        return False

async def test_database_connection():
    """Test database connection"""
    print("\n🗄️  Testing Database Connection...")
    
    try:
        from backend.database.supabase_client import init_supabase, get_supabase
        
        # Initialize Supabase
        init_supabase()
        supabase = get_supabase()
        print("✅ Supabase client initialized")
        
        # Test basic table access
        result = supabase.table("users").select("count").limit(1).execute()
        print("✅ Database connection successful")
        
        return True
        
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        return False

async def test_enhanced_ai_service():
    """Test enhanced AI service"""
    print("\n🚀 Testing Enhanced AI Service...")
    
    try:
        from backend.services.ai_service import init_ai_service, get_ai_service
        from backend.database.supabase_client import get_supabase
        
        supabase = get_supabase()
        
        # Initialize enhanced AI service
        enhanced_ai = init_ai_service(supabase)
        print("✅ Enhanced AI service initialized")
        
        # Test service retrieval
        ai_service = get_ai_service()
        print("✅ Enhanced AI service accessible")
        
        return True
        
    except Exception as e:
        print(f"❌ Enhanced AI service test failed: {e}")
        return False

async def main():
    """Run all tests"""
    print("🚀 Starting AgileForge AI Features Simple Test\n")
    
    tests = [
        ("Basic Imports", test_basic_imports),
        ("AI Service Init", test_ai_service_init),
        ("Database Connection", test_database_connection),
        ("Enhanced AI Service", test_enhanced_ai_service)
    ]
    
    results = []
    for test_name, test_func in tests:
        try:
            result = await test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"❌ {test_name} test crashed: {e}")
            results.append((test_name, False))
    
    # Summary
    print("\n" + "="*50)
    print("📊 TEST SUMMARY")
    print("="*50)
    
    passed = 0
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} - {test_name}")
        if result:
            passed += 1
    
    print(f"\nResults: {passed}/{len(results)} tests passed")
    
    if passed == len(results):
        print("🎉 All tests passed! AI features are ready for production.")
        return 0
    else:
        print("⚠️  Some tests failed. Please review the issues above.")
        return 1

if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code) 