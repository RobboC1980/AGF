import { FastifyInstance } from 'fastify'
import { requireAuth } from '../../guards/auth.guard'

export default async function analyticsRoutes(fastify: FastifyInstance) {
  // Dashboard analytics endpoint
  fastify.get('/dashboard', {
    preHandler: requireAuth
  }, async (request, reply) => {
    const { projectId, timeRange = 'month' } = request.query as { projectId: string; timeRange?: string }

    try {
      // Mock analytics data - in a real implementation, this would query the database
      const analyticsData = {
        sprints: [
          {
            id: '1',
            name: 'Sprint 1',
            startDate: '2024-01-01',
            endDate: '2024-01-14',
            capacity: 40,
            velocity: 35,
            completed: true
          },
          {
            id: '2',
            name: 'Sprint 2',
            startDate: '2024-01-15',
            endDate: '2024-01-28',
            capacity: 40,
            velocity: 42,
            completed: true
          }
        ],
        tasks: [],
        stories: [],
        epics: [
          {
            id: '1',
            name: 'User Authentication System',
            totalStoryPoints: 50,
            completedStoryPoints: 35,
            progress: 70
          },
          {
            id: '2',
            name: 'Dashboard Implementation',
            totalStoryPoints: 30,
            completedStoryPoints: 25,
            progress: 83
          }
        ],
        velocityHistory: [
          {
            sprintName: 'Sprint 1',
            plannedPoints: 40,
            completedPoints: 35,
            date: '2024-01-14'
          },
          {
            sprintName: 'Sprint 2',
            plannedPoints: 40,
            completedPoints: 42,
            date: '2024-01-28'
          },
          {
            sprintName: 'Sprint 3',
            plannedPoints: 45,
            completedPoints: 38,
            date: '2024-02-11'
          }
        ],
        burndownData: generateBurndownData(),
        cumulativeFlow: generateCumulativeFlowData(),
        teamMetrics: {
          averageVelocity: 38.3,
          predictability: 85,
          throughput: 12,
          cycleTime: 3.2,
          leadTime: 5.8,
          defectRate: 2.1
        }
      }

      return analyticsData
    } catch (error) {
      fastify.log.error('Analytics dashboard error:', error)
      return reply.status(500).send({ error: 'Failed to load analytics data' })
    }
  })

  // Velocity tracking endpoint
  fastify.get('/velocity', {
    preHandler: requireAuth
  }, async (request, reply) => {
    const { projectId, sprints = 6 } = request.query as { projectId: string; sprints?: number }

    try {
      // Mock velocity data
      const velocityData = Array.from({ length: sprints }, (_, i) => ({
        sprintName: `Sprint ${i + 1}`,
        plannedPoints: 35 + Math.floor(Math.random() * 15),
        completedPoints: 30 + Math.floor(Math.random() * 20),
        date: new Date(Date.now() - (sprints - i - 1) * 14 * 24 * 60 * 60 * 1000).toISOString()
      }))

      return { velocityData }
    } catch (error) {
      fastify.log.error('Velocity tracking error:', error)
      return reply.status(500).send({ error: 'Failed to load velocity data' })
    }
  })

  // Burndown chart endpoint
  fastify.get('/burndown/:sprintId', {
    preHandler: requireAuth
  }, async (request, reply) => {
    const { sprintId } = request.params as { sprintId: string }

    try {
      const burndownData = generateBurndownData()
      return { burndownData }
    } catch (error) {
      fastify.log.error('Burndown chart error:', error)
      return reply.status(500).send({ error: 'Failed to load burndown data' })
    }
  })

  // Team metrics endpoint
  fastify.get('/team-metrics', {
    preHandler: requireAuth
  }, async (request, reply) => {
    const { projectId, timeRange = 'month' } = request.query as { projectId: string; timeRange?: string }

    try {
      const teamMetrics = {
        averageVelocity: 38.3,
        predictability: 85,
        throughput: 12,
        cycleTime: 3.2,
        leadTime: 5.8,
        defectRate: 2.1,
        teamCapacity: [
          {
            teamName: 'Frontend Team',
            sprintCapacity: 40,
            availablePoints: 35,
            allocatedPoints: 32
          },
          {
            teamName: 'Backend Team',
            sprintCapacity: 35,
            availablePoints: 30,
            allocatedPoints: 28
          }
        ]
      }

      return teamMetrics
    } catch (error) {
      fastify.log.error('Team metrics error:', error)
      return reply.status(500).send({ error: 'Failed to load team metrics' })
    }
  })
}

// Helper functions to generate mock data
function generateBurndownData() {
  const sprintDays = 10
  const totalWork = 120
  const burndownData = []

  for (let day = 0; day <= sprintDays; day++) {
    const idealBurndown = totalWork - (totalWork / sprintDays) * day
    const actualBurndown = totalWork - (totalWork / sprintDays) * day + (Math.random() - 0.5) * 20
    
    burndownData.push({
      date: new Date(Date.now() - (sprintDays - day) * 24 * 60 * 60 * 1000).toISOString(),
      remainingWork: Math.max(0, actualBurndown),
      idealBurndown: Math.max(0, idealBurndown),
      actualBurndown: Math.max(0, actualBurndown)
    })
  }

  return burndownData
}

function generateCumulativeFlowData() {
  const days = 30
  const cumulativeFlowData = []

  for (let day = 0; day < days; day++) {
    const baseDate = new Date(Date.now() - (days - day - 1) * 24 * 60 * 60 * 1000)
    
    cumulativeFlowData.push({
      date: baseDate.toISOString(),
      todo: Math.max(0, 50 - day * 1.2 + Math.random() * 5),
      inProgress: Math.min(15, day * 0.8 + Math.random() * 3),
      review: Math.min(8, day * 0.4 + Math.random() * 2),
      done: Math.min(day * 1.5, 45)
    })
  }

  return cumulativeFlowData
} 