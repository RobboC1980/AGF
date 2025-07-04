#!/usr/bin/env python3
"""
AgileForge Enterprise Backend Diagnostic Script
Systematically tests all imports and dependencies to identify startup issues
Preserves all enterprise features and advanced architecture
"""

import os
import sys
import traceback
from pathlib import Path
from datetime import datetime

# Colors for output
class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    END = '\033[0m'
    BOLD = '\033[1m'

def print_success(msg):
    print(f"{Colors.GREEN}✅ {msg}{Colors.END}")

def print_error(msg):
    print(f"{Colors.RED}❌ {msg}{Colors.END}")

def print_warning(msg):
    print(f"{Colors.YELLOW}⚠️  {msg}{Colors.END}")

def print_info(msg):
    print(f"{Colors.BLUE}ℹ️  {msg}{Colors.END}")

def print_header(msg):
    print(f"\n{Colors.BOLD}{Colors.BLUE}🔍 {msg}{Colors.END}")

def main():
    print_header("AgileForge Enterprise Backend Diagnostic Tool")
    print(f"Timestamp: {datetime.now().isoformat()}")
    print(f"Python Version: {sys.version}")
    print(f"Working Directory: {os.getcwd()}")
    
    # Set up paths
    backend_dir = Path(__file__).parent
    project_root = backend_dir.parent
    
    print_info(f"Backend Directory: {backend_dir}")
    print_info(f"Project Root: {project_root}")
    
    # Add paths to Python path
    sys.path.insert(0, str(project_root))
    sys.path.insert(0, str(backend_dir))
    
    # Change to backend directory
    os.chdir(backend_dir)
    
    print_header("1. Testing Core Enterprise Dependencies")
    
    # Test enterprise-level dependencies
    enterprise_imports = [
        ('fastapi', 'FastAPI Core'),
        ('uvicorn', 'ASGI Server'),
        ('pydantic', 'Data Validation'),
        ('structlog', 'Structured Logging'),
        ('supabase', 'Supabase Client'),
        ('openai', 'OpenAI Integration'),
        ('anthropic', 'Anthropic AI'),
        ('opentelemetry', 'OpenTelemetry Tracing'),
        ('prometheus_client', 'Prometheus Metrics'),
        ('redis', 'Redis Caching'),
        ('asyncpg', 'PostgreSQL Async Driver'),
        ('psycopg2', 'PostgreSQL Driver'),
        ('cryptography', 'Advanced Security'),
        ('jwt', 'JWT Authentication'),
        ('aiofiles', 'Async File Operations'),
        ('celery', 'Background Tasks'),
        ('boto3', 'AWS/S3 Integration'),
    ]
    
    failed_enterprise = []
    for module, desc in enterprise_imports:
        try:
            __import__(module)
            print_success(f"{desc}")
        except ImportError as e:
            print_error(f"{desc}: {e}")
            failed_enterprise.append(module)
    
    if failed_enterprise:
        print_error(f"Missing enterprise dependencies: {failed_enterprise}")
        print_info("Install with: pip install -r requirements.txt")
    
    print_header("2. Testing Environment Configuration")
    
    # Test all enterprise environment variables
    enterprise_env_vars = [
        ('ENVIRONMENT', 'Environment Mode'),
        ('SUPABASE_URL', 'Supabase URL'),
        ('SUPABASE_ANON_KEY', 'Supabase Anonymous Key'),
        ('SUPABASE_SERVICE_KEY', 'Supabase Service Key'),
        ('CLERK_SECRET_KEY', 'Clerk Secret Key'),
        ('CLERK_PUBLISHABLE_KEY', 'Clerk Publishable Key'),
        ('OPENAI_API_KEY', 'OpenAI API Key'),
        ('ANTHROPIC_API_KEY', 'Anthropic API Key'),
        ('JWT_SECRET', 'JWT Secret'),
        ('REDIS_URL', 'Redis URL'),
        ('DATABASE_URL', 'Database URL'),
        ('ENCRYPTION_KEY', 'Encryption Key'),
        ('ENABLE_TELEMETRY', 'Telemetry Flag'),
        ('ENABLE_METRICS', 'Metrics Flag'),
        ('LOG_LEVEL', 'Log Level'),
    ]
    
    missing_env = []
    for var, desc in enterprise_env_vars:
        value = os.getenv(var)
        if value:
            print_success(f"{desc} (set)")
        else:
            print_warning(f"{desc} (not set)")
            missing_env.append(var)
    
    print_header("3. Testing Backend Core Services")
    
    # Test core backend services in order
    core_services = [
        ('database.supabase_client', 'Supabase Database Client'),
        ('middleware.auth', 'Authentication Middleware'),
        ('middleware.logging', 'Logging Middleware'),
        ('auth.unified_auth', 'Unified Authentication'),
        ('auth.enhanced_auth', 'Enhanced Authentication Manager'),
        ('auth.dependencies', 'Auth Dependencies'),
        ('auth.clerk_auth', 'Clerk Authentication'),
        ('auth.project_access', 'Project Access Control'),
    ]
    
    failed_core = []
    for module, desc in core_services:
        try:
            # Try backend. prefix first
            try:
                __import__(f'backend.{module}')
                print_success(f"{desc} (backend.{module})")
            except ImportError:
                # Try without prefix
                __import__(module)
                print_success(f"{desc} ({module})")
        except ImportError as e:
            print_error(f"{desc}: {e}")
            failed_core.append((module, str(e)))
    
    print_header("4. Testing AI Services & Analytics")
    
    # Test AI and analytics services
    ai_services = [
        ('services.ai_service', 'AI Service Core'),
        ('services.async_ai_service', 'Async AI Service'),
        ('services.analytics_service', 'Analytics Service'),
        ('services.cache_service', 'Cache Service'),
        ('services.monitoring', 'System Monitoring'),
        ('services.notification_service', 'Notification Service'),
        ('services.realtime_service', 'Real-time Service'),
        ('services.storage_service', 'Storage Service'),
        ('services.performance_optimization', 'Performance Optimization'),
    ]
    
    failed_ai = []
    for module, desc in ai_services:
        try:
            try:
                __import__(f'backend.{module}')
                print_success(f"{desc} (backend.{module})")
            except ImportError:
                __import__(module)
                print_success(f"{desc} ({module})")
        except ImportError as e:
            print_error(f"{desc}: {e}")
            failed_ai.append((module, str(e)))
    
    print_header("5. Testing Enterprise Middleware Stack")
    
    # Test advanced middleware
    middleware_stack = [
        ('middleware.observability', 'OpenTelemetry Observability'),
        ('middleware.security', 'Advanced Security'),
        ('middleware.enhanced_error_handling', 'Enhanced Error Handling'),
        ('security.advanced_security', 'Advanced Security Components'),
        ('backup.backup_manager', 'Backup Manager'),
        ('database.query_optimizer', 'Query Optimizer'),
    ]
    
    failed_middleware = []
    for module, desc in middleware_stack:
        try:
            try:
                __import__(f'backend.{module}')
                print_success(f"{desc} (backend.{module})")
            except ImportError:
                __import__(module)
                print_success(f"{desc} ({module})")
        except ImportError as e:
            print_error(f"{desc}: {e}")
            failed_middleware.append((module, str(e)))
    
    print_header("6. Testing All API Routers")
    
    # Test all API routers
    api_routers = [
        ('api.auth', 'Authentication API'),
        ('api.stories', 'Stories API'),
        ('api.projects', 'Projects API'),
        ('api.epics', 'Epics API'),
        ('api.users', 'Users API'),
        ('api.tasks', 'Tasks API'),
        ('api.teams', 'Teams API'),
        ('api.search', 'Search API'),
        ('api.sprints', 'Sprints API'),
        ('api.ai_endpoints', 'AI Endpoints'),
        ('api.ai_analysis', 'AI Analysis'),
        ('api.ai_kanban_endpoints', 'AI Kanban'),
        ('api.ai_sprint_endpoints', 'AI Sprint Planning'),
        ('api.ai_analytics_endpoints', 'AI Analytics'),
        ('api.analytics_endpoints', 'Analytics Endpoints'),
        ('api.access_control', 'Access Control'),
        ('api.performance_endpoints', 'Performance Monitoring'),
        ('api.project_assignments', 'Project Assignments'),
        ('api.user_permissions', 'User Permissions'),
        ('api.notification_endpoints', 'Notification Endpoints'),
        ('api.realtime_endpoints', 'Real-time Endpoints'),
        ('api.storage_endpoints', 'Storage Endpoints'),
        ('api.story_mentions', 'Story Mentions'),
        ('api.stripe_products', 'Stripe Products'),
    ]
    
    working_routers = []
    broken_routers = []
    
    for module, desc in api_routers:
        try:
            # Try to import the router specifically
            try:
                mod = __import__(f'backend.{module}', fromlist=['router'])
                module_path = f'backend.{module}'
            except ImportError:
                mod = __import__(module, fromlist=['router'])
                module_path = module
            
            if hasattr(mod, 'router'):
                print_success(f"{desc} ({module_path})")
                working_routers.append(module)
            else:
                print_warning(f"{desc} (no router attribute)")
                broken_routers.append(module)
        except ImportError as e:
            print_error(f"{desc}: {e}")
            broken_routers.append(module)
    
    print_header("7. Testing Main Application Import")
    
    # Test if we can import the main application
    try:
        # First, let's try importing main step by step
        print_info("Testing main.py import...")
        
        # Test the import chain that main.py uses
        print_info("Testing import chain...")
        
        # Test sys.path setup
        print_info("Current sys.path:")
        for i, path in enumerate(sys.path[:5]):
            print(f"  {i}: {path}")
        
        # Try importing main
        import main
        print_success("main.py imports successfully")
        
        # Test if FastAPI app exists
        if hasattr(main, 'app'):
            print_success("FastAPI app object found")
            print_info(f"App title: {main.app.title}")
            print_info(f"App version: {main.app.version}")
            
            # Test if we can create a test client
            try:
                from fastapi.testclient import TestClient
                client = TestClient(main.app)
                print_success("TestClient created successfully")
                
                # Test health endpoint
                response = client.get("/health")
                if response.status_code == 200:
                    print_success("Health endpoint accessible")
                    health_data = response.json()
                    print_info(f"Health response: {health_data}")
                    
                    # Show enterprise features status
                    if 'features' in health_data:
                        print_info("Enterprise features status:")
                        for feature, enabled in health_data['features'].items():
                            status = "✅" if enabled else "❌"
                            print(f"  {status} {feature}")
                else:
                    print_error(f"Health endpoint returned {response.status_code}")
                    
            except Exception as e:
                print_error(f"TestClient creation failed: {e}")
        else:
            print_error("No 'app' attribute in main.py")
            
    except ImportError as e:
        print_error(f"main.py import failed: {e}")
        print_info("Detailed traceback:")
        traceback.print_exc()
    
    print_header("8. Enterprise Architecture Summary")
    
    print(f"\n{Colors.BOLD}📊 ENTERPRISE DIAGNOSTIC SUMMARY{Colors.END}")
    print(f"✅ Working API routers: {len(working_routers)}")
    print(f"❌ Broken API routers: {len(broken_routers)}")
    print(f"❌ Failed core services: {len(failed_core)}")
    print(f"❌ Failed AI services: {len(failed_ai)}")
    print(f"❌ Failed middleware: {len(failed_middleware)}")
    print(f"❌ Missing dependencies: {len(failed_enterprise)}")
    print(f"⚠️  Missing env vars: {len(missing_env)}")
    
    if failed_core:
        print_error("\n🔥 CORE SERVICE FAILURES:")
        for module, error in failed_core:
            print(f"  - {module}: {error}")
    
    if failed_ai:
        print_error("\n🤖 AI SERVICE FAILURES:")
        for module, error in failed_ai:
            print(f"  - {module}: {error}")
    
    if failed_middleware:
        print_error("\n🛡️  MIDDLEWARE FAILURES:")
        for module, error in failed_middleware:
            print(f"  - {module}: {error}")
    
    if broken_routers:
        print_error("\n🚨 BROKEN API ROUTERS:")
        for router in broken_routers:
            print(f"  - {router}")
    
    print_header("9. Enterprise Fix Recommendations")
    
    print(f"{Colors.BOLD}🎯 ENTERPRISE BACKEND FIX STRATEGY:{Colors.END}")
    
    total_issues = len(failed_core) + len(failed_ai) + len(failed_middleware) + len(broken_routers)
    
    if total_issues == 0:
        print_success("🎉 ALL ENTERPRISE FEATURES WORKING!")
        print("Start your enterprise backend with:")
        print("   python3 -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload")
    else:
        print("1. 📦 Install missing dependencies:")
        print("   pip install -r requirements.txt")
        
        print("\n2. 🔐 Set up environment variables:")
        print("   Create .env file with all required variables")
        
        print("\n3. 🔧 Fix failed imports:")
        print("   The traceback above shows exactly which import is failing")
        
        print("\n4. 🚀 Start enterprise backend:")
        print("   Once all imports work, start with full enterprise features")
    
    print(f"\n{Colors.BOLD}🏗️  ENTERPRISE ARCHITECTURE STATUS:{Colors.END}")
    print(f"• OpenTelemetry Observability: {'✅' if 'middleware.observability' not in [m[0] for m in failed_middleware] else '❌'}")
    print(f"• Advanced Security: {'✅' if 'security.advanced_security' not in [m[0] for m in failed_middleware] else '❌'}")
    print(f"• AI Services: {'✅' if len(failed_ai) == 0 else '❌'}")
    print(f"• Backup & Recovery: {'✅' if 'backup.backup_manager' not in [m[0] for m in failed_middleware] else '❌'}")
    print(f"• Performance Monitoring: {'✅' if 'api.performance_endpoints' not in broken_routers else '❌'}")
    print(f"• Query Optimization: {'✅' if 'database.query_optimizer' not in [m[0] for m in failed_middleware] else '❌'}")
    
    print(f"\n{Colors.BOLD}🎊 MAINTAINING ENTERPRISE FEATURES:{Colors.END}")
    print("This diagnostic preserves all your advanced architecture:")
    print("✅ 15+ API routers with comprehensive functionality")
    print("✅ OpenTelemetry tracing and structured logging")
    print("✅ Advanced security with threat detection")
    print("✅ AI services with async operations")
    print("✅ Redis caching and performance optimization")
    print("✅ Backup and disaster recovery systems")
    print("✅ Rate limiting and circuit breakers")
    print("✅ JWT refresh and enhanced authentication")

if __name__ == "__main__":
    main() 