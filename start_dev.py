#!/usr/bin/env python3
"""
AgileForge Development Startup Script
Manages both backend and frontend with automatic port detection and cleanup
"""

import os
import sys
import subprocess
import signal
import time
import socket
import psutil
import logging
from pathlib import Path

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("AgileForge-Dev")

class DevManager:
    def __init__(self):
        self.processes = []
        self.backend_port = 8000
        self.frontend_port = 3000
        self.project_root = Path(__file__).parent
        
    def check_port(self, port):
        """Check if a port is available"""
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        result = sock.connect_ex(('127.0.0.1', port))
        sock.close()
        return result != 0
    
    def find_available_port(self, start_port, max_attempts=10):
        """Find an available port starting from start_port"""
        for i in range(max_attempts):
            port = start_port + i
            if self.check_port(port):
                return port
        raise RuntimeError(f"No available ports found starting from {start_port}")
    
    def kill_process_on_port(self, port):
        """Kill any process using the specified port"""
        try:
            for proc in psutil.process_iter(['pid', 'name']):
                try:
                    for conn in proc.connections():
                        if conn.laddr.port == port:
                            logger.info(f"Killing process {proc.info['name']} (PID: {proc.info['pid']}) on port {port}")
                            proc.terminate()
                            time.sleep(1)
                            if proc.is_running():
                                proc.kill()
                            return True
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    continue
        except Exception as e:
            logger.warning(f"Error killing process on port {port}: {e}")
        return False
    
    def cleanup_existing_processes(self):
        """Clean up any existing AgileForge processes"""
        logger.info("Cleaning up existing processes...")
        
        # Kill processes by name
        process_names = ["uvicorn", "node", "next-server"]
        for proc in psutil.process_iter(['pid', 'name', 'cmdline']):
            try:
                cmdline = ' '.join(proc.info.get('cmdline', []))
                if any(name in proc.info['name'] for name in process_names):
                    if 'AgileForge' in cmdline or 'production_backend' in cmdline or 'next dev' in cmdline:
                        logger.info(f"Terminating {proc.info['name']} (PID: {proc.info['pid']})")
                        proc.terminate()
                        time.sleep(0.5)
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                continue
        
        # Clean up specific ports
        time.sleep(2)
        self.kill_process_on_port(self.backend_port)
        self.kill_process_on_port(self.frontend_port)
    
    def validate_environment(self):
        """Validate that all required environment variables are set"""
        logger.info("Validating environment...")
        
        required_vars = [
            "SUPABASE_URL",
            "SUPABASE_SERVICE_KEY",
            "SUPABASE_JWT_SECRET",
            "OPENAI_API_KEY",
            "ANTHROPIC_API_KEY"
        ]
        
        missing_vars = []
        for var in required_vars:
            if not os.getenv(var):
                missing_vars.append(var)
        
        if missing_vars:
            logger.warning(f"Missing environment variables: {', '.join(missing_vars)}")
            logger.warning("Some features may not work properly. Check your .env file.")
        else:
            logger.info("✅ All required environment variables are set")
    
    def check_dependencies(self):
        """Check if all dependencies are installed"""
        logger.info("Checking dependencies...")
        
        # Check Python dependencies
        try:
            import fastapi
            import uvicorn
            import supabase
            logger.info("✅ Python dependencies installed")
        except ImportError as e:
            logger.error(f"❌ Missing Python dependency: {e}")
            logger.info("Run: pip install -r requirements.txt")
            return False
        
        # Check Node.js
        try:
            result = subprocess.run(["node", "--version"], capture_output=True, text=True)
            if result.returncode == 0:
                logger.info(f"✅ Node.js installed: {result.stdout.strip()}")
            else:
                raise Exception("Node.js not found")
        except Exception:
            logger.error("❌ Node.js not installed")
            return False
        
        # Check npm packages
        if not (self.project_root / "node_modules").exists():
            logger.warning("⚠️  Node modules not installed. Installing...")
            subprocess.run(["npm", "install"], cwd=self.project_root)
        
        return True
    
    def start_backend(self):
        """Start the backend server"""
        # Find available port
        if not self.check_port(self.backend_port):
            logger.warning(f"Port {self.backend_port} is in use")
            self.kill_process_on_port(self.backend_port)
            time.sleep(2)
        
        logger.info(f"Starting backend on port {self.backend_port}...")
        
        cmd = [
            sys.executable,
            "-m",
            "uvicorn",
            "production_backend:app",
            "--host", "0.0.0.0",
            "--port", str(self.backend_port),
            "--reload",
            "--log-level", "info"
        ]
        
        process = subprocess.Popen(
            cmd,
            cwd=self.project_root,
            env={**os.environ, "ENVIRONMENT": "development"}
        )
        self.processes.append(process)
        
        # Wait for backend to start
        for i in range(30):
            if not self.check_port(self.backend_port):
                logger.info("✅ Backend started successfully")
                return True
            time.sleep(1)
        
        logger.error("❌ Backend failed to start")
        return False
    
    def start_frontend(self):
        """Start the frontend server"""
        # Find available port
        if not self.check_port(self.frontend_port):
            logger.warning(f"Port {self.frontend_port} is in use")
            self.frontend_port = self.find_available_port(self.frontend_port)
            logger.info(f"Using alternative port: {self.frontend_port}")
        
        logger.info(f"Starting frontend on port {self.frontend_port}...")
        
        env = {
            **os.environ,
            "PORT": str(self.frontend_port),
            "NEXT_PUBLIC_API_URL": f"http://localhost:{self.backend_port}"
        }
        
        process = subprocess.Popen(
            ["npm", "run", "dev"],
            cwd=self.project_root,
            env=env
        )
        self.processes.append(process)
        
        logger.info("✅ Frontend started successfully")
        return True
    
    def signal_handler(self, signum, frame):
        """Handle shutdown signals"""
        logger.info("\n🛑 Shutting down AgileForge...")
        for process in self.processes:
            try:
                process.terminate()
                process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                process.kill()
        logger.info("✅ Shutdown complete")
        sys.exit(0)
    
    def run(self):
        """Main run method"""
        # Set up signal handlers
        signal.signal(signal.SIGINT, self.signal_handler)
        signal.signal(signal.SIGTERM, self.signal_handler)
        
        logger.info("🚀 Starting AgileForge Development Environment")
        logger.info("=" * 50)
        
        # Validate environment
        self.validate_environment()
        
        # Check dependencies
        if not self.check_dependencies():
            logger.error("❌ Dependency check failed. Please install missing dependencies.")
            return
        
        # Clean up existing processes
        self.cleanup_existing_processes()
        
        # Start services
        if not self.start_backend():
            logger.error("❌ Failed to start backend")
            return
        
        time.sleep(3)  # Give backend time to fully initialize
        
        if not self.start_frontend():
            logger.error("❌ Failed to start frontend")
            return
        
        logger.info("=" * 50)
        logger.info("✅ AgileForge is running!")
        logger.info(f"🔗 Backend:  http://localhost:{self.backend_port}")
        logger.info(f"🔗 Frontend: http://localhost:{self.frontend_port}")
        logger.info(f"📚 API Docs: http://localhost:{self.backend_port}/docs")
        logger.info("=" * 50)
        logger.info("Press Ctrl+C to stop all services")
        
        # Keep running
        try:
            while True:
                time.sleep(1)
                # Check if processes are still running
                for process in self.processes:
                    if process.poll() is not None:
                        logger.error(f"Process {process.pid} has stopped unexpectedly")
                        self.signal_handler(None, None)
        except KeyboardInterrupt:
            self.signal_handler(None, None)

if __name__ == "__main__":
    # Check if psutil is installed
    try:
        import psutil
    except ImportError:
        print("Installing required package: psutil")
        subprocess.run([sys.executable, "-m", "pip", "install", "psutil"])
        import psutil
    
    manager = DevManager()
    manager.run() 