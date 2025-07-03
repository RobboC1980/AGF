#!/bin/bash

# AgileForge Clean Restart Script
# Designed for the actual project structure: Next.js in root, FastAPI in backend/

echo "🔄 AgileForge Clean Restart Process"
echo "=================================="

# Function to kill processes on specific ports
kill_port() {
    local port=$1
    local service_name=$2
    
    echo "🔍 Checking port $port for $service_name..."
    
    # Find and kill processes on the port
    local pids=$(lsof -ti:$port 2>/dev/null)
    
    if [ -n "$pids" ]; then
        echo "⚠️  Found processes on port $port: $pids"
        echo "🔪 Killing processes..."
        kill -9 $pids 2>/dev/null
        sleep 2
        
        # Verify processes are dead
        local remaining=$(lsof -ti:$port 2>/dev/null)
        if [ -z "$remaining" ]; then
            echo "✅ Port $port cleared successfully"
        else
            echo "❌ Some processes still running on port $port"
            sudo kill -9 $remaining 2>/dev/null
        fi
    else
        echo "✅ Port $port is already free"
    fi
}

# Kill common AgileForge ports
echo "🚫 Stopping all AgileForge services..."
kill_port 3000 "Next.js Frontend"
kill_port 8000 "FastAPI Backend" 
kill_port 5432 "PostgreSQL/Supabase"
kill_port 6379 "Redis"
kill_port 8080 "Development Server"
kill_port 3001 "Backup Frontend"
kill_port 8001 "Backup Backend"

# Kill any Node.js processes that might be hanging
echo "🔪 Killing any hanging Node.js processes..."
pkill -f "next" 2>/dev/null || true
pkill -f "node.*3000" 2>/dev/null || true
pkill -f "react-scripts" 2>/dev/null || true

# Kill any Python processes that might be hanging
echo "🔪 Killing any hanging Python processes..."
pkill -f "uvicorn" 2>/dev/null || true
pkill -f "fastapi" 2>/dev/null || true
pkill -f "python.*8000" 2>/dev/null || true
pkill -f "python.*main" 2>/dev/null || true
pkill -f "production_backend" 2>/dev/null || true

# Clear any npm/yarn locks and cache
echo "🧹 Cleaning package manager locks and cache..."
rm -f package-lock.json yarn.lock 2>/dev/null || true
rm -rf .next/cache 2>/dev/null || true
rm -rf node_modules/.cache 2>/dev/null || true

# Clear Python cache in backend
if [ -d "backend" ]; then
    echo "🧹 Cleaning Python cache in backend..."
    cd backend
    find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
    find . -name "*.pyc" -delete 2>/dev/null || true
    cd ..
fi

# Clear Python cache in root
echo "🧹 Cleaning Python cache in root..."
find . -maxdepth 1 -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
find . -maxdepth 1 -name "*.pyc" -delete 2>/dev/null || true

echo ""
echo "🔄 Starting AgileForge services..."
echo "=================================="

# Check if virtual environment exists and activate it
if [ -d "venv" ]; then
    echo "🐍 Activating virtual environment..."
    source venv/bin/activate
elif [ -d "backend/venv" ]; then
    echo "🐍 Activating backend virtual environment..."
    source backend/venv/bin/activate
else
    echo "⚠️  No virtual environment found, using system Python"
fi

# Start backend first
echo "🐍 Starting FastAPI Backend on port 8000..."

# Check which backend file to use
if [ -f "production_backend.py" ] && [ "$1" = "production" ]; then
    echo "📍 Starting production backend..."
    python production_backend.py &
    BACKEND_PID=$!
elif [ -f "backend/main.py" ]; then
    echo "📍 Starting development backend..."
    cd backend
    uvicorn main:app --host 0.0.0.0 --port 8000 --reload &
    BACKEND_PID=$!
    cd ..
else
    echo "❌ No backend file found"
    exit 1
fi

echo "📍 Backend PID: $BACKEND_PID"
sleep 3

# Start frontend (Next.js in root directory)
echo "⚛️  Starting Next.js Frontend on port 3000..."

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    npm install
fi

# Start frontend
npm run dev &
FRONTEND_PID=$!
echo "📍 Frontend PID: $FRONTEND_PID"
sleep 3

# Check if services are running
echo ""
echo "🔍 Checking service status..."
echo "============================="

check_service() {
    local port=$1
    local service_name=$2
    local max_attempts=15
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s "http://localhost:$port" >/dev/null 2>&1 || curl -s "http://localhost:$port/health" >/dev/null 2>&1; then
            echo "✅ $service_name is running on port $port"
            return 0
        fi
        
        if [ $attempt -eq 1 ]; then
            echo "⏳ Waiting for $service_name to start..."
        fi
        
        sleep 2
        attempt=$((attempt + 1))
    done
    
    echo "❌ $service_name failed to start on port $port"
    return 1
}

# Check backend health
if check_service 8000 "Backend API"; then
    echo "🔗 Backend docs: http://localhost:8000/docs"
    echo "🔗 Backend health: http://localhost:8000/health"
fi

# Check frontend
if check_service 3000 "Frontend App"; then
    echo "🔗 Frontend app: http://localhost:3000"
fi

echo ""
echo "📊 Process Summary:"
echo "==================="
echo "Backend PID: ${BACKEND_PID:-'Not started'}"
echo "Frontend PID: ${FRONTEND_PID:-'Not started'}"

# Show active ports
echo ""
echo "🔌 Active ports:"
netstat -tlnp 2>/dev/null | grep -E ":(3000|8000|5432|6379)" || echo "No AgileForge ports active"

echo ""
echo "🎉 AgileForge restart complete!"
echo ""
echo "📱 Quick Links:"
echo "   Frontend: http://localhost:3000"
echo "   Backend API: http://localhost:8000"
echo "   API Docs: http://localhost:8000/docs"
echo "   Health Check: http://localhost:8000/health"
echo ""
echo "🛑 To stop services:"
echo "   kill $BACKEND_PID $FRONTEND_PID"
echo "   or run: pkill -f 'uvicorn|next'"
echo ""
echo "💡 Usage:"
echo "   ./agileforge-restart.sh          # Development mode"
echo "   ./agileforge-restart.sh production  # Production mode" 