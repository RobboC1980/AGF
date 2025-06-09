# AgileForge Setup Guide

## Prerequisites

- Node.js 18+ and pnpm
- Python 3.8+ and pip
- PostgreSQL database (Render)

## 1. Backend Setup

### Install Dependencies
```bash
cd backend
pip install -r requirements.txt
```

### Environment Configuration
The backend `.env` file is already configured with:
- PostgreSQL database URL
- AI API keys
- CORS settings for your Vercel frontend

### Start the Backend
```bash
cd backend
python -m uvicorn main:app --host 0.0.0.0 --port 4000 --reload
```

The backend will be available at: `http://localhost:4000`

## 2. Frontend Setup

### Install Dependencies
```bash
pnpm install
```

### Environment Configuration
The frontend `.env.local` is configured to connect to `http://localhost:4000`

### Start the Frontend
```bash
pnpm dev
```

The frontend will be available at: `http://localhost:3000`

## 3. Verify Connection

1. Open the frontend at `http://localhost:3000`
2. Check the API status indicator (should show "Connected")
3. Navigate to the Epics, Stories, or Projects pages
4. Data should load from the PostgreSQL backend

## 4. Production Deployment

### Backend (Render)
1. Deploy your backend to Render
2. Update the production database URL in `backend/.env`
3. Note your backend URL (e.g., `https://your-app.onrender.com`)

### Frontend (Vercel)
1. Update `next.config.mjs` with your production backend URL
2. Update `.env.local` for production:
   ```
   NEXT_PUBLIC_API_URL=https://your-backend-url.onrender.com
   ```
3. Deploy to Vercel

## 5. Database Schema

The backend automatically creates the following tables:
- `users` - User accounts
- `projects` - Project management
- `epics` - Large feature initiatives  
- `stories` - User stories and requirements
- `sprints` - Sprint management
- `tasks` - Individual tasks

## 6. API Endpoints

- `GET /health` - Health check
- `GET /api/epics` - Get all epics
- `GET /api/stories` - Get all user stories
- `GET /api/projects` - Get all projects
- `POST /api/ai/generate-story` - AI story generation
- `POST /api/ai/generate-acceptance-criteria` - AI criteria generation

## 7. Troubleshooting

### Hydration Errors
The app includes fixes for browser extension interference (Dashlane, etc.)

### CORS Issues
Make sure your frontend URL is in the backend's allowed origins list

### Database Connection
Verify the PostgreSQL connection string in `backend/.env`

### API Connection
Check the API status component in the frontend for connection status

## Files Modified for Backend Integration

- `lib/api.ts` - API utility functions
- `hooks/useApi.ts` - React hooks for API state
- `components/api-status.tsx` - Connection status display
- `next.config.mjs` - API rewrites and environment config
- `backend/main.py` - CORS configuration
- `backend/.env` - Database and API configuration 