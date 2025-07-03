#!/bin/bash

echo "🔍 AgileForge Production Health Check"
echo "=================================="
echo "Timestamp: $(date)"
echo ""

# Initialize counters
PASSED=0
FAILED=0

# Function to check service and count results
check_service() {
    local service_name="$1"
    local test_command="$2"
    local expected_pattern="$3"
    
    echo -n "🔍 $service_name: "
    
    if result=$(eval "$test_command" 2>/dev/null); then
        if echo "$result" | grep -q "$expected_pattern"; then
            echo "✅ PASS"
            ((PASSED++))
            return 0
        else
            echo "❌ FAIL (unexpected response)"
            ((FAILED++))
            return 1
        fi
    else
        echo "❌ FAIL (connection error)"
        ((FAILED++))
        return 1
    fi
}

# 1. Backend Core Services
echo "🖥️  Backend Core Services:"
check_service "Backend Health" "curl -f http://localhost:8000/health" "healthy"
check_service "API Documentation" "curl -f http://localhost:8000/docs" "swagger"
check_service "Core API Status" "curl -s http://localhost:8000/api/projects" "success"
echo ""

# 2. External Service Integrations
echo "🔗 External Service Integrations:"
check_service "Database Connection" "curl -s http://localhost:8000/health" '"database":"healthy"'
check_service "Stripe Integration" "curl -s http://localhost:8000/health" '"stripe":"configured"'
check_service "AI Services (OpenAI)" "curl -s http://localhost:8000/health" '"openai":"configured"'
check_service "AI Service Status" "curl -s http://localhost:8000/api/ai/status" '"basic_service":true'
echo ""

# 3. Core API Endpoints
echo "📡 Core API Endpoints:"
check_service "Projects API" "curl -s http://localhost:8000/api/projects" '"success":true'
check_service "Users API" "curl -s http://localhost:8000/api/users" '"success":true'
check_service "Health Metrics" "curl -s http://localhost:8000/health" '"timestamp"'
echo ""

# 4. Frontend Integration (if running)
echo "🌐 Frontend Integration:"
if lsof -i :3000 >/dev/null 2>&1; then
    check_service "Frontend Server" "curl -f http://localhost:3000" "html"
    check_service "Frontend Health" "curl -f http://localhost:3000/health" "status"
else
    echo "⚠️  Frontend not running on port 3000"
fi
echo ""

# 5. AI Feature Testing
echo "🤖 AI Feature Validation:"
check_service "AI Status Endpoint" "curl -s http://localhost:8000/api/ai/status" '"openai_client":true'
check_service "Anthropic Client" "curl -s http://localhost:8000/api/ai/status" '"anthropic_client":true'
check_service "Supabase AI Connection" "curl -s http://localhost:8000/api/ai/status" '"supabase_connection":true'
echo ""

# Summary
echo "=================================="
echo "🎯 HEALTH CHECK SUMMARY"
echo "=================================="
echo "✅ Services Passed: $PASSED"
echo "❌ Services Failed: $FAILED"
echo "🏆 Total Coverage: $((PASSED + FAILED)) services tested"
echo ""

if [ $FAILED -eq 0 ]; then
    echo "🎉 ALL HEALTH CHECKS PASSED!"
    echo "🚀 System is PRODUCTION READY!"
    exit 0
else
    echo "⚠️  $FAILED health check(s) failed"
    echo "🔧 Please review failed services before production deployment"
    exit 1
fi 