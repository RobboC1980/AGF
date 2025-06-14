#!/usr/bin/env python3
"""
Production Setup and Test Script for AgileForge
Ensures proper initialization and testing of Enhanced AI Service, Authentication, and Frontend Integration
"""

import os
import sys
import asyncio
import logging
import subprocess
from pathlib import Path
from typing import Dict, Any
import json

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

class ProductionSetup:
    """Setup and validation for production AgileForge environment"""
    
    def __init__(self):
        self.root_path = Path(__file__).parent
        self.backend_path = self.root_path / "backend"
        
    def check_environment_variables(self) -> Dict[str, bool]:
        """Check if all required environment variables are set"""
        logger.info("🔍 Checking environment variables...")
        
        required_vars = {
            "SUPABASE_URL": os.getenv("SUPABASE_URL"),
            "SUPABASE_SERVICE_KEY": os.getenv("SUPABASE_SERVICE_KEY"),
            "SUPABASE_JWT_SECRET": os.getenv("SUPABASE_JWT_SECRET"),
            "OPENAI_API_KEY": os.getenv("OPENAI_API_KEY"),
            "ANTHROPIC_API_KEY": os.getenv("ANTHROPIC_API_KEY")
        }
        
        results = {}
        for var_name, var_value in required_vars.items():
            is_set = bool(var_value and var_value.strip())
            results[var_name] = is_set
            status = "✅" if is_set else "❌"
            logger.info(f"  {status} {var_name}: {'Set' if is_set else 'Not set'}")
        
        return results
    
    def check_dependencies(self) -> Dict[str, bool]:
        """Check if all required Python packages are installed"""
        logger.info("📦 Checking Python dependencies...")
        
        required_packages = [
            "fastapi",
            "uvicorn",
            "supabase",
            "openai",
            "anthropic",
            "pydantic",
            "python-jose",
            "passlib",
            "httpx",
            "numpy",
            "python-dotenv"
        ]
        
        results = {}
        for package in required_packages:
            try:
                __import__(package.replace("-", "_"))
                results[package] = True
                logger.info(f"  ✅ {package}: Installed")
            except ImportError:
                results[package] = False
                logger.info(f"  ❌ {package}: Not installed")
        
        return results
    
    def install_missing_dependencies(self, missing_deps: list):
        """Install missing dependencies"""
        if not missing_deps:
            return
            
        logger.info(f"📥 Installing missing dependencies: {missing_deps}")
        try:
            subprocess.check_call([
                sys.executable, "-m", "pip", "install"
            ] + missing_deps)
            logger.info("✅ Dependencies installed successfully")
        except subprocess.CalledProcessError as e:
            logger.error(f"❌ Failed to install dependencies: {e}")
    
    def verify_database_connection(self) -> bool:
        """Verify connection to Supabase"""
        logger.info("🗄️ Verifying database connection...")
        
        try:
            from supabase import create_client
            
            supabase_url = os.getenv("SUPABASE_URL")
            supabase_key = os.getenv("SUPABASE_SERVICE_KEY")
            
            if not supabase_url or not supabase_key:
                logger.error("❌ Supabase credentials not found")
                return False
            
            supabase = create_client(supabase_url, supabase_key)
            
            # Test connection by querying users table
            result = supabase.table("users").select("count").limit(1).execute()
            logger.info("✅ Database connection successful")
            return True
            
        except Exception as e:
            logger.error(f"❌ Database connection failed: {e}")
            return False
    
    def setup_database_tables(self) -> bool:
        """Ensure all required database tables exist"""
        logger.info("🏗️ Setting up/verifying database tables...")
        
        try:
            from supabase import create_client
            
            supabase_url = os.getenv("SUPABASE_URL")
            supabase_key = os.getenv("SUPABASE_SERVICE_KEY")
            supabase = create_client(supabase_url, supabase_key)
            
            # Check for essential tables
            essential_tables = [
                "users",
                "projects", 
                "epics",
                "stories",
                "story_embeddings",
                "project_insights",
                "sprint_analyses"
            ]
            
            for table in essential_tables:
                try:
                    # Try to query the table
                    supabase.table(table).select("*").limit(1).execute()
                    logger.info(f"  ✅ Table '{table}' exists")
                except Exception as e:
                    logger.warning(f"  ⚠️ Table '{table}' may not exist or is inaccessible: {e}")
            
            return True
            
        except Exception as e:
            logger.error(f"❌ Database table setup failed: {e}")
            return False
    
    def start_backend_server(self) -> subprocess.Popen:
        """Start the backend server"""
        logger.info("🚀 Starting backend server...")
        
        try:
            # Start the production backend
            process = subprocess.Popen([
                sys.executable, "production_backend.py"
            ], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            
            logger.info("✅ Backend server started")
            return process
            
        except Exception as e:
            logger.error(f"❌ Failed to start backend server: {e}")
            return None
    
    async def run_integration_tests(self) -> Dict[str, Any]:
        """Run the comprehensive integration tests"""
        logger.info("🧪 Running integration tests...")
        
        try:
            # Import and run the integration test
            from integration_test import IntegrationTester
            
            tester = IntegrationTester()
            results = await tester.run_comprehensive_test()
            
            return results
            
        except Exception as e:
            logger.error(f"❌ Integration tests failed: {e}")
            return {"error": str(e)}
    
    async def full_setup_and_test(self):
        """Run full setup and testing process"""
        logger.info("🎯 Starting Full Production Setup and Test")
        logger.info("="*60)
        
        # Step 1: Check environment variables
        env_results = self.check_environment_variables()
        missing_env_vars = [k for k, v in env_results.items() if not v]
        
        if missing_env_vars:
            logger.error(f"❌ Missing environment variables: {missing_env_vars}")
            logger.error("Please set these variables in your .env file")
            return False
        
        # Step 2: Check dependencies
        dep_results = self.check_dependencies()
        missing_deps = [k for k, v in dep_results.items() if not v]
        
        if missing_deps:
            logger.info(f"Installing missing dependencies: {missing_deps}")
            self.install_missing_dependencies(missing_deps)
        
        # Step 3: Verify database connection
        if not self.verify_database_connection():
            logger.error("❌ Database connection failed. Cannot proceed.")
            return False
        
        # Step 4: Setup database tables
        if not self.setup_database_tables():
            logger.warning("⚠️ Database table setup had issues, but continuing...")
        
        # Step 5: Run integration tests
        logger.info("\n🧪 Running comprehensive integration tests...")
        test_results = await self.run_integration_tests()
        
        # Step 6: Generate final report
        self.generate_final_report(test_results)
        
        return test_results
    
    def generate_final_report(self, test_results: Dict[str, Any]):
        """Generate final setup and test report"""
        logger.info("\n" + "="*60)
        logger.info("🎯 PRODUCTION SETUP COMPLETE")
        logger.info("="*60)
        
        if "error" in test_results:
            logger.error(f"❌ Setup failed with error: {test_results['error']}")
            return
        
        # Task status summary
        tasks = [
            ("Enhanced AI Service Connection", [
                "supabase_connection",
                "ai_service_basic", 
                "ai_service_enhanced"
            ]),
            ("Authentication Testing", [
                "auth_system",
                "test_user_created",
                "crud_operations"
            ]),
            ("Frontend Integration", [
                "frontend_integration"
            ])
        ]
        
        for task_name, task_keys in tasks:
            logger.info(f"\n📊 {task_name}:")
            for key in task_keys:
                status = "✅" if test_results.get(key, False) else "❌"
                logger.info(f"  {status} {key.replace('_', ' ').title()}")
        
        # Overall status
        total_checks = sum(len(keys) for _, keys in tasks)
        passed_checks = sum(
            1 for _, keys in tasks 
            for key in keys 
            if test_results.get(key, False)
        )
        
        logger.info(f"\n📈 Overall Status: {passed_checks}/{total_checks} checks passed")
        
        if test_results.get("errors"):
            logger.info(f"\n❌ Errors encountered:")
            for error in test_results["errors"]:
                logger.info(f"  • {error}")
        
        # Recommendations
        if passed_checks == total_checks:
            logger.info("\n🎉 SUCCESS! All systems are operational.")
            logger.info("Your AgileForge production environment is ready!")
            logger.info("\nNext steps:")
            logger.info("  1. Deploy frontend application")
            logger.info("  2. Configure domain and SSL")
            logger.info("  3. Set up monitoring and alerts")
        else:
            logger.info("\n⚠️ Some issues detected. Please resolve the errors above.")
            logger.info("Run this script again after fixing the issues.")
        
        logger.info("="*60)

async def main():
    """Main setup and test runner"""
    setup = ProductionSetup()
    await setup.full_setup_and_test()

if __name__ == "__main__":
    asyncio.run(main()) 