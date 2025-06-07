import 'dotenv/config'
import Fastify from 'fastify'
import sensible from '@fastify/sensible'
import cors from '@fastify/cors'
import { PrismaClient } from '@prisma/client'

// Plugins
import authPlugin from './plugins/auth'
import rateLimitPlugin from './plugins/rateLimit'

// Module routes
import authRoutes from './modules/auth/auth.routes'
import projectsRoutes from './modules/projects/projects.routes'
import epicsRoutes from './modules/epics/epics.routes'
import storiesRoutes from './modules/stories/stories.routes'
import tasksRoutes from './modules/tasks/tasks.routes'
import aiRoutes from './modules/ai/ai.routes'
import analyticsRoutes from './modules/analytics/analytics.routes'
import releasesRoutes from './modules/releases/releases.routes'

// Guards
import { optionalAuth, requireAuth, requireAdmin } from './guards/auth.guard'

// Legacy CRUD (to be migrated)
import { registerCrud } from './routes/genericCrud'

// Types
import { UserRole } from './types/auth'

// ─── Setup ──────────────────────────────────────────────────────────────
const prisma = new PrismaClient()
const app = Fastify({ logger: true })

// Add Prisma to Fastify instance
app.decorate('prisma', prisma)

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient
  }
}

// ─── Plugin Registration ────────────────────────────────────────────────
app.register(sensible)
app.register(cors, {
  origin: process.env.NODE_ENV === 'production' ? false : true,
  credentials: true
})
app.register(rateLimitPlugin)
app.register(authPlugin)

// ─── Health Check ───────────────────────────────────────────────────────
app.get('/health', async () => ({ 
  status: 'ok', 
  timestamp: new Date().toISOString(),
  version: '2.0.0'
}))

// ─── Dashboard Endpoint ─────────────────────────────────────────────────
app.get('/dashboard', {
  preHandler: optionalAuth
}, async (req, reply) => {
  try {
    // Return basic dashboard data
    const stats = {
      projects: await prisma.project.count(),
      epics: await prisma.epic.count(),
      stories: await prisma.story.count(),
      tasks: await prisma.task.count(),
      sprints: await prisma.sprint.count(),
      initiatives: await prisma.initiative.count(),
      risks: await prisma.risk.count(),
      okrs: await prisma.oKR.count()
    }

    const response = {
      message: 'Welcome to AgileForge Dashboard',
      stats,
      timestamp: new Date().toISOString()
    }

    // Add user info if authenticated
    if (req.user) {
      (response as any).user = {
        email: (req.user as any).email,
        role: (req.user as any).role,
        authenticated: true
      }
    }

    return response
  } catch (error: any) {
    app.log.error('Dashboard endpoint error:', error)
    return reply.status(500).send({ error: 'Dashboard data unavailable' })
  }
})

// ─── Module Routes ──────────────────────────────────────────────────────
// Authentication routes
app.register(authRoutes, { prefix: '/auth' })

// Project management routes
app.register(projectsRoutes, { prefix: '/projects' })

// Epic management routes
app.register(epicsRoutes, { prefix: '/epics' })

// Story management routes
app.register(storiesRoutes, { prefix: '/stories' })

// Task management routes
app.register(tasksRoutes, { prefix: '/tasks' })

// AI service routes (with rate limiting)
app.register(aiRoutes, { prefix: '/ai' })

// Analytics routes
app.register(analyticsRoutes, { prefix: '/analytics' })

// Releases routes
app.register(releasesRoutes, { prefix: '/releases' })

// ─── Legacy CRUD Routes (Rate Limited) ──────────────────────────────────
// TODO: Migrate these to proper modules with RBAC
app.register(async function legacyCrudRoutes(fastify) {
  // Apply rate limiting to legacy CRUD routes
  await fastify.register(rateLimitPlugin, {
    max: 100,
    timeWindow: '1 minute'
  })

  // Note: Epics now handled by dedicated module

  // Note: Stories and Tasks now handled by dedicated modules

  registerCrud(fastify, 'sprints', 'sprint', {
    preHandler: requireAuth
  })

  registerCrud(fastify, 'initiatives', 'initiative', {
    preHandler: requireAuth
  })

  registerCrud(fastify, 'risks', 'risk', {
    preHandler: requireAuth
  })

  registerCrud(fastify, 'okrs', 'oKR', {
    preHandler: requireAuth
  })
})

// ─── Demo Data Endpoint ─────────────────────────────────────────────────
app.get('/demo-data', {
  preHandler: optionalAuth
}, async (req, reply) => {
  try {
    const demoData = {
      projects: [
        {
          id: 'demo',
          name: 'AgileForge Demo Project',
          description: 'Demonstration project showcasing advanced agile workflow features',
          ownerId: 'demo-user',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ],
      stories: [
        {
          id: '1',
          name: 'User Authentication System',
          description: 'Implement secure user login and registration',
          storyPoints: 13,
          priority: 'high',
          epicId: '1',
          tasks: [
            {
              id: '1',
              name: 'Design login UI',
              status: 'done',
              priority: 'medium',
              estimatedHours: 8,
              actualHours: 6,
              assignedTo: 'Alice Johnson',
              sprintId: '1'
            },
            {
              id: '2',
              name: 'Implement OAuth integration',
              status: 'in-progress',
              priority: 'high',
              estimatedHours: 16,
              actualHours: 10,
              assignedTo: 'Bob Smith',
              sprintId: '1'
            }
          ]
        },
        {
          id: '2',
          name: 'Dashboard Analytics',
          description: 'Create comprehensive analytics dashboard',
          storyPoints: 21,
          priority: 'medium',
          epicId: '1',
          tasks: [
            {
              id: '3',
              name: 'Design chart components',
              status: 'todo',
              priority: 'medium',
              estimatedHours: 12,
              assignedTo: 'Carol Davis',
              sprintId: '2'
            },
            {
              id: '4',
              name: 'Implement data visualization',
              status: 'todo',
              priority: 'high',
              estimatedHours: 20,
              assignedTo: 'David Wilson',
              sprintId: '2'
            }
          ]
        }
      ],
      sprints: [
        {
          id: '1',
          name: 'Sprint 1 - Authentication',
          startDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date().toISOString(),
          projectId: 'demo',
          capacity: 40,
          velocity: 35
        },
        {
          id: '2',
          name: 'Sprint 2 - Dashboard',
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          projectId: 'demo',
          capacity: 45,
          velocity: null
        }
      ]
    }

    return {
      message: 'Demo data for AgileForge advanced workflow features',
      data: demoData,
      timestamp: new Date().toISOString()
    }
  } catch (error: any) {
    app.log.error('Demo data endpoint error:', error)
    return reply.status(500).send({ error: 'Demo data unavailable' })
  }
})

// ─── Admin Interface ────────────────────────────────────────────────────
import { readFileSync } from 'fs'
import { join } from 'path'

app.get('/', async () => {
  try {
    const templatePath = join(__dirname, 'templates', 'admin-interface.html')
    return readFileSync(templatePath, 'utf-8')
  } catch (error) {
    app.log.error('Failed to load admin interface template:', error)
    return '<h1>AgileForge Backend v2.0</h1><p>Admin interface temporarily unavailable</p>'
  }
})

// ─── Admin Panel - Role Management ──────────────────────────────────────
app.get('/admin/roles', {
  preHandler: requireAdmin
}, async () => {
  return {
    roles: Object.values(UserRole),
    permissions: Object.keys(require('./types/auth').Permission),
    message: 'Available roles and permissions'
  }
})

// ─── Server Startup ─────────────────────────────────────────────────────
const start = async () => {
  try {
    const port = parseInt(process.env.PORT || '4000')
    const host = process.env.HOST || '0.0.0.0'
    
    await app.listen({ port, host })
    
    console.log(`
🚀 AgileForge Backend v2.0 Started Successfully!
📍 Server running on http://${host}:${port}
🔐 RBAC Enabled with 5 user roles
🏗️  Modular architecture implemented
✅ JWT Security configured
    `)
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

start() 