#!/usr/bin/env python3
"""
AgileForge Production Startup Script
Simple script to start the production backend
"""

import subprocess
import sys
import os

def main():
    """Start the AgileForge production backend"""
    print("🚀 Starting AgileForge Production Backend...")
    print("📧 Use credentials: newuser@agileforge.com / demo123")
    print("🌐 Frontend: http://localhost:3000")
    print("🔗 Backend API: http://localhost:8000")
    print("📚 API Docs: http://localhost:8000/docs")
    print("-" * 50)
    
    try:
        # Start the production backend
        subprocess.run([sys.executable, "start_production.py"], check=True)
    except KeyboardInterrupt:
        print("\n👋 Shutting down AgileForge...")
    except Exception as e:
        print(f"❌ Error starting backend: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main() 