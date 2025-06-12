#!/usr/bin/env python3
"""
Initialize realistic production data for AgileForge
This script populates PostgreSQL with comprehensive sample data for a software development company
"""

import asyncio
import uuid
from datetime import datetime, date, timedelta
from dotenv import load_dotenv
import bcrypt
import random

# Load environment variables first
load_dotenv()

from database.connection import db_manager, init_db

async def init_realistic_data():
    """Initialize comprehensive realistic data"""
    try:
        await init_db()
        
        async with db_manager.get_connection() as conn:
            print("🚀 Initializing realistic production data for AgileForge...")
            
            # 1. Create realistic users first
            users = await create_realistic_users(conn)
            
            # 2. Create projects
            projects = await create_realistic_projects(conn, users)
            
            # 3. Create epics with realistic data
            epics = await create_realistic_epics(conn, projects, users)
            
            # 4. Create comprehensive user stories
            stories = await create_realistic_stories(conn, epics, users)
            
            # 5. Create detailed tasks
            await create_realistic_tasks(conn, stories, users)
            
            # 6. Create enhanced sprints with story assignments
            await create_enhanced_sprints_with_assignments(conn, projects, stories, users)
            
            # 7. Create time tracking data
            await create_time_tracking_data(conn, stories, users)
            
            # 8. Create story comments
            await create_story_comments(conn, stories, users)
            
            # 9. Create activity logs
            await create_activity_logs(conn, stories, users)
            
            print("\n🎉 Realistic production data initialization completed!")
            await print_data_summary(conn)
            
    except Exception as e:
        print(f"❌ Error initializing realistic data: {e}")
        raise

async def create_realistic_users(conn):
    """Create realistic users for a software development company"""
    print("\n👥 Creating realistic users...")
    
    # Hash a default password for testing
    default_password = "SecurePass123!"
    hashed_password = bcrypt.hashpw(default_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    realistic_users = [
        # Leadership Team
        {"email": "sarah.chen@techvision.com", "name": "Sarah Chen", "role": "CEO"},
        {"email": "michael.rodriguez@techvision.com", "name": "Michael Rodriguez", "role": "CTO"},
        
        # Product Team
        {"email": "jennifer.kim@techvision.com", "name": "Jennifer Kim", "role": "Director of Product"},
        {"email": "david.patel@techvision.com", "name": "David Patel", "role": "Senior Product Manager"},
        {"email": "lisa.anderson@techvision.com", "name": "Lisa Anderson", "role": "Product Manager"},
        
        # Engineering Team
        {"email": "alex.thompson@techvision.com", "name": "Alex Thompson", "role": "Engineering Manager"},
        {"email": "maria.gonzalez@techvision.com", "name": "Maria Gonzalez", "role": "Staff Software Engineer"},
        {"email": "james.wilson@techvision.com", "name": "James Wilson", "role": "Senior Software Engineer"},
        {"email": "priya.sharma@techvision.com", "name": "Priya Sharma", "role": "Senior Software Engineer"},
        {"email": "kevin.lee@techvision.com", "name": "Kevin Lee", "role": "Software Engineer"},
        {"email": "emma.johnson@techvision.com", "name": "Emma Johnson", "role": "Software Engineer"},
        
        # Design Team
        {"email": "sophie.martin@techvision.com", "name": "Sophie Martin", "role": "Senior UX Designer"},
        {"email": "carlos.rivera@techvision.com", "name": "Carlos Rivera", "role": "UI Designer"},
        
        # QA Team
        {"email": "rachel.brown@techvision.com", "name": "Rachel Brown", "role": "QA Manager"},
        {"email": "daniel.clark@techvision.com", "name": "Daniel Clark", "role": "Senior QA Engineer"},
        {"email": "amy.davis@techvision.com", "name": "Amy Davis", "role": "QA Engineer"},
        
        # DevOps Team
        {"email": "robert.miller@techvision.com", "name": "Robert Miller", "role": "DevOps Manager"},
        {"email": "natalie.taylor@techvision.com", "name": "Natalie Taylor", "role": "DevOps Engineer"}
    ]
    
    created_users = []
    for user_data in realistic_users:
        try:
            # Check if user already exists
            existing = await conn.fetchrow("SELECT id FROM users WHERE email = $1", user_data["email"])
            if existing:
                print(f"  ⚠️  User {user_data['name']} already exists")
                created_users.append(existing["id"])
                continue
                
            # Split name into first and last name
            name_parts = user_data["name"].split(" ", 1)
            first_name = name_parts[0]
            last_name = name_parts[1] if len(name_parts) > 1 else ""
            
            user_id = await conn.fetchval("""
                INSERT INTO users (id, email, username, first_name, last_name, password_hash, 
                                 is_active, is_verified, created_at, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                RETURNING id
            """, str(uuid.uuid4()), user_data["email"], user_data["email"], first_name, last_name, 
                 hashed_password, True, True, datetime.now(), datetime.now())
            
            created_users.append(user_id)
            print(f"  ✅ Created user: {user_data['name']} ({user_data['role']})")
        except Exception as e:
            print(f"  ❌ Failed to create user {user_data['name']}: {e}")
    
    return created_users

async def create_realistic_projects(conn, users):
    """Create realistic projects for the company"""
    print("\n📁 Creating realistic projects...")
    
    if not users:
        print("  ❌ No users available to assign as project creators")
        return []
    
    realistic_projects = [
        {
            "name": "Mobile App 2.0 Redesign",
            "key": "MOBILE",
            "description": "Complete redesign of our mobile application with improved UX, performance optimizations, and new features based on user feedback from 10,000+ users.",
            "status": "in_progress",
            "priority": "high",
            "progress": 65
        },
        {
            "name": "Platform API v3",
            "key": "PLAT",
            "description": "Next generation platform API with GraphQL, improved authentication, rate limiting, and comprehensive documentation for external developers.",
            "status": "in_progress",
            "priority": "high",
            "progress": 40
        },
        {
            "name": "Analytics Dashboard",
            "key": "DASH",
            "description": "Real-time analytics dashboard for business users with customizable widgets, reporting capabilities, and data visualization for actionable insights.",
            "status": "in_progress",
            "priority": "medium",
            "progress": 30
        }
    ]
    
    created_projects = []
    for project_data in realistic_projects:
        try:
            # Check if project already exists
            existing = await conn.fetchrow("SELECT id FROM projects WHERE key = $1", project_data["key"])
            if existing:
                print(f"  ⚠️  Project {project_data['name']} already exists")
                created_projects.append(existing["id"])
                continue
                
            start_date = datetime.now() - timedelta(days=random.randint(30, 120))
            target_end_date = start_date + timedelta(days=random.randint(90, 180))
            
            project_id = await conn.fetchval("""
                INSERT INTO projects (id, organization_id, name, key, description, status, priority, progress, 
                                    start_date, target_end_date, created_by, created_at, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
                RETURNING id
            """, str(uuid.uuid4()), "default-org", project_data["name"], project_data["key"], project_data["description"],
                 project_data["status"], project_data["priority"], project_data["progress"],
                 start_date.date(), target_end_date.date(), random.choice(users),
                 datetime.now(), datetime.now())
            
            created_projects.append(project_id)
            print(f"  ✅ Created project: {project_data['name']} ({project_data['key']})")
        except Exception as e:
            print(f"  ❌ Failed to create project {project_data['name']}: {e}")
    
    return created_projects

async def create_realistic_epics(conn, projects, users):
    """Create realistic epics for the projects"""
    print("\n📈 Creating realistic epics...")
    
    if not projects or not users:
        print("  ❌ No projects or users available")
        return []
    
    realistic_epics = [
        {
            "project_id": projects[0],
            "title": "User Onboarding & Authentication Redesign",
            "description": "Redesign the user onboarding experience with improved authentication flow, biometric login, social login integration, and personalized welcome experience to reduce user drop-off.",
            "epic_key": "MOBILE-1",
            "status": "in_progress",
            "priority": "high",
            "estimated_story_points": 34,
            "actual_story_points": 21
        },
        {
            "project_id": projects[0],
            "title": "Core Feature Performance & Accessibility",
            "description": "Redesign core application features with improved performance, WCAG 2.1 AA accessibility compliance, offline functionality, and dark mode support.",
            "epic_key": "MOBILE-2",
            "status": "in_progress", 
            "priority": "high",
            "estimated_story_points": 55,
            "actual_story_points": 34
        }
    ]
    
    if len(projects) > 1:
        realistic_epics.extend([
            {
                "project_id": projects[1],
                "title": "Authentication & Authorization System",
                "description": "Implement robust OAuth2 authentication, JWT token management, role-based access control (RBAC), and comprehensive API security measures.",
                "epic_key": "PLAT-1",
                "status": "done",
                "priority": "critical",
                "estimated_story_points": 42,
                "actual_story_points": 45
            },
            {
                "project_id": projects[1],
                "title": "GraphQL API Implementation",
                "description": "Build comprehensive GraphQL API with type-safe schema, optimized resolvers, real-time subscriptions, and comprehensive developer documentation.",
                "epic_key": "PLAT-2",
                "status": "in_progress",
                "priority": "high",
                "estimated_story_points": 68,
                "actual_story_points": 34
            }
        ])
    
    if len(projects) > 2:
        realistic_epics.extend([
            {
                "project_id": projects[2],
                "title": "Real-time Analytics Engine",
                "description": "Build scalable real-time analytics processing with streaming data pipelines, customizable dashboards, and automated insights generation.",
                "epic_key": "DASH-1",
                "status": "in_progress",
                "priority": "high",
                "estimated_story_points": 89,
                "actual_story_points": 25
            },
            {
                "project_id": projects[2],
                "title": "Advanced Visualization Components",
                "description": "Create interactive data visualization components with drill-down capabilities, export functionality, and responsive design for mobile devices.",
                "epic_key": "DASH-2",
                "status": "backlog",
                "priority": "medium",
                "estimated_story_points": 55,
                "actual_story_points": 0
            }
        ])
    
    created_epics = []
    for epic_data in realistic_epics:
        try:
            # Check if epic already exists
            existing = await conn.fetchrow("SELECT id FROM epics WHERE epic_key = $1", epic_data["epic_key"])
            if existing:
                print(f"  ⚠️  Epic {epic_data['title']} already exists")
                created_epics.append(existing["id"])
                continue
                
            start_date = datetime.now() - timedelta(days=random.randint(10, 60))
            target_end_date = start_date + timedelta(days=random.randint(30, 90))
            
            epic_id = await conn.fetchval("""
                INSERT INTO epics (id, project_id, title, description, epic_key, status, priority,
                                 estimated_story_points, actual_story_points, start_date, target_end_date,
                                 created_by, created_at, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
                RETURNING id
            """, str(uuid.uuid4()), epic_data["project_id"], epic_data["title"], epic_data["description"],
                 epic_data["epic_key"], epic_data["status"], epic_data["priority"],
                 epic_data["estimated_story_points"], epic_data["actual_story_points"],
                 start_date.date(), target_end_date.date(), random.choice(users),
                 datetime.now(), datetime.now())
            
            created_epics.append(epic_id)
            print(f"  ✅ Created epic: {epic_data['title']}")
        except Exception as e:
            print(f"  ❌ Failed to create epic {epic_data['title']}: {e}")
    
    return created_epics

async def create_realistic_stories(conn, epics, users):
    """Create comprehensive user stories with detailed acceptance criteria"""
    print("\n📋 Creating realistic user stories...")
    
    if not epics or not users:
        print("  ❌ No epics or users available")
        return []
    
    # Temporarily disable problematic triggers
    custom_triggers = [
        'trigger_log_story_activity',
        'trigger_story_assignment_notification', 
        'trigger_update_project_progress'
    ]
    
    try:
        for trigger in custom_triggers:
            await conn.execute(f"ALTER TABLE stories DISABLE TRIGGER {trigger}")
        print("  🔧 Temporarily disabled story triggers")
        
        realistic_stories = [
            {
                "epic_id": epics[0],
                "title": "Social Login Integration (OAuth2)",
                "story_key": "MOBILE-1-1",
                "as_a": "new user",
                "i_want": "to sign up and log in using my existing Google, Apple, or Facebook account",
                "so_that": "I can quickly create an account without manually entering personal details and passwords",
                "acceptance_criteria": """GIVEN I am on the registration/login screen
WHEN I tap "Continue with Google", "Continue with Apple", or "Continue with Facebook"
THEN I should be redirected to the respective OAuth provider
AND after successful authentication, my account should be created/accessed automatically
AND my basic profile information (name, email, avatar) should be populated
AND I should be directed to the onboarding flow or main app""",
                "story_points": 8,
                "priority": "high",
                "status": "done"
            },
            {
                "epic_id": epics[0],
                "title": "Biometric Authentication Setup & Management",
                "story_key": "MOBILE-1-2",
                "as_a": "security-conscious user",
                "i_want": "to enable and use Face ID, Touch ID, or fingerprint authentication",
                "so_that": "I can securely and conveniently access my account without typing passwords",
                "acceptance_criteria": """GIVEN I have completed initial account setup
WHEN I am prompted to enable biometric authentication
THEN I should see clear explanation of security benefits
AND I should be able to enable Face ID, Touch ID, or Android fingerprint
AND biometric data should never leave the device
AND fallback authentication should always be available""",
                "story_points": 5,
                "priority": "high", 
                "status": "in_progress"
            },
            {
                "epic_id": epics[0],
                "title": "Interactive Onboarding Tutorial",
                "story_key": "MOBILE-1-3",
                "as_a": "new user",
                "i_want": "to see an interactive tutorial that demonstrates key app features",
                "so_that": "I understand how to use the app effectively and feel confident getting started",
                "acceptance_criteria": """GIVEN I have completed account setup
WHEN I start the onboarding tutorial
THEN I should see engaging demonstrations of key features
AND I should be able to skip or replay tutorial steps
AND my progress should be saved if I exit early
AND I should be able to access the tutorial later from settings""",
                "story_points": 13,
                "priority": "medium",
                "status": "backlog"
            }
        ]
        
        if len(epics) > 1:
            realistic_stories.extend([
                {
                    "epic_id": epics[1],
                    "title": "Dark Mode Implementation",
                    "story_key": "MOBILE-2-1",
                    "as_a": "user who works in various lighting conditions",
                    "i_want": "to switch between light and dark themes",
                    "so_that": "I can use the app comfortably in different environments and reduce eye strain",
                    "acceptance_criteria": """GIVEN I am using the app
WHEN I go to settings and toggle dark mode
THEN all screens should switch to dark theme with proper contrast
AND the setting should persist across app sessions
AND system theme preference should be respected by default""",
                    "story_points": 8,
                    "priority": "medium",
                    "status": "done"
                },
                {
                    "epic_id": epics[1],
                    "title": "Offline Functionality for Core Features",
                    "story_key": "MOBILE-2-2",
                    "as_a": "mobile user with intermittent connectivity",
                    "i_want": "to access and use core app features when offline",
                    "so_that": "I can continue being productive even without internet connection",
                    "acceptance_criteria": """GIVEN I am using the app with internet connection
WHEN I lose internet connectivity
THEN core features should remain accessible with cached data
AND I should see clear indicators of offline status
AND changes should be queued for sync when online""",
                    "story_points": 21,
                    "priority": "high",
                    "status": "in_progress"
                }
            ])
        
        if len(epics) > 2:
            realistic_stories.extend([
                {
                    "epic_id": epics[2],
                    "title": "OAuth2 Authentication Flow Implementation",
                    "story_key": "PLAT-1-1",
                    "as_a": "third-party developer",
                    "i_want": "to implement OAuth2 authentication to access platform APIs",
                    "so_that": "my application can securely access user data with proper permissions",
                    "acceptance_criteria": """GIVEN I am a third-party developer with a registered application
WHEN I initiate the OAuth2 authorization code flow
THEN users should be redirected to our secure authorization server
AND users should see clear information about my app and requested permissions
AND I should receive valid access and refresh tokens upon user approval""",
                    "story_points": 13,
                    "priority": "critical",
                    "status": "done"
                },
                {
                    "epic_id": epics[2],
                    "title": "JWT Token Management System",
                    "story_key": "PLAT-1-2",
                    "as_a": "API user",
                    "i_want": "secure JWT tokens with automatic refresh capabilities",
                    "so_that": "my session remains active without manual re-authentication",
                    "acceptance_criteria": """GIVEN I have authenticated with the platform
WHEN my access token approaches expiration
THEN the system should automatically refresh the token
AND the new token should maintain my permissions
AND the process should be transparent to my application""",
                    "story_points": 8,
                    "priority": "high",
                    "status": "done"
                },
                {
                    "epic_id": epics[2],
                    "title": "Role-Based Access Control (RBAC)",
                    "story_key": "PLAT-1-3",
                    "as_a": "system administrator",
                    "i_want": "to manage user permissions with granular role-based controls",
                    "so_that": "users can only access resources appropriate to their role",
                    "acceptance_criteria": """GIVEN I am a system administrator
WHEN I assign roles to users
THEN users should only access permitted resources
AND permissions should be enforced at API level
AND unauthorized access attempts should be logged""",
                    "story_points": 21,
                    "priority": "critical",
                    "status": "in_progress"
                }
            ])
        
        # Add more stories for additional epics if they exist
        if len(epics) > 3:
            realistic_stories.extend([
                {
                    "epic_id": epics[3],
                    "title": "GraphQL Schema Design & Implementation",
                    "story_key": "PLAT-2-1",
                    "as_a": "frontend developer",
                    "i_want": "a type-safe GraphQL API with comprehensive schema",
                    "so_that": "I can efficiently query exactly the data I need",
                    "acceptance_criteria": """GIVEN I am a frontend developer
WHEN I query the GraphQL API
THEN I should receive strongly-typed responses
AND the schema should be self-documenting
AND I should be able to introspect all available operations""",
                    "story_points": 13,
                    "priority": "high",
                    "status": "in_progress"
                },
                {
                    "epic_id": epics[3],
                    "title": "Real-time GraphQL Subscriptions",
                    "story_key": "PLAT-2-2", 
                    "as_a": "application developer",
                    "i_want": "real-time data updates through GraphQL subscriptions",
                    "so_that": "my application can react to data changes instantly",
                    "acceptance_criteria": """GIVEN I have subscribed to data changes
WHEN relevant data is updated on the server
THEN I should receive real-time notifications
AND the subscription should handle connection failures gracefully
AND I should be able to filter subscription events""",
                    "story_points": 21,
                    "priority": "high",
                    "status": "backlog"
                }
            ])
        
        # Add analytics dashboard stories if analytics epics exist
        if len(epics) > 4:
            realistic_stories.extend([
                {
                    "epic_id": epics[4],
                    "title": "Streaming Data Pipeline Implementation",
                    "story_key": "DASH-1-1",
                    "as_a": "business analyst",
                    "i_want": "real-time data processing for immediate insights",
                    "so_that": "I can make data-driven decisions without delays",
                    "acceptance_criteria": """GIVEN data is being generated by applications
WHEN events occur in real-time
THEN the analytics pipeline should process them immediately
AND processed data should be available in dashboards within 30 seconds
AND the system should handle high-volume event streams""",
                    "story_points": 34,
                    "priority": "high",
                    "status": "in_progress"
                },
                {
                    "epic_id": epics[4],
                    "title": "Automated Insights Generation",
                    "story_key": "DASH-1-2",
                    "as_a": "business user",
                    "i_want": "automated insights and anomaly detection",
                    "so_that": "I can identify trends and issues without manual analysis",
                    "acceptance_criteria": """GIVEN sufficient historical data exists
WHEN patterns or anomalies are detected
THEN the system should generate automated insights
AND insights should include confidence levels and recommendations
AND users should be notified of significant findings""",
                    "story_points": 21,
                    "priority": "medium",
                    "status": "backlog"
                }
            ])
        
        if len(epics) > 5:
            realistic_stories.extend([
                {
                    "epic_id": epics[5],
                    "title": "Interactive Chart Components",
                    "story_key": "DASH-2-1",
                    "as_a": "dashboard user",
                    "i_want": "interactive charts with drill-down capabilities",
                    "so_that": "I can explore data at different levels of detail",
                    "acceptance_criteria": """GIVEN I am viewing a dashboard chart
WHEN I click on data points or segments
THEN I should be able to drill down to more detailed views
AND the interface should provide breadcrumb navigation
AND drill-down operations should be performant""",
                    "story_points": 13,
                    "priority": "medium",
                    "status": "backlog"
                },
                {
                    "epic_id": epics[5],
                    "title": "Dashboard Export & Sharing",
                    "story_key": "DASH-2-2",
                    "as_a": "team lead",
                    "i_want": "to export and share dashboard reports",
                    "so_that": "I can include insights in presentations and reports",
                    "acceptance_criteria": """GIVEN I have configured a dashboard view
WHEN I choose to export or share
THEN I should be able to generate PDF, PNG, or shareable links
AND exported content should maintain visual formatting
AND shared links should respect access permissions""",
                    "story_points": 8,
                    "priority": "medium",
                    "status": "backlog"
                }
            ])
        
        created_stories = []
        for story_data in realistic_stories:
            # Check if story already exists
            existing = await conn.fetchrow("SELECT id FROM stories WHERE story_key = $1", story_data["story_key"])
            if existing:
                print(f"  ⚠️  Story {story_data['title']} already exists")
                created_stories.append(existing["id"])
                continue
                
            # Set realistic dates based on status
            created_at = datetime.now() - timedelta(days=random.randint(5, 30))
            due_date = datetime.now() + timedelta(days=random.randint(7, 30))
            
            story_id = await conn.fetchval("""
                INSERT INTO stories (id, epic_id, title, story_key, as_a, i_want, so_that,
                                   acceptance_criteria, story_points, priority, status, 
                                   assignee_id, reporter_id, due_date, created_by, created_at, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
                RETURNING id
            """, str(uuid.uuid4()), story_data["epic_id"], story_data["title"], story_data["story_key"],
                 story_data["as_a"], story_data["i_want"], story_data["so_that"],
                 story_data["acceptance_criteria"], story_data["story_points"],
                 story_data["priority"], story_data["status"], random.choice(users),
                 random.choice(users), due_date, random.choice(users), created_at, datetime.now())
            
            created_stories.append(story_id)
            print(f"  ✅ Created story: {story_data['title']} ({story_data['story_points']} pts)")
            
    except Exception as e:
        print(f"  ❌ Error during story creation: {e}")
    finally:
        # Re-enable triggers
        for trigger in custom_triggers:
            try:
                await conn.execute(f"ALTER TABLE stories ENABLE TRIGGER {trigger}")
            except Exception as e:
                print(f"  ⚠️  Failed to re-enable {trigger}: {e}")
        print("  🔧 Re-enabled story triggers")
    
    return created_stories

async def create_realistic_tasks(conn, stories, users):
    """Create realistic tasks for each story"""
    print("\n✅ Creating realistic tasks...")
    
    if not stories or not users:
        print("  ❌ No stories or users available")
        return
    
    task_count = 0
    for story_id in stories:
        # Get story details for task generation
        story = await conn.fetchrow("SELECT id, title, story_key FROM stories WHERE id = $1", story_id)
        if not story:
            continue
            
        # Generate tasks based on story type
        if "oauth" in story["title"].lower() or "authentication" in story["title"].lower():
            task_templates = [
                {"title": "Research OAuth2 security best practices", "description": "Evaluate OAuth2 libraries and security implications", "status": "done"},
                {"title": "Design OAuth2 flow architecture", "description": "Design complete OAuth2 flow including token storage", "status": "done"},
                {"title": "Implement OAuth2 authorization endpoints", "description": "Build authorization server with proper token management", "status": "done"},
                {"title": "Create OAuth2 client registration", "description": "Build admin interface for registering third-party applications", "status": "in_progress"},
                {"title": "Write OAuth2 security tests", "description": "Create comprehensive test suite for OAuth2 flows", "status": "todo"}
            ]
        elif "biometric" in story["title"].lower():
            task_templates = [
                {"title": "Research biometric authentication APIs", "description": "Evaluate iOS and Android biometric APIs", "status": "done"},
                {"title": "Design biometric enrollment UI", "description": "Create user interface for biometric setup", "status": "done"},
                {"title": "Implement iOS Face ID integration", "description": "Native iOS biometric authentication", "status": "in_progress"},
                {"title": "Implement Android fingerprint", "description": "Android biometric authentication", "status": "todo"},
                {"title": "Add biometric settings management", "description": "Settings interface for biometric authentication", "status": "todo"}
            ]
        elif "dark mode" in story["title"].lower():
            task_templates = [
                {"title": "Design dark theme color palette", "description": "Create comprehensive dark theme colors", "status": "done"},
                {"title": "Implement theme switching", "description": "Build theme switching system", "status": "done"},
                {"title": "Update UI components for dark mode", "description": "Modify all components for theme support", "status": "done"},
                {"title": "Test theme switching", "description": "Comprehensive testing of theme functionality", "status": "todo"}
            ]
        else:
            # Default task templates
            task_templates = [
                {"title": f"Design implementation for {story['title'][:30]}", "description": f"Create technical design for {story['title']}", "status": "done"},
                {"title": f"Implement core functionality", "description": f"Build main functionality for {story['title']}", "status": "in_progress"},
                {"title": f"Create UI components", "description": f"Build user interface components", "status": "todo"},
                {"title": f"Write comprehensive tests", "description": f"Create test suite for {story['title']}", "status": "todo"}
            ]
        
        # Create tasks for this story
        for task_data in task_templates:
            try:
                await conn.execute("""
                    INSERT INTO tasks (id, title, description, story_id, assignee_id, status, created_at, updated_at)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                """, str(uuid.uuid4()), task_data["title"], task_data["description"], story_id,
                     random.choice(users), task_data["status"], datetime.now(), datetime.now())
                task_count += 1
                
            except Exception as e:
                print(f"    ❌ Failed to create task: {e}")
                
    print(f"  ✅ Created {task_count} realistic tasks")

async def create_realistic_sprints(conn, projects, stories, users):
    """Create realistic sprints and assign stories"""
    print("\n🏃‍♂️ Creating realistic sprints...")
    
    if not projects or not users:
        print("  ❌ No projects or users available")
        return
    
    # Create 2 sprints per project
    sprint_count = 0
    for project_id in projects[:2]:  # Only for first 2 projects
        for sprint_num in range(1, 3):
            try:
                start_date = datetime.now() - timedelta(days=14 * sprint_num)
                end_date = start_date + timedelta(days=14)
                
                status = "completed" if sprint_num == 1 else "active"
                
                await conn.execute("""
                    INSERT INTO sprints (id, name, project_id, sprint_number, start_date, end_date, goal, status, created_at, updated_at)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                """, str(uuid.uuid4()), f"Sprint {sprint_num}", project_id, sprint_num, start_date.date(), end_date.date(),
                     f"Complete key features for sprint {sprint_num} delivery", status,
                     datetime.now(), datetime.now())
                
                sprint_count += 1
                print(f"  ✅ Created Sprint {sprint_num} for project")
            except Exception as e:
                print(f"  ❌ Failed to create sprint: {e}")
    
    print(f"  ✅ Created {sprint_count} sprints")

async def create_enhanced_sprints_with_assignments(conn, projects, stories, users):
    """Create realistic sprints with proper story assignments and velocity tracking"""
    print("\n🏃‍♂️ Creating enhanced sprints with story assignments...")
    
    if not projects or not users:
        print("  ❌ No projects or users available")
        return
    
    # Create multiple sprint cycles for each project
    sprint_count = 0
    for project_id in projects:
        # Get stories for this project
        project_stories = await conn.fetch("""
            SELECT s.id FROM stories s 
            JOIN epics e ON s.epic_id = e.id 
            WHERE e.project_id = $1
        """, project_id)
        
        if not project_stories:
            continue
            
        story_ids = [story["id"] for story in project_stories]
        
        # Create 4 sprints per project (past, current, planned)
        for sprint_num in range(1, 5):
            days_offset = 14 * (sprint_num - 2)  # Sprint 2 is current
            start_date = datetime.now() - timedelta(days=days_offset)
            end_date = start_date + timedelta(days=14)
            
            # Determine sprint status based on dates
            if sprint_num == 1:
                status = "completed"
                goal = "Complete user authentication and core UI components"
            elif sprint_num == 2:
                status = "active"
                goal = "Implement offline functionality and performance optimizations"
            elif sprint_num == 3:
                status = "planned"
                goal = "Add advanced features and comprehensive testing"
            else:
                status = "planned"
                goal = "Polish, deployment preparation, and documentation"
            
            try:
                sprint_id = await conn.fetchval("""
                    INSERT INTO sprints (id, name, project_id, sprint_number, start_date, end_date, 
                                       goal, status, created_at, updated_at)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                    RETURNING id
                """, str(uuid.uuid4()), f"Sprint {sprint_num}", project_id, sprint_num, 
                     start_date.date(), end_date.date(), goal, status,
                     datetime.now(), datetime.now())
                
                # Assign stories to sprint based on realistic patterns
                if sprint_num <= 2:  # Only assign to past and current sprints
                    stories_per_sprint = min(len(story_ids) // 3, 3)  # Max 3 stories per sprint
                    selected_stories = random.sample(story_ids, min(stories_per_sprint, len(story_ids)))
                    
                    for story_id in selected_stories:
                        await conn.execute("""
                            UPDATE stories SET sprint_id = $1 WHERE id = $2
                        """, sprint_id, story_id)
                        story_ids.remove(story_id)  # Don't reuse stories
                
                sprint_count += 1
                print(f"  ✅ Created {goal[:50]}... ({status})")
                
            except Exception as e:
                print(f"  ❌ Failed to create sprint: {e}")
    
    print(f"  ✅ Created {sprint_count} enhanced sprints with assignments")

async def create_time_tracking_data(conn, stories, users):
    """Create realistic time tracking entries for stories and tasks"""
    print("\n⏱️  Creating realistic time tracking data...")
    
    if not stories or not users:
        print("  ❌ No stories or users available")
        return

    time_entries_count = 0
    
    # Get all tasks for the stories
    tasks = await conn.fetch("""
        SELECT t.id, t.title, t.story_id, t.assignee_id, t.status, s.story_points
        FROM tasks t 
        JOIN stories s ON t.story_id = s.id 
        WHERE s.id = ANY($1)
    """, stories)
    
    for task in tasks:
        # Create multiple time entries per task to simulate realistic work patterns
        entries_per_task = random.randint(2, 8)  # 2-8 time entries per task
        
        for _ in range(entries_per_task):
            # Generate realistic work patterns
            work_date = datetime.now() - timedelta(days=random.randint(1, 30))
            
            # Realistic time durations (in minutes)
            if task["status"] == "done":
                duration = random.choice([30, 45, 60, 90, 120, 180, 240])  # Completed work
            elif task["status"] == "in_progress":
                duration = random.choice([15, 30, 45, 60, 90])  # Ongoing work
            else:
                continue  # No time for todo tasks
            
            # Realistic work descriptions
            descriptions = [
                f"Implementing core functionality for {task['title'][:30]}",
                f"Code review and testing for {task['title'][:20]}",
                f"Bug fixes and optimizations",
                f"Writing unit tests and documentation",
                f"Debugging and performance tuning",
                f"API integration and error handling",
                f"UI/UX improvements and accessibility",
                f"Security review and vulnerability fixes"
            ]
            
            try:
                await conn.execute("""
                    INSERT INTO time_entries (id, task_id, user_id, duration_minutes, description, 
                                            date_logged, created_at, updated_at)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                """, str(uuid.uuid4()), task["id"], task["assignee_id"], duration,
                     random.choice(descriptions), work_date.date(), datetime.now(), datetime.now())
                
                time_entries_count += 1
                
            except Exception as e:
                # Skip if time_entries table doesn't exist
                if "relation \"time_entries\" does not exist" in str(e):
                    print("  ⚠️  Time entries table not found - skipping time tracking")
                    return
                print(f"  ❌ Failed to create time entry: {e}")
    
    print(f"  ✅ Created {time_entries_count} realistic time tracking entries")

async def create_story_comments(conn, stories, users):
    """Create realistic comments and discussions on stories"""
    print("\n💬 Creating realistic story comments and discussions...")
    
    if not stories or not users:
        print("  ❌ No stories or users available")
        return

    comments_count = 0
    
    # Realistic comment templates
    comment_templates = [
        "I've reviewed the acceptance criteria and they look comprehensive. Should we also consider edge cases for network failures?",
        "The design mockups are ready for this story. I've shared them in Figma - please review before implementation.",
        "Started working on this story. The OAuth integration is more complex than expected due to Apple's recent API changes.",
        "Code review completed. Left a few minor suggestions for improvement, but overall implementation looks solid.",
        "QA testing revealed an issue with the biometric fallback. Created a bug ticket - MOBILE-BUG-123.",
        "This story has been successfully deployed to staging. Ready for stakeholder review.",
        "Performance tests show significant improvement - 40% faster load times compared to previous version.",
        "Documentation has been updated to reflect the new authentication flow. API docs are now live.",
        "Security review passed with minor recommendations. All suggested changes have been implemented.",
        "Demo went well with stakeholders. They've requested one additional feature for the next sprint."
    ]
    
    for story_id in stories:
        # Each story gets 2-5 comments to simulate realistic collaboration
        num_comments = random.randint(2, 5)
        
        for i in range(num_comments):
            comment_date = datetime.now() - timedelta(days=random.randint(1, 20))
            
            try:
                await conn.execute("""
                    INSERT INTO comments (id, story_id, user_id, content, created_at, updated_at)
                    VALUES ($1, $2, $3, $4, $5, $6)
                """, str(uuid.uuid4()), story_id, random.choice(users), 
                     random.choice(comment_templates), comment_date, datetime.now())
                
                comments_count += 1
                
            except Exception as e:
                # Skip if comments table doesn't exist
                if "relation \"comments\" does not exist" in str(e):
                    print("  ⚠️  Comments table not found - skipping comments")
                    return
                print(f"  ❌ Failed to create comment: {e}")
    
    print(f"  ✅ Created {comments_count} realistic story comments")

async def create_activity_logs(conn, stories, users):
    """Create realistic activity logs for stories and projects"""
    print("\n📊 Creating realistic activity logs...")
    
    if not stories or not users:
        print("  ❌ No stories or users available")
        return

    activities_count = 0
    
    # Realistic activity types and descriptions
    activities = [
        {"action": "story_created", "description": "Story created and added to backlog"},
        {"action": "story_assigned", "description": "Story assigned to team member"},
        {"action": "status_changed", "description": "Story status changed from 'backlog' to 'in_progress'"},
        {"action": "status_changed", "description": "Story status changed from 'in_progress' to 'done'"},
        {"action": "story_updated", "description": "Story acceptance criteria updated"},
        {"action": "points_estimated", "description": "Story points estimated during planning"},
        {"action": "comment_added", "description": "Comment added to story discussion"},
        {"action": "sprint_assigned", "description": "Story added to current sprint"},
        {"action": "task_completed", "description": "Related task marked as completed"},
        {"action": "code_reviewed", "description": "Code review completed for story implementation"}
    ]
    
    for story_id in stories:
        # Each story gets 5-10 activity entries
        num_activities = random.randint(5, 10)
        
        for i in range(num_activities):
            activity = random.choice(activities)
            activity_date = datetime.now() - timedelta(days=random.randint(1, 25))
            
            try:
                await conn.execute("""
                    INSERT INTO activity_logs (id, story_id, user_id, action, description, created_at)
                    VALUES ($1, $2, $3, $4, $5, $6)
                """, str(uuid.uuid4()), story_id, random.choice(users), 
                     activity["action"], activity["description"], activity_date)
                
                activities_count += 1
                
            except Exception as e:
                # Skip if activity_logs table doesn't exist
                if "relation \"activity_logs\" does not exist" in str(e):
                    print("  ⚠️  Activity logs table not found - skipping activity logs")
                    return
                print(f"  ❌ Failed to create activity log: {e}")
    
    print(f"  ✅ Created {activities_count} realistic activity log entries")

async def print_data_summary(conn):
    """Print comprehensive summary of created data"""
    try:
        users_count = await conn.fetchval("SELECT COUNT(*) FROM users")
        projects_count = await conn.fetchval("SELECT COUNT(*) FROM projects")
        epics_count = await conn.fetchval("SELECT COUNT(*) FROM epics")
        stories_count = await conn.fetchval("SELECT COUNT(*) FROM stories")
        tasks_count = await conn.fetchval("SELECT COUNT(*) FROM tasks")
        sprints_count = await conn.fetchval("SELECT COUNT(*) FROM sprints")
        
        # Try to get additional metrics if tables exist
        try:
            comments_count = await conn.fetchval("SELECT COUNT(*) FROM comments")
        except:
            comments_count = "N/A (table not found)"
            
        try:
            time_entries_count = await conn.fetchval("SELECT COUNT(*) FROM time_entries")
        except:
            time_entries_count = "N/A (table not found)"
            
        try:
            activity_logs_count = await conn.fetchval("SELECT COUNT(*) FROM activity_logs")
        except:
            activity_logs_count = "N/A (table not found)"
        
        print(f"\n🎉 COMPREHENSIVE DATA SUMMARY:")
        print(f"=" * 50)
        print(f"  👥 Users: {users_count} (Development team with realistic roles)")
        print(f"  📁 Projects: {projects_count} (Mobile App, Platform API, Analytics)")
        print(f"  📈 Epics: {epics_count} (Feature-complete with story points)")
        print(f"  📋 Stories: {stories_count} (Detailed with acceptance criteria)")
        print(f"  ✅ Tasks: {tasks_count} (Implementation tasks)")
        print(f"  🏃‍♂️ Sprints: {sprints_count} (Multi-cycle with assignments)")
        print(f"  💬 Comments: {comments_count}")
        print(f"  ⏱️  Time Entries: {time_entries_count}")
        print(f"  📊 Activity Logs: {activity_logs_count}")
        
        # Show story distribution by status
        story_stats = await conn.fetch("""
            SELECT status, COUNT(*) as count, SUM(story_points) as total_points
            FROM stories 
            GROUP BY status 
            ORDER BY count DESC
        """)
        
        print(f"\n📊 STORY DISTRIBUTION:")
        for stat in story_stats:
            print(f"  • {stat['status'].title()}: {stat['count']} stories ({stat['total_points']} points)")
        
        # Show project progress
        project_progress = await conn.fetch("""
            SELECT p.name, p.key, COUNT(s.id) as story_count, 
                   AVG(s.story_points) as avg_points,
                   COUNT(CASE WHEN s.status = 'done' THEN 1 END) as completed_stories
            FROM projects p 
            LEFT JOIN epics e ON p.id = e.project_id 
            LEFT JOIN stories s ON e.id = s.epic_id 
            GROUP BY p.id, p.name, p.key
            ORDER BY story_count DESC
        """)
        
        print(f"\n🎯 PROJECT METRICS:")
        for project in project_progress:
            completion_rate = 0
            if project['story_count'] > 0:
                completion_rate = (project['completed_stories'] / project['story_count']) * 100
            print(f"  • {project['key']}: {project['story_count']} stories, {completion_rate:.1f}% complete")
        
        # Show team members and their assignments
        user_assignments = await conn.fetch("""
            SELECT u.first_name, u.last_name, 
                   COUNT(s.id) as assigned_stories,
                   COUNT(t.id) as assigned_tasks
            FROM users u 
            LEFT JOIN stories s ON u.id = s.assignee_id 
            LEFT JOIN tasks t ON u.id = t.assignee_id 
            GROUP BY u.id, u.first_name, u.last_name
            HAVING COUNT(s.id) > 0 OR COUNT(t.id) > 0
            ORDER BY assigned_stories DESC, assigned_tasks DESC
            LIMIT 8
        """)
        
        print(f"\n👥 TEAM WORKLOAD (Top Contributors):")
        for user in user_assignments:
            full_name = f"{user['first_name']} {user['last_name']}"
            print(f"  • {full_name}: {user['assigned_stories']} stories, {user['assigned_tasks']} tasks")
        
        # Show sample stories across projects
        sample_stories = await conn.fetch("""
            SELECT s.title, s.story_key, s.status, s.story_points, e.epic_key, p.key as project_key
            FROM stories s 
            JOIN epics e ON s.epic_id = e.id 
            JOIN projects p ON e.project_id = p.id 
            ORDER BY s.created_at DESC 
            LIMIT 8
        """)
        
        print(f"\n📋 SAMPLE STORIES:")
        for story in sample_stories:
            status_emoji = {"done": "✅", "in_progress": "🔄", "backlog": "📝"}.get(story['status'], "❓")
            print(f"  {status_emoji} {story['story_key']}: {story['title'][:50]}... ({story['story_points']} pts)")
        
        # Show sprint information
        sprint_info = await conn.fetch("""
            SELECT s.name, s.status, s.goal, COUNT(st.id) as story_count
            FROM sprints s 
            LEFT JOIN stories st ON s.id = st.sprint_id
            GROUP BY s.id, s.name, s.status, s.goal
            ORDER BY s.sprint_number
            LIMIT 6
        """)
        
        print(f"\n🏃‍♂️ SPRINT OVERVIEW:")
        for sprint in sprint_info:
            status_emoji = {"completed": "✅", "active": "🔄", "planned": "📋"}.get(sprint['status'], "❓")
            print(f"  {status_emoji} {sprint['name']}: {sprint['story_count']} stories - {sprint['goal'][:40]}...")
        
        print(f"\n🎯 READY FOR DEVELOPMENT!")
        print(f"Your AgileForge application now has realistic production data")
        print(f"with comprehensive user stories, sprint planning, and team collaboration!")
        
    except Exception as e:
        print(f"❌ Error getting data summary: {e}")

if __name__ == "__main__":
    asyncio.run(init_realistic_data()) 