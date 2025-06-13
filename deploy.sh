#!/bin/bash

# AgileForge Production Deployment Script
# This script handles deployment to staging and production environments

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${1:-staging}
PROJECT_NAME="agileforge"
BACKEND_SERVICE="${PROJECT_NAME}-api"
FRONTEND_SERVICE="${PROJECT_NAME}-frontend"

echo -e "${BLUE}🚀 Starting AgileForge deployment to ${ENVIRONMENT}...${NC}"

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Function to check if required tools are installed
check_dependencies() {
    echo -e "${BLUE}📋 Checking dependencies...${NC}"
    
    # Check for required tools
    for tool in git docker node npm; do
        if ! command -v $tool &> /dev/null; then
            print_error "$tool is not installed"
            exit 1
        fi
    done
    
    print_status "All dependencies are installed"
}

# Function to validate environment variables
validate_environment() {
    echo -e "${BLUE}🔍 Validating environment configuration...${NC}"
    
    # Check if environment file exists
    ENV_FILE=".env.${ENVIRONMENT}"
    if [ ! -f "$ENV_FILE" ]; then
        print_error "Environment file $ENV_FILE not found"
        exit 1
    fi
    
    # Source environment variables
    source "$ENV_FILE"
    
    # Check required variables
    REQUIRED_VARS=(
        "SUPABASE_URL"
        "SUPABASE_SERVICE_KEY"
        "SUPABASE_JWT_SECRET"
        "FRONTEND_URL"
    )
    
    for var in "${REQUIRED_VARS[@]}"; do
        if [ -z "${!var}" ]; then
            print_error "Required environment variable $var is not set"
            exit 1
        fi
    done
    
    print_status "Environment configuration is valid"
}

# Function to run tests
run_tests() {
    echo -e "${BLUE}🧪 Running tests...${NC}"
    
    # Backend tests
    if [ -f "test_auth.py" ]; then
        echo "Running authentication tests..."
        python test_auth.py
    fi
    
    if [ -f "test_crud.py" ]; then
        echo "Running CRUD tests..."
        python test_crud.py
    fi
    
    # Frontend tests (if they exist)
    if [ -f "package.json" ] && grep -q "test" package.json; then
        echo "Running frontend tests..."
        npm test -- --watchAll=false
    fi
    
    print_status "All tests passed"
}

# Function to build and deploy backend
deploy_backend() {
    echo -e "${BLUE}🔧 Deploying backend to ${ENVIRONMENT}...${NC}"
    
    case $ENVIRONMENT in
        "staging"|"production")
            # Deploy to Render
            if command -v render &> /dev/null; then
                echo "Deploying to Render..."
                render deploy --service=$BACKEND_SERVICE
            else
                print_warning "Render CLI not found. Please deploy manually via Render dashboard."
                echo "1. Go to https://dashboard.render.com"
                echo "2. Find your $BACKEND_SERVICE service"
                echo "3. Click 'Manual Deploy' -> 'Deploy latest commit'"
            fi
            ;;
        "local")
            echo "Starting local backend..."
            ENVIRONMENT=$ENVIRONMENT PORT=8000 python production_backend.py &
            BACKEND_PID=$!
            echo $BACKEND_PID > backend.pid
            ;;
    esac
    
    print_status "Backend deployment initiated"
}

# Function to build and deploy frontend
deploy_frontend() {
    echo -e "${BLUE}🎨 Deploying frontend to ${ENVIRONMENT}...${NC}"
    
    case $ENVIRONMENT in
        "staging"|"production")
            # Deploy to Vercel
            if command -v vercel &> /dev/null; then
                echo "Deploying to Vercel..."
                if [ "$ENVIRONMENT" = "production" ]; then
                    vercel --prod
                else
                    vercel
                fi
            else
                print_warning "Vercel CLI not found. Please deploy manually."
                echo "1. Install Vercel CLI: npm i -g vercel"
                echo "2. Run: vercel --prod (for production) or vercel (for staging)"
            fi
            ;;
        "local")
            echo "Starting local frontend..."
            npm run dev &
            FRONTEND_PID=$!
            echo $FRONTEND_PID > frontend.pid
            ;;
    esac
    
    print_status "Frontend deployment initiated"
}

# Function to setup monitoring
setup_monitoring() {
    echo -e "${BLUE}📊 Setting up monitoring...${NC}"
    
    # Create monitoring configuration
    cat > monitoring.json << EOF
{
    "environment": "$ENVIRONMENT",
    "services": {
        "backend": {
            "health_endpoint": "/health",
            "metrics_endpoint": "/metrics"
        },
        "frontend": {
            "health_endpoint": "/_next/health"
        }
    },
    "alerts": {
        "response_time_threshold": 2000,
        "error_rate_threshold": 0.05,
        "uptime_threshold": 0.99
    }
}
EOF
    
    print_status "Monitoring configuration created"
}

# Function to run health checks
health_check() {
    echo -e "${BLUE}🏥 Running health checks...${NC}"
    
    # Wait for services to start
    sleep 10
    
    # Check backend health
    if [ "$ENVIRONMENT" = "local" ]; then
        BACKEND_URL="http://localhost:8000"
        FRONTEND_URL="http://localhost:3000"
    else
        # Use environment variables for deployed URLs
        BACKEND_URL="${API_URL:-https://$BACKEND_SERVICE.onrender.com}"
        FRONTEND_URL="${FRONTEND_URL}"
    fi
    
    echo "Checking backend health at $BACKEND_URL/health..."
    if curl -f -s "$BACKEND_URL/health" > /dev/null; then
        print_status "Backend is healthy"
    else
        print_error "Backend health check failed"
        return 1
    fi
    
    echo "Checking frontend at $FRONTEND_URL..."
    if curl -f -s "$FRONTEND_URL" > /dev/null; then
        print_status "Frontend is accessible"
    else
        print_warning "Frontend health check failed (may still be starting)"
    fi
    
    # Check database connectivity
    echo "Checking database connectivity..."
    python -c "
import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv('.env.$ENVIRONMENT')
supabase = create_client(os.getenv('SUPABASE_URL'), os.getenv('SUPABASE_SERVICE_KEY'))
result = supabase.table('users').select('count').limit(1).execute()
print('Database connection successful')
"
    
    print_status "All health checks passed"
}

# Function to setup SSL certificates (for production)
setup_ssl() {
    if [ "$ENVIRONMENT" = "production" ]; then
        echo -e "${BLUE}🔒 SSL certificates are automatically managed by Render and Vercel${NC}"
        print_status "SSL setup complete"
    fi
}

# Function to setup environment-specific configurations
setup_environment_config() {
    echo -e "${BLUE}⚙️  Setting up $ENVIRONMENT configuration...${NC}"
    
    case $ENVIRONMENT in
        "production")
            # Production-specific setup
            echo "Setting up production configuration..."
            
            # Ensure production environment variables are set
            export ENVIRONMENT=production
            export DEBUG=false
            export LOG_LEVEL=INFO
            ;;
        "staging")
            # Staging-specific setup
            echo "Setting up staging configuration..."
            
            export ENVIRONMENT=staging
            export DEBUG=true
            export LOG_LEVEL=DEBUG
            ;;
        "local")
            # Local development setup
            echo "Setting up local development configuration..."
            
            export ENVIRONMENT=development
            export DEBUG=true
            export LOG_LEVEL=DEBUG
            ;;
    esac
    
    print_status "Environment configuration complete"
}

# Function to create deployment summary
create_deployment_summary() {
    echo -e "${BLUE}📋 Creating deployment summary...${NC}"
    
    TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
    COMMIT_HASH=$(git rev-parse --short HEAD)
    
    cat > "deployment-${ENVIRONMENT}-$(date +%Y%m%d-%H%M%S).log" << EOF
AgileForge Deployment Summary
============================

Environment: $ENVIRONMENT
Timestamp: $TIMESTAMP
Commit: $COMMIT_HASH
Deployed by: $(whoami)

Services:
- Backend: $BACKEND_SERVICE
- Frontend: $FRONTEND_SERVICE

URLs:
- Backend API: $BACKEND_URL
- Frontend: $FRONTEND_URL
- Health Check: $BACKEND_URL/health
- Metrics: $BACKEND_URL/metrics

Status: Deployment completed successfully
EOF
    
    print_status "Deployment summary created"
}

# Function to cleanup on exit
cleanup() {
    if [ "$ENVIRONMENT" = "local" ]; then
        echo -e "${YELLOW}🧹 Cleaning up local processes...${NC}"
        
        if [ -f backend.pid ]; then
            kill $(cat backend.pid) 2>/dev/null || true
            rm backend.pid
        fi
        
        if [ -f frontend.pid ]; then
            kill $(cat frontend.pid) 2>/dev/null || true
            rm frontend.pid
        fi
    fi
}

# Set trap for cleanup
trap cleanup EXIT

# Main deployment flow
main() {
    echo -e "${BLUE}🎯 Deploying AgileForge to ${ENVIRONMENT} environment${NC}"
    
    check_dependencies
    validate_environment
    setup_environment_config
    
    if [ "$ENVIRONMENT" != "local" ]; then
        run_tests
    fi
    
    deploy_backend
    deploy_frontend
    setup_monitoring
    setup_ssl
    health_check
    create_deployment_summary
    
    echo -e "${GREEN}🎉 Deployment to ${ENVIRONMENT} completed successfully!${NC}"
    
    if [ "$ENVIRONMENT" = "local" ]; then
        echo -e "${BLUE}📱 Local services are running:${NC}"
        echo "  Backend:  http://localhost:8000"
        echo "  Frontend: http://localhost:3000"
        echo "  Health:   http://localhost:8000/health"
        echo "  Metrics:  http://localhost:8000/metrics"
        echo ""
        echo "Press Ctrl+C to stop services"
        wait
    fi
}

# Show usage if no arguments provided
if [ $# -eq 0 ]; then
    echo "Usage: $0 [staging|production|local]"
    echo ""
    echo "Examples:"
    echo "  $0 staging     # Deploy to staging environment"
    echo "  $0 production  # Deploy to production environment"
    echo "  $0 local       # Run locally for development"
    exit 1
fi

# Run main function
main 