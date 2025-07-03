#!/usr/bin/env python3
"""
Script to fix relative imports in the backend API files
"""

import os
import re

def fix_imports_in_file(file_path):
    """Fix relative imports in a single file"""
    try:
        with open(file_path, 'r') as f:
            content = f.read()
        
        original_content = content
        
        # Fix common relative import patterns
        patterns = [
            (r'from \.\.services\.', 'from services.'),
            (r'from \.\.auth\.', 'from auth.'),
            (r'from \.\.database\.', 'from database.'),
            (r'from \.\.middleware\.', 'from middleware.'),
            (r'from \.\.models\.', 'from models.'),
            (r'from \.\.security\.', 'from security.'),
            (r'from \.\.backup\.', 'from backup.'),
            (r'from \.\.api\.', 'from api.'),
            # Fix imports within services
            (r'from ai_service import', 'from services.ai_service import'),
        ]
        
        for pattern, replacement in patterns:
            content = re.sub(pattern, replacement, content)
        
        # Only write if content changed
        if content != original_content:
            with open(file_path, 'w') as f:
                f.write(content)
            print(f"✅ Fixed imports in {file_path}")
            return True
        else:
            print(f"ℹ️  No changes needed in {file_path}")
            return False
            
    except Exception as e:
        print(f"❌ Error fixing {file_path}: {e}")
        return False

def fix_directory_imports(directory):
    """Fix imports in all Python files in a directory"""
    fixed_count = 0
    total_count = 0
    
    if not os.path.exists(directory):
        print(f"⚠️  Directory not found: {directory}")
        return 0, 0
    
    for filename in os.listdir(directory):
        if filename.endswith('.py') and filename != '__init__.py':
            file_path = os.path.join(directory, filename)
            total_count += 1
            if fix_imports_in_file(file_path):
                fixed_count += 1
    
    return fixed_count, total_count

def main():
    """Main function to fix imports in all backend files"""
    backend_dir = "backend"
    
    print("🔧 Fixing relative imports in backend files...")
    
    # Directories to fix
    directories = [
        os.path.join(backend_dir, "api"),
        os.path.join(backend_dir, "services"),
        os.path.join(backend_dir, "auth"),
        os.path.join(backend_dir, "middleware"),
        os.path.join(backend_dir, "database"),
        os.path.join(backend_dir, "models"),
        os.path.join(backend_dir, "security"),
        os.path.join(backend_dir, "backup"),
    ]
    
    total_fixed = 0
    total_files = 0
    
    for directory in directories:
        print(f"\n📁 Processing {directory}...")
        fixed, total = fix_directory_imports(directory)
        total_fixed += fixed
        total_files += total
        print(f"   Fixed {fixed}/{total} files")
    
    print(f"\n📊 Overall Summary: Fixed imports in {total_fixed}/{total_files} files")

if __name__ == "__main__":
    main() 