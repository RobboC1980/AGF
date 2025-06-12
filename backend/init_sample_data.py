#!/usr/bin/env python3
"""
Initialize sample data for testing - continues from create_default_org.py
"""

import asyncio
import uuid
from datetime import datetime, date
from dotenv import load_dotenv
import bcrypt

# Load environment variables first
load_dotenv()

from database.connection import db_manager, init_db

async def init_sample_data():
    """Initialize comprehensive sample data for testing"""
    try:
        await init_db()
        
        async with db_manager.get_connection() as conn:
            print("🚀 Initializing sample data...")
            
            # Check if default organization exists
            org = await conn.fetchrow("SELECT * FROM organizations WHERE id = $1", "default-org")
            if not org:
                print("❌ Default organization not found. Please run create_default_org.py first.")
                return
            
            print(f"✅ Found organization: {org['name']}")
            
            # 1. Create sample users
            print("\n👥 Creating sample users...")
            
            # Hash a default password for testing
            default_password = "password123"
            hashed_password = bcrypt.hashpw(default_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
            
            sample_users = [
                {
                    "id": "user-admin",
                    "email": "admin@example.com",
                    "first_name": "Admin",
                    "last_name": "User",
                    "username": "admin",
                    "password_hash": hashed_password,
                    "is_active": True,
                    "is_verified": True
                },
                {
                    "id": "user-manager",
                    "email": "manager@example.com", 
                    "first_name": "Project",
                    "last_name": "Manager",
                    "username": "manager",
                    "password_hash": hashed_password,
                    "is_active": True,
                    "is_verified": True
                },
                {
                    "id": "user-developer",
                    "email": "developer@example.com",
                    "first_name": "Jane",
                    "last_name": "Developer", 
                    "username": "developer",
                    "password_hash": hashed_password,
                    "is_active": True,
                    "is_verified": True
                }
            ]
            
            for user_data in sample_users:
                try:
                    # Check if user already exists
                    existing = await conn.fetchrow("SELECT id FROM users WHERE id = $1", user_data["id"])
                    if existing:
                        print(f"  ⚠️  User {user_data['username']} already exists")
                        continue
                        
                    await conn.execute("""
                        INSERT INTO users (id, email, first_name, last_name, username, password_hash, is_active, is_verified, created_at, updated_at)
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                    """, user_data["id"], user_data["email"], user_data["first_name"], 
                         user_data["last_name"], user_data["username"], user_data["password_hash"],
                         user_data["is_active"], user_data["is_verified"], 
                         datetime.now(), datetime.now())
                    print(f"  ✅ Created user: {user_data['username']} ({user_data['email']})")
                except Exception as e:
                    print(f"  ❌ Failed to create user {user_data['username']}: {e}")
            
            # 2. Create sample teams
            print("\n👨‍👩‍👧‍👦 Creating sample teams...")
            
            sample_teams = [
                {
                    "id": "team-development",
                    "organization_id": "default-org",
                    "name": "Development Team",
                    "description": "Core development team",
                    "is_default": True,
                    "created_by": "user-admin"
                },
                {
                    "id": "team-design",
                    "organization_id": "default-org", 
                    "name": "Design Team",
                    "description": "UX/UI design team",
                    "is_default": False,
                    "created_by": "user-admin"
                }
            ]
            
            for team_data in sample_teams:
                try:
                    # Check if team already exists
                    existing = await conn.fetchrow("SELECT id FROM teams WHERE id = $1", team_data["id"])
                    if existing:
                        print(f"  ⚠️  Team {team_data['name']} already exists")
                        continue
                        
                    await conn.execute("""
                        INSERT INTO teams (id, organization_id, name, description, is_default, created_by, created_at, updated_at)
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                    """, team_data["id"], team_data["organization_id"], team_data["name"],
                         team_data["description"], team_data["is_default"], team_data["created_by"],
                         datetime.now(), datetime.now())
                    print(f"  ✅ Created team: {team_data['name']}")
                except Exception as e:
                    print(f"  ❌ Failed to create team {team_data['name']}: {e}")
            
            # 3. Add users to teams
            print("\n🔗 Adding users to teams...")
            
            team_memberships = [
                {"team_id": "team-development", "user_id": "user-admin", "role": "lead"},
                {"team_id": "team-development", "user_id": "user-manager", "role": "manager"},
                {"team_id": "team-development", "user_id": "user-developer", "role": "developer"},
                {"team_id": "team-design", "user_id": "user-admin", "role": "lead"},
                {"team_id": "team-design", "user_id": "user-developer", "role": "developer"}
            ]
            
            for membership in team_memberships:
                try:
                    # Check if membership already exists
                    existing = await conn.fetchrow(
                        "SELECT id FROM team_members WHERE team_id = $1 AND user_id = $2", 
                        membership["team_id"], membership["user_id"]
                    )
                    if existing:
                        continue
                        
                    await conn.execute("""
                        INSERT INTO team_members (id, team_id, user_id, role, joined_at)
                        VALUES ($1, $2, $3, $4, $5)
                    """, str(uuid.uuid4()), membership["team_id"], membership["user_id"],
                         membership["role"], datetime.now())
                    print(f"  ✅ Added {membership['user_id']} to {membership['team_id']} as {membership['role']}")
                except Exception as e:
                    print(f"  ❌ Failed to add team membership: {e}")
            
            # 4. Create sample projects
            print("\n📁 Creating sample projects...")
            
            sample_projects = [
                {
                    "id": "proj-agile-demo",
                    "organization_id": "default-org",
                    "team_id": "team-development",
                    "name": "AgileForge Demo Project",
                    "key": "DEMO",
                    "description": "A demonstration project showcasing AgileForge capabilities",
                    "status": "in_progress",
                    "priority": "high",
                    "start_date": date.today(),
                    "progress": 25,
                    "created_by": "user-admin"
                },
                {
                    "id": "proj-ui-redesign",
                    "organization_id": "default-org",
                    "team_id": "team-design", 
                    "name": "UI Redesign Project",
                    "key": "UIRD",
                    "description": "Redesigning the user interface for better UX",
                    "status": "backlog",
                    "priority": "medium",
                    "progress": 5,
                    "created_by": "user-manager"
                }
            ]
            
            for project_data in sample_projects:
                try:
                    # Check if project already exists
                    existing = await conn.fetchrow("SELECT id FROM projects WHERE id = $1", project_data["id"])
                    if existing:
                        print(f"  ⚠️  Project {project_data['name']} already exists")
                        continue
                        
                    await conn.execute("""
                        INSERT INTO projects (id, organization_id, team_id, name, key, description, 
                                            status, priority, start_date, progress, created_by, created_at, updated_at)
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
                    """, project_data["id"], project_data["organization_id"], project_data["team_id"],
                         project_data["name"], project_data["key"], project_data["description"],
                         project_data["status"], project_data["priority"], project_data["start_date"],
                         project_data["progress"], project_data["created_by"], 
                         datetime.now(), datetime.now())
                    print(f"  ✅ Created project: {project_data['name']} ({project_data['key']})")
                except Exception as e:
                    print(f"  ❌ Failed to create project {project_data['name']}: {e}")
            
            # 5. Show summary
            print("\n📊 Sample data initialization complete!")
            
            # Count what we've created
            user_count = await conn.fetchval("SELECT COUNT(*) FROM users")
            team_count = await conn.fetchval("SELECT COUNT(*) FROM teams WHERE organization_id = 'default-org'")  
            project_count = await conn.fetchval("SELECT COUNT(*) FROM projects WHERE organization_id = 'default-org'")
            
            print(f"  📈 Summary:")
            print(f"    - Users: {user_count}")
            print(f"    - Teams: {team_count}")
            print(f"    - Projects: {project_count}")
            print(f"\n🔑 Test login credentials:")
            print(f"    Email: admin@example.com | Password: {default_password}")
            print(f"    Email: manager@example.com | Password: {default_password}")
            print(f"    Email: developer@example.com | Password: {default_password}")
            
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        await db_manager.close_pool()

if __name__ == "__main__":
    asyncio.run(init_sample_data()) 