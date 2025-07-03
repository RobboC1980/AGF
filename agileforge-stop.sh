#!/bin/bash

# AgileForge Stop Script
# Cleanly stops all AgileForge services

echo "🛑 Stopping AgileForge Services"
echo "==============================="

# Function to kill processes on specific ports
kill_port() {
    local port=$1
    local service_name=$2
    
    echo "🔍 Checking port $port for $service_name..."
    
    local pids=$(lsof -ti:$port 2>/dev/null)
    
    if [ -n "$pids" ]; then
        echo "🔪 Stopping $service_name on port $port..."
        kill -TERM $pids 2>/dev/null
        sleep 3
        
        # Check if processes are still running
        local remaining=$(lsof -ti:$port 2>/dev/null)
        if [ -n "$remaining" ]; then
            echo "⚠️  Force killing $service_name..."
            kill -9 $remaining 2>/dev/null
        fi
        echo "✅ $service_name stopped"
    else
        echo "✅ $service_name already stopped"
    fi
}

# Stop services gracefully
kill_port 3000 "Next.js Frontend"
kill_port 8000 "FastAPI Backend"
kill_port 8001 "Backup Backend"
kill_port 3001 "Backup Frontend"

# Kill any remaining processes
echo "🧹 Cleaning up remaining processes..."
pkill -f "next" 2>/dev/null || true
pkill -f "uvicorn" 2>/dev/null || true
pkill -f "fastapi" 2>/dev/null || true
pkill -f "python.*main" 2>/dev/null || true
pkill -f "production_backend" 2>/dev/null || true

echo ""
echo "🔌 Final port check:"
netstat -tlnp 2>/dev/null | grep -E ":(3000|8000)" || echo "All AgileForge ports are clear"

echo ""
echo "✅ AgileForge services stopped successfully!" 