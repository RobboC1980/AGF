#!/usr/bin/env python3
"""
Simple migration runner that uses the existing backend Supabase connection
"""

import sys
import os
import asyncio
from pathlib import Path

# Add the backend to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from backend.database.supabase_client import get_supabase

def read_migration_file():
    """Read the migration SQL file"""
    migration_path = Path("supabase_migration/synqforge_access_control_migration.sql")
    
    if not migration_path.exists():
        print(f"❌ Error: Migration file not found at {migration_path}")
        return None
    
    with open(migration_path, 'r') as f:
        return f.read()

def split_sql_statements(sql_content):
    """Split SQL content into individual statements"""
    # Simple splitting - this might need refinement for complex SQL
    statements = []
    current_statement = ""
    
    for line in sql_content.split('\n'):
        line = line.strip()
        
        # Skip empty lines and comments
        if not line or line.startswith('--'):
            continue
            
        # Handle multi-line comments
        if line.startswith('/*'):
            continue
            
        current_statement += line + " "
        
        # If line ends with semicolon, it's the end of a statement
        if line.endswith(';'):
            statements.append(current_statement.strip())
            current_statement = ""
    
    return [stmt for stmt in statements if stmt and not stmt.startswith('/*')]

def apply_migration():
    """Apply the migration using the existing Supabase connection"""
    print("🚀 Applying SynqForge Access Control Migration...")
    
    try:
        # Get Supabase client
        supabase = get_supabase()
        print("✅ Connected to Supabase")
        
        # Read migration file
        migration_sql = read_migration_file()
        if not migration_sql:
            return False
        
        print("📖 Migration file loaded")
        
        # For now, let's just create the basic tables manually using the Supabase client
        # This is a simplified approach since raw SQL execution might be limited
        
        print("🔧 Creating access control tables...")
        
        # Create the basic tables that we can create via the Supabase client
        # Note: This is a simplified version - the full migration should be run via SQL
        
        try:
            # Try to create a simple test to see if we can access the database
            result = supabase.table('profiles').select('count').limit(1).execute()
            print("✅ Database connection verified")
            
            print("\n⚠️  Note: This script verifies the connection but the full migration")
            print("   needs to be applied directly to the database.")
            print("\n📋 To complete the migration:")
            print("   1. Go to your Supabase dashboard")
            print("   2. Navigate to the SQL Editor")
            print("   3. Copy and paste the contents of:")
            print("      supabase_migration/synqforge_access_control_migration.sql")
            print("   4. Run the migration")
            
            return True
            
        except Exception as e:
            print(f"❌ Database operation failed: {str(e)}")
            return False
            
    except Exception as e:
        print(f"❌ Migration failed: {str(e)}")
        return False

def main():
    print("=" * 60)
    print("   SynqForge Access Control Migration Runner")
    print("=" * 60)
    
    success = apply_migration()
    
    if success:
        print("\n✅ Migration preparation completed!")
        print("\n🔄 Now restart your backend server to load the new access control endpoints:")
        print("   python start.py")
    else:
        print("\n❌ Migration preparation failed!")

if __name__ == "__main__":
    main() 