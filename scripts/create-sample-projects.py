#!/usr/bin/env python3
"""
Script to create sample projects for testing the projects loading functionality.
This will help debug why projects aren't loading in the frontend.
"""

import os
import sys
import asyncio
from datetime import datetime, timedelta
from supabase import create_client, Client

# Add the backend directory to Python path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend'))

async def create_sample_projects():
    """Create sample projects in the database"""
    
    # Get Supabase credentials from environment
    url = os.getenv("SUPABASE_URL")
    # Try service key first (has more permissions), fallback to anon key
    key = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_ANON_KEY")
    
    if not url or not key:
        print("ERROR: Missing SUPABASE_URL or Supabase API key environment variables")
        print("Available keys: SUPABASE_SERVICE_KEY, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY")
        print("Make sure your .env file is configured correctly")
        return False
    
    try:
        # Create Supabase client
        supabase: Client = create_client(url, key)
        print(f"Connected to Supabase at {url}")
        
        # First, let's check if we have any users to assign projects to
        users_result = supabase.table("users").select("*").limit(5).execute()
        
        if not users_result.data:
            print("No users found in database. Creating sample user first...")
            # Create a sample user
            user_data = {
                "email": "test@example.com",
                "name": "Test User",
                "hashed_password": "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeOZxEaLRhX01mNBE",  # "password123"
                "is_active": True,
                "is_verified": True,
                "roles": ["developer"],
                "permissions": ["view_project", "create_project", "edit_project"],
                "created_at": datetime.utcnow().isoformat()
            }
            
            user_result = supabase.table("users").insert(user_data).execute()
            if user_result.data:
                print(f"Created sample user: {user_result.data[0]['email']}")
                sample_user_id = user_result.data[0]['id']
            else:
                print("Failed to create sample user")
                return False
        else:
            sample_user_id = users_result.data[0]['id']
            print(f"Using existing user: {users_result.data[0]['email']}")
        
        # Check if projects already exist
        existing_projects = supabase.table("projects").select("*").execute()
        if existing_projects.data:
            print(f"Found {len(existing_projects.data)} existing projects:")
            for project in existing_projects.data:
                print(f"  - {project['name']} (Status: {project['status']})")
            
            response = input("Do you want to add more sample projects? (y/n): ")
            if response.lower() != 'y':
                return True
        
        # Sample project data
        sample_projects = [
            {
                "name": "E-Commerce Platform",
                "description": "Modern e-commerce platform with AI-powered recommendations",
                "status": "in-progress",
                "priority": "high",
                "created_by": sample_user_id,
                "start_date": (datetime.utcnow() - timedelta(days=30)).isoformat(),
                "target_end_date": (datetime.utcnow() + timedelta(days=90)).isoformat(),
                "created_at": datetime.utcnow().isoformat()
            },
            {
                "name": "Mobile Banking App",
                "description": "Secure mobile banking application with biometric authentication",
                "status": "todo",
                "priority": "critical",
                "created_by": sample_user_id,
                "start_date": datetime.utcnow().isoformat(),
                "target_end_date": (datetime.utcnow() + timedelta(days=120)).isoformat(),
                "created_at": datetime.utcnow().isoformat()
            },
            {
                "name": "HR Management System",
                "description": "Comprehensive HR management system with employee self-service portal",
                "status": "review",
                "priority": "medium",
                "created_by": sample_user_id,
                "start_date": (datetime.utcnow() - timedelta(days=60)).isoformat(),
                "target_end_date": (datetime.utcnow() + timedelta(days=30)).isoformat(),
                "created_at": (datetime.utcnow() - timedelta(days=60)).isoformat()
            },
            {
                "name": "Data Analytics Dashboard",
                "description": "Real-time analytics dashboard for business intelligence",
                "status": "done",
                "priority": "medium",
                "created_by": sample_user_id,
                "start_date": (datetime.utcnow() - timedelta(days=90)).isoformat(),
                "target_end_date": (datetime.utcnow() - timedelta(days=10)).isoformat(),
                "created_at": (datetime.utcnow() - timedelta(days=90)).isoformat()
            },
            {
                "name": "Customer Support Portal",
                "description": "AI-powered customer support system with ticket management",
                "status": "backlog",
                "priority": "low",
                "created_by": sample_user_id,
                "created_at": datetime.utcnow().isoformat()
            }
        ]
        
        print(f"\nCreating {len(sample_projects)} sample projects...")
        
        # Insert projects
        for i, project_data in enumerate(sample_projects, 1):
            try:
                result = supabase.table("projects").insert(project_data).execute()
                if result.data:
                    project = result.data[0]
                    print(f"  ✓ Created project {i}: {project['name']} (ID: {project['id']})")
                else:
                    print(f"  ✗ Failed to create project {i}: {project_data['name']}")
            except Exception as e:
                print(f"  ✗ Error creating project {i}: {e}")
        
        # Verify projects were created
        final_projects = supabase.table("projects").select("*").execute()
        print(f"\nTotal projects in database: {len(final_projects.data)}")
        
        # Create some sample epics for the first project if we have projects
        if final_projects.data:
            first_project = final_projects.data[0]
            print(f"\nCreating sample epics for project: {first_project['name']}")
            
            sample_epics = [
                {
                    "name": "User Authentication System",
                    "description": "Implement secure user registration, login, and session management",
                    "project_id": first_project['id'],
                    "status": "in-progress",
                    "priority": "high",
                    "color": "#3B82F6",
                    "created_at": datetime.utcnow().isoformat()
                },
                {
                    "name": "Product Catalog Management",
                    "description": "Build comprehensive product catalog with search and filtering",
                    "project_id": first_project['id'],
                    "status": "todo",
                    "priority": "medium",
                    "color": "#10B981",
                    "created_at": datetime.utcnow().isoformat()
                }
            ]
            
            for epic_data in sample_epics:
                try:
                    result = supabase.table("epics").insert(epic_data).execute()
                    if result.data:
                        epic = result.data[0]
                        print(f"  ✓ Created epic: {epic['name']}")
                    else:
                        print(f"  ✗ Failed to create epic: {epic_data['name']}")
                except Exception as e:
                    print(f"  ✗ Error creating epic: {e}")
        
        print("\n🎉 Sample data creation completed!")
        print("\nYou can now test the projects loading functionality in the frontend.")
        return True
        
    except Exception as e:
        print(f"ERROR: Failed to create sample projects: {e}")
        return False

if __name__ == "__main__":
    print("Creating sample projects for AgileForge...")
    print("=" * 50)
    
    success = asyncio.run(create_sample_projects())
    
    if success:
        print("\n✅ Sample projects created successfully!")
        print("Now refresh your frontend to see the projects loading.")
    else:
        print("\n❌ Failed to create sample projects.")
        print("Please check your database configuration and try again.") 