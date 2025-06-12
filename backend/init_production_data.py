#!/usr/bin/env python3
"""
Initialize production-ready sample data for AgileForge
This script creates realistic data as if input by actual users in a software development company.
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

# Sample data constants
COMPANY_NAME = "TechVision Solutions"
DEPARTMENTS = ["Engineering", "Product", "Design", "QA", "DevOps", "Marketing"]
LOCATIONS = ["San Francisco, CA", "Austin, TX", "Seattle, WA", "Remote", "New York, NY"]

async def init_production_data():
    """Initialize comprehensive production-ready sample data"""
    try:
        await init_db()
        
        async with db_manager.get_connection() as conn:
            print("🚀 Initializing production-ready sample data...")
            
            # Check if default organization exists
            org = await conn.fetchrow("SELECT * FROM organizations WHERE id = $1", "default-org")
            if not org:
                print("❌ Default organization not found. Please run create_default_org.py first.")
                return
            
            print(f"✅ Found organization: {org['name']}")
            
            # Generate realistic users
            await create_realistic_users(conn)
            
            # Create teams with realistic structure
            await create_realistic_teams(conn)
            
            # Create multiple projects
            await create_multiple_projects(conn)
            
            # Create comprehensive epics, stories, and tasks
            await create_comprehensive_work_items(conn)
            
            # Create sprints and releases
            await create_sprints_and_releases(conn)
            
            # Add realistic comments and activities
            await create_realistic_interactions(conn)
            
            print("\n🎉 Production-ready sample data initialization completed!")
            
    except Exception as e:
        print(f"❌ Error initializing production data: {e}")
        raise

async def create_realistic_users(conn):
    """Create a realistic set of users for a software company"""
    print("\n👥 Creating realistic users...")
    
    default_password = "SecurePass123!"
    hashed_password = bcrypt.hashpw(default_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    realistic_users = [
        # Leadership Team
        {
            "id": "user-ceo",
            "email": "sarah.chen@techvision.com",
            "username": "sarah.chen",
            "first_name": "Sarah",
            "last_name": "Chen",
            "job_title": "Chief Executive Officer",
            "department": "Executive",
            "location": "San Francisco, CA",
            "bio": "Visionary leader with 15+ years experience scaling tech companies."
        },
        {
            "id": "user-cto",
            "email": "michael.rodriguez@techvision.com",
            "username": "michael.rodriguez",
            "first_name": "Michael",
            "last_name": "Rodriguez",
            "job_title": "Chief Technology Officer",
            "department": "Engineering",
            "location": "Austin, TX",
            "bio": "Former senior architect at major tech companies, passionate about scalable systems."
        },
        
        # Product Team
        {
            "id": "user-product-director",
            "email": "jennifer.kim@techvision.com",
            "username": "jennifer.kim",
            "first_name": "Jennifer",
            "last_name": "Kim",
            "job_title": "Director of Product",
            "department": "Product",
            "location": "Seattle, WA",
            "bio": "Product strategy expert with deep understanding of user experience and market dynamics."
        },
        {
            "id": "user-product-manager1",
            "email": "david.patel@techvision.com",
            "username": "david.patel",
            "first_name": "David",
            "last_name": "Patel",
            "job_title": "Senior Product Manager",
            "department": "Product",
            "location": "Remote",
            "bio": "Data-driven product manager focused on mobile and web platform experiences."
        },
        {
            "id": "user-product-manager2",
            "email": "lisa.anderson@techvision.com",
            "username": "lisa.anderson",
            "first_name": "Lisa",
            "last_name": "Anderson",
            "job_title": "Product Manager",
            "department": "Product",
            "location": "New York, NY",
            "bio": "Growth-focused PM with expertise in user acquisition and retention strategies."
        },
        
        # Engineering Team
        {
            "id": "user-eng-manager",
            "email": "alex.thompson@techvision.com",
            "username": "alex.thompson",
            "first_name": "Alex",
            "last_name": "Thompson",
            "job_title": "Engineering Manager",
            "department": "Engineering",
            "location": "San Francisco, CA",
            "bio": "Full-stack engineer turned manager, passionate about team growth and technical excellence."
        },
        {
            "id": "user-tech-lead",
            "email": "maria.gonzalez@techvision.com",
            "username": "maria.gonzalez",
            "first_name": "Maria",
            "last_name": "Gonzalez",
            "job_title": "Staff Software Engineer",
            "department": "Engineering",
            "location": "Austin, TX",
            "bio": "Technical leader specializing in distributed systems and cloud architecture."
        },
        {
            "id": "user-senior-dev1",
            "email": "james.wilson@techvision.com",
            "username": "james.wilson",
            "first_name": "James",
            "last_name": "Wilson",
            "job_title": "Senior Software Engineer",
            "department": "Engineering",
            "location": "Remote",
            "bio": "Backend specialist with expertise in Node.js, Python, and microservices architecture."
        },
        {
            "id": "user-senior-dev2",
            "email": "priya.sharma@techvision.com",
            "username": "priya.sharma",
            "first_name": "Priya",
            "last_name": "Sharma",
            "job_title": "Senior Software Engineer",
            "department": "Engineering",
            "location": "Seattle, WA",
            "bio": "Frontend expert passionate about React, TypeScript, and creating exceptional user interfaces."
        },
        {
            "id": "user-dev1",
            "email": "kevin.lee@techvision.com",
            "username": "kevin.lee",
            "first_name": "Kevin",
            "last_name": "Lee",
            "job_title": "Software Engineer",
            "department": "Engineering",
            "location": "San Francisco, CA",
            "bio": "Full-stack developer with 3 years experience, excited about learning new technologies."
        },
        {
            "id": "user-dev2",
            "email": "emma.johnson@techvision.com",
            "username": "emma.johnson",
            "first_name": "Emma",
            "last_name": "Johnson",
            "job_title": "Software Engineer",
            "department": "Engineering",
            "location": "Remote",
            "bio": "Recent computer science graduate passionate about web development and user experience."
        },
        
        # Design Team
        {
            "id": "user-design-lead",
            "email": "sophie.martin@techvision.com",
            "username": "sophie.martin",
            "first_name": "Sophie",
            "last_name": "Martin",
            "job_title": "Senior UX Designer",
            "department": "Design",
            "location": "San Francisco, CA",
            "bio": "User experience designer with 8 years creating intuitive digital products."
        },
        {
            "id": "user-ui-designer",
            "email": "carlos.rivera@techvision.com",
            "username": "carlos.rivera",
            "first_name": "Carlos",
            "last_name": "Rivera",
            "job_title": "UI Designer",
            "department": "Design",
            "location": "Austin, TX",
            "bio": "Visual designer focused on creating beautiful, accessible, and functional interfaces."
        },
        
        # QA Team
        {
            "id": "user-qa-lead",
            "email": "rachel.brown@techvision.com",
            "username": "rachel.brown",
            "first_name": "Rachel",
            "last_name": "Brown",
            "job_title": "QA Manager",
            "department": "QA",
            "location": "Seattle, WA",
            "bio": "Quality assurance professional with expertise in automated testing and test strategy."
        },
        {
            "id": "user-qa-engineer1",
            "email": "daniel.clark@techvision.com",
            "username": "daniel.clark",
            "first_name": "Daniel",
            "last_name": "Clark",
            "job_title": "Senior QA Engineer",
            "department": "QA",
            "location": "Remote",
            "bio": "Test automation specialist with experience in Selenium, Cypress, and API testing."
        },
        {
            "id": "user-qa-engineer2", 
            "email": "amy.davis@techvision.com",
            "username": "amy.davis",
            "first_name": "Amy",
            "last_name": "Davis",
            "job_title": "QA Engineer",
            "department": "QA",
            "location": "New York, NY",
            "bio": "Manual and automated testing expert focused on mobile app quality assurance."
        },
        
        # DevOps Team
        {
            "id": "user-devops-lead",
            "email": "robert.miller@techvision.com",
            "username": "robert.miller",
            "first_name": "Robert",
            "last_name": "Miller",
            "job_title": "DevOps Manager",
            "department": "DevOps",
            "location": "Austin, TX",
            "bio": "Infrastructure and deployment specialist with expertise in AWS, Docker, and Kubernetes."
        },
        {
            "id": "user-devops-engineer",
            "email": "natalie.taylor@techvision.com",
            "username": "natalie.taylor",
            "first_name": "Natalie",
            "last_name": "Taylor",
            "job_title": "DevOps Engineer",
            "department": "DevOps",
            "location": "Remote",
            "bio": "Site reliability engineer passionate about automation, monitoring, and scalable infrastructure."
        }
    ]
    
    for user_data in realistic_users:
        try:
            existing = await conn.fetchrow("SELECT id FROM users WHERE id = $1", user_data["id"])
            if existing:
                print(f"  ⚠️  User {user_data['username']} already exists")
                continue
                
            await conn.execute("""
                INSERT INTO users (id, email, first_name, last_name, username, password_hash, 
                                 job_title, department, location, bio, is_active, is_verified, 
                                 created_at, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            """, user_data["id"], user_data["email"], user_data["first_name"], 
                 user_data["last_name"], user_data["username"], hashed_password,
                 user_data["job_title"], user_data["department"], user_data["location"],
                 user_data["bio"], True, True, datetime.now(), datetime.now())
            print(f"  ✅ Created user: {user_data['first_name']} {user_data['last_name']} ({user_data['job_title']})")
        except Exception as e:
            print(f"  ❌ Failed to create user {user_data['username']}: {e}")

async def create_realistic_teams(conn):
    """Create realistic team structure"""
    print("\n👨‍👩‍👧‍👦 Creating realistic teams...")
    
    teams = [
        {
            "id": "team-platform",
            "name": "Platform Engineering",
            "description": "Core platform infrastructure, APIs, and shared services",
            "color": "#3B82F6"
        },
        {
            "id": "team-mobile",
            "name": "Mobile Development",
            "description": "iOS and Android mobile applications",
            "color": "#10B981"
        },
        {
            "id": "team-web",
            "name": "Web Frontend",
            "description": "Web application frontend and user experience",
            "color": "#8B5CF6"
        },
        {
            "id": "team-data",
            "name": "Data & Analytics",
            "description": "Data pipeline, analytics, and business intelligence",
            "color": "#F59E0B"
        },
        {
            "id": "team-qa",
            "name": "Quality Assurance",
            "description": "Testing, quality assurance, and release management",
            "color": "#EF4444"
        },
        {
            "id": "team-devops",
            "name": "DevOps & Infrastructure",
            "description": "DevOps, infrastructure, security, and monitoring",
            "color": "#6B7280"
        }
    ]
    
    for team_data in teams:
        try:
            existing = await conn.fetchrow("SELECT id FROM teams WHERE id = $1", team_data["id"])
            if existing:
                print(f"  ⚠️  Team {team_data['name']} already exists")
                continue
                
            await conn.execute("""
                INSERT INTO teams (id, organization_id, name, description, color, is_default, 
                                 created_by, created_at, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            """, team_data["id"], "default-org", team_data["name"], team_data["description"],
                 team_data["color"], False, "user-cto", datetime.now(), datetime.now())
            print(f"  ✅ Created team: {team_data['name']}")
        except Exception as e:
            print(f"  ❌ Failed to create team {team_data['name']}: {e}")
    
    # Add team memberships
    team_memberships = [
        # Platform Engineering
        ("team-platform", "user-eng-manager", "manager"),
        ("team-platform", "user-tech-lead", "lead"),
        ("team-platform", "user-senior-dev1", "developer"),
        ("team-platform", "user-dev1", "developer"),
        ("team-platform", "user-devops-engineer", "developer"),
        
        # Mobile Development
        ("team-mobile", "user-senior-dev2", "lead"),
        ("team-mobile", "user-dev2", "developer"),
        ("team-mobile", "user-qa-engineer2", "tester"),
        
        # Web Frontend
        ("team-web", "user-senior-dev2", "lead"),
        ("team-web", "user-dev1", "developer"),
        ("team-web", "user-dev2", "developer"),
        ("team-web", "user-ui-designer", "designer"),
        
        # Quality Assurance
        ("team-qa", "user-qa-lead", "manager"),
        ("team-qa", "user-qa-engineer1", "tester"),
        ("team-qa", "user-qa-engineer2", "tester"),
        
        # DevOps
        ("team-devops", "user-devops-lead", "manager"),
        ("team-devops", "user-devops-engineer", "developer"),
    ]
    
    for team_id, user_id, role in team_memberships:
        try:
            existing = await conn.fetchrow(
                "SELECT id FROM team_members WHERE team_id = $1 AND user_id = $2", 
                team_id, user_id
            )
            if existing:
                continue
                
            await conn.execute("""
                INSERT INTO team_members (id, team_id, user_id, role, joined_at)
                VALUES ($1, $2, $3, $4, $5)
            """, str(uuid.uuid4()), team_id, user_id, role, datetime.now())
        except Exception as e:
            print(f"  ❌ Failed to add team membership: {e}")

async def create_multiple_projects(conn):
    """Create multiple realistic projects"""
    print("\n📁 Creating multiple realistic projects...")
    
    projects = [
        {
            "id": "proj-mobile-app-v2",
            "team_id": "team-mobile",
            "name": "Mobile App 2.0 Redesign",
            "key": "MOBILE",
            "description": "Complete redesign of our mobile application with improved UX, performance optimizations, and new features based on user feedback.",
            "vision": "Create the most intuitive and powerful mobile experience in our industry",
            "status": "in_progress",
            "priority": "high",
            "progress": 65,
            "methodology": "scrum",
            "created_by": "user-product-director"
        },
        {
            "id": "proj-platform-api",
            "team_id": "team-platform", 
            "name": "Platform API v3",
            "key": "PLAT",
            "description": "Next generation platform API with GraphQL, improved authentication, rate limiting, and comprehensive documentation.",
            "vision": "Build a developer-friendly, scalable API platform that powers all our products",
            "status": "in_progress",
            "priority": "high",
            "progress": 40,
            "methodology": "scrum",
            "created_by": "user-cto"
        },
        {
            "id": "proj-web-dashboard",
            "team_id": "team-web",
            "name": "Analytics Dashboard",
            "key": "DASH",
            "description": "Real-time analytics dashboard for business users with customizable widgets, reporting, and data visualization.",
            "vision": "Empower business users with actionable insights through beautiful, intuitive dashboards",
            "status": "in_progress", 
            "priority": "medium",
            "progress": 30,
            "methodology": "kanban",
            "created_by": "user-product-manager1"
        },
        {
            "id": "proj-data-pipeline",
            "team_id": "team-data",
            "name": "Data Pipeline Modernization",
            "key": "DATA",
            "description": "Modernize our data processing pipeline with real-time streaming, improved data quality, and machine learning capabilities.",
            "vision": "Build a robust, scalable data infrastructure that enables data-driven decision making",
            "status": "backlog",
            "priority": "medium", 
            "progress": 10,
            "methodology": "scrum",
            "created_by": "user-cto"
        },
        {
            "id": "proj-security-audit",
            "team_id": "team-devops",
            "name": "Security & Compliance Audit",
            "key": "SEC",
            "description": "Comprehensive security audit and implementation of compliance measures for SOC2 and GDPR requirements.",
            "vision": "Ensure our platform meets the highest security and compliance standards",
            "status": "backlog",
            "priority": "high",
            "progress": 5,
            "methodology": "waterfall",
            "created_by": "user-devops-lead"
        }
    ]
    
    for project_data in projects:
        try:
            existing = await conn.fetchrow("SELECT id FROM projects WHERE id = $1", project_data["id"])
            if existing:
                print(f"  ⚠️  Project {project_data['name']} already exists")
                continue
                
            start_date = datetime.now() - timedelta(days=random.randint(30, 120))
            target_end_date = start_date + timedelta(days=random.randint(90, 180))
            
            await conn.execute("""
                INSERT INTO projects (id, organization_id, team_id, name, key, description, vision,
                                    status, priority, progress, methodology, start_date, target_end_date,
                                    created_by, created_at, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
            """, project_data["id"], "default-org", project_data["team_id"], project_data["name"],
                 project_data["key"], project_data["description"], project_data["vision"],
                 project_data["status"], project_data["priority"], project_data["progress"],
                 project_data["methodology"], start_date, target_end_date,
                 project_data["created_by"], datetime.now(), datetime.now())
            print(f"  ✅ Created project: {project_data['name']}")
        except Exception as e:
            print(f"  ❌ Failed to create project {project_data['name']}: {e}")

if __name__ == "__main__":
    asyncio.run(init_production_data()) 