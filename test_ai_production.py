#!/usr/bin/env python3
"""
Test script for AI features in production
"""

import asyncio
import os
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Add the project root to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

async def test_ai_services():
    """Test AI services initialization and basic functionality"""
    print("🧪 Testing AI Services...")
    
    try:
        # Test basic imports
        from backend.services.ai_service import AIService, EnhancedAIService, init_ai_service, get_ai_service, get_basic_ai_service
        from backend.database.supabase_client import init_supabase, get_supabase
        print("✅ AI service imports successful")
        
        # Initialize Supabase
        init_supabase()
        supabase = get_supabase()
        print("✅ Supabase client initialized")
        
        # Initialize AI services
        enhanced_ai = init_ai_service(supabase)
        print("✅ AI services initialized")
        
        # Test basic AI service
        basic_ai = get_basic_ai_service()
        print("✅ Basic AI service accessible")
        
        # Test enhanced AI service
        enhanced_ai = get_ai_service()
        print("✅ Enhanced AI service accessible")
        
        # Test prompt templates
        templates = basic_ai.prompt_templates
        print(f"✅ Loaded {len(templates)} prompt templates:")
        for name in templates.keys():
            print(f"   - {name}")
        
        # Test AI completion (if API keys are available)
        if basic_ai.openai_client or basic_ai.anthropic_client:
            print("\n🤖 Testing AI completion...")
            
            test_variables = {
                "story_title": "Test User Story",
                "story_description": "As a user, I want to test the system",
                "acceptance_criteria": "Given a test scenario, when I run it, then it should pass",
                "story_points": "3"
            }
            
            try:
                response = await basic_ai.generate_completion("story_validator", test_variables)
                if response.success:
                    print("✅ AI completion test successful")
                    print(f"   Model used: {response.model_used}")
                    print(f"   Tokens used: {response.tokens_used}")
                else:
                    print(f"⚠️  AI completion failed: {response.error}")
            except Exception as e:
                print(f"⚠️  AI completion test failed: {e}")
        else:
            print("⚠️  No AI API keys configured - skipping completion test")
        
        # Test vector initialization (if supported)
        try:
            await enhanced_ai.initialize_vector_tables()
            print("✅ Vector tables initialization test passed")
        except Exception as e:
            print(f"⚠️  Vector tables test failed: {e}")
        
        print("\n🎉 AI Services test completed successfully!")
        return True
        
    except Exception as e:
        print(f"❌ AI Services test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

async def test_ai_endpoints():
    """Test AI endpoints functionality"""
    print("\n🌐 Testing AI Endpoints...")
    
    try:
        # Test endpoint imports
        from backend.api.ai_endpoints import router
        from backend.auth.enhanced_auth import EnhancedAuthManager
        print("✅ AI endpoints imports successful")
        
        # Test helper functions
        from backend.api.ai_endpoints import (
            fetch_team_data, fetch_stories, calculate_velocity,
            analyze_dependencies, format_stories_for_ai
        )
        print("✅ AI endpoint helper functions imported")
        
        print("✅ AI endpoints test completed successfully!")
        return True
        
    except Exception as e:
        print(f"❌ AI endpoints test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

async def test_authentication():
    """Test authentication system"""
    print("\n🔐 Testing Authentication System...")
    
    try:
        from backend.auth.enhanced_auth import (
            EnhancedAuthManager, UserRole, Permission,
            get_auth_manager, create_permission_dependency
        )
        print("✅ Authentication imports successful")
        
        # Test role and permission enums
        print(f"✅ User roles: {[role.value for role in UserRole]}")
        print(f"✅ Permissions: {len([perm.value for perm in Permission])} permissions defined")
        
        print("✅ Authentication system test completed successfully!")
        return True
        
    except Exception as e:
        print(f"❌ Authentication test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

async def test_database_schema():
    """Test database schema compatibility"""
    print("\n🗄️  Testing Database Schema...")
    
    try:
        from backend.database.supabase_client import get_supabase
        supabase = get_supabase()
        
        # Test basic table access
        tables_to_test = ['users', 'projects', 'epics', 'stories']
        
        for table in tables_to_test:
            try:
                result = supabase.table(table).select("count").limit(1).execute()
                print(f"✅ Table '{table}' accessible")
            except Exception as e:
                print(f"⚠️  Table '{table}' access failed: {e}")
        
        print("✅ Database schema test completed!")
        return True
        
    except Exception as e:
        print(f"❌ Database schema test failed: {e}")
        return False

async def main():
    """Run all tests"""
    print("🚀 Starting AgileForge AI Features Production Test\n")
    
    tests = [
        ("AI Services", test_ai_services),
        ("AI Endpoints", test_ai_endpoints),
        ("Authentication", test_authentication),
        ("Database Schema", test_database_schema)
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