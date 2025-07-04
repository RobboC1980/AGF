#!/usr/bin/env python3
"""
AgileForge Enterprise Backend Startup Script
Handles complex dependencies and maintains all advanced features
"""

import os
import sys
import subprocess
import signal
import time
from pathlib import Path
from dotenv import load_dotenv

# Colors for output
class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    PURPLE = '\033[95m'
    END = '\033[0m'
    BOLD = '\033[1m'

def print_banner():
    banner = f"""
{Colors.PURPLE}{Colors.BOLD}
╔══════════════════════════════════════════════════════════════════════════════════╗
║                                                                                  ║
║                    🚀 AgileForge Enterprise Backend v3.0                        ║
║                                                                                  ║
║         AI-Powered Project Management with Enterprise Architecture               ║
║                                                                                  ║
║  Features: OpenTelemetry • Redis Caching • Advanced Security • AI Services     ║
║           Rate Limiting • Circuit Breakers • Backup & Recovery • Monitoring     ║
║                                                                                  ║
╚══════════════════════════════════════════════════════════════════════════════════╝
{Colors.END}
"""
    print(banner)

def print_success(msg):
    print(f"{Colors.GREEN}✅ {msg}{Colors.END}")

def print_error(msg):
    print(f"{Colors.RED}❌ {msg}{Colors.END}")

def print_warning(msg):
    print(f"{Colors.YELLOW}⚠️  {msg}{Colors.END}")

def print_info(msg):
    print(f"{Colors.BLUE}ℹ️  {msg}{Colors.END}")

def print_step(msg):
    print(f"{Colors.PURPLE}{Colors.BOLD}🔧 {msg}{Colors.END}")

def check_dependencies():
    """Check if all enterprise dependencies are available"""
    print_step("Checking Enterprise Dependencies...")
    
    critical_deps = [
        'fastapi', 'uvicorn', 'supabase', 'openai', 'anthropic',
        'opentelemetry', 'prometheus_client', 'redis', 'structlog',
        'cryptography', 'jwt', 'asyncpg', 'psycopg2'
    ]
    
    missing_deps = []
    for dep in critical_deps:
        try:
            __import__(dep)
            print_success(f"{dep}")
        except ImportError:
            print_error(f"Missing: {dep}")
            missing_deps.append(dep)
    
    if missing_deps:
        print_error(f"\n🚨 Missing critical dependencies: {missing_deps}")
        print_info("Install with: pip install -r requirements.txt")
        return False
    
    print_success("All enterprise dependencies available!")
    return True

def check_environment():
    """Check if environment variables are set"""
    print_step("Checking Environment Configuration...")
    
    required_vars = [
        'SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_KEY',
        'CLERK_SECRET_KEY', 'OPENAI_API_KEY', 'ANTHROPIC_API_KEY'
    ]
    
    missing_vars = []
    for var in required_vars:
        if not os.getenv(var):
            missing_vars.append(var)
            print_warning(f"Missing: {var}")
        else:
            print_success(f"{var} (set)")
    
    if missing_vars:
        print_warning(f"\n⚠️  Missing environment variables: {missing_vars}")
        print_info("Some enterprise features may be disabled")
        print_info("Copy .env.template to .env and fill in your values")
        return False
    
    print_success("Environment configuration complete!")
    return True

def setup_paths():
    """Set up Python paths for proper imports"""
    print_step("Setting up Python paths...")
    
    # Get directories
    script_dir = Path(__file__).parent
    backend_dir = script_dir / 'backend'
    
    # Add to Python path
    sys.path.insert(0, str(script_dir))
    sys.path.insert(0, str(backend_dir))
    
    # Set environment variables
    os.environ['PYTHONPATH'] = f"{script_dir}:{backend_dir}:{os.environ.get('PYTHONPATH', '')}"
    
    print_success(f"Python paths configured")
    print_info(f"Project root: {script_dir}")
    print_info(f"Backend dir: {backend_dir}")
    
    return backend_dir

def test_backend_imports():
    """Test if backend can be imported successfully"""
    print_step("Testing Backend Import Chain...")
    
    try:
        # Change to backend directory
        backend_dir = Path(__file__).parent / 'backend'
        os.chdir(backend_dir)
        
        # Test main import
        print_info("Testing main.py import...")
        import main
        print_success("main.py imported successfully")
        
        # Test FastAPI app
        if hasattr(main, 'app'):
            print_success("FastAPI app object found")
            print_info(f"App title: {main.app.title}")
            print_info(f"App version: {main.app.version}")
            
            # Test health endpoint
            from fastapi.testclient import TestClient
            client = TestClient(main.app)
            response = client.get("/health")
            
            if response.status_code == 200:
                print_success("Health endpoint working")
                health_data = response.json()
                
                # Show enterprise features
                if 'features' in health_data:
                    print_info("Enterprise features status:")
                    for feature, enabled in health_data['features'].items():
                        status = "✅" if enabled else "❌"
                        print(f"  {status} {feature}")
                
                return True
            else:
                print_error(f"Health endpoint failed: {response.status_code}")
                return False
        else:
            print_error("FastAPI app not found in main.py")
            return False
            
    except Exception as e:
        print_error(f"Backend import failed: {e}")
        print_info("Running diagnostic script...")
        
        # Run diagnostic script
        diagnostic_script = Path(__file__).parent / 'backend' / 'diagnostic_startup.py'
        if diagnostic_script.exists():
            subprocess.run([sys.executable, str(diagnostic_script)])
        
        return False

def kill_existing_processes():
    """Kill any existing backend processes"""
    print_step("Cleaning up existing processes...")
    
    try:
        # Kill processes on port 8000
        result = subprocess.run(['lsof', '-ti:8000'], capture_output=True, text=True)
        if result.stdout.strip():
            pids = result.stdout.strip().split('\n')
            for pid in pids:
                try:
                    os.kill(int(pid), signal.SIGTERM)
                    print_success(f"Terminated process {pid}")
                except:
                    pass
        
        # Kill any uvicorn processes
        subprocess.run(['pkill', '-f', 'uvicorn'], capture_output=True)
        subprocess.run(['pkill', '-f', 'main:app'], capture_output=True)
        
        print_success("Existing processes cleaned up")
        
    except Exception as e:
        print_warning(f"Cleanup warning: {e}")

def start_enterprise_backend():
    """Start the enterprise backend with all features"""
    print_step("Starting Enterprise Backend...")
    
    # Change to backend directory
    backend_dir = Path(__file__).parent / 'backend'
    os.chdir(backend_dir)
    
    # Environment variables for enterprise features
    env_vars = {
        'ENVIRONMENT': 'development',
        'PYTHONPATH': f"{Path(__file__).parent}:{backend_dir}",
        'ENABLE_TELEMETRY': 'true',
        'ENABLE_METRICS': 'true',
        'LOG_LEVEL': 'INFO',
    }
    
    # Add existing environment variables
    for key, value in os.environ.items():
        env_vars[key] = value
    
    # Start command
    cmd = [
        sys.executable, '-m', 'uvicorn', 
        'main:app',
        '--host', '0.0.0.0',
        '--port', '8000',
        '--reload',
        '--reload-dir', str(backend_dir),
        '--log-level', 'info'
    ]
    
    print_info(f"Starting command: {' '.join(cmd)}")
    print_info("Enterprise backend starting with full features...")
    print_info("📖 API Documentation: http://localhost:8000/docs")
    print_info("🏥 Health Check: http://localhost:8000/health")
    print_info("📊 Metrics: http://localhost:8000/metrics")
    print_info("🔍 Search: http://localhost:8000/api/search")
    print_info("🤖 AI Features: http://localhost:8000/api/ai")
    print_info("📈 Analytics: http://localhost:8000/api/analytics")
    
    try:
        # Start the server
        process = subprocess.Popen(cmd, env=env_vars)
        
        # Give it time to start
        time.sleep(3)
        
        # Check if it's running
        if process.poll() is None:
            print_success("🎉 Enterprise Backend Started Successfully!")
            print_info("Press Ctrl+C to stop the server")
            
            # Wait for the process
            process.wait()
        else:
            print_error("Backend failed to start")
            return False
            
    except KeyboardInterrupt:
        print_info("\n🛑 Shutting down Enterprise Backend...")
        try:
            process.terminate()
            process.wait(timeout=5)
        except:
            process.kill()
        print_success("Backend stopped successfully")
        return True
    except Exception as e:
        print_error(f"Startup failed: {e}")
        return False

def main():
    """Main startup function"""
    print_banner()
    
    print_step("Initializing Enterprise Backend Startup...")
    
    # Load environment variables
    env_file = Path(__file__).parent / 'backend' / '.env'
    if env_file.exists():
        load_dotenv(env_file)
        print_success("Environment variables loaded")
    else:
        print_warning("No .env file found")
        print_info("Copy .env.template to backend/.env and configure")
    
    # Setup paths
    backend_dir = setup_paths()
    
    # Check dependencies
    if not check_dependencies():
        print_error("❌ Dependency check failed. Please install missing packages.")
        return False
    
    # Check environment
    env_ok = check_environment()
    if not env_ok:
        print_warning("⚠️  Environment check failed. Some features may be disabled.")
    
    # Clean up existing processes
    kill_existing_processes()
    
    # Test backend imports
    if not test_backend_imports():
        print_error("❌ Backend import test failed. Please check the diagnostic output above.")
        return False
    
    # Start the backend
    return start_enterprise_backend()

if __name__ == "__main__":
    try:
        success = main()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print_info("\n🛑 Startup interrupted by user")
        sys.exit(0)
    except Exception as e:
        print_error(f"Startup failed: {e}")
        sys.exit(1) 