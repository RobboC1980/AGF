#!/usr/bin/env python3
"""
Simple test script to verify backend startup
"""
import os
import sys
import traceback

# Add the backend directory to the path
sys.path.insert(0, os.path.dirname(__file__))

def test_environment():
    """Test environment variables"""
    print("Testing environment variables...")
    
    # Test Supabase configuration
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_KEY") or os.getenv("SUPABASE_ANON_KEY")
    
    print(f"SUPABASE_URL: {supabase_url[:50]}..." if supabase_url else "SUPABASE_URL: Not set")
    print(f"SUPABASE_KEY: {'Set' if supabase_key else 'Not set'}")
    
    return supabase_url and supabase_key

def test_imports():
    """Test critical imports"""
    print("\nTesting imports...")
    
    try:
        from database.supabase_client import init_supabase, get_supabase
        print("✓ Supabase client import successful")
        
        from backup.backup_manager import BackupManager
        print("✓ Backup manager import successful")
        
        from middleware.security import SecurityMiddleware
        print("✓ Security middleware import successful")
        
        return True
    except Exception as e:
        print(f"✗ Import failed: {e}")
        traceback.print_exc()
        return False

def test_supabase_connection():
    """Test Supabase connection"""
    print("\nTesting Supabase connection...")
    
    try:
        from database.supabase_client import init_supabase, get_supabase
        
        # Initialize Supabase
        init_supabase()
        supabase = get_supabase()
        
        # Test connection with a simple query
        result = supabase.table("projects").select("id").limit(1).execute()
        print(f"✓ Supabase connection successful - found {len(result.data)} records")
        return True
        
    except Exception as e:
        print(f"✗ Supabase connection failed: {e}")
        return False

def test_backup_manager():
    """Test backup manager initialization"""
    print("\nTesting backup manager...")
    
    try:
        from backup.backup_manager import BackupManager
        
        backup_config = {
            "backup_root": "/tmp/test_backups",
            "s3_bucket": None,
            "encryption_key": None,
            "retention_policy": {
                "daily": 7,
                "weekly": 4,
                "monthly": 12
            }
        }
        
        backup_manager = BackupManager(backup_config)
        print("✓ Backup manager initialization successful")
        return True
        
    except Exception as e:
        print(f"✗ Backup manager initialization failed: {e}")
        return False

def main():
    """Run all tests"""
    print("🚀 AgileForge Backend Startup Test")
    print("=" * 50)
    
    # Load environment variables
    from dotenv import load_dotenv
    load_dotenv()
    
    tests = [
        test_environment,
        test_imports,
        test_supabase_connection,
        test_backup_manager
    ]
    
    results = []
    for test in tests:
        try:
            result = test()
            results.append(result)
        except Exception as e:
            print(f"✗ Test {test.__name__} failed with exception: {e}")
            results.append(False)
    
    print("\n" + "=" * 50)
    passed_count = sum(1 for result in results if result)
    print(f"Test Results: {passed_count}/{len(results)} passed")
    
    if all(results):
        print("✅ All tests passed! Backend should start successfully.")
        return 0
    else:
        print("❌ Some tests failed. Check the output above.")
        return 1

if __name__ == "__main__":
    sys.exit(main()) 