import { FastifyInstance, FastifyRequest, FastifyReply, preHandlerAsyncHookHandler } from 'fastify'

interface CrudOptions {
  preHandler?: preHandlerAsyncHookHandler
  include?: any
}

interface ParamsWithId {
  Params: {
    id: string
  }
}

export function registerCrud(
  app: FastifyInstance,
  entityName: string,
  modelName: string,
  options: CrudOptions = {}
) {
  const { preHandler, include } = options
  
  // Get the Prisma model from the app instance
  const model = (app.prisma as any)[modelName]
  
  if (!model) {
    throw new Error(`Model '${modelName}' not found in Prisma client`)
  }

  // GET all entities
  app.get(`/${entityName}`, { preHandler }, async (request, reply) => {
    try {
      const entities = await model.findMany(include ? { include } : {})
      return entities
    } catch (error) {
      app.log.error(`Error fetching ${entityName}:`, error)
      return reply.status(500).send({ error: `Failed to fetch ${entityName}` })
    }
  })

  // GET single entity by ID
  app.get<ParamsWithId>(`/${entityName}/:id`, { preHandler }, async (req, reply) => {
    try {
      const { id } = req.params
      const entity = await model.findUnique({ 
        where: { id },
        ...(include ? { include } : {})
      })
      
      if (!entity) {
        return reply.status(404).send({ error: `${entityName.slice(0, -1)} not found` })
      }
      
      return entity
    } catch (error) {
      app.log.error(`Error fetching ${entityName} by ID:`, error)
      return reply.status(500).send({ error: `Failed to fetch ${entityName.slice(0, -1)}` })
    }
  })

  // POST create new entity
  app.post(`/${entityName}`, { preHandler }, async (req, reply) => {
    try {
      const entity = await model.create({ 
        data: req.body,
        ...(include ? { include } : {})
      })
      return entity
    } catch (error) {
      app.log.error(`Error creating ${entityName}:`, error)
      return reply.status(500).send({ error: `Failed to create ${entityName.slice(0, -1)}` })
    }
  })

  // PUT update entity by ID
  app.put<ParamsWithId>(`/${entityName}/:id`, { preHandler }, async (req, reply) => {
    try {
      const { id } = req.params
      const entity = await model.update({ 
        where: { id }, 
        data: req.body,
        ...(include ? { include } : {})
      })
      return entity
    } catch (error) {
      app.log.error(`Error updating ${entityName}:`, error)
      return reply.status(500).send({ error: `Failed to update ${entityName.slice(0, -1)}` })
    }
  })

  // DELETE entity by ID
  app.delete<ParamsWithId>(`/${entityName}/:id`, { preHandler }, async (req, reply) => {
    try {
      const { id } = req.params
      const entity = await model.delete({ where: { id } })
      return entity
    } catch (error) {
      app.log.error(`Error deleting ${entityName}:`, error)
      return reply.status(500).send({ error: `Failed to delete ${entityName.slice(0, -1)}` })
    }
  })
}
