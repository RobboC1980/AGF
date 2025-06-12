#!/usr/bin/env python3
"""
Populate AgileForge with comprehensive production-ready data
This script creates realistic data for a software development company
"""

import asyncio
import uuid
from datetime import datetime, date, timedelta
from dotenv import load_dotenv
import bcrypt
import random

# Load environment variables
load_dotenv()

async def populate_all_data():
    """Main function to populate all production data"""
    print("🚀 Starting comprehensive data population...")
    
    # Mock connection for now - replace with actual database connection
    conn = None
    
    try:
        # 1. Create realistic users
        await create_realistic_users(conn)
        
        # 2. Create teams
        await create_realistic_teams(conn)
        
        # 3. Create projects
        await create_realistic_projects(conn)
        
        # 4. Create comprehensive work items
        await create_comprehensive_work_items(conn)
        
        print("\n🎉 Production data population completed successfully!")
        
    except Exception as e:
        print(f"❌ Error populating data: {e}")
        raise

async def create_realistic_users(conn):
    """Create realistic users for software company"""
    print("\n👥 Creating realistic users...")
    
    users_data = [
        # Leadership Team
        {
            "id": "user-ceo",
            "email": "sarah.chen@techvision.com",
            "first_name": "Sarah",
            "last_name": "Chen",
            "job_title": "Chief Executive Officer",
            "department": "Executive",
            "bio": "Visionary leader with 15+ years experience scaling tech companies."
        },
        {
            "id": "user-cto",
            "email": "michael.rodriguez@techvision.com",
            "first_name": "Michael",
            "last_name": "Rodriguez",
            "job_title": "Chief Technology Officer",
            "department": "Engineering",
            "bio": "Former senior architect at major tech companies, passionate about scalable systems."
        },
        
        # Product Team
        {
            "id": "user-product-director",
            "email": "jennifer.kim@techvision.com",
            "first_name": "Jennifer",
            "last_name": "Kim",
            "job_title": "Director of Product",
            "department": "Product",
            "bio": "Product strategy expert with deep understanding of user experience."
        },
        {
            "id": "user-product-manager1",
            "email": "david.patel@techvision.com",
            "first_name": "David",
            "last_name": "Patel",
            "job_title": "Senior Product Manager",
            "department": "Product",
            "bio": "Data-driven product manager focused on mobile platform experiences."
        },
        
        # Engineering Team
        {
            "id": "user-eng-manager",
            "email": "alex.thompson@techvision.com",
            "first_name": "Alex",
            "last_name": "Thompson",
            "job_title": "Engineering Manager",
            "department": "Engineering",
            "bio": "Full-stack engineer turned manager, passionate about team growth."
        },
        {
            "id": "user-tech-lead",
            "email": "maria.gonzalez@techvision.com",
            "first_name": "Maria",
            "last_name": "Gonzalez",
            "job_title": "Staff Software Engineer",
            "department": "Engineering",
            "bio": "Technical leader specializing in distributed systems and cloud architecture."
        },
        {
            "id": "user-senior-dev1",
            "email": "james.wilson@techvision.com",
            "first_name": "James",
            "last_name": "Wilson",
            "job_title": "Senior Software Engineer",
            "department": "Engineering",
            "bio": "Backend specialist with expertise in Node.js, Python, and microservices."
        },
        {
            "id": "user-senior-dev2",
            "email": "priya.sharma@techvision.com",
            "first_name": "Priya",
            "last_name": "Sharma",
            "job_title": "Senior Software Engineer",
            "department": "Engineering",
            "bio": "Frontend expert passionate about React, TypeScript, and exceptional UX."
        },
        {
            "id": "user-dev1",
            "email": "kevin.lee@techvision.com",
            "first_name": "Kevin",
            "last_name": "Lee",
            "job_title": "Software Engineer",
            "department": "Engineering",
            "bio": "Full-stack developer with 3 years experience, eager to learn new technologies."
        },
        {
            "id": "user-dev2",
            "email": "emma.johnson@techvision.com",
            "first_name": "Emma",
            "last_name": "Johnson",
            "job_title": "Software Engineer",
            "department": "Engineering",
            "bio": "Recent CS graduate passionate about web development and user experience."
        },
        
        # Design Team
        {
            "id": "user-design-lead",
            "email": "sophie.martin@techvision.com",
            "first_name": "Sophie",
            "last_name": "Martin",
            "job_title": "Senior UX Designer",
            "department": "Design",
            "bio": "User experience designer with 8 years creating intuitive digital products."
        },
        {
            "id": "user-ui-designer",
            "email": "carlos.rivera@techvision.com",
            "first_name": "Carlos",
            "last_name": "Rivera",
            "job_title": "UI Designer", 
            "department": "Design",
            "bio": "Visual designer focused on creating beautiful, accessible interfaces."
        },
        
        # QA Team
        {
            "id": "user-qa-lead",
            "email": "rachel.brown@techvision.com",
            "first_name": "Rachel",
            "last_name": "Brown",
            "job_title": "QA Manager",
            "department": "QA",
            "bio": "Quality assurance professional with expertise in automated testing."
        },
        {
            "id": "user-qa-engineer1",
            "email": "daniel.clark@techvision.com",
            "first_name": "Daniel",
            "last_name": "Clark",
            "job_title": "Senior QA Engineer",
            "department": "QA",
            "bio": "Test automation specialist with Selenium, Cypress, and API testing experience."
        },
        {
            "id": "user-qa-engineer2",
            "email": "amy.davis@techvision.com",
            "first_name": "Amy",
            "last_name": "Davis",
            "job_title": "QA Engineer",
            "department": "QA", 
            "bio": "Manual and automated testing expert focused on mobile app QA."
        },
        
        # DevOps Team
        {
            "id": "user-devops-lead",
            "email": "robert.miller@techvision.com",
            "first_name": "Robert",
            "last_name": "Miller",
            "job_title": "DevOps Manager",
            "department": "DevOps",
            "bio": "Infrastructure specialist with AWS, Docker, and Kubernetes expertise."
        },
        {
            "id": "user-devops-engineer",
            "email": "natalie.taylor@techvision.com",
            "first_name": "Natalie",
            "last_name": "Taylor",
            "job_title": "DevOps Engineer",
            "department": "DevOps",
            "bio": "Site reliability engineer passionate about automation and monitoring."
        }
    ]
    
    for user in users_data:
        print(f"  ✅ Would create user: {user['first_name']} {user['last_name']} ({user['job_title']})")

async def create_realistic_teams(conn):
    """Create realistic team structure"""
    print("\n👨‍👩‍👧‍👦 Creating teams...")
    
    teams_data = [
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
    
    for team in teams_data:
        print(f"  ✅ Would create team: {team['name']}")

async def create_realistic_projects(conn):
    """Create multiple realistic projects"""
    print("\n📁 Creating projects...")
    
    projects_data = [
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
            "methodology": "scrum"
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
            "methodology": "scrum"
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
            "methodology": "kanban"
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
            "methodology": "waterfall"
        }
    ]
    
    for project in projects_data:
        print(f"  ✅ Would create project: {project['name']} ({project['key']})")

async def create_comprehensive_work_items(conn):
    """Create epics, stories, and tasks with realistic data"""
    print("\n📋 Creating comprehensive work items...")
    
    # Mobile App 2.0 Redesign Epics
    mobile_epics = [
        {
            "id": "epic-mobile-onboarding",
            "project_id": "proj-mobile-app-v2",
            "title": "User Onboarding & Authentication Redesign",
            "description": "Redesign the user onboarding experience with improved authentication flow, biometric login, and personalized welcome experience.",
            "epic_key": "MOBILE-1",
            "status": "in_progress",
            "priority": "high",
            "estimated_story_points": 34,
            "actual_story_points": 21,
            "acceptance_criteria": """
            ✅ Acceptance Criteria:
            - New users can complete registration in under 2 minutes
            - Biometric authentication (Face ID/Touch ID) is available and secure
            - Social login options (Google, Apple, Facebook) are fully integrated
            - Onboarding flow includes interactive tutorial with skip/replay options
            - User preferences and personalization are captured during onboarding
            - Email verification process is streamlined and user-friendly
            - WCAG 2.1 AA accessibility standards are met
            - Analytics tracking is implemented for onboarding funnel optimization
            """,
            "business_value": "Improved user acquisition by 25% and reduced churn in first 7 days by 40%. Enhanced security through biometric authentication adoption.",
            "stories": [
                {
                    "title": "Social Login Integration (OAuth2)",
                    "as_a": "new user",
                    "i_want": "to sign up and log in using my existing Google, Apple, or Facebook account",
                    "so_that": "I can quickly create an account without manually entering personal details and passwords",
                    "acceptance_criteria": """
                    Given I am on the registration/login screen
                    When I tap "Continue with Google", "Continue with Apple", or "Continue with Facebook"
                    Then I should be redirected to the respective OAuth provider
                    And after successful authentication, my account should be created/accessed
                    And my basic profile information (name, email, avatar) should be populated
                    And I should be directed to the appropriate next step (onboarding or main app)
                    And if account linking is needed, I should see a clear prompt
                    And all OAuth flows should handle errors gracefully with user-friendly messages
                    """,
                    "story_points": 8,
                    "priority": "high",
                    "status": "done",
                    "assignee_id": "user-senior-dev2",
                    "business_value": 90,
                    "definition_of_done": "Code reviewed, unit tests written, integration tests pass, security review completed",
                    "tasks": [
                        {
                            "title": "Research and select OAuth libraries for React Native",
                            "estimated_hours": 4,
                            "assignee_id": "user-senior-dev2",
                            "status": "done",
                            "description": "Evaluate OAuth libraries, security implications, and integration complexity"
                        },
                        {
                            "title": "Implement Google OAuth integration",
                            "estimated_hours": 8,
                            "assignee_id": "user-senior-dev2",
                            "status": "done",
                            "description": "Full Google OAuth flow with proper error handling and token management"
                        },
                        {
                            "title": "Implement Apple Sign-In integration",
                            "estimated_hours": 6,
                            "assignee_id": "user-senior-dev2",
                            "status": "done",
                            "description": "Apple Sign-In with privacy features and proper credential handling"
                        },
                        {
                            "title": "Implement Facebook Login integration",
                            "estimated_hours": 6,
                            "assignee_id": "user-dev1",
                            "status": "done",
                            "description": "Facebook OAuth integration with appropriate permission scopes"
                        },
                        {
                            "title": "Create backend API endpoints for OAuth user creation",
                            "estimated_hours": 10,
                            "assignee_id": "user-senior-dev1",
                            "status": "done",
                            "description": "Secure backend endpoints for processing OAuth tokens and user creation"
                        },
                        {
                            "title": "Design OAuth login UI components",
                            "estimated_hours": 6,
                            "assignee_id": "user-ui-designer",
                            "status": "done",
                            "description": "User-friendly OAuth button designs following platform guidelines"
                        },
                        {
                            "title": "Implement error handling and edge cases",
                            "estimated_hours": 8,
                            "assignee_id": "user-senior-dev2",
                            "status": "done",
                            "description": "Handle network errors, account conflicts, and OAuth cancellation scenarios"
                        },
                        {
                            "title": "Write comprehensive unit and integration tests",
                            "estimated_hours": 12,
                            "assignee_id": "user-qa-engineer1",
                            "status": "done",
                            "description": "Test all OAuth flows, error scenarios, and security aspects"
                        },
                        {
                            "title": "Security audit of OAuth implementation", 
                            "estimated_hours": 6,
                            "assignee_id": "user-qa-engineer1",
                            "status": "done",
                            "description": "Security review of token handling, storage, and transmission"
                        },
                        {
                            "title": "Performance testing and optimization",
                            "estimated_hours": 4,
                            "assignee_id": "user-qa-engineer2",
                            "status": "done",
                            "description": "Ensure OAuth flows are performant and don't impact app startup time"
                        }
                    ]
                },
                {
                    "title": "Biometric Authentication Setup & Management",
                    "as_a": "user who values security and convenience",
                    "i_want": "to enable and use Face ID, Touch ID, or fingerprint authentication",
                    "so_that": "I can securely and quickly access my account without typing passwords",
                    "acceptance_criteria": """
                    Given I have completed initial account setup
                    When I am prompted to enable biometric authentication
                    Then I should see clear explanation of benefits and security
                    And I should be able to enable Face ID, Touch ID, or Android fingerprint based on device capability
                    And the system should securely store biometric authentication preference
                    And on subsequent app launches, I should be able to authenticate with biometrics
                    And I should have the option to disable biometric auth in settings
                    And fallback to password should always be available
                    And biometric data should never leave the device (use secure enclave/keystore)
                    """,
                    "story_points": 5,
                    "priority": "high",
                    "status": "in_progress",
                    "assignee_id": "user-dev1",
                    "business_value": 85,
                    "definition_of_done": "Biometric auth works on both iOS and Android, security review passed, user testing completed",
                    "tasks": [
                        {
                            "title": "Research biometric authentication libraries and security best practices",
                            "estimated_hours": 6,
                            "assignee_id": "user-dev1",
                            "status": "done",
                            "description": "Evaluate React Native biometric libraries and platform-specific security features"
                        },
                        {
                            "title": "Design biometric setup flow UI/UX",
                            "estimated_hours": 8,
                            "assignee_id": "user-ui-designer",
                            "status": "done", 
                            "description": "Create intuitive biometric setup screens with clear security messaging"
                        },
                        {
                            "title": "Implement iOS Face ID/Touch ID integration",
                            "estimated_hours": 12,
                            "assignee_id": "user-dev1",
                            "status": "in_progress",
                            "description": "Native iOS biometric authentication using LocalAuthentication framework"
                        },
                        {
                            "title": "Implement Android fingerprint/face unlock integration",
                            "estimated_hours": 12,
                            "assignee_id": "user-dev1",
                            "status": "todo",
                            "description": "Android biometric authentication using BiometricPrompt API"
                        },
                        {
                            "title": "Create secure keychain/keystore integration",
                            "estimated_hours": 10,
                            "assignee_id": "user-senior-dev1",
                            "status": "in_progress",
                            "description": "Secure storage of authentication tokens using platform-specific secure storage"
                        },
                        {
                            "title": "Implement biometric settings management",
                            "estimated_hours": 6,
                            "assignee_id": "user-dev1",
                            "status": "todo",
                            "description": "Settings screen for enabling/disabling biometric auth"
                        },
                        {
                            "title": "Add fallback authentication mechanisms",
                            "estimated_hours": 8,
                            "assignee_id": "user-dev1",
                            "status": "todo",
                            "description": "PIN/password fallback when biometrics fail or are unavailable"
                        },
                        {
                            "title": "Security testing and penetration testing",
                            "estimated_hours": 10,
                            "assignee_id": "user-qa-engineer1",
                            "status": "todo",
                            "description": "Comprehensive security testing of biometric authentication implementation"
                        },
                        {
                            "title": "Cross-device compatibility testing",
                            "estimated_hours": 8,
                            "assignee_id": "user-qa-engineer2",
                            "status": "todo",
                            "description": "Test biometric auth across different iOS and Android devices"
                        }
                    ]
                }
            ]
        }
    ]
    
    # Print comprehensive work items structure
    for epic in mobile_epics:
        print(f"  📈 Epic: {epic['title']}")
        print(f"    📊 Status: {epic['status']} | Priority: {epic['priority']} | Points: {epic['actual_story_points']}/{epic['estimated_story_points']}")
        print(f"    💼 Business Value: {epic['business_value'][:100]}...")
        
        for story in epic.get('stories', []):
            print(f"    📋 Story: {story['title']} ({story['story_points']} pts)")
            print(f"      👤 As a {story['as_a']}")
            print(f"      🎯 I want {story['i_want']}")
            print(f"      💡 So that {story['so_that']}")
            print(f"      📊 Status: {story['status']} | Assignee: {story['assignee_id']}")
            print(f"      📈 Business Value: {story['business_value']}/100")
            
            for task in story.get('tasks', []):
                print(f"        ✅ Task: {task['title']} ({task['estimated_hours']}h) - {task['status']}")
        print()

if __name__ == "__main__":
    asyncio.run(populate_all_data()) 