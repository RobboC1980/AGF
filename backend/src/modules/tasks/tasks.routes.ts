import { FastifyInstance } from 'fastify';
import { Permission } from '../../types/auth';
import { requirePermission } from '../../guards/auth.guard';

const VALID_STATUS_TRANSITIONS = {
  'todo': ['in_progress'],
  'in_progress': ['todo', 'done'],
  'done': ['in_progress']
};

export default async function tasksRoutes(fastify: FastifyInstance) {
  
  // Get all tasks with filtering
  fastify.get('/', {
    preHandler: requirePermission(Permission.READ_TASK)
  }, async (request) => {
    const { storyId, sprintId, status, assignedTo } = request.query as { 
      storyId?: string; 
      sprintId?: string;
      status?: string;
      assignedTo?: string;
    };
    
    let whereClause: any = {};
    
    if (storyId) whereClause.storyId = storyId;
    if (sprintId) whereClause.sprintId = sprintId;
    if (status) whereClause.status = status;
    if (assignedTo) whereClause.assignedTo = assignedTo;
    
    const tasks = await fastify.prisma.task.findMany({
      where: whereClause,
      include: {
        story: {
          include: {
            epic: {
              include: {
                project: {
                  select: { id: true, name: true }
                }
              }
            }
          }
        },
        sprint: {
          select: { id: true, name: true, startDate: true, endDate: true }
        }
      },
      orderBy: [
        { status: 'asc' }, // todo, in_progress, done
        { priority: 'desc' }, // high priority first
        { createdAt: 'asc' }
      ]
    });
    
    return { tasks };
  });

  // Get single task with full details
  fastify.get('/:id', {
    preHandler: requirePermission(Permission.READ_TASK)
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    
    const task = await fastify.prisma.task.findUnique({
      where: { id },
      include: {
        story: {
          include: {
            epic: {
              include: {
                project: true
              }
            }
          }
        },
        sprint: true
      }
    });

    if (!task) {
      return reply.code(404).send({
        error: 'Task not found',
        code: 'TASK_NOT_FOUND'
      });
    }

    return { task };
  });

  // Create new task
  fastify.post('/', {
    preHandler: requirePermission(Permission.CREATE_TASK),
    schema: {
      body: {
        type: 'object',
        required: ['name', 'storyId'],
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 200 },
          storyId: { type: 'string' },
          description: { type: 'string', maxLength: 1000 },
          estimatedHours: { type: 'number', minimum: 0.5, maximum: 40 },
          priority: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
          sprintId: { type: 'string' },
          assignedTo: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    const taskData = request.body as {
      name: string;
      storyId: string;
      description?: string;
      estimatedHours?: number;
      priority?: string;
      sprintId?: string;
      assignedTo?: string;
    };

    try {
      // Verify story exists
      const story = await fastify.prisma.story.findUnique({
        where: { id: taskData.storyId },
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

      if (!story) {
        return reply.code(404).send({
          error: 'Story not found',
          code: 'STORY_NOT_FOUND'
        });
      }

      // Verify sprint exists if provided
      if (taskData.sprintId) {
        const sprint = await fastify.prisma.sprint.findUnique({
          where: { id: taskData.sprintId }
        });

        if (!sprint) {
          return reply.code(404).send({
            error: 'Sprint not found',
            code: 'SPRINT_NOT_FOUND'
          });
        }
      }

      const task = await fastify.prisma.task.create({
        data: {
          name: taskData.name,
          storyId: taskData.storyId,
          description: taskData.description,
          estimatedHours: taskData.estimatedHours,
          priority: taskData.priority || 'medium',
          sprintId: taskData.sprintId,
          assignedTo: taskData.assignedTo,
          status: 'todo'
        },
        include: {
          story: {
            include: {
              epic: {
                include: {
                  project: {
                    select: { id: true, name: true }
                  }
                }
              }
            }
          },
          sprint: {
            select: { id: true, name: true }
          }
        }
      });

      fastify.log.info(`User ${request.user?.email} created task: ${task.name} for story ${story.name}`);

      return reply.code(201).send({ task });
    } catch (error: any) {
      fastify.log.error('Task creation error:', error);
      return reply.code(500).send({
        error: 'Failed to create task',
        code: 'TASK_CREATE_ERROR'
      });
    }
  });

  // Update task
  fastify.put('/:id', {
    preHandler: requirePermission(Permission.UPDATE_TASK),
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
          description: { type: 'string', maxLength: 1000 },
          status: { type: 'string', enum: ['todo', 'in_progress', 'done'] },
          estimatedHours: { type: 'number', minimum: 0.5, maximum: 40 },
          actualHours: { type: 'number', minimum: 0, maximum: 100 },
          priority: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
          sprintId: { type: 'string' },
          assignedTo: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const updateData = request.body as {
      name?: string;
      description?: string;
      status?: string;
      estimatedHours?: number;
      actualHours?: number;
      priority?: string;
      sprintId?: string;
      assignedTo?: string;
    };

    try {
      // Get current task to validate status transition
      const currentTask = await fastify.prisma.task.findUnique({
        where: { id }
      });

      if (!currentTask) {
        return reply.code(404).send({
          error: 'Task not found',
          code: 'TASK_NOT_FOUND'
        });
      }

      // Validate status transition if status is being updated
      if (updateData.status && updateData.status !== currentTask.status) {
        const validTransitions = VALID_STATUS_TRANSITIONS[currentTask.status as keyof typeof VALID_STATUS_TRANSITIONS];
        if (!validTransitions.includes(updateData.status)) {
          return reply.code(400).send({
            error: 'Invalid status transition',
            message: `Cannot transition from ${currentTask.status} to ${updateData.status}`,
            code: 'INVALID_STATUS_TRANSITION'
          });
        }
      }

      // Add completion timestamp if moving to done
      let additionalData: any = {};
      if (updateData.status === 'done' && currentTask.status !== 'done') {
        additionalData.completedAt = new Date();
      } else if (updateData.status !== 'done' && currentTask.status === 'done') {
        additionalData.completedAt = null;
      }

      const task = await fastify.prisma.task.update({
        where: { id },
        data: {
          ...updateData,
          ...additionalData
        },
        include: {
          story: {
            include: {
              epic: {
                include: {
                  project: {
                    select: { id: true, name: true }
                  }
                }
              }
            }
          },
          sprint: {
            select: { id: true, name: true }
          }
        }
      });

      fastify.log.info(`User ${request.user?.email} updated task: ${task.name} (${currentTask.status} → ${task.status})`);

      return { task };
    } catch (error: any) {
      fastify.log.error('Task update error:', error);
      return reply.code(500).send({
        error: 'Failed to update task',
        code: 'TASK_UPDATE_ERROR'
      });
    }
  });

  // Update task status (quick endpoint for status changes)
  fastify.patch('/:id/status', {
    preHandler: requirePermission(Permission.UPDATE_TASK),
    schema: {
      params: {
        type: 'object',
        properties: { id: { type: 'string' } },
        required: ['id']
      },
      body: {
        type: 'object',
        required: ['status'],
        properties: {
          status: { type: 'string', enum: ['todo', 'in_progress', 'done'] }
        }
      }
    }
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { status } = request.body as { status: string };

    try {
      const currentTask = await fastify.prisma.task.findUnique({
        where: { id }
      });

      if (!currentTask) {
        return reply.code(404).send({
          error: 'Task not found',
          code: 'TASK_NOT_FOUND'
        });
      }

      // Validate status transition
      const validTransitions = VALID_STATUS_TRANSITIONS[currentTask.status as keyof typeof VALID_STATUS_TRANSITIONS];
      if (!validTransitions.includes(status)) {
        return reply.code(400).send({
          error: 'Invalid status transition',
          message: `Cannot transition from ${currentTask.status} to ${status}`,
          code: 'INVALID_STATUS_TRANSITION'
        });
      }

      // Add completion timestamp if moving to done
      let additionalData: any = {};
      if (status === 'done' && currentTask.status !== 'done') {
        additionalData.completedAt = new Date();
      } else if (status !== 'done' && currentTask.status === 'done') {
        additionalData.completedAt = null;
      }

      const task = await fastify.prisma.task.update({
        where: { id },
        data: {
          status,
          ...additionalData
        }
      });

      fastify.log.info(`User ${request.user?.email} changed task status: ${task.name} (${currentTask.status} → ${status})`);

      return { task };
    } catch (error: any) {
      fastify.log.error('Task status update error:', error);
      return reply.code(500).send({
        error: 'Failed to update task status',
        code: 'TASK_STATUS_UPDATE_ERROR'
      });
    }
  });

  // Delete task
  fastify.delete('/:id', {
    preHandler: requirePermission(Permission.DELETE_TASK)
  }, async (request, reply) => {
    const { id } = request.params as { id: string };

    try {
      const task = await fastify.prisma.task.delete({
        where: { id }
      });

      fastify.log.info(`User ${request.user?.email} deleted task: ${task.name}`);

      return reply.code(204).send();
    } catch (error: any) {
      if (error.code === 'P2025') {
        return reply.code(404).send({
          error: 'Task not found',
          code: 'TASK_NOT_FOUND'
        });
      }

      fastify.log.error('Task deletion error:', error);
      return reply.code(500).send({
        error: 'Failed to delete task',
        code: 'TASK_DELETE_ERROR'
      });
    }
  });

  // Get tasks by story (convenience endpoint)
  fastify.get('/by-story/:storyId', {
    preHandler: requirePermission(Permission.READ_TASK)
  }, async (request) => {
    const { storyId } = request.params as { storyId: string };
    
    const tasks = await fastify.prisma.task.findMany({
      where: { storyId },
      include: {
        sprint: {
          select: { id: true, name: true }
        }
      },
      orderBy: [
        { status: 'asc' },
        { priority: 'desc' },
        { createdAt: 'asc' }
      ]
    });
    
    return { tasks };
  });

  // Get tasks by sprint (convenience endpoint)
  fastify.get('/by-sprint/:sprintId', {
    preHandler: requirePermission(Permission.READ_TASK)
  }, async (request) => {
    const { sprintId } = request.params as { sprintId: string };
    
    const tasks = await fastify.prisma.task.findMany({
      where: { sprintId },
      include: {
        story: {
          include: {
            epic: {
              select: { id: true, name: true }
            }
          }
        }
      },
      orderBy: [
        { status: 'asc' },
        { priority: 'desc' },
        { createdAt: 'asc' }
      ]
    });
    
    return { tasks };
  });
} 