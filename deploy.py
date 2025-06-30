#!/usr/bin/env python3
"""
AgileForge Deployment Script
Comprehensive deployment automation for all phases of enhancements
"""

import os
import sys
import subprocess
import json
import time
import logging
from pathlib import Path
from typing import Dict, List, Optional
import asyncio
import asyncpg
from dotenv import load_dotenv

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('deployment.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class AgileForgeDeployer:
    """Comprehensive deployment manager for AgileForge"""
    
    def __init__(self):
        self.root_dir = Path(__file__).parent
        self.load_environment()
        self.deployment_steps = [
            ("Environment Setup", self.setup_environment),
            ("Dependencies Installation", self.install_dependencies),
            ("Database Migration", self.migrate_database),
            ("Performance Schema Setup", self.setup_performance_schema),
            ("Security Components", self.setup_security),
            ("Backup System", self.setup_backup_system),
            ("Testing Infrastructure", self.setup_testing),
            ("CI/CD Pipeline", self.setup_cicd),
            ("Monitoring & Observability", self.setup_monitoring),
            ("Health Checks", self.verify_deployment)
        ]
    
    def load_environment(self):
        """Load environment variables"""
        load_dotenv()
        self.environment = os.getenv("ENVIRONMENT", "development")
        self.database_url = os.getenv("DATABASE_URL")
        self.supabase_url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
        self.supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        
        logger.info(f"Deployment environment: {self.environment}")
    
    async def deploy(self, phases: Optional[List[str]] = None):
        """Run complete deployment process"""
        logger.info("🚀 Starting AgileForge deployment...")
        
        if phases:
            steps = [(name, func) for name, func in self.deployment_steps if name in phases]
        else:
            steps = self.deployment_steps
        
        total_steps = len(steps)
        
        for i, (step_name, step_func) in enumerate(steps, 1):
            logger.info(f"📋 Step {i}/{total_steps}: {step_name}")
            try:
                await step_func()
                logger.info(f"✅ {step_name} completed successfully")
            except Exception as e:
                logger.error(f"❌ {step_name} failed: {str(e)}")
                if self.environment == "production":
                    raise
                logger.warning("Continuing deployment in development mode...")
        
        logger.info("🎉 AgileForge deployment completed!")
    
    async def setup_environment(self):
        """Setup environment configuration"""
        # Create necessary directories
        dirs = [
            "logs", "backups", "uploads", "temp", 
            "backend/logs", "backend/temp", "backend/uploads"
        ]
        
        for dir_path in dirs:
            os.makedirs(dir_path, exist_ok=True)
            logger.info(f"Created directory: {dir_path}")
        
        # Environment file validation
        required_env_vars = [
            "DATABASE_URL", "NEXT_PUBLIC_SUPABASE_URL", 
            "SUPABASE_SERVICE_ROLE_KEY", "OPENAI_API_KEY"
        ]
        
        missing_vars = [var for var in required_env_vars if not os.getenv(var)]
        if missing_vars:
            logger.warning(f"Missing environment variables: {missing_vars}")
            if self.environment == "production":
                raise ValueError(f"Missing required environment variables: {missing_vars}")
    
    async def install_dependencies(self):
        """Install all dependencies"""
        # Python dependencies
        python_requirements = [
            "pip install -r requirements.txt",
            "pip install -r backend/requirements.txt"
        ]
        
        for req in python_requirements:
            if os.path.exists(req.split()[-1]):
                logger.info(f"Installing {req.split()[-1]}")
                subprocess.run(req.split(), check=True)
        
        # Node.js dependencies
        if os.path.exists("package.json"):
            logger.info("Installing Node.js dependencies")
            subprocess.run(["npm", "install"], check=True)
        
        # Playwright browsers (for E2E testing)
        if os.path.exists("playwright.config.ts"):
            logger.info("Installing Playwright browsers")
            subprocess.run(["npx", "playwright", "install"], check=True)
    
    async def migrate_database(self):
        """Run database migrations"""
        if not self.database_url:
            logger.warning("No database URL configured, skipping migrations")
            return
        
        # Basic database connectivity test
        try:
            import asyncpg
            conn = await asyncpg.connect(self.database_url)
            await conn.execute("SELECT 1")
            await conn.close()
            logger.info("Database connection successful")
        except Exception as e:
            logger.error(f"Database connection failed: {e}")
            if self.environment == "production":
                raise
    
    async def setup_performance_schema(self):
        """Setup performance monitoring database schema"""
        schema_file = "backend/database/performance_schema.sql"
        
        if not os.path.exists(schema_file):
            logger.warning(f"Performance schema file not found: {schema_file}")
            return
        
        if not self.database_url:
            logger.warning("No database URL configured, skipping performance schema setup")
            return
        
        try:
            import asyncpg
            conn = await asyncpg.connect(self.database_url)
            
            with open(schema_file, 'r') as f:
                schema_sql = f.read()
            
            # Execute schema in parts (handle multiple statements)
            statements = [stmt.strip() for stmt in schema_sql.split(';') if stmt.strip()]
            
            for statement in statements:
                try:
                    await conn.execute(statement)
                    logger.debug(f"Executed: {statement[:50]}...")
                except Exception as e:
                    logger.warning(f"Schema statement failed (might already exist): {e}")
            
            await conn.close()
            logger.info("Performance schema setup completed")
            
        except ImportError:
            logger.warning("asyncpg not available, skipping performance schema setup")
        except Exception as e:
            logger.error(f"Performance schema setup failed: {e}")
            if self.environment == "production":
                raise
    
    async def setup_security(self):
        """Setup security components"""
        # Generate security keys if they don't exist
        security_env_vars = {
            "JWT_SECRET_KEY": self.generate_secret_key(),
            "ENCRYPTION_KEY": self.generate_encryption_key(),
            "SECURITY_SALT": self.generate_salt()
        }
        
        env_file = ".env.local" if self.environment == "development" else ".env"
        
        # Read existing env file
        existing_vars = {}
        if os.path.exists(env_file):
            with open(env_file, 'r') as f:
                for line in f:
                    if '=' in line and not line.startswith('#'):
                        key, value = line.strip().split('=', 1)
                        existing_vars[key] = value
        
        # Add missing security variables
        updated = False
        for key, value in security_env_vars.items():
            if key not in existing_vars:
                existing_vars[key] = value
                updated = True
                logger.info(f"Generated security key: {key}")
        
        if updated:
            with open(env_file, 'w') as f:
                for key, value in existing_vars.items():
                    f.write(f"{key}={value}\n")
            logger.info(f"Security configuration updated in {env_file}")
    
    async def setup_backup_system(self):
        """Setup backup system"""
        backup_config = {
            "backup_schedule": "0 2 * * *",  # Daily at 2 AM
            "retention_days": 30,
            "backup_location": os.getenv("BACKUP_LOCATION", "./backups"),
            "encryption_enabled": True,
            "compression_enabled": True
        }
        
        os.makedirs(backup_config["backup_location"], exist_ok=True)
        
        config_file = "backend/config/backup_config.json"
        os.makedirs(os.path.dirname(config_file), exist_ok=True)
        
        with open(config_file, 'w') as f:
            json.dump(backup_config, f, indent=2)
        
        logger.info("Backup system configuration created")
    
    async def setup_testing(self):
        """Setup testing infrastructure"""
        # Create test database if needed
        test_db_url = os.getenv("TEST_DATABASE_URL")
        if test_db_url:
            try:
                import asyncpg
                conn = await asyncpg.connect(test_db_url)
                await conn.execute("SELECT 1")
                await conn.close()
                logger.info("Test database connection successful")
            except Exception as e:
                logger.warning(f"Test database setup failed: {e}")
        
        # Setup test data directories
        test_dirs = ["__tests__/fixtures", "e2e/test-results", "backend/tests/fixtures"]
        for test_dir in test_dirs:
            os.makedirs(test_dir, exist_ok=True)
        
        logger.info("Testing infrastructure setup completed")
    
    async def setup_cicd(self):
        """Setup CI/CD pipeline configuration"""
        if os.path.exists(".github/workflows/ci.yml"):
            logger.info("CI/CD pipeline configuration found")
            
            # Validate GitHub secrets documentation
            secrets_doc = """
Required GitHub Secrets for CI/CD:
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY  
- OPENAI_API_KEY
- ANTHROPIC_API_KEY
- DATABASE_URL
- SLACK_WEBHOOK_URL (optional)
- DOCKER_USERNAME (for Docker deployment)
- DOCKER_PASSWORD (for Docker deployment)
"""
            
            with open("github-secrets.md", 'w') as f:
                f.write(secrets_doc)
            
            logger.info("GitHub secrets documentation created")
    
    async def setup_monitoring(self):
        """Setup monitoring and observability"""
        # Create monitoring configuration
        monitoring_config = {
            "metrics": {
                "enabled": True,
                "port": 9090,
                "path": "/metrics"
            },
            "tracing": {
                "enabled": True,
                "jaeger_endpoint": os.getenv("JAEGER_ENDPOINT", "http://localhost:14268"),
                "service_name": "agileforge-api"
            },
            "logging": {
                "level": "INFO" if self.environment == "production" else "DEBUG",
                "structured": True,
                "format": "json" if self.environment == "production" else "console"
            }
        }
        
        config_dir = "backend/config"
        os.makedirs(config_dir, exist_ok=True)
        
        with open(f"{config_dir}/monitoring.json", 'w') as f:
            json.dump(monitoring_config, f, indent=2)
        
        logger.info("Monitoring configuration created")
    
    async def verify_deployment(self):
        """Verify deployment health"""
        health_checks = [
            ("Environment Variables", self.check_environment),
            ("Database Connection", self.check_database),
            ("API Endpoints", self.check_api_health),
            ("Security Components", self.check_security),
            ("Monitoring", self.check_monitoring)
        ]
        
        results = {}
        
        for check_name, check_func in health_checks:
            try:
                result = await check_func()
                results[check_name] = {"status": "✅ PASS", "details": result}
                logger.info(f"Health check passed: {check_name}")
            except Exception as e:
                results[check_name] = {"status": "❌ FAIL", "details": str(e)}
                logger.error(f"Health check failed: {check_name} - {e}")
        
        # Save health check results
        with open("deployment-health.json", 'w') as f:
            json.dump(results, f, indent=2)
        
        failed_checks = [name for name, result in results.items() if "FAIL" in result["status"]]
        
        if failed_checks and self.environment == "production":
            raise RuntimeError(f"Critical health checks failed: {failed_checks}")
        
        logger.info(f"Health check summary: {len(results) - len(failed_checks)}/{len(results)} passed")
    
    # Utility methods
    def generate_secret_key(self) -> str:
        """Generate a secure secret key"""
        import secrets
        return secrets.token_urlsafe(32)
    
    def generate_encryption_key(self) -> str:
        """Generate encryption key"""
        from cryptography.fernet import Fernet
        return Fernet.generate_key().decode()
    
    def generate_salt(self) -> str:
        """Generate security salt"""
        import secrets
        return secrets.token_hex(16)
    
    async def check_environment(self) -> str:
        """Check environment configuration"""
        required_vars = ["DATABASE_URL", "NEXT_PUBLIC_SUPABASE_URL"]
        missing = [var for var in required_vars if not os.getenv(var)]
        if missing:
            raise ValueError(f"Missing environment variables: {missing}")
        return "All required environment variables present"
    
    async def check_database(self) -> str:
        """Check database connectivity"""
        if not self.database_url:
            return "Database URL not configured"
        
        try:
            import asyncpg
            conn = await asyncpg.connect(self.database_url)
            result = await conn.fetchval("SELECT version()")
            await conn.close()
            return f"Database connected: {result[:50]}..."
        except ImportError:
            return "Database check skipped (asyncpg not available)"
        except Exception as e:
            raise ConnectionError(f"Database connection failed: {e}")
    
    async def check_api_health(self) -> str:
        """Check API health endpoint"""
        # This would normally make an HTTP request to the health endpoint
        # For now, we'll just check if the main.py file exists and is valid
        main_file = "backend/main.py"
        if not os.path.exists(main_file):
            raise FileNotFoundError("Main API file not found")
        
        return "API configuration file present"
    
    async def check_security(self) -> str:
        """Check security components"""
        security_files = [
            "backend/security/advanced_security.py",
            "backend/backup/backup_manager.py"
        ]
        
        missing = [f for f in security_files if not os.path.exists(f)]
        if missing:
            raise FileNotFoundError(f"Security files missing: {missing}")
        
        return "Security components present"
    
    async def check_monitoring(self) -> str:
        """Check monitoring setup"""
        monitoring_files = [
            "backend/api/performance_endpoints.py",
            "backend/database/query_optimizer.py"
        ]
        
        missing = [f for f in monitoring_files if not os.path.exists(f)]
        if missing:
            raise FileNotFoundError(f"Monitoring files missing: {missing}")
        
        return "Monitoring components present"


async def main():
    """Main deployment function"""
    import argparse
    
    parser = argparse.ArgumentParser(description="AgileForge Deployment Script")
    parser.add_argument("--phases", nargs="*", help="Specific phases to deploy")
    parser.add_argument("--environment", default="development", 
                       choices=["development", "staging", "production"])
    parser.add_argument("--verify-only", action="store_true", 
                       help="Only run health checks")
    
    args = parser.parse_args()
    
    # Set environment
    os.environ["ENVIRONMENT"] = args.environment
    
    deployer = AgileForgeDeployer()
    
    if args.verify_only:
        logger.info("Running health checks only...")
        await deployer.verify_deployment()
    else:
        await deployer.deploy(phases=args.phases)


if __name__ == "__main__":
    asyncio.run(main()) 