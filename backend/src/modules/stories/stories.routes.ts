import { FastifyInstance } from 'fastify';
import { Permission } from '../../types/auth';
import { requirePermission } from '../../guards/auth.guard';

export default async function storiesRoutes(fastify: FastifyInstance) {
  
  // Get all stories with filtering options
  fastify.get('/', {
    preHandler: requirePermission(Permission.READ_STORY)
  }, async (request) => {
    const { epicId, projectId, status } = request.query as { 
      epicId?: string; 
      projectId?: string;
      status?: string;
    };
    
    let whereClause: any = {};
    
    if (epicId) {
      whereClause.epicId = epicId;
    } else if (projectId) {
      whereClause.epic = { projectId };
    }
    
    const stories = await fastify.prisma.story.findMany({
      where: whereClause,
      include: {
        epic: {
          include: {
            project: {
              select: { id: true, name: true }
            }
          }
        },
        tasks: {
          include: {
            sprint: {
              select: { id: true, name: true }
            }
          },
          orderBy: { createdAt: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    // Calculate stats for each story
    const storiesWithStats = stories.map(story => {
      const totalTasks = story.tasks.length;
      const completedTasks = story.tasks.filter(task => task.status === 'done').length;
      const inProgressTasks = story.tasks.filter(task => task.status === 'in_progress').length;
      const todoTasks = story.tasks.filter(task => task.status === 'todo').length;
      
      return {
        ...story,
        stats: {
          totalTasks,
          completedTasks,
          inProgressTasks,
          todoTasks,
          completionPercentage: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
          status: totalTasks === 0 ? 'no_tasks' :
                  completedTasks === totalTasks ? 'complete' :
                  inProgressTasks > 0 ? 'in_progress' : 'todo'
        }
      };
    });
    
    return { stories: storiesWithStats };
  });

  // Get single story by ID with full details
  fastify.get('/:id', {
    preHandler: requirePermission(Permission.READ_STORY)
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    
    const story = await fastify.prisma.story.findUnique({
      where: { id },
      include: {
        epic: {
          include: {
            project: {
              select: { id: true, name: true, description: true }
            }
          }
        },
        tasks: {
          include: {
            sprint: {
              select: { id: true, name: true, startDate: true, endDate: true }
            }
          },
          orderBy: [
            { status: 'asc' }, // todo first, then in_progress, then done
            { createdAt: 'asc' }
          ]
        }
      }
    });

    if (!story) {
      return reply.code(404).send({
        error: 'Story not found',
        code: 'STORY_NOT_FOUND'
      });
    }

    // Add computed stats
    const totalTasks = story.tasks.length;
    const completedTasks = story.tasks.filter(task => task.status === 'done').length;
    
    const storyWithStats = {
      ...story,
      stats: {
        totalTasks,
        completedTasks,
        completionPercentage: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
      }
    };

    return { story: storyWithStats };
  });

  // Create new story
  fastify.post('/', {
    preHandler: requirePermission(Permission.CREATE_STORY),
    schema: {
      body: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 200 },
          epicId: { type: 'string' },
          description: { type: 'string', maxLength: 2000 },
          acceptanceCriteria: { type: 'string', maxLength: 2000 },
          storyPoints: { type: 'integer', minimum: 1, maximum: 100 },
          priority: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] }
        }
      }
    }
  }, async (request, reply) => {
    const storyData = request.body as {
      name: string;
      epicId?: string;
      description?: string;
      acceptanceCriteria?: string;
      storyPoints?: number;
      priority?: string;
    };

    try {
      let epic = null;
      
      // Verify epic exists if provided
      if (storyData.epicId) {
        epic = await fastify.prisma.epic.findUnique({
          where: { id: storyData.epicId },
          include: {
            project: {
              select: { id: true, name: true }
            }
          }
        });

        if (!epic) {
          return reply.code(404).send({
            error: 'Epic not found',
            code: 'EPIC_NOT_FOUND'
          });
        }
      }

      const story = await fastify.prisma.story.create({
        data: {
          name: storyData.name,
          epicId: storyData.epicId || null,
          description: storyData.description,
          acceptanceCriteria: storyData.acceptanceCriteria,
          storyPoints: storyData.storyPoints,
          priority: storyData.priority || 'medium'
        },
        include: {
          epic: storyData.epicId ? {
            include: {
              project: {
                select: { id: true, name: true }
              }
            }
          } : false
        }
      });

      const logMessage = epic 
        ? `User ${request.user?.email} created story: ${story.name} in epic ${epic.name}`
        : `User ${request.user?.email} created independent story: ${story.name}`;
      
      fastify.log.info(logMessage);

      return reply.code(201).send({ story });
    } catch (error: any) {
      fastify.log.error('Story creation error:', error);
      return reply.code(500).send({
        error: 'Failed to create story',
        code: 'STORY_CREATE_ERROR'
      });
    }
  });

  // Update story
  fastify.put('/:id', {
    preHandler: requirePermission(Permission.UPDATE_STORY),
    schema: {
      params: {
        type: 'object',
        properties: { id: { type: 'string' } },
        required: ['id']
      },
      body: {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 200 },
          description: { type: 'string', maxLength: 2000 },
          acceptanceCriteria: { type: 'string', maxLength: 2000 },
          storyPoints: { type: 'integer', minimum: 1, maximum: 100 },
          priority: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] }
        }
      }
    }
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const updateData = request.body as {
      name?: string;
      description?: string;
      acceptanceCriteria?: string;
      storyPoints?: number;
      priority?: string;
    };

    try {
      const story = await fastify.prisma.story.update({
        where: { id },
        data: updateData,
        include: {
          epic: {
            include: {
              project: {
                select: { id: true, name: true }
              }
            }
          }
        }
      });

      fastify.log.info(`User ${request.user?.email} updated story: ${story.name}`);

      return { story };
    } catch (error: any) {
      if (error.code === 'P2025') {
        return reply.code(404).send({
          error: 'Story not found',
          code: 'STORY_NOT_FOUND'
        });
      }

      fastify.log.error('Story update error:', error);
      return reply.code(500).send({
        error: 'Failed to update story',
        code: 'STORY_UPDATE_ERROR'
      });
    }
  });

  // Delete story
  fastify.delete('/:id', {
    preHandler: requirePermission(Permission.DELETE_STORY)
  }, async (request, reply) => {
    const { id } = request.params as { id: string };

    try {
      // Check if story has tasks
      const tasksCount = await fastify.prisma.task.count({
        where: { storyId: id }
      });

      if (tasksCount > 0) {
        return reply.code(409).send({
          error: 'Cannot delete story with existing tasks',
          message: `This story contains ${tasksCount} tasks. Please delete or reassign them first.`,
          code: 'STORY_HAS_TASKS'
        });
      }

      const story = await fastify.prisma.story.delete({
        where: { id }
      });

      fastify.log.info(`User ${request.user?.email} deleted story: ${story.name}`);

      return reply.code(204).send();
    } catch (error: any) {
      if (error.code === 'P2025') {
        return reply.code(404).send({
          error: 'Story not found',
          code: 'STORY_NOT_FOUND'
        });
      }

      fastify.log.error('Story deletion error:', error);
      return reply.code(500).send({
        error: 'Failed to delete story',
        code: 'STORY_DELETE_ERROR'
      });
    }
  });

  // Get stories for a specific epic (convenience endpoint)
  fastify.get('/by-epic/:epicId', {
    preHandler: requirePermission(Permission.READ_STORY)
  }, async (request) => {
    const { epicId } = request.params as { epicId: string };
    
    const stories = await fastify.prisma.story.findMany({
      where: { epicId },
      include: {
        tasks: {
          select: { id: true, status: true }
        }
      },
      orderBy: { createdAt: 'asc' }
    });
    
    const storiesWithStats = stories.map(story => ({
      ...story,
      stats: {
        totalTasks: story.tasks.length,
        completedTasks: story.tasks.filter(task => task.status === 'done').length
      }
    }));
    
    return { stories: storiesWithStats };
  });
} 