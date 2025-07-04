#!/usr/bin/env python3
"""
AgileForge Backend Startup Script
Fixes import path issues and starts the FastAPI server
"""

import os
import sys
import subprocess
from pathlib import Path

def main():
    # Get the project root directory
    project_root = Path(__file__).parent
    os.chdir(project_root)
    
    # Add project root to Python path
    sys.path.insert(0, str(project_root))
    
    # Set environment variables
    os.environ.setdefault('PYTHONPATH', str(project_root))
    os.environ.setdefault('ENVIRONMENT', 'development')
    
    # Change to backend directory
    backend_dir = project_root / 'backend'
    os.chdir(backend_dir)
    
    # Start uvicorn with proper module path
    cmd = [
        sys.executable, 
        '-m', 'uvicorn', 
        'main:app', 
        '--host', '0.0.0.0', 
        '--port', '8000', 
        '--reload',
        '--reload-dir', str(backend_dir)
    ]
    
    print(f"Starting backend from: {backend_dir}")
    print(f"Command: {' '.join(cmd)}")
    
    # Start the server
    try:
        subprocess.run(cmd, check=True)
    except KeyboardInterrupt:
        print("\nShutting down backend server...")
    except subprocess.CalledProcessError as e:
        print(f"Backend startup failed: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main() 