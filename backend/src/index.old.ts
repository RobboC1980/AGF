import 'dotenv/config'
import Fastify from 'fastify'
import sensible from '@fastify/sensible'
import cors from '@fastify/cors'
import { PrismaClient } from '@prisma/client'
import authPlugin from './plugins/auth'
import rateLimitPlugin from './plugins/rateLimit'
import { registerCrud } from './routes/genericCrud'
import { z } from 'zod'
import { aiService } from './services/aiService'

// ─── Setup ──────────────────────────────────────────────────────────────
const prisma = new PrismaClient()
const app = Fastify({ logger: true })

// ─── Plugin Registration ────────────────────────────────────────────────
app.register(sensible)
app.register(cors, {
  origin: process.env.NODE_ENV === 'production' ? false : true,
  credentials: true
})
app.register(rateLimitPlugin)
app.register(authPlugin)

// ─── Auth Routes ────────────────────────────────────────────────────────
app.post('/login', async (req, reply) => {
  const { email, password } = req.body as { email: string; password: string }
  if (!email || !password) {
    return reply.badRequest('Email and password are required')
  }

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user || user.password !== password) {
    return reply.unauthorized('Invalid credentials')
  }

  const token = app.jwt.sign({ id: user.id, email: user.email })
  return { token, user: { id: user.id, email: user.email, name: user.name } }
})

app.post('/register', async (req) => {
  const { email, password, name } = req.body as {
    email: string
    password: string
    name: string
  }
  if (!email || !password || !name) {
    throw new Error('Email, password, and name are required')
  }

  try {
    const user = await prisma.user.create({ data: { email, password, name } })
    return { id: user.id, email: user.email, name: user.name }
  } catch (error: any) {
    if (error.code === 'P2002') {
      throw new Error('User with this email already exists')
    }
    throw error
  }
})

// ─── Health Check ───────────────────────────────────────────────────────
app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }))

// ─── Dashboard Endpoint ─────────────────────────────────────────────────
app.get('/dashboard', async (req, reply) => {
  try {
    // Verify token if provided, but don't fail if it's invalid
    if (req.headers.authorization) {
      try {
        await req.jwtVerify()
      } catch (jwtError) {
        // Log JWT errors but continue - dashboard is publicly accessible
        app.log.warn('JWT verification failed for dashboard request:', jwtError)
      }
    }

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

    return {
      message: 'Welcome to AgileForge Dashboard',
      stats,
      timestamp: new Date().toISOString()
    }
  } catch (error: any) {
    app.log.error('Dashboard endpoint error:', error)
    return reply.status(500).send({ error: 'Dashboard data unavailable' })
  }
})

// ─── Admin Interface ────────────────────────────────────────────────────
app.get('/', async () => {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>AgileForge Backend Admin</title>
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
            .container { max-width: 1200px; margin: 0 auto; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 2rem; border-radius: 12px; margin-bottom: 2rem; }
            .card { background: white; padding: 1.5rem; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-bottom: 1rem; }
            .endpoint { display: flex; align-items: center; margin: 0.5rem 0; }
            .method { padding: 0.25rem 0.5rem; border-radius: 4px; font-weight: bold; font-size: 0.75rem; margin-right: 1rem; }
            .get { background: #22c55e; color: white; }
            .post { background: #3b82f6; color: white; }
            .endpoint-url { font-family: 'Monaco', monospace; background: #f3f4f6; padding: 0.25rem 0.5rem; border-radius: 4px; }
            .test-btn { background: #8b5cf6; color: white; border: none; padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer; margin-left: 1rem; }
            .test-btn:hover { background: #7c3aed; }
            .section { margin-bottom: 2rem; }
            pre { background: #1f2937; color: #e5e7eb; padding: 1rem; border-radius: 4px; overflow-x: auto; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🚀 AgileForge Backend Admin</h1>
                <p>API Status: <strong>Running</strong> | Database: <strong>Connected</strong></p>
            </div>

            <div class="section">
                <div class="card">
                    <h2>📡 API Endpoints</h2>
                    
                    <h3>Authentication</h3>
                    <div class="endpoint">
                        <span class="method post">POST</span>
                        <span class="endpoint-url">/register</span>
                        <button class="test-btn" onclick="testEndpoint('/register', 'POST', {email:'test@example.com', password:'test123', name:'Test User'})">Test</button>
                    </div>
                    <div class="endpoint">
                        <span class="method post">POST</span>
                        <span class="endpoint-url">/login</span>
                        <button class="test-btn" onclick="testEndpoint('/login', 'POST', {email:'chrisjrobertson@outlook.com', password:'your_password'})">Test</button>
                    </div>

                    <h3>Health & Status</h3>
                    <div class="endpoint">
                        <span class="method get">GET</span>
                        <span class="endpoint-url">/health</span>
                        <button class="test-btn" onclick="testEndpoint('/health', 'GET')">Test</button>
                    </div>

                    <h3>AI Endpoints (Rate Limited: 5/min)</h3>
                    <div class="endpoint">
                        <span class="method post">POST</span>
                        <span class="endpoint-url">/ai/generate-story</span>
                        <button class="test-btn" onclick="testEndpoint('/ai/generate-story', 'POST', {epicName:'User Management', projectName:'AgileForge'})">Test</button>
                    </div>
                    <div class="endpoint">
                        <span class="method get">GET</span>
                        <span class="endpoint-url">/ai/health</span>
                        <button class="test-btn" onclick="testEndpoint('/ai/health', 'GET')">Test</button>
                    </div>

                    <h3>CRUD Endpoints (Rate Limited: 100/min)</h3>
                    <div class="endpoint">
                        <span class="method get">GET</span>
                        <span class="endpoint-url">/projects</span>
                        <button class="test-btn" onclick="testEndpoint('/projects', 'GET')">Test</button>
                    </div>
                    <div class="endpoint">
                        <span class="method get">GET</span>
                        <span class="endpoint-url">/epics</span>
                        <button class="test-btn" onclick="testEndpoint('/epics', 'GET')">Test</button>
                    </div>
                    <div class="endpoint">
                        <span class="method get">GET</span>
                        <span class="endpoint-url">/stories</span>
                        <button class="test-btn" onclick="testEndpoint('/stories', 'GET')">Test</button>
                    </div>
                    <div class="endpoint">
                        <span class="method get">GET</span>
                        <span class="endpoint-url">/tasks</span>
                        <button class="test-btn" onclick="testEndpoint('/tasks', 'GET')">Test</button>
                    </div>
                    <div class="endpoint">
                        <span class="method get">GET</span>
                        <span class="endpoint-url">/sprints</span>
                        <button class="test-btn" onclick="testEndpoint('/sprints', 'GET')">Test</button>
                    </div>
                    <div class="endpoint">
                        <span class="method get">GET</span>
                        <span class="endpoint-url">/initiatives</span>
                        <button class="test-btn" onclick="testEndpoint('/initiatives', 'GET')">Test</button>
                    </div>
                    <div class="endpoint">
                        <span class="method get">GET</span>
                        <span class="endpoint-url">/risks</span>
                        <button class="test-btn" onclick="testEndpoint('/risks', 'GET')">Test</button>
                    </div>
                    <div class="endpoint">
                        <span class="method get">GET</span>
                        <span class="endpoint-url">/okrs</span>
                        <button class="test-btn" onclick="testEndpoint('/okrs', 'GET')">Test</button>
                    </div>
                </div>
            </div>

            <div class="section">
                <div class="card">
                    <h2>🧪 API Tester</h2>
                    <div id="result"></div>
                </div>
            </div>

            <div class="section">
                <div class="card">
                    <h2>🚦 Rate Limit Status</h2>
                    <button class="test-btn" onclick="getRateLimits()">Check Rate Limits</button>
                    <div id="rate-limits"></div>
                </div>
            </div>

            <div class="section">
                <div class="card">
                    <h2>📊 Quick Database Stats</h2>
                    <button class="test-btn" onclick="getStats()">Load Stats</button>
                    <div id="stats"></div>
                </div>
            </div>
        </div>

        <script>
            async function testEndpoint(url, method, body = null) {
                const resultDiv = document.getElementById('result');
                resultDiv.innerHTML = '<p>Testing ' + method + ' ' + url + '...</p>';
                
                try {
                    const options = {
                        method: method,
                        headers: {
                            'Content-Type': 'application/json',
                        }
                    };
                    
                    if (body) {
                        options.body = JSON.stringify(body);
                    }
                    
                    const response = await fetch(url, options);
                    const data = await response.text();
                    
                    resultDiv.innerHTML = \`
                        <h3>Response from \${method} \${url}</h3>
                        <p><strong>Status:</strong> \${response.status} \${response.statusText}</p>
                        <pre>\${data}</pre>
                    \`;
                } catch (error) {
                    resultDiv.innerHTML = \`
                        <h3>Error testing \${method} \${url}</h3>
                        <pre style="color: #ef4444;">\${error.message}</pre>
                    \`;
                }
            }

            async function getRateLimits() {
                const rateLimitsDiv = document.getElementById('rate-limits');
                rateLimitsDiv.innerHTML = '<p>Loading rate limit status...</p>';
                
                try {
                    const response = await fetch('/admin/rate-limits');
                    const data = await response.json();
                    
                    rateLimitsDiv.innerHTML = \`
                        <h3>Rate Limit Status for IP: \${data.ip}</h3>
                        <div style="display: grid; gap: 1rem; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));">
                            <div style="background: #f8f9fa; padding: 1rem; border-radius: 8px;">
                                <h4>🤖 AI Endpoints</h4>
                                <p><strong>Limit:</strong> \${data.limits.ai.max} requests per minute</p>
                                <p><strong>Remaining:</strong> \${data.limits.ai.remaining}</p>
                                <p><strong>Reset:</strong> \${new Date(data.limits.ai.resetTime).toLocaleTimeString()}</p>
                            </div>
                            <div style="background: #f8f9fa; padding: 1rem; border-radius: 8px;">
                                <h4>🔐 Auth Endpoints</h4>
                                <p><strong>Limit:</strong> \${data.limits.auth.max} requests per 15 minutes</p>
                                <p><strong>Remaining:</strong> \${data.limits.auth.remaining}</p>
                                <p><strong>Reset:</strong> \${new Date(data.limits.auth.resetTime).toLocaleTimeString()}</p>
                            </div>
                            <div style="background: #f8f9fa; padding: 1rem; border-radius: 8px;">
                                <h4>📝 CRUD Endpoints</h4>
                                <p><strong>Limit:</strong> \${data.limits.crud.max} requests per minute</p>
                                <p><strong>Remaining:</strong> \${data.limits.crud.remaining}</p>
                                <p><strong>Reset:</strong> \${new Date(data.limits.crud.resetTime).toLocaleTimeString()}</p>
                            </div>
                        </div>
                    \`;
                } catch (error) {
                    rateLimitsDiv.innerHTML = \`<p style="color: #ef4444;">Error loading rate limits: \${error.message}</p>\`;
                }
            }

            async function getStats() {
                const statsDiv = document.getElementById('stats');
                statsDiv.innerHTML = '<p>Loading database statistics...</p>';
                
                try {
                    const response = await fetch('/admin/stats');
                    const data = await response.json();
                    
                    statsDiv.innerHTML = \`
                        <h3>Database Statistics</h3>
                        <pre>\${JSON.stringify(data, null, 2)}</pre>
                    \`;
                } catch (error) {
                    statsDiv.innerHTML = \`<p style="color: #ef4444;">Error loading stats: \${error.message}</p>\`;
                }
            }
        </script>
    </body>
    </html>
  `
})

// ─── Admin Stats Endpoint ───────────────────────────────────────────────
app.get('/admin/stats', async () => {
  try {
    const users = await prisma.user.count()
    const projects = await prisma.project.count()
    const epics = await prisma.epic.count()
    const stories = await prisma.story.count()
    const tasks = await prisma.task.count()
    const sprints = await prisma.sprint.count()
    const initiatives = await prisma.initiative.count()
    const risks = await prisma.risk.count()
    const okrs = await prisma.oKR.count()

    return {
      database: 'Connected',
      timestamp: new Date().toISOString(),
      tables: {
        users,
        projects,
        epics,
        stories,
        tasks,
        sprints,
        initiatives,
        risks,
        okrs
      }
    }
  } catch (error: any) {
    return { error: 'Database connection failed', message: error.message }
  }
})

// ─── CRUD Endpoints Registration ────────────────────────────────────────
app.register(async function (app) {
  registerCrud(app, 'projects', prisma.project, z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    ownerId: z.string().uuid()
  }))

  registerCrud(app, 'epics', prisma.epic, z.object({
    name: z.string(),
    projectId: z.string().uuid()
  }))

  registerCrud(app, 'stories', prisma.story, z.object({
    name: z.string(),
    epicId: z.string().uuid()
  }))

  registerCrud(app, 'tasks', prisma.task, z.object({
    name: z.string(),
    status: z.string(),
    storyId: z.string().uuid(),
    sprintId: z.string().uuid().optional()
  }))

  registerCrud(app, 'sprints', prisma.sprint, z.object({
    name: z.string(),
    startDate: z.string().transform(date => new Date(date)),
    endDate: z.string().transform(date => new Date(date)),
    projectId: z.string().uuid()
  }))

  registerCrud(app, 'initiatives', prisma.initiative, z.object({
    title: z.string(),
    description: z.string().optional(),
    projectId: z.string().uuid()
  }))

  registerCrud(app, 'risks', prisma.risk, z.object({
    description: z.string(),
    probability: z.number().min(1).max(5),
    impact: z.number().min(1).max(5),
    mitigation: z.string().optional(),
    initiativeId: z.string().uuid()
  }))

  registerCrud(app, 'okrs', prisma.oKR, z.object({
    objective: z.string(),
    keyResult: z.string(),
    progress: z.number().min(0).max(100),
    initiativeId: z.string().uuid()
  }))
})

// ─── AI Story Generation ────────────────────────────────────────────────
app.post('/ai/generate-story', async (req, reply) => {
  try {
    const { epicName, projectName, projectType, userPersona } = req.body as { 
      epicName: string; 
      projectName?: string;
      projectType?: string;
      userPersona?: string;
    }
    
    if (!epicName) {
      return reply.badRequest('Epic name is required')
    }

    // Use the AI service for intelligent story generation
    const result = await aiService.generateUserStories({
      epicName,
      projectName,
      projectType,
      userPersona
    })
    
    return {
      success: true,
      suggestions: result.suggestions,
      provider: result.provider,
      model: result.model,
      confidence: result.confidence,
      context: {
        epicName,
        projectName,
        projectType,
        userPersona,
        generatedAt: new Date().toISOString()
      }
    }
  } catch (error: any) {
    app.log.error('AI story generation error:', error)
    return reply.status(500).send({
      success: false,
      error: 'Failed to generate story suggestions',
      message: error.message,
      provider: 'error'
    })
  }
})

// ─── AI Health Check ────────────────────────────────────────────────────
app.get('/ai/health', async () => {
  try {
    const status = await aiService.checkAIProviders()
    return {
      status: 'ok',
      providers: status,
      timestamp: new Date().toISOString()
    }
  } catch (error: any) {
    return {
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    }
  }
})

// ─── Start Server ───────────────────────────────────────────────────────
const start = async () => {
  try {
    const port = parseInt(process.env.PORT ?? '4000')
    const host = process.env.HOST ?? '0.0.0.0'
    const address = await app.listen({ port, host })
    console.log(`Server running on ${address}`)
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

start()
