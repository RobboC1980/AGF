import { FastifyInstance } from 'fastify';
import { Permission } from '../../types/auth';
import { requirePermission } from '../../guards/auth.guard';

export default async function epicsRoutes(fastify: FastifyInstance) {
  
  // Get all epics for a project
  fastify.get('/', {
    preHandler: requirePermission(Permission.READ_EPIC)
  }, async (request) => {
    const { projectId } = request.query as { projectId?: string };
    
    const whereClause = projectId ? { projectId } : {};
    
    const epics = await fastify.prisma.epic.findMany({
      where: whereClause,
      include: {
        project: {
          select: { id: true, name: true }
        },
        stories: {
          include: {
            tasks: {
              select: { id: true, status: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    // Calculate stats for each epic
    const epicsWithStats = epics.map(epic => ({
      ...epic,
      stats: {
        totalStories: epic.stories.length,
        totalTasks: epic.stories.reduce((sum, story) => sum + story.tasks.length, 0),
        completedTasks: epic.stories.reduce((sum, story) => 
          sum + story.tasks.filter(task => task.status === 'done').length, 0
        )
      }
    }));
    
    return { epics: epicsWithStats };
  });

  // Get single epic by ID
  fastify.get('/:id', {
    preHandler: requirePermission(Permission.READ_EPIC)
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    
    const epic = await fastify.prisma.epic.findUnique({
      where: { id },
      include: {
        project: {
          select: { id: true, name: true, description: true }
        },
        stories: {
          include: {
            tasks: true
          },
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!epic) {
      return reply.code(404).send({
        error: 'Epic not found',
        code: 'EPIC_NOT_FOUND'
      });
    }

    return { epic };
  });

  // Create new epic
  fastify.post('/', {
    preHandler: requirePermission(Permission.CREATE_EPIC),
    schema: {
      body: {
        type: 'object',
        required: ['name', 'projectId'],
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 200 },
          projectId: { type: 'string' },
          description: { type: 'string', maxLength: 1000 }
        }
      }
    }
  }, async (request, reply) => {
    const epicData = request.body as {
      name: string;
      projectId: string;
      description?: string;
    };

    try {
      // Verify project exists and user has access
      const project = await fastify.prisma.project.findUnique({
        where: { id: epicData.projectId }
      });

      if (!project) {
        return reply.code(404).send({
          error: 'Project not found',
          code: 'PROJECT_NOT_FOUND'
        });
      }

      const epic = await fastify.prisma.epic.create({
        data: {
          name: epicData.name,
          projectId: epicData.projectId,
          description: epicData.description
        },
        include: {
          project: {
            select: { id: true, name: true }
          }
        }
      });

      fastify.log.info(`User ${request.user?.email} created epic: ${epic.name} in project ${project.name}`);

      return reply.code(201).send({ epic });
    } catch (error: any) {
      fastify.log.error('Epic creation error:', error);
      return reply.code(500).send({
        error: 'Failed to create epic',
        code: 'EPIC_CREATE_ERROR'
      });
    }
  });

  // Update epic
  fastify.put('/:id', {
    preHandler: requirePermission(Permission.UPDATE_EPIC),
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
          description: { type: 'string', maxLength: 1000 }
        }
      }
    }
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const updateData = request.body as {
      name?: string;
      description?: string;
    };

    try {
      const epic = await fastify.prisma.epic.update({
        where: { id },
        data: updateData,
        include: {
          project: {
            select: { id: true, name: true }
          }
        }
      });

      fastify.log.info(`User ${request.user?.email} updated epic: ${epic.name}`);

      return { epic };
    } catch (error: any) {
      if (error.code === 'P2025') {
        return reply.code(404).send({
          error: 'Epic not found',
          code: 'EPIC_NOT_FOUND'
        });
      }

      fastify.log.error('Epic update error:', error);
      return reply.code(500).send({
        error: 'Failed to update epic',
        code: 'EPIC_UPDATE_ERROR'
      });
    }
  });

  // Delete epic
  fastify.delete('/:id', {
    preHandler: requirePermission(Permission.DELETE_EPIC)
  }, async (request, reply) => {
    const { id } = request.params as { id: string };

    try {
      // Check if epic has stories
      const storiesCount = await fastify.prisma.story.count({
        where: { epicId: id }
      });

      if (storiesCount > 0) {
        return reply.code(409).send({
          error: 'Cannot delete epic with existing stories',
          message: `This epic contains ${storiesCount} stories. Please delete or move them first.`,
          code: 'EPIC_HAS_STORIES'
        });
      }

      const epic = await fastify.prisma.epic.delete({
        where: { id }
      });

      fastify.log.info(`User ${request.user?.email} deleted epic: ${epic.name}`);

      return reply.code(204).send();
    } catch (error: any) {
      if (error.code === 'P2025') {
        return reply.code(404).send({
          error: 'Epic not found',
          code: 'EPIC_NOT_FOUND'
        });
      }

      fastify.log.error('Epic deletion error:', error);
      return reply.code(500).send({
        error: 'Failed to delete epic',
        code: 'EPIC_DELETE_ERROR'
      });
    }
  });
} 