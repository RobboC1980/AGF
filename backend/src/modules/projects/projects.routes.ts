import { FastifyInstance } from 'fastify';
import { Permission } from '../../types/auth';
import { 
  requirePermission, 
  requireAuth,
  requireProjectManagerOrAbove,
  requireDeveloperOrAbove 
} from '../../guards/auth.guard';

export default async function projectsRoutes(fastify: FastifyInstance) {
  
  // Get all projects - requires READ_PROJECT permission
  fastify.get('/', {
    preHandler: requirePermission(Permission.READ_PROJECT)
  }, async () => {
    const projects = await fastify.prisma.project.findMany({
      include: {
        epics: {
          include: {
            stories: {
              include: {
                tasks: true
              }
            }
          }
        },
        sprints: true,
        initiatives: {
          include: {
            risks: true,
            okrs: true
          }
        }
      }
    });
    
    return { projects };
  });

  // Get single project by ID - requires READ_PROJECT permission
  fastify.get('/:id', {
    preHandler: requirePermission(Permission.READ_PROJECT)
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    
    const project = await fastify.prisma.project.findUnique({
      where: { id },
      include: {
        epics: {
          include: {
            stories: {
              include: {
                tasks: true
              }
            }
          }
        },
        sprints: true,
        initiatives: {
          include: {
            risks: true,
            okrs: true
          }
        }
      }
    });

    if (!project) {
      return reply.code(404).send({
        error: 'Project not found',
        code: 'PROJECT_NOT_FOUND'
      });
    }

    return { project };
  });

  // Create new project - requires CREATE_PROJECT permission (PM+ only)
  fastify.post('/', {
    preHandler: requirePermission(Permission.CREATE_PROJECT),
    schema: {
      body: {
        type: 'object',
        required: ['name', 'description'],
        properties: {
          name: { type: 'string', minLength: 1 },
          description: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    const projectData = request.body as {
      name: string;
      description: string;
    };

    try {
      const project = await fastify.prisma.project.create({
        data: {
          name: projectData.name,
          description: projectData.description,
          ownerId: request.user!.id
        }
      });

      fastify.log.info(`User ${request.user?.email} created project: ${project.name}`);

      return reply.code(201).send({ project });
    } catch (error: any) {
      fastify.log.error('Project creation error:', error);
      return reply.code(500).send({
        error: 'Failed to create project',
        code: 'PROJECT_CREATE_ERROR'
      });
    }
  });

  // Update project - requires UPDATE_PROJECT permission (PM+ only)
  fastify.put('/:id', {
    preHandler: requirePermission(Permission.UPDATE_PROJECT),
    schema: {
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        },
        required: ['id']
      },
      body: {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 1 },
          description: { type: 'string' },
          status: { type: 'string', enum: ['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED'] }
        }
      }
    }
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const updateData = request.body as {
      name?: string;
      description?: string;
      status?: string;
    };

    try {
      const project = await fastify.prisma.project.update({
        where: { id },
        data: updateData
      });

      fastify.log.info(`User ${request.user?.email} updated project: ${project.name}`);

      return { project };
    } catch (error: any) {
      if (error.code === 'P2025') {
        return reply.code(404).send({
          error: 'Project not found',
          code: 'PROJECT_NOT_FOUND'
        });
      }

      fastify.log.error('Project update error:', error);
      return reply.code(500).send({
        error: 'Failed to update project',
        code: 'PROJECT_UPDATE_ERROR'
      });
    }
  });

  // Delete project - requires DELETE_PROJECT permission (PM+ only)
  fastify.delete('/:id', {
    preHandler: requirePermission(Permission.DELETE_PROJECT)
  }, async (request, reply) => {
    const { id } = request.params as { id: string };

    try {
      const project = await fastify.prisma.project.delete({
        where: { id }
      });

      fastify.log.info(`User ${request.user?.email} deleted project: ${project.name}`);

      return reply.code(204).send();
    } catch (error: any) {
      if (error.code === 'P2025') {
        return reply.code(404).send({
          error: 'Project not found',
          code: 'PROJECT_NOT_FOUND'
        });
      }

      fastify.log.error('Project deletion error:', error);
      return reply.code(500).send({
        error: 'Failed to delete project',
        code: 'PROJECT_DELETE_ERROR'
      });
    }
  });

  // Get project statistics - developers and above can access
  fastify.get('/:id/stats', {
    preHandler: requireDeveloperOrAbove
  }, async (request, reply) => {
    const { id } = request.params as { id: string };

    try {
      const project = await fastify.prisma.project.findUnique({
        where: { id },
        select: { id: true, name: true }
      });

      if (!project) {
        return reply.code(404).send({
          error: 'Project not found',
          code: 'PROJECT_NOT_FOUND'
        });
      }

      const stats = {
        epics: await fastify.prisma.epic.count({ where: { projectId: id } }),
        stories: await fastify.prisma.story.count({ 
          where: { epic: { projectId: id } } 
        }),
        tasks: await fastify.prisma.task.count({ 
          where: { story: { epic: { projectId: id } } } 
        }),
        sprints: await fastify.prisma.sprint.count({ where: { projectId: id } }),
        risks: await fastify.prisma.risk.count({ 
          where: { initiative: { projectId: id } } 
        })
      };

      return {
        project: project.name,
        stats
      };
    } catch (error: any) {
      fastify.log.error('Project stats error:', error);
      return reply.code(500).send({
        error: 'Failed to get project statistics',
        code: 'PROJECT_STATS_ERROR'
      });
    }
  });
} 