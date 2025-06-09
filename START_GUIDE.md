# AgileForge Startup Guide

## Quick Start Options

### Option 1: Frontend Only (Recommended for Demo)
```bash
npm run dev
```
- **Frontend**: http://localhost:3000
- **Status**: Full UI with mock data
- **Features**: All pages, components, and interactions work

### Option 2: Full Stack - Simple Backend
```bash
npm run start:dev
```
- **Frontend**: http://localhost:3000  
- **Backend**: http://localhost:4000 (Simple)
- **API Docs**: http://localhost:4000/docs
- **Status**: Basic API with health checks

### Option 3: Full Stack - Complete Backend (NEW!)
```bash
npm run start:dev:complete
```
- **Frontend**: http://localhost:3000  
- **Backend**: http://localhost:4000 (Complete)
- **API Docs**: http://localhost:4000/docs
- **Status**: Full CRUD API for all entities

## Individual Service Management

### Frontend
```bash
npm run dev                    # Start Next.js frontend
```

### Backend Options
```bash
npm run dev:backend           # Start simple FastAPI backend
npm run dev:backend:complete  # Start complete FastAPI backend (NEW!)
npm run setup:backend         # Install Python dependencies
npm run health:check          # Check backend health
```

### Stop All Services
```bash
npm run kill:all              # Stop all running services
```

## NEW Features Added

### 1. Tasks Page ✨
- **Access**: Tasks tab in main navigation
- **Features**: 
  - Grid, list, and table views
  - Advanced filtering and sorting
  - Time tracking and progress monitoring
  - Subtask management
  - Real-time status updates

### 2. Simple Creation Modals ✨
- **Access**: Quick create buttons in header (Epic, Story, Task)
- **Features**:
  - Three-tab interface (Basic, Details, Advanced)
  - User story format for stories (As a... I want... So that...)
  - Story points estimation
  - Time estimation for tasks
  - Tag management
  - Subtask creation
  - Due date picker
  - Assignee selection

### 3. Complete Backend Schema ✨
- **Database**: Complete SQLAlchemy models for all entities
- **API Models**: Comprehensive Pydantic schemas
- **Endpoints**: Full CRUD operations for:
  - Users & Authentication
  - Projects & Teams
  - Epics & Stories & Tasks
  - Sprints & Releases
  - Time Tracking & Comments
  - Notifications & Activity Logs
  - Search & Analytics

### 4. Backend API Endpoints

#### Core Entities
- **Users**: `/api/users` - User management and profiles
- **Projects**: `/api/projects` - Project portfolio management
- **Epics**: `/api/epics` - Epic creation and tracking
- **Stories**: `/api/stories` - User story management
- **Tasks**: `/api/tasks` - Task creation and tracking

#### Advanced Features
- **Analytics**: `/api/analytics/overview` - Platform metrics
- **Search**: `/api/search?q=query` - Global search
- **Health**: `/health` - System health check
- **Status**: `/api/status` - Entity counts and status

## Verification

### Frontend Health Check
- Visit: http://localhost:3000
- Should show: AgileForge platform with 8 navigation tabs
- New: Tasks tab, Quick create buttons in header

### Backend Health Check  
- Visit: http://localhost:4000/health
- Should return: `{"status": "healthy", "database": "connected", ...}`

### API Documentation
- Visit: http://localhost:4000/docs
- Interactive API documentation with all endpoints

### Test Creation Flow
1. Click "Epic" in header → Create new epic
2. Click "Story" in header → Create new story (linked to epic)
3. Click "Task" in header → Create new task (linked to story)
4. Navigate to Tasks tab → View all tasks with filtering

## Access Points

- **Main App**: http://localhost:3000
- **Tasks Page**: http://localhost:3000 (Tasks tab)
- **API Health**: http://localhost:4000/health  
- **API Status**: http://localhost:4000/api/status
- **API Docs**: http://localhost:4000/docs
- **Search API**: http://localhost:4000/api/search?q=test
- **Analytics**: http://localhost:4000/api/analytics/overview

## Sample API Calls

### Get All Stories
```bash
curl http://localhost:4000/api/stories
```

### Create New Epic
```bash
curl -X POST http://localhost:4000/api/epics \
  -H "Content-Type: application/json" \
  -d '{"project_id":"proj-1","title":"New Epic","description":"Epic description","priority":"high"}'
```

### Search Everything
```bash
curl "http://localhost:4000/api/search?q=authentication"
```

## Troubleshooting

### Python Environment Issues
If you see "python: command not found":
1. Ensure virtual environment exists: `python3 -m venv venv`
2. Activate manually: `source venv/bin/activate`
3. Install dependencies: `pip install -r backend/requirements.txt`

### Port Conflicts
- Frontend (3000): Change in next.config.js
- Backend (4000): Change PORT in backend/.env

### Missing Dependencies
```bash
# Frontend dependencies
npm install

# Backend dependencies  
source venv/bin/activate
pip install -r backend/requirements.txt
```

### Service Dependencies
- Backend requires Python 3.9+
- Frontend requires Node.js 18+
- Both can run independently

## Available Features

### Core Functionality
- **Projects**: Create and manage project portfolios
- **Epics**: Large feature initiatives and milestones  
- **User Stories**: Detailed feature requirements with acceptance criteria
- **Tasks**: Individual work items with time tracking ✨
- **Quick Creation**: Simple modals for all entity types ✨

### Advanced Features
- **Kanban**: Visual workflow management
- **Analytics**: Performance insights and metrics
- **Search**: Global search across all entities
- **Collaboration**: Comments, mentions, and real-time updates

### Data Management
- **Complete Schema**: No-gap database design ✨
- **Full CRUD API**: All operations for all entities ✨
- **Relationships**: Proper entity hierarchies and linking
- **Filtering**: Advanced filtering and sorting options
- **Pagination**: Efficient data loading

## Architecture Overview

### Frontend (Next.js)
- **Pages**: Epics, Projects, Stories, Tasks, Kanban, Analytics, Search, Collaboration
- **Components**: Shared components with reusable logic
- **State**: React Query for server state management
- **UI**: Tailwind CSS with Radix UI components

### Backend (FastAPI)
- **Simple**: Basic health checks and mock data
- **Complete**: Full database schema with all entities ✨
- **API**: RESTful endpoints with OpenAPI documentation
- **Models**: Pydantic for validation, SQLAlchemy for ORM

### Database Schema (Complete) ✨
- **Users & Auth**: Complete authentication system
- **Projects & Teams**: Multi-tenant organization support
- **Work Items**: Projects → Epics → Stories → Tasks hierarchy
- **Collaboration**: Comments, mentions, reactions
- **Time Tracking**: Detailed work logging
- **Notifications**: Real-time activity feeds
- **Search**: Full-text search indexing

## Notes

- Frontend works independently with mock data
- Simple backend provides health checks and basic API
- Complete backend provides full platform functionality ✨
- All services configured for development with hot-reload
- Database schema designed for production scalability ✨ 