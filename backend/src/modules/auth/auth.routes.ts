import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import { UserRole, UserPayload } from '../../types/auth';
import { requireAdmin } from '../../guards/auth.guard';

// Validation schemas
const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required')
});

const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().min(1, 'Name is required'),
  role: z.nativeEnum(UserRole).optional().default(UserRole.VIEWER)
});

const updateRoleSchema = z.object({
  userId: z.string(),
  role: z.nativeEnum(UserRole)
});

export default async function authRoutes(fastify: FastifyInstance) {
  // User login
  fastify.post('/login', {
    schema: {
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 1 }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            token: { type: 'string' },
            user: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                email: { type: 'string' },
                name: { type: 'string' },
                role: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    const { email, password } = request.body as z.infer<typeof loginSchema>;

    try {
      // Find user by email
      const user = await fastify.prisma.user.findUnique({ 
        where: { email } 
      });

      if (!user) {
        return reply.code(401).send({
          error: 'Invalid credentials',
          message: 'Email or password is incorrect',
          code: 'INVALID_CREDENTIALS'
        });
      }

      // Check password using bcrypt
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return reply.code(401).send({
          error: 'Invalid credentials',
          message: 'Email or password is incorrect',
          code: 'INVALID_CREDENTIALS'
        });
      }

      // Create JWT payload with role information
      const userPayload: UserPayload = {
        id: user.id,
        email: user.email,
        name: user.name,
        role: (user.role as UserRole) || UserRole.VIEWER
      };

      const token = fastify.jwt.sign(userPayload);

      fastify.log.info(`User ${user.email} logged in with role ${userPayload.role}`);

      return {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: userPayload.role
        }
      };
    } catch (error: any) {
      fastify.log.error('Login error:', error);
      return reply.code(500).send({
        error: 'Login failed',
        message: 'An error occurred during login',
        code: 'LOGIN_ERROR'
      });
    }
  });

  // User registration
  fastify.post('/register', {
    schema: {
      body: {
        type: 'object',
        required: ['email', 'password', 'name'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 6 },
          name: { type: 'string', minLength: 1 },
          role: { type: 'string', enum: Object.values(UserRole) }
        }
      },
      response: {
        201: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            name: { type: 'string' },
            role: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    const userData = request.body as z.infer<typeof registerSchema>;

    try {
      // Check if user already exists
      const existingUser = await fastify.prisma.user.findUnique({
        where: { email: userData.email }
      });

      if (existingUser) {
        return reply.code(409).send({
          error: 'User already exists',
          message: 'A user with this email already exists',
          code: 'USER_EXISTS'
        });
      }

      // Hash password before storing
      const hashedPassword = await bcrypt.hash(userData.password, 10);

      // Create new user
      const user = await fastify.prisma.user.create({
        data: {
          email: userData.email,
          password: hashedPassword,
          name: userData.name,
          role: userData.role
        }
      });

      fastify.log.info(`New user registered: ${user.email} with role ${user.role}`);

      return reply.code(201).send({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      });
    } catch (error: any) {
      fastify.log.error('Registration error:', error);
      
      if (error.code === 'P2002') {
        return reply.code(409).send({
          error: 'User already exists',
          message: 'A user with this email already exists',
          code: 'USER_EXISTS'
        });
      }

      return reply.code(500).send({
        error: 'Registration failed',
        message: 'An error occurred during registration',
        code: 'REGISTRATION_ERROR'
      });
    }
  });

  // Update user role (Admin only)
  fastify.put('/users/:userId/role', {
    preHandler: requireAdmin,
    schema: {
      params: {
        type: 'object',
        properties: {
          userId: { type: 'string' }
        },
        required: ['userId']
      },
      body: {
        type: 'object',
        properties: {
          role: { type: 'string', enum: Object.values(UserRole) }
        },
        required: ['role']
      }
    }
  }, async (request, reply) => {
    const { userId } = request.params as { userId: string };
    const { role } = request.body as { role: UserRole };

    try {
      const updatedUser = await fastify.prisma.user.update({
        where: { id: userId },
        data: { role },
        select: {
          id: true,
          email: true,
          name: true,
          role: true
        }
      });

      fastify.log.info(`Admin ${request.user?.email} updated user ${updatedUser.email} role to ${role}`);

      return reply.send(updatedUser);
    } catch (error: any) {
      if (error.code === 'P2025') {
        return reply.code(404).send({
          error: 'User not found',
          message: 'User with the specified ID does not exist',
          code: 'USER_NOT_FOUND'
        });
      }

      fastify.log.error('Role update error:', error);
      return reply.code(500).send({
        error: 'Role update failed',
        message: 'An error occurred while updating user role',
        code: 'ROLE_UPDATE_ERROR'
      });
    }
  });

  // Get current user info
  fastify.get('/me', {
    preHandler: fastify.authenticate
  }, async (request) => {
    return {
      user: request.user
    };
  });

  // List all users with their roles (Admin only)
  fastify.get('/users', {
    preHandler: requireAdmin
  }, async (request) => {
    const users = await fastify.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true
      }
    });

    return { users };
  });
} 