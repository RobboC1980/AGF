import { FastifyInstance } from 'fastify';
import { Permission } from '../../types/auth';
import { requirePermission, requireAdmin } from '../../guards/auth.guard';
import { aiService } from './ai.service';

export default async function aiRoutes(fastify: FastifyInstance) {
  
  // AI Health Check - requires AI usage permission
  fastify.get('/health', {
    preHandler: requirePermission(Permission.USE_AI_GENERATION)
  }, async () => {
    return {
      status: 'AI Service Available',
      provider: process.env.AI_PROVIDER || 'openai',
      timestamp: new Date().toISOString()
    };
  });

  // Generate User Story - requires AI usage permission
  fastify.post('/generate-story', {
    preHandler: requirePermission(Permission.USE_AI_GENERATION),
    schema: {
      body: {
        type: 'object',
        required: [],
        properties: {
          epicName: { type: 'string', minLength: 1 },
          projectName: { type: 'string' },
          projectType: { type: 'string' },
          userPersona: { type: 'string' },
          prompt: { type: 'string', minLength: 1 }
        }
      }
    }
  }, async (request, reply) => {
    const {
      epicName,
      projectName,
      projectType,
      userPersona,
      prompt
    } = request.body as {
      epicName?: string;
      projectName?: string;
      projectType?: string;
      userPersona?: string;
      prompt?: string;
    };

    try {
      const logContext = epicName ? `epic: ${epicName}` : `independent story${prompt ? ` with prompt: ${prompt}` : ''}`;
      fastify.log.info(`User ${request.user?.email} (${request.user?.role}) generating story for ${logContext}`);

      const result = await aiService.generateUserStories({
        epicName,
        projectName,
        projectType,
        userPersona,
        prompt
      });

      return {
        success: true,
        suggestions: result.suggestions,
        provider: result.provider,
        model: result.model,
        confidence: result.confidence,
        context: {
          epicName: epicName || null,
          projectName,
          prompt,
          isIndependentStory: !epicName,
          generatedAt: new Date().toISOString()
        }
      };
    } catch (error: any) {
      fastify.log.error('AI story generation error:', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to generate story suggestions',
        message: error.message,
        provider: 'error'
      });
    }
  });

  // Generate Epic - requires AI usage permission
  fastify.post('/generate-epic', {
    preHandler: requirePermission(Permission.USE_AI_GENERATION),
    schema: {
      body: {
        type: 'object',
        required: ['projectName', 'description'],
        properties: {
          projectName: { type: 'string', minLength: 1 },
          description: { type: 'string', minLength: 1 },
          goals: { type: 'array', items: { type: 'string' } },
          constraints: { type: 'array', items: { type: 'string' } }
        }
      }
    }
  }, async (request, reply) => {
    const {
      projectName,
      description,
      goals,
      constraints
    } = request.body as {
      projectName: string;
      description: string;
      goals?: string[];
      constraints?: string[];
    };

    try {
      fastify.log.info(`User ${request.user?.email} (${request.user?.role}) generating epic for project: ${projectName}`);

      const epic = await aiService.generateEpic({
        projectName,
        description,
        goals,
        constraints
      });

      return { epic };
    } catch (error: any) {
      fastify.log.error('AI epic generation error:', error);
      return reply.code(500).send({
        error: 'Epic generation failed',
        message: error.message || 'An error occurred while generating the epic',
        code: 'AI_GENERATION_ERROR'
      });
    }
  });

  // Generate Tasks from Story - requires AI usage permission
  fastify.post('/generate-tasks', {
    preHandler: requirePermission(Permission.USE_AI_GENERATION),
    schema: {
      body: {
        type: 'object',
        required: ['storyTitle', 'storyDescription'],
        properties: {
          storyTitle: { type: 'string', minLength: 1 },
          storyDescription: { type: 'string', minLength: 1 },
          acceptanceCriteria: { type: 'array', items: { type: 'string' } },
          technicalRequirements: { type: 'array', items: { type: 'string' } }
        }
      }
    }
  }, async (request, reply) => {
    const {
      storyTitle,
      storyDescription,
      acceptanceCriteria,
      technicalRequirements
    } = request.body as {
      storyTitle: string;
      storyDescription: string;
      acceptanceCriteria?: string[];
      technicalRequirements?: string[];
    };

    try {
      fastify.log.info(`User ${request.user?.email} (${request.user?.role}) generating tasks for story: ${storyTitle}`);

      const tasks = await aiService.generateTasks({
        storyTitle,
        storyDescription,
        acceptanceCriteria,
        technicalRequirements
      });

      return { tasks };
    } catch (error: any) {
      fastify.log.error('AI task generation error:', error);
      return reply.code(500).send({
        error: 'Task generation failed',
        message: error.message || 'An error occurred while generating tasks',
        code: 'AI_GENERATION_ERROR'
      });
    }
  });

  // Get AI Usage Statistics - Admin only
  fastify.get('/stats', {
    preHandler: requireAdmin
  }, async (request) => {
    // This would typically come from a usage tracking database
    // For now, return mock data
    return {
      totalRequests: 0,
      requestsByUser: {},
      requestsByType: {
        story: 0,
        epic: 0,
        tasks: 0
      },
      errorRate: 0,
      averageResponseTime: 0,
      timestamp: new Date().toISOString(),
      requestedBy: request.user?.email
    };
  });

  // AI Configuration - Admin only
  fastify.get('/config', {
    preHandler: requireAdmin
  }, async () => {
    return {
      provider: process.env.AI_PROVIDER || 'openai',
      hasOpenAIKey: !!process.env.OPENAI_API_KEY,
      hasAnthropicKey: !!process.env.ANTHROPIC_API_KEY,
      rateLimits: {
        requestsPerMinute: 5,
        requestsPerDay: 100
      }
    };
  });

  // Update AI Configuration - Admin only
  fastify.put('/config', {
    preHandler: requireAdmin,
    schema: {
      body: {
        type: 'object',
        properties: {
          provider: { type: 'string', enum: ['openai', 'anthropic'] },
          rateLimits: {
            type: 'object',
            properties: {
              requestsPerMinute: { type: 'number', minimum: 1 },
              requestsPerDay: { type: 'number', minimum: 1 }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    const config = request.body as {
      provider?: string;
      rateLimits?: {
        requestsPerMinute?: number;
        requestsPerDay?: number;
      };
    };

    fastify.log.info(`Admin ${request.user?.email} updating AI configuration:`, config);

    // In a real implementation, you would update the configuration in a database
    // and possibly restart services or update environment variables
    
    return reply.send({
      message: 'AI configuration updated successfully',
      updatedBy: request.user?.email,
      timestamp: new Date().toISOString(),
      config
    });
  });
} 