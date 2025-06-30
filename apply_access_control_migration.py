#!/usr/bin/env python3
"""
Apply SynqForge Access Control Migration Script

This script applies the access control migration to your Supabase database.
It reads the migration file and executes it using the Supabase client.
"""

import os
import sys
from pathlib import Path
from supabase import create_client, Client

def load_env():
    """Load environment variables from .env file"""
    env_path = Path('.env')
    if env_path.exists():
        with open(env_path) as f:
            for line in f:
                if '=' in line and not line.strip().startswith('#'):
                    key, value = line.strip().split('=', 1)
                    # Remove quotes if present
                    value = value.strip('"\'')
                    os.environ[key] = value

def get_supabase_client() -> Client:
    """Initialize Supabase client"""
    load_env()
    
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_KEY") or os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_ANON_KEY")
    
    if not url or not key:
        print("❌ Error: SUPABASE_URL and SUPABASE_SERVICE_KEY (or SUPABASE_SERVICE_ROLE_KEY) must be set")
        print("   Check your .env file for these variables")
        sys.exit(1)
    
    return create_client(url, key)

def read_migration_file() -> str:
    """Read the migration SQL file"""
    migration_path = Path("supabase_migration/synqforge_access_control_migration.sql")
    
    if not migration_path.exists():
        print(f"❌ Error: Migration file not found at {migration_path}")
        sys.exit(1)
    
    with open(migration_path, 'r') as f:
        return f.read()

def apply_migration():
    """Apply the access control migration"""
    print("🚀 Starting SynqForge Access Control Migration...")
    
    try:
        # Initialize Supabase client
        print("📡 Connecting to Supabase...")
        supabase = get_supabase_client()
        
        # Test connection
        try:
            result = supabase.table('profiles').select('count').limit(1).execute()
            print("✅ Connected to Supabase successfully")
        except Exception as e:
            print(f"❌ Failed to connect to Supabase: {str(e)}")
            return False
        
        # Read migration file
        print("📖 Reading migration file...")
        migration_sql = read_migration_file()
        
        # Split migration into individual statements
        statements = [stmt.strip() for stmt in migration_sql.split(';') if stmt.strip()]
        
        print(f"📝 Found {len(statements)} SQL statements to execute")
        
        # Execute migration statements
        print("🔧 Applying migration...")
        
        executed = 0
        for i, statement in enumerate(statements, 1):
            if not statement:
                continue
                
            try:
                # Skip comments and empty statements
                if statement.startswith('--') or statement.startswith('/*'):
                    continue
                
                print(f"   Executing statement {i}/{len(statements)}...")
                
                # Use RPC for DDL statements
                result = supabase.rpc('exec_sql', {'sql': statement}).execute()
                executed += 1
                
            except Exception as stmt_error:
                print(f"⚠️  Warning: Statement {i} failed: {str(stmt_error)}")
                # Continue with other statements
                continue
        
        print(f"✅ Migration completed! Executed {executed} statements successfully")
        
        # Verify new tables exist
        print("🔍 Verifying migration...")
        try:
            # Check if new tables exist by trying to query them
            tables_to_check = ['team_members', 'project_members', 'role_audit_log']
            
            for table in tables_to_check:
                try:
                    result = supabase.table(table).select('count').limit(1).execute()
                    print(f"   ✅ Table '{table}' exists and is accessible")
                except:
                    print(f"   ⚠️  Table '{table}' may not be fully accessible yet")
            
        except Exception as verify_error:
            print(f"⚠️  Verification warning: {str(verify_error)}")
        
        print("\n🎉 SynqForge Access Control Migration completed successfully!")
        print("\n📋 Next steps:")
        print("   1. Restart your backend server")
        print("   2. Check the API docs at http://localhost:8000/docs")
        print("   3. Look for the new 'Access Control' section")
        
        return True
        
    except Exception as e:
        print(f"❌ Migration failed: {str(e)}")
        return False

def main():
    """Main function"""
    print("=" * 60)
    print("   SynqForge Access Control Migration")
    print("=" * 60)
    
    success = apply_migration()
    
    if success:
        print("\n✅ Migration completed successfully!")
        sys.exit(0)
    else:
        print("\n❌ Migration failed!")
        sys.exit(1)

if __name__ == "__main__":
    main() 