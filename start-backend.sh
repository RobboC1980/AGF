#!/bin/bash

echo "🚀 Starting AgileForge Backend with Full CRUD Support..."

# Check if Python virtual environment exists
if [ ! -d "backend/venv" ]; then
    echo "📦 Creating Python virtual environment..."
    cd backend
    python3 -m venv venv
    cd ..
fi

# Activate virtual environment and install dependencies
echo "📦 Installing backend dependencies..."
cd backend
source venv/bin/activate

# Install required packages
pip install fastapi uvicorn python-multipart pydantic[email] python-jose[cryptography] passlib[bcrypt] sqlalchemy sqlite3 aiosqlite

echo "🔧 Starting backend server on port 4000..."
echo "📍 Backend API will be available at: http://localhost:4000"
echo "📚 API Documentation will be available at: http://localhost:4000/docs"
echo ""
echo "🔥 Starting server..."

# Start the main backend with all endpoints
python -c "
import uvicorn
from main import app
import os

if __name__ == '__main__':
    port = int(os.getenv('PORT', 4000))
    uvicorn.run(
        'main:app',
        host='0.0.0.0',
        port=port,
        reload=True
    )
" 