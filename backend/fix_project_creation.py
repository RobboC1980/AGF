#!/usr/bin/env python3
"""
Fix project creation issue and verify sample data
"""

import asyncio
from datetime import datetime, date
from dotenv import load_dotenv

# Load environment variables first
load_dotenv()

from database.connection import db_manager, init_db

async def fix_and_verify():
    """Fix project creation and verify all sample data"""
    try:
        await init_db()
        
        async with db_manager.get_connection() as conn:
            print("🔧 Fixing project creation and verifying data...")
            
            # First, let's check the projects table schema to see what columns exist
            schema = await conn.fetch("""
                SELECT column_name, data_type, is_nullable, column_default
                FROM information_schema.columns 
                WHERE table_name = 'projects'
                ORDER BY ordinal_position
            """)
            
            print("\n📋 Projects table schema:")
            for row in schema:
                print(f"  - {row['column_name']}: {row['data_type']} (nullable: {row['is_nullable']})")
            
            # Create the missing project with proper column names
            print("\n📁 Creating missing project...")
            
            try:
                # Check if project already exists
                existing = await conn.fetchrow("SELECT id FROM projects WHERE id = $1", "proj-ui-redesign")
                if existing:
                    print("  ⚠️  Project already exists")
                else:
                    await conn.execute("""
                        INSERT INTO projects (id, organization_id, team_id, name, key, description, 
                                            status, priority, progress, created_by, created_at, updated_at)
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                    """, "proj-ui-redesign", "default-org", "team-design", 
                         "UI Redesign Project", "UIRD", "Redesigning the user interface for better UX",
                         "backlog", "medium", 5, "user-manager", 
                         datetime.now(), datetime.now())
                    print("  ✅ Created project: UI Redesign Project (UIRD)")
            except Exception as e:
                print(f"  ❌ Failed to create project: {e}")
            
            # Now let's verify all our data
            print("\n🔍 Verifying all sample data...")
            
            # Check organizations
            orgs = await conn.fetch("SELECT id, name, slug FROM organizations")
            print(f"\n🏢 Organizations ({len(orgs)}):")
            for org in orgs:
                print(f"  - {org['id']}: {org['name']} (slug: {org['slug']})")
            
            # Check users
            users = await conn.fetch("SELECT id, username, email, first_name, last_name, is_active FROM users")
            print(f"\n👥 Users ({len(users)}):")
            for user in users:
                print(f"  - {user['id']}: {user['username']} ({user['email']}) - {user['first_name']} {user['last_name']} [Active: {user['is_active']}]")
            
            # Check teams
            teams = await conn.fetch("SELECT id, name, organization_id, is_default FROM teams")
            print(f"\n👨‍👩‍👧‍👦 Teams ({len(teams)}):")
            for team in teams:
                print(f"  - {team['id']}: {team['name']} (org: {team['organization_id']}) [Default: {team['is_default']}]")
            
            # Check team memberships
            memberships = await conn.fetch("""
                SELECT tm.team_id, tm.user_id, tm.role, t.name as team_name, u.username 
                FROM team_members tm
                JOIN teams t ON tm.team_id = t.id
                JOIN users u ON tm.user_id = u.id
                ORDER BY tm.team_id, tm.role
            """)
            print(f"\n🔗 Team Memberships ({len(memberships)}):")
            for membership in memberships:
                print(f"  - {membership['team_name']}: {membership['username']} ({membership['role']})")
            
            # Check projects
            projects = await conn.fetch("""
                SELECT p.id, p.name, p.key, p.organization_id, p.team_id, p.status, p.priority, p.progress,
                       t.name as team_name, u.username as created_by_username
                FROM projects p
                LEFT JOIN teams t ON p.team_id = t.id
                LEFT JOIN users u ON p.created_by = u.id
                ORDER BY p.created_at
            """)
            print(f"\n📁 Projects ({len(projects)}):")
            for project in projects:
                print(f"  - {project['id']}: {project['name']} ({project['key']}) [{project['status']}] - {project['priority']} priority")
                print(f"    Team: {project['team_name']}, Progress: {project['progress']}%, Created by: {project['created_by_username']}")
            
            # Summary
            print(f"\n📊 Summary:")
            print(f"  - Organizations: {len(orgs)}")
            print(f"  - Users: {len(users)}")
            print(f"  - Teams: {len(teams)}")
            print(f"  - Team Memberships: {len(memberships)}")
            print(f"  - Projects: {len(projects)}")
            
            print(f"\n✅ Sample data setup complete! Your AgileForge instance is ready for testing.")
            print(f"\n🔑 Login with any of these test accounts:")
            print(f"  • admin@example.com / password123")
            print(f"  • manager@example.com / password123") 
            print(f"  • developer@example.com / password123")
            
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        await db_manager.close_pool()

if __name__ == "__main__":
    asyncio.run(fix_and_verify()) 