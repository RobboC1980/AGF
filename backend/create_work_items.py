#!/usr/bin/env python3
"""
Create comprehensive work items (epics, stories, tasks) for AgileForge
This script creates realistic epics, stories, and tasks with detailed acceptance criteria
"""

import asyncio
import uuid
from datetime import datetime, date, timedelta
from dotenv import load_dotenv
import random

# Load environment variables first
load_dotenv()

from database.connection import db_manager, init_db

async def create_comprehensive_work_items(conn):
    """Create comprehensive epics, stories, and tasks"""
    print("\n📋 Creating comprehensive work items...")
    
    # Create epics for Mobile App project
    await create_mobile_app_epics(conn)
    
    # Create epics for Platform API project
    await create_platform_api_epics(conn)
    
    # Create epics for Analytics Dashboard project
    await create_dashboard_epics(conn)
    
    print("✅ Work items creation completed!")

async def create_mobile_app_epics(conn):
    """Create epics for Mobile App 2.0 project"""
    print("  📱 Creating Mobile App epics...")
    
    mobile_epics = [
        {
            "id": "epic-mobile-onboarding",
            "project_id": "proj-mobile-app-v2",
            "title": "User Onboarding & Authentication",
            "description": "Redesign the user onboarding experience with improved authentication flow, biometric login, and personalized welcome experience.",
            "acceptance_criteria": """
            - New users can complete registration in under 2 minutes
            - Biometric authentication (Face ID/Touch ID) is available
            - Social login options (Google, Apple, Facebook) are integrated
            - Onboarding flow includes interactive tutorial
            - User preferences are captured during onboarding
            - Email verification is streamlined
            """,
            "business_value": "Improved user acquisition and reduced churn in first 7 days",
            "epic_key": "MOBILE-1",
            "status": "in_progress",
            "priority": "high",
            "estimated_story_points": 34,
            "actual_story_points": 21
        },
        {
            "id": "epic-mobile-core-features",
            "project_id": "proj-mobile-app-v2", 
            "title": "Core Feature Redesign",
            "description": "Redesign core application features with improved UX, performance, and accessibility standards.",
            "acceptance_criteria": """
            - All core features meet WCAG 2.1 AA accessibility standards
            - App performance improves by 40% (measured by loading times)
            - New design system is implemented consistently
            - Dark mode support is available
            - Offline functionality for core features
            - Push notifications are contextual and actionable
            """,
            "business_value": "Increased user engagement and satisfaction scores",
            "epic_key": "MOBILE-2",
            "status": "in_progress",
            "priority": "high",
            "estimated_story_points": 55,
            "actual_story_points": 34
        },
        {
            "id": "epic-mobile-analytics",
            "project_id": "proj-mobile-app-v2",
            "title": "Analytics & Insights",
            "description": "Implement comprehensive analytics tracking and provide users with personalized insights about their usage patterns.",
            "acceptance_criteria": """
            - User behavior analytics are tracked (privacy-compliant)
            - Personalized insights dashboard is available
            - Usage patterns and trends are visualized
            - Goal setting and progress tracking features
            - Export functionality for personal data
            - Privacy controls for data sharing preferences
            """,
            "business_value": "Better understanding of user behavior and increased user retention",
            "epic_key": "MOBILE-3",
            "status": "backlog",
            "priority": "medium",
            "estimated_story_points": 21,
            "actual_story_points": 0
        }
    ]
    
    for epic_data in mobile_epics:
        await create_epic_with_stories(conn, epic_data)

async def create_platform_api_epics(conn):
    """Create epics for Platform API project"""
    print("  🔗 Creating Platform API epics...")
    
    platform_epics = [
        {
            "id": "epic-api-auth",
            "project_id": "proj-platform-api",
            "title": "Authentication & Authorization System",
            "description": "Implement robust authentication and authorization system with OAuth2, JWT tokens, role-based access control, and API key management.",
            "acceptance_criteria": """
            - OAuth2 authentication flow is implemented
            - JWT tokens with refresh mechanism
            - Role-based access control (RBAC) system
            - API key management and rotation
            - Rate limiting per user/organization
            - Audit logging for all authentication events
            """,
            "business_value": "Secure, scalable authentication system that supports enterprise customers",
            "epic_key": "PLAT-1",
            "status": "done",
            "priority": "critical",
            "estimated_story_points": 42,
            "actual_story_points": 45
        },
        {
            "id": "epic-api-graphql",
            "project_id": "proj-platform-api",
            "title": "GraphQL API Implementation",
            "description": "Implement GraphQL API with comprehensive schema, real-time subscriptions, and advanced query optimization.",
            "acceptance_criteria": """
            - GraphQL schema covers all entity types
            - Real-time subscriptions for live updates
            - Query complexity analysis and limits
            - Comprehensive error handling and validation
            - GraphQL playground for API exploration
            - Performance monitoring and optimization
            """,
            "business_value": "Flexible, efficient API that reduces over-fetching and improves developer experience",
            "epic_key": "PLAT-2",
            "status": "in_progress",
            "priority": "high",
            "estimated_story_points": 38,
            "actual_story_points": 29
        },
        {
            "id": "epic-api-docs",
            "project_id": "proj-platform-api",
            "title": "API Documentation & Developer Experience",
            "description": "Create comprehensive API documentation, SDKs, and developer tools to improve the developer experience.",
            "acceptance_criteria": """
            - Interactive API documentation with examples
            - SDKs for major programming languages (JS, Python, Go)
            - Postman collections and API testing tools
            - Developer onboarding guides and tutorials
            - Code examples and use case scenarios
            - Community forum and support channels
            """,
            "business_value": "Improved developer adoption and reduced support burden",
            "epic_key": "PLAT-3",
            "status": "backlog",
            "priority": "medium",
            "estimated_story_points": 25,
            "actual_story_points": 0
        }
    ]
    
    for epic_data in platform_epics:
        await create_epic_with_stories(conn, epic_data)

async def create_dashboard_epics(conn):
    """Create epics for Analytics Dashboard project"""
    print("  📊 Creating Analytics Dashboard epics...")
    
    dashboard_epics = [
        {
            "id": "epic-dashboard-core",
            "project_id": "proj-web-dashboard",
            "title": "Core Dashboard Framework",
            "description": "Build the foundational dashboard framework with widget system, responsive design, and real-time data updates.",
            "acceptance_criteria": """
            - Responsive dashboard layout that works on all devices
            - Drag-and-drop widget customization
            - Real-time data updates without page refresh
            - Multiple dashboard views and configurations
            - Export functionality (PDF, Excel, CSV)
            - Dark/light theme support
            """,
            "business_value": "Flexible dashboard platform that can be customized for different user needs",
            "epic_key": "DASH-1",
            "status": "in_progress",
            "priority": "high",
            "estimated_story_points": 40,
            "actual_story_points": 28
        },
        {
            "id": "epic-dashboard-widgets",
            "project_id": "proj-web-dashboard",
            "title": "Analytics Widgets & Visualizations",
            "description": "Implement comprehensive set of analytics widgets with various chart types, tables, and interactive visualizations.",
            "acceptance_criteria": """
            - 10+ chart types (bar, line, pie, scatter, heatmap, etc.)
            - Interactive data tables with filtering and sorting
            - KPI widgets with trend indicators
            - Time series analysis widgets
            - Geographic visualization (maps)
            - Custom widget builder for advanced users
            """,
            "business_value": "Rich data visualization capabilities that provide actionable insights",
            "epic_key": "DASH-2",
            "status": "backlog",
            "priority": "high",
            "estimated_story_points": 32,
            "actual_story_points": 0
        }
    ]
    
    for epic_data in dashboard_epics:
        await create_epic_with_stories(conn, epic_data)

async def create_epic_with_stories(conn, epic_data):
    """Create an epic and its associated stories"""
    try:
        # Create the epic
        existing = await conn.fetchrow("SELECT id FROM epics WHERE id = $1", epic_data["id"])
        if existing:
            print(f"    ⚠️  Epic {epic_data['title']} already exists")
            return
            
        start_date = datetime.now() - timedelta(days=random.randint(10, 60))
        target_end_date = start_date + timedelta(days=random.randint(30, 90))
        
        await conn.execute("""
            INSERT INTO epics (id, project_id, title, description, acceptance_criteria, business_value,
                             epic_key, status, priority, estimated_story_points, actual_story_points,
                             start_date, target_end_date, created_by, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        """, epic_data["id"], epic_data["project_id"], epic_data["title"], epic_data["description"],
             epic_data["acceptance_criteria"], epic_data["business_value"], epic_data["epic_key"],
             epic_data["status"], epic_data["priority"], epic_data["estimated_story_points"],
             epic_data["actual_story_points"], start_date, target_end_date,
             "user-product-director", datetime.now(), datetime.now())
        
        print(f"    ✅ Created epic: {epic_data['title']}")
        
        # Create stories for this epic
        await create_stories_for_epic(conn, epic_data)
        
    except Exception as e:
        print(f"    ❌ Failed to create epic {epic_data['title']}: {e}")

async def create_stories_for_epic(conn, epic_data):
    """Create stories for a specific epic"""
    
    # Define story templates based on epic type
    if "onboarding" in epic_data["id"]:
        stories = [
            {
                "title": "Social Login Integration",
                "as_a": "new user",
                "i_want": "to sign up using my Google or Apple account",
                "so_that": "I can quickly create an account without entering personal details",
                "acceptance_criteria": """
                Given I am on the registration screen
                When I tap "Sign up with Google" or "Sign up with Apple"
                Then I should be authenticated and my account should be created
                And my basic profile information should be populated
                And I should be directed to the onboarding flow
                """,
                "story_points": 8,
                "priority": "high",
                "status": "done",
                "assignee_id": "user-senior-dev2"
            },
            {
                "title": "Biometric Authentication Setup",
                "as_a": "user",
                "i_want": "to enable Face ID or Touch ID for login",
                "so_that": "I can securely access my account without typing passwords",
                "acceptance_criteria": """
                Given I have completed initial registration
                When I am prompted to set up biometric authentication
                Then I should be able to enable Face ID or Touch ID
                And the system should securely store my biometric data
                And I should be able to login using biometrics on subsequent visits
                """,
                "story_points": 5,
                "priority": "high",
                "status": "in_progress",
                "assignee_id": "user-dev1"
            },
            {
                "title": "Interactive Onboarding Tutorial",
                "as_a": "new user",
                "i_want": "to see an interactive tutorial of key features",
                "so_that": "I understand how to use the app effectively",
                "acceptance_criteria": """
                Given I have completed account setup
                When I start the onboarding tutorial
                Then I should see interactive demonstrations of core features
                And I should be able to skip or replay tutorial steps
                And my progress should be saved if I exit early
                And I should be able to access the tutorial later from settings
                """,
                "story_points": 13,
                "priority": "medium",
                "status": "backlog",
                "assignee_id": "user-ui-designer"
            }
        ]
    elif "core-features" in epic_data["id"]:
        stories = [
            {
                "title": "Dark Mode Implementation",
                "as_a": "user",
                "i_want": "to switch between light and dark themes",
                "so_that": "I can use the app comfortably in different lighting conditions",
                "acceptance_criteria": """
                Given I am using the app
                When I go to settings and toggle dark mode
                Then all screens should switch to dark theme
                And the setting should be remembered across app sessions
                And system theme preference should be respected by default
                """,
                "story_points": 8,
                "priority": "medium",
                "status": "done",
                "assignee_id": "user-ui-designer"
            },
            {
                "title": "Offline Functionality for Core Features",
                "as_a": "user",
                "i_want": "to access core features when offline",
                "so_that": "I can continue using the app without internet connection",
                "acceptance_criteria": """
                Given I am using the app online
                When I lose internet connection
                Then core features should still be accessible
                And data should sync automatically when connection is restored
                And I should see clear indicators of offline status
                """,
                "story_points": 21,
                "priority": "high",
                "status": "in_progress",
                "assignee_id": "user-senior-dev1"
            },
            {
                "title": "Accessibility Improvements",
                "as_a": "user with disabilities",
                "i_want": "to use the app with assistive technologies",
                "so_that": "I can access all features regardless of my abilities",
                "acceptance_criteria": """
                Given I am using screen reader or other assistive technology
                When I navigate through the app
                Then all interactive elements should have proper labels
                And navigation should be logical and predictable
                And color contrast should meet WCAG 2.1 AA standards
                And all functionality should be keyboard accessible
                """,
                "story_points": 13,
                "priority": "high",
                "status": "review",
                "assignee_id": "user-dev2"
            }
        ]
    elif "auth" in epic_data["id"]:
        stories = [
            {
                "title": "OAuth2 Authentication Flow",
                "as_a": "developer",
                "i_want": "to implement OAuth2 authentication",
                "so_that": "third-party applications can securely access our API",
                "acceptance_criteria": """
                Given a third-party application wants to access our API
                When they initiate the OAuth2 flow
                Then they should be redirected to our authorization server
                And users should be able to grant/deny permissions
                And access tokens should be issued with appropriate scopes
                And refresh tokens should be handled securely
                """,
                "story_points": 13,
                "priority": "critical",
                "status": "done",
                "assignee_id": "user-tech-lead"
            },
            {
                "title": "Role-Based Access Control (RBAC)",
                "as_a": "system administrator",
                "i_want": "to manage user permissions through roles",
                "so_that": "users only have access to appropriate resources",
                "acceptance_criteria": """
                Given I am managing user permissions
                When I assign roles to users
                Then users should only access resources allowed by their roles
                And permissions should be checked on every API request
                And audit logs should track all permission changes
                """,
                "story_points": 21,
                "priority": "high",
                "status": "done",
                "assignee_id": "user-senior-dev1"
            },
            {
                "title": "API Rate Limiting",
                "as_a": "platform administrator",
                "i_want": "to implement rate limiting on API endpoints",
                "so_that": "the system remains stable under high load",
                "acceptance_criteria": """
                Given API endpoints are receiving requests
                When request rate exceeds defined limits
                Then requests should be throttled appropriately
                And clients should receive meaningful error messages
                And rate limits should be configurable per user/organization
                """,
                "story_points": 8,
                "priority": "high",
                "status": "testing",
                "assignee_id": "user-senior-dev1"
            }
        ]
    else:
        # Default stories for other epics
        stories = [
            {
                "title": f"Core Implementation for {epic_data['title'][:30]}",
                "as_a": "user",
                "i_want": "to use the core functionality",
                "so_that": "I can accomplish my goals efficiently",
                "acceptance_criteria": "Core functionality works as expected with proper error handling and validation",
                "story_points": 8,
                "priority": "high",
                "status": "in_progress",
                "assignee_id": "user-senior-dev1"
            }
        ]
    
    # Create each story and its tasks
    for i, story_data in enumerate(stories):
        story_id = f"{epic_data['id']}-story-{i+1}"
        story_key = f"{epic_data['epic_key']}-{i+1}"
        
        try:
            existing = await conn.fetchrow("SELECT id FROM stories WHERE id = $1", story_id)
            if existing:
                continue
                
            # Set dates based on status
            created_at = datetime.now() - timedelta(days=random.randint(5, 30))
            started_at = created_at + timedelta(days=random.randint(1, 5)) if story_data['status'] != 'backlog' else None
            completed_at = started_at + timedelta(days=random.randint(1, 10)) if story_data['status'] == 'done' else None
            
            await conn.execute("""
                INSERT INTO stories (id, epic_id, title, description, story_key, as_a, i_want, so_that,
                                   acceptance_criteria, status, priority, story_points, assignee_id, 
                                   started_at, completed_at, created_by, created_at, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
            """, story_id, epic_data["id"], story_data["title"], 
                 f"As a {story_data['as_a']}, I want {story_data['i_want']} so that {story_data['so_that']}",
                 story_key, story_data["as_a"], story_data["i_want"], story_data["so_that"],
                 story_data["acceptance_criteria"], story_data["status"], story_data["priority"],
                 story_data["story_points"], story_data["assignee_id"], started_at, completed_at,
                 "user-product-manager1", created_at, datetime.now())
            
            # Create tasks for this story
            await create_tasks_for_story(conn, story_id, story_key, story_data)
            
        except Exception as e:
            print(f"      ❌ Failed to create story {story_data['title']}: {e}")

async def create_tasks_for_story(conn, story_id, story_key, story_data):
    """Create tasks for a specific story"""
    
    # Define common task templates based on story type
    if "login" in story_data["title"].lower() or "auth" in story_data["title"].lower():
        task_templates = [
            {
                "title": "Design authentication UI components",
                "task_type": "task",
                "estimated_hours": 8,
                "assignee_id": "user-ui-designer",
                "status": "done"
            },
            {
                "title": "Implement backend authentication logic",
                "task_type": "task", 
                "estimated_hours": 16,
                "assignee_id": "user-senior-dev1",
                "status": "done" if story_data["status"] == "done" else "in_progress"
            },
            {
                "title": "Add frontend authentication integration",
                "task_type": "task",
                "estimated_hours": 12,
                "assignee_id": "user-senior-dev2",
                "status": "done" if story_data["status"] == "done" else "in_progress"
            },
            {
                "title": "Write unit tests for authentication",
                "task_type": "task",
                "estimated_hours": 6,
                "assignee_id": "user-qa-engineer1",
                "status": "todo"
            },
            {
                "title": "Conduct security testing",
                "task_type": "task",
                "estimated_hours": 8,
                "assignee_id": "user-qa-engineer1",
                "status": "todo"
            }
        ]
    elif "dark mode" in story_data["title"].lower():
        task_templates = [
            {
                "title": "Design dark theme color palette",
                "task_type": "task",
                "estimated_hours": 4,
                "assignee_id": "user-ui-designer",
                "status": "done"
            },
            {
                "title": "Implement theme switching logic",
                "task_type": "task",
                "estimated_hours": 8,
                "assignee_id": "user-senior-dev2",
                "status": "done"
            },
            {
                "title": "Update all UI components for dark mode",
                "task_type": "task",
                "estimated_hours": 16,
                "assignee_id": "user-dev2",
                "status": "done" if story_data["status"] == "done" else "in_progress"
            },
            {
                "title": "Test theme switching across all screens",
                "task_type": "task",
                "estimated_hours": 6,
                "assignee_id": "user-qa-engineer2",
                "status": "todo"
            }
        ]
    elif "accessibility" in story_data["title"].lower():
        task_templates = [
            {
                "title": "Accessibility audit of current implementation", 
                "task_type": "task",
                "estimated_hours": 12,
                "assignee_id": "user-qa-engineer1",
                "status": "done"
            },
            {
                "title": "Add ARIA labels and semantic HTML",
                "task_type": "task",
                "estimated_hours": 16,
                "assignee_id": "user-dev2",
                "status": "in_progress"
            },
            {
                "title": "Implement keyboard navigation",
                "task_type": "task",
                "estimated_hours": 10,
                "assignee_id": "user-senior-dev2",
                "status": "review"
            },
            {
                "title": "Update color contrast ratios",
                "task_type": "task",
                "estimated_hours": 6,
                "assignee_id": "user-ui-designer",
                "status": "done"
            },
            {
                "title": "Screen reader testing",
                "task_type": "task",
                "estimated_hours": 8,
                "assignee_id": "user-qa-engineer2",
                "status": "todo"
            }
        ]
    else:
        # Default tasks for other stories
        task_templates = [
            {
                "title": f"Implement {story_data['title']} backend logic",
                "task_type": "task",
                "estimated_hours": 12,
                "assignee_id": "user-senior-dev1",
                "status": "in_progress"
            },
            {
                "title": f"Create frontend components for {story_data['title']}",
                "task_type": "task",
                "estimated_hours": 10,
                "assignee_id": "user-senior-dev2",
                "status": "todo"
            },
            {
                "title": f"Write tests for {story_data['title']}",
                "task_type": "task",
                "estimated_hours": 6,
                "assignee_id": "user-qa-engineer1",
                "status": "todo"
            }
        ]
    
    # Create tasks
    for i, task_data in enumerate(task_templates):
        task_id = f"{story_id}-task-{i+1}"
        task_key = f"{story_key}-T{i+1}"
        
        try:
            existing = await conn.fetchrow("SELECT id FROM tasks WHERE id = $1", task_id)
            if existing:
                continue
                
            # Set dates based on status
            created_at = datetime.now() - timedelta(days=random.randint(1, 20))
            started_at = created_at + timedelta(days=random.randint(1, 3)) if task_data['status'] != 'todo' else None
            completed_at = started_at + timedelta(days=random.randint(1, 5)) if task_data['status'] == 'done' else None
            
            await conn.execute("""
                INSERT INTO tasks (id, story_id, title, description, task_key, task_type, status, priority,
                                 estimated_hours, assignee_id, started_at, completed_at, 
                                 created_by, created_at, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
            """, task_id, story_id, task_data["title"], 
                 f"Complete the implementation of {task_data['title'].lower()}",
                 task_key, task_data["task_type"], task_data["status"], "medium",
                 task_data["estimated_hours"], task_data["assignee_id"], 
                 started_at, completed_at, task_data["assignee_id"], created_at, datetime.now())
                 
        except Exception as e:
            print(f"        ❌ Failed to create task {task_data['title']}: {e}")

if __name__ == "__main__":
    asyncio.run(init_db())
    asyncio.run(create_comprehensive_work_items(None)) 