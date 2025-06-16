#!/usr/bin/env python3
"""
Create realistic demo data for AgileForge production demo
"""

import os
import sys
from datetime import datetime, timedelta
import random
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize Supabase client
url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not url or not key:
    print("Error: Missing Supabase credentials")
    sys.exit(1)

supabase: Client = create_client(url, key)

def create_demo_data():
    """Create comprehensive demo data"""
    
    print("🚀 Creating AgileForge Demo Data...")
    
    # 1. Create Projects
    projects = [
        {
            "name": "AgileForge Platform",
            "description": "Next-generation agile project management platform with AI-powered insights",
            "status": "active",
            "created_at": datetime.now().isoformat()
        },
        {
            "name": "Mobile App Development",
            "description": "Cross-platform mobile application for AgileForge",
            "status": "active", 
            "created_at": datetime.now().isoformat()
        },
        {
            "name": "AI Analytics Engine",
            "description": "Machine learning powered analytics and predictions",
            "status": "planning",
            "created_at": datetime.now().isoformat()
        }
    ]
    
    print("📁 Creating projects...")
    project_results = []
    for project in projects:
        result = supabase.table("projects").insert(project).execute()
        if result.data:
            project_results.append(result.data[0])
            print(f"  ✅ Created project: {project['name']}")
    
    # 2. Create Epics
    epics = [
        {
            "name": "User Authentication & Authorization",
            "description": "Complete user management system with role-based access control",
            "project_id": project_results[0]["id"],
            "color": "#3B82F6",
            "status": "active",
            "created_at": datetime.now().isoformat()
        },
        {
            "name": "Dashboard & Analytics",
            "description": "Real-time dashboard with comprehensive project analytics",
            "project_id": project_results[0]["id"],
            "color": "#8B5CF6",
            "status": "active",
            "created_at": datetime.now().isoformat()
        },
        {
            "name": "AI-Powered Story Generation",
            "description": "Intelligent user story creation and management",
            "project_id": project_results[0]["id"],
            "color": "#10B981",
            "status": "active",
            "created_at": datetime.now().isoformat()
        },
        {
            "name": "Collaboration Tools",
            "description": "Real-time collaboration and communication features",
            "project_id": project_results[0]["id"],
            "color": "#F59E0B",
            "status": "planning",
            "created_at": datetime.now().isoformat()
        },
        {
            "name": "Mobile App Core",
            "description": "Core mobile application functionality",
            "project_id": project_results[1]["id"],
            "color": "#EF4444",
            "status": "active",
            "created_at": datetime.now().isoformat()
        },
        {
            "name": "Predictive Analytics",
            "description": "AI-powered project predictions and insights",
            "project_id": project_results[2]["id"],
            "color": "#6366F1",
            "status": "planning",
            "created_at": datetime.now().isoformat()
        }
    ]
    
    print("🎯 Creating epics...")
    epic_results = []
    for epic in epics:
        result = supabase.table("epics").insert(epic).execute()
        if result.data:
            epic_results.append(result.data[0])
            print(f"  ✅ Created epic: {epic['name']}")
    
    # 3. Get existing users
    users_result = supabase.table("users").select("*").execute()
    users = users_result.data
    
    if not users:
        print("❌ No users found. Please create users first.")
        return
    
    # 4. Create Stories
    stories = [
        # Authentication Epic Stories
        {
            "name": "User Registration with Email Verification",
            "description": "As a new user, I want to register with email verification so that my account is secure",
            "acceptance_criteria": "Given a new user visits the registration page\nWhen they enter valid email and password\nThen they receive a verification email\nAnd can activate their account",
            "story_points": 8,
            "priority": "high",
            "status": "done",
            "epic_id": epic_results[0]["id"],
            "assignee_id": users[0]["id"] if users else None,
            "tags": ["authentication", "security", "email"],
            "created_at": (datetime.now() - timedelta(days=15)).isoformat(),
            "updated_at": (datetime.now() - timedelta(days=2)).isoformat()
        },
        {
            "name": "OAuth Social Login Integration",
            "description": "As a user, I want to login with Google/GitHub so that I can access the platform quickly",
            "acceptance_criteria": "Given a user on the login page\nWhen they click social login\nThen they are redirected to OAuth provider\nAnd can authenticate and return to the platform",
            "story_points": 13,
            "priority": "medium",
            "status": "in-progress",
            "epic_id": epic_results[0]["id"],
            "assignee_id": users[1]["id"] if len(users) > 1 else users[0]["id"],
            "tags": ["authentication", "oauth", "social-login"],
            "created_at": (datetime.now() - timedelta(days=10)).isoformat(),
            "updated_at": datetime.now().isoformat()
        },
        {
            "name": "Role-Based Access Control",
            "description": "As an admin, I want to assign roles to users so that I can control access to features",
            "acceptance_criteria": "Given an admin user\nWhen they access user management\nThen they can assign roles (admin, manager, developer)\nAnd users see appropriate features based on their role",
            "story_points": 21,
            "priority": "high",
            "status": "ready",
            "epic_id": epic_results[0]["id"],
            "assignee_id": users[2]["id"] if len(users) > 2 else users[0]["id"],
            "tags": ["authorization", "rbac", "admin"],
            "created_at": (datetime.now() - timedelta(days=8)).isoformat(),
            "updated_at": (datetime.now() - timedelta(days=1)).isoformat()
        },
        
        # Dashboard Epic Stories
        {
            "name": "Real-time Project Dashboard",
            "description": "As a project manager, I want to see real-time project metrics so that I can track progress",
            "acceptance_criteria": "Given a project manager\nWhen they access the dashboard\nThen they see live project metrics\nAnd data updates automatically without refresh",
            "story_points": 13,
            "priority": "critical",
            "status": "done",
            "epic_id": epic_results[1]["id"],
            "assignee_id": users[0]["id"] if users else None,
            "tags": ["dashboard", "real-time", "metrics"],
            "created_at": (datetime.now() - timedelta(days=20)).isoformat(),
            "updated_at": (datetime.now() - timedelta(days=5)).isoformat()
        },
        {
            "name": "Burndown Chart Visualization",
            "description": "As a scrum master, I want to see burndown charts so that I can track sprint progress",
            "acceptance_criteria": "Given a scrum master\nWhen they view sprint analytics\nThen they see interactive burndown charts\nAnd can filter by time periods",
            "story_points": 8,
            "priority": "medium",
            "status": "in-progress",
            "epic_id": epic_results[1]["id"],
            "assignee_id": users[1]["id"] if len(users) > 1 else users[0]["id"],
            "tags": ["analytics", "charts", "sprint"],
            "created_at": (datetime.now() - timedelta(days=12)).isoformat(),
            "updated_at": datetime.now().isoformat()
        },
        {
            "name": "Team Performance Analytics",
            "description": "As a team lead, I want to see team performance metrics so that I can identify improvement areas",
            "acceptance_criteria": "Given a team lead\nWhen they access team analytics\nThen they see velocity, completion rates, and workload distribution\nAnd can export reports",
            "story_points": 13,
            "priority": "medium",
            "status": "backlog",
            "epic_id": epic_results[1]["id"],
            "assignee_id": None,
            "tags": ["analytics", "team", "performance"],
            "created_at": (datetime.now() - timedelta(days=5)).isoformat(),
            "updated_at": (datetime.now() - timedelta(days=5)).isoformat()
        },
        
        # AI Epic Stories
        {
            "name": "AI Story Generation from Requirements",
            "description": "As a product owner, I want AI to generate user stories from requirements so that I can save time",
            "acceptance_criteria": "Given a product owner with requirements\nWhen they use the AI story generator\nThen they get well-formatted user stories with acceptance criteria\nAnd can edit and save them",
            "story_points": 21,
            "priority": "high",
            "status": "done",
            "epic_id": epic_results[2]["id"],
            "assignee_id": users[2]["id"] if len(users) > 2 else users[0]["id"],
            "tags": ["ai", "story-generation", "automation"],
            "created_at": (datetime.now() - timedelta(days=25)).isoformat(),
            "updated_at": (datetime.now() - timedelta(days=1)).isoformat()
        },
        {
            "name": "Smart Story Point Estimation",
            "description": "As a developer, I want AI to suggest story points so that estimation is more consistent",
            "acceptance_criteria": "Given a developer creating a story\nWhen they enter the story details\nThen AI suggests appropriate story points\nAnd provides reasoning for the estimate",
            "story_points": 13,
            "priority": "medium",
            "status": "review",
            "epic_id": epic_results[2]["id"],
            "assignee_id": users[0]["id"] if users else None,
            "tags": ["ai", "estimation", "story-points"],
            "created_at": (datetime.now() - timedelta(days=18)).isoformat(),
            "updated_at": (datetime.now() - timedelta(days=3)).isoformat()
        },
        {
            "name": "Intelligent Task Breakdown",
            "description": "As a developer, I want AI to break down stories into tasks so that I can plan work better",
            "acceptance_criteria": "Given a developer with a user story\nWhen they request task breakdown\nThen AI generates logical development tasks\nAnd estimates time for each task",
            "story_points": 8,
            "priority": "low",
            "status": "backlog",
            "epic_id": epic_results[2]["id"],
            "assignee_id": None,
            "tags": ["ai", "task-breakdown", "planning"],
            "created_at": (datetime.now() - timedelta(days=7)).isoformat(),
            "updated_at": (datetime.now() - timedelta(days=7)).isoformat()
        },
        
        # Collaboration Epic Stories
        {
            "name": "Real-time Comments and Mentions",
            "description": "As a team member, I want to comment on stories and mention colleagues so that we can collaborate effectively",
            "acceptance_criteria": "Given a team member viewing a story\nWhen they add comments with @mentions\nThen mentioned users get notifications\nAnd comments appear in real-time",
            "story_points": 13,
            "priority": "medium",
            "status": "backlog",
            "epic_id": epic_results[3]["id"],
            "assignee_id": None,
            "tags": ["collaboration", "comments", "notifications"],
            "created_at": (datetime.now() - timedelta(days=3)).isoformat(),
            "updated_at": (datetime.now() - timedelta(days=3)).isoformat()
        },
        {
            "name": "File Attachments and Document Sharing",
            "description": "As a user, I want to attach files to stories so that I can share relevant documents",
            "acceptance_criteria": "Given a user editing a story\nWhen they upload files\nThen files are securely stored and accessible\nAnd team members can download them",
            "story_points": 8,
            "priority": "low",
            "status": "backlog",
            "epic_id": epic_results[3]["id"],
            "assignee_id": None,
            "tags": ["collaboration", "files", "sharing"],
            "created_at": (datetime.now() - timedelta(days=2)).isoformat(),
            "updated_at": (datetime.now() - timedelta(days=2)).isoformat()
        },
        
        # Mobile Epic Stories
        {
            "name": "Mobile App Authentication",
            "description": "As a mobile user, I want to login to the mobile app so that I can access my projects on the go",
            "acceptance_criteria": "Given a mobile user\nWhen they open the app\nThen they can login with email/password or biometrics\nAnd stay logged in securely",
            "story_points": 13,
            "priority": "critical",
            "status": "ready",
            "epic_id": epic_results[4]["id"],
            "assignee_id": users[1]["id"] if len(users) > 1 else users[0]["id"],
            "tags": ["mobile", "authentication", "biometrics"],
            "created_at": (datetime.now() - timedelta(days=6)).isoformat(),
            "updated_at": (datetime.now() - timedelta(days=1)).isoformat()
        },
        {
            "name": "Offline Story Management",
            "description": "As a mobile user, I want to view and edit stories offline so that I can work without internet",
            "acceptance_criteria": "Given a mobile user without internet\nWhen they access the app\nThen they can view cached stories\nAnd changes sync when connection returns",
            "story_points": 21,
            "priority": "medium",
            "status": "backlog",
            "epic_id": epic_results[4]["id"],
            "assignee_id": None,
            "tags": ["mobile", "offline", "sync"],
            "created_at": (datetime.now() - timedelta(days=4)).isoformat(),
            "updated_at": (datetime.now() - timedelta(days=4)).isoformat()
        }
    ]
    
    print("📝 Creating stories...")
    story_results = []
    for story in stories:
        result = supabase.table("stories").insert(story).execute()
        if result.data:
            story_results.append(result.data[0])
            print(f"  ✅ Created story: {story['name']}")
    
    print(f"\n🎉 Demo data created successfully!")
    print(f"  📁 {len(project_results)} projects")
    print(f"  🎯 {len(epic_results)} epics")
    print(f"  📝 {len(story_results)} stories")
    print(f"  👥 {len(users)} users (existing)")
    
    print(f"\n🚀 Your AgileForge demo is ready!")
    print(f"  Login at: http://localhost:3000/login")
    print(f"  Email: Chris@clariq.co.uk")
    print(f"  Password: password123")

if __name__ == "__main__":
    create_demo_data() 