import fp from 'fastify-plugin'
import fastifyJwt from '@fastify/jwt'
import { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify'
import { JWTPayload, UserRole } from '../types/auth'

export default fp(async (app: FastifyInstance) => {
  const jwtSecret = process.env.JWT_SECRET || 'super-secret-change-me'
  console.log('JWT Secret configured:', jwtSecret.substring(0, 10) + '...')
  
  app.register(fastifyJwt, {
    secret: jwtSecret
  })

  app.decorate('authenticate', async function (request: FastifyRequest, reply: FastifyReply) {
    try {
      console.log('Auth headers:', request.headers.authorization ? 'present' : 'missing')
      await request.jwtVerify()
      
      // Ensure user object exists and has required fields
      const user = request.user as JWTPayload
      if (!user || !user.id || !user.email) {
        throw new Error('Invalid user data in token')
      }
      
      // Set default role if not present (for backward compatibility)
      if (!user.role) {
        user.role = UserRole.VIEWER
        console.log('Warning: User token missing role, defaulting to VIEWER')
      }
      
      console.log('JWT verification successful for user:', user.email, 'role:', user.role)
    } catch (err: any) {
      console.error('JWT verification failed:', err.message)
      reply.status(401).send({ 
        error: 'Authentication required', 
        message: 'Invalid or missing token',
        code: 'UNAUTHORIZED' 
      })
    }
  })
})

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
  }
}
