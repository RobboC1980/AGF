#!/bin/bash

# AgileForge Development Startup Script
# This script starts all necessary services for development

set -e

echo "🚀 Starting AgileForge Development Environment..."

# Check if Redis is running
if ! redis-cli ping > /dev/null 2>&1; then
    echo "❌ Redis is not running. Starting Redis..."
    brew services start redis
    sleep 2
fi

echo "✅ Redis is running"

# Start Celery worker for AI tasks
echo "🔧 Starting Celery AI worker..."
celery -A backend.services.async_ai_service worker --loglevel=info --queues=ai_queue --concurrency=2 &
CELERY_AI_PID=$!

# Start Celery worker for analytics tasks  
echo "📊 Starting Celery Analytics worker..."
celery -A backend.services.async_ai_service worker --loglevel=info --queues=analytics_queue --concurrency=1 &
CELERY_ANALYTICS_PID=$!

# Start Flower for monitoring
echo "🌸 Starting Flower monitoring..."
celery -A backend.services.async_ai_service flower --port=5555 &
FLOWER_PID=$!

# Start FastAPI backend
echo "🖥️  Starting FastAPI backend..."
python start_backend.py &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 3

# Start Next.js frontend
echo "🌐 Starting Next.js frontend..."
npm start &
FRONTEND_PID=$!

echo ""
echo "🎉 All services started successfully!"
echo ""
echo "📊 Services running:"
echo "   - Backend API: http://localhost:8000"
echo "   - Frontend: http://localhost:3000" 
echo "   - Flower (Celery Monitor): http://localhost:5555"
echo "   - Redis: localhost:6379"
echo ""
echo "📋 Process IDs:"
echo "   - Backend: $BACKEND_PID"
echo "   - Frontend: $FRONTEND_PID"
echo "   - Celery AI Worker: $CELERY_AI_PID"
echo "   - Celery Analytics Worker: $CELERY_ANALYTICS_PID"
echo "   - Flower: $FLOWER_PID"
echo ""
echo "🛑 To stop all services:"
echo "   kill $BACKEND_PID $FRONTEND_PID $CELERY_AI_PID $CELERY_ANALYTICS_PID $FLOWER_PID"
echo ""
echo "📝 Logs are available in the terminal. Press Ctrl+C to stop monitoring."

# Wait for any process to exit
wait 