import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seeding...')

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 10)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@agileforge.com' },
    update: {},
    create: {
      email: 'admin@agileforge.com',
      name: 'System Administrator',
      password: adminPassword,
      role: 'ADMIN'
    }
  })
  console.log('✅ Admin user created:', admin.email)

  // Create project manager
  const pmPassword = await bcrypt.hash('pm123', 10)
  const pm = await prisma.user.upsert({
    where: { email: 'pm@agileforge.com' },
    update: {},
    create: {
      email: 'pm@agileforge.com',
      name: 'Project Manager',
      password: pmPassword,
      role: 'PROJECT_MANAGER'
    }
  })
  console.log('✅ Project Manager created:', pm.email)

  // Create developer
  const devPassword = await bcrypt.hash('dev123', 10)
  const dev = await prisma.user.upsert({
    where: { email: 'dev@agileforge.com' },
    update: {},
    create: {
      email: 'dev@agileforge.com',
      name: 'Senior Developer',
      password: devPassword,
      role: 'DEVELOPER'
    }
  })
  console.log('✅ Developer created:', dev.email)

  // Create sample project
  const project = await prisma.project.upsert({
    where: { id: 'sample-project-id' },
    update: {},
    create: {
      id: 'sample-project-id',
      name: 'AgileForge Platform',
      description: 'A comprehensive agile project management platform',
      ownerId: pm.id
    }
  })
  console.log('✅ Sample project created:', project.name)

  // Create sample epic
  const epic = await prisma.epic.upsert({
    where: { id: 'sample-epic-id' },
    update: {},
    create: {
      id: 'sample-epic-id',
      name: 'User Authentication & Authorization',
      projectId: project.id
    }
  })
  console.log('✅ Sample epic created:', epic.name)

  // Create sample stories with enhanced data
  const story1 = await prisma.story.upsert({
    where: { id: 'sample-story-1' },
    update: {},
    create: {
      id: 'sample-story-1',
      name: 'User Login with Email and Password',
      description: 'As a user, I want to log in with my email and password so that I can access my account securely.',
      acceptanceCriteria: '- User can enter email and password\n- Invalid credentials show error message\n- Successful login redirects to dashboard\n- Remember me option available',
      storyPoints: 5,
      priority: 'high',
      epicId: epic.id
    }
  })

  const story2 = await prisma.story.upsert({
    where: { id: 'sample-story-2' },
    update: {},
    create: {
      id: 'sample-story-2',
      name: 'Password Reset Functionality',
      description: 'As a user, I want to reset my password if I forget it so that I can regain access to my account.',
      acceptanceCriteria: '- User can request password reset via email\n- Reset link expires after 24 hours\n- New password must meet security requirements\n- User is notified of successful reset',
      storyPoints: 8,
      priority: 'medium',
      epicId: epic.id
    }
  })

  const story3 = await prisma.story.upsert({
    where: { id: 'sample-story-3' },
    update: {},
    create: {
      id: 'sample-story-3',
      name: 'Two-Factor Authentication',
      description: 'As a user, I want to enable 2FA for my account to enhance security.',
      acceptanceCriteria: '- Support for TOTP apps (Google Authenticator, Authy)\n- QR code generation for setup\n- Backup codes provided\n- Option to disable 2FA',
      storyPoints: 13,
      priority: 'low',
      epicId: epic.id
    }
  })
  console.log('✅ Sample stories created')

  // Create sample sprint
  const sprint = await prisma.sprint.upsert({
    where: { id: 'sample-sprint-1' },
    update: {},
    create: {
      id: 'sample-sprint-1',
      name: 'Sprint 1 - Authentication Foundation',
      startDate: new Date('2025-01-06'),
      endDate: new Date('2025-01-20'),
      projectId: project.id
    }
  })
  console.log('✅ Sample sprint created:', sprint.name)

  // Create sample tasks with enhanced data
  await prisma.task.upsert({
    where: { id: 'sample-task-1' },
    update: {},
    create: {
      id: 'sample-task-1',
      name: 'Design login form UI',
      description: 'Create a clean, accessible login form with email and password fields',
      status: 'done',
      priority: 'medium',
      estimatedHours: 4,
      actualHours: 3.5,
      assignedTo: dev.id,
      sprintId: sprint.id,
      completedAt: new Date('2025-01-08'),
      storyId: story1.id
    }
  })

  await prisma.task.upsert({
    where: { id: 'sample-task-2' },
    update: {},
    create: {
      id: 'sample-task-2',
      name: 'Implement login API endpoint',
      description: 'Build secure authentication endpoint with JWT token generation',
      status: 'done',
      priority: 'high',
      estimatedHours: 6,
      actualHours: 7,
      assignedTo: dev.id,
      sprintId: sprint.id,
      completedAt: new Date('2025-01-10'),
      storyId: story1.id
    }
  })

  await prisma.task.upsert({
    where: { id: 'sample-task-3' },
    update: {},
    create: {
      id: 'sample-task-3',
      name: 'Add client-side password validation',
      description: 'Implement real-time password strength indicator and validation',
      status: 'in_progress',
      priority: 'medium',
      estimatedHours: 2,
      assignedTo: dev.id,
      sprintId: sprint.id,
      storyId: story1.id
    }
  })

  await prisma.task.upsert({
    where: { id: 'sample-task-4' },
    update: {},
    create: {
      id: 'sample-task-4',
      name: 'Write integration tests for login',
      description: 'Create comprehensive test suite for login functionality',
      status: 'todo',
      priority: 'medium',
      estimatedHours: 3,
      assignedTo: dev.id,
      sprintId: sprint.id,
      storyId: story1.id
    }
  })

  // Tasks for password reset story
  await prisma.task.upsert({
    where: { id: 'sample-task-5' },
    update: {},
    create: {
      id: 'sample-task-5',
      name: 'Design password reset flow',
      description: 'Create user flow and wireframes for password reset process',
      status: 'todo',
      priority: 'medium',
      estimatedHours: 3,
      storyId: story2.id
    }
  })

  await prisma.task.upsert({
    where: { id: 'sample-task-6' },
    update: {},
    create: {
      id: 'sample-task-6',
      name: 'Implement email service integration',
      description: 'Set up email service for sending reset links',
      status: 'todo',
      priority: 'high',
      estimatedHours: 4,
      storyId: story2.id
    }
  })

  console.log('✅ Sample tasks created')

  console.log('🎉 Database seeding completed successfully!')
  console.log('')
  console.log('📋 Test Users Created:')
  console.log('  Admin: admin@agileforge.com / admin123')
  console.log('  PM:    pm@agileforge.com / pm123')  
  console.log('  Dev:   dev@agileforge.com / dev123')
  console.log('')
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  }) 