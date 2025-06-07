import { FastifyRequest, FastifyReply } from 'fastify';
import { UserRole, Permission, hasPermission, JWTPayload } from '../types/auth';

const shouldLog = process.env.NODE_ENV !== 'production';

// Override @fastify/jwt module to use our JWTPayload type
declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: JWTPayload;
    user: JWTPayload;
  }
}

/**
 * Guard that requires authentication (valid JWT token)
 */
export const requireAuth = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    await request.jwtVerify();
    
    // Ensure user object exists
    if (!request.user) {
      return reply.code(401).send({
        error: 'Authentication required',
        message: 'User information not found in token',
        code: 'UNAUTHORIZED'
      });
    }
    
    if (shouldLog) {
      console.log(`Auth: User ${request.user.email} (${request.user.role}) authenticated`);
    }
  } catch (err: any) {
    if (shouldLog) {
      console.error('Authentication failed:', err.message);
    }
    return reply.code(401).send({
      error: 'Authentication required',
      message: 'Invalid or missing token',
      code: 'UNAUTHORIZED'
    });
  }
};

/**
 * Guard that requires a specific role
 */
export const requireRole = (requiredRole: UserRole) => {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    // First ensure authentication
    await requireAuth(request, reply);
    
    if (reply.sent) return; // If auth failed, don't continue
    
    const user = request.user!;
    
    if (user.role !== requiredRole) {
      if (shouldLog) {
        console.log(`Auth: User ${user.email} role ${user.role} insufficient, required: ${requiredRole}`);
      }
      return reply.code(403).send({
        error: 'Insufficient privileges',
        message: `Role ${requiredRole} required`,
        code: 'FORBIDDEN',
        userRole: user.role,
        requiredRole
      });
    }
    
    if (shouldLog) {
      console.log(`Auth: User ${user.email} has required role: ${requiredRole}`);
    }
  };
};

/**
 * Guard that requires one of multiple roles
 */
export const requireAnyRole = (allowedRoles: UserRole[]) => {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    // First ensure authentication
    await requireAuth(request, reply);
    
    if (reply.sent) return; // If auth failed, don't continue
    
    const user = request.user!;
    
    if (!allowedRoles.includes(user.role)) {
      if (shouldLog) {
        console.log(`Auth: User ${user.email} role ${user.role} not in allowed roles: ${allowedRoles.join(', ')}`);
      }
      return reply.code(403).send({
        error: 'Insufficient privileges',
        message: `One of these roles required: ${allowedRoles.join(', ')}`,
        code: 'FORBIDDEN',
        userRole: user.role,
        allowedRoles
      });
    }
    
    if (shouldLog) {
      console.log(`Auth: User ${user.email} has allowed role: ${user.role}`);
    }
  };
};

/**
 * Guard that requires a specific permission
 */
export const requirePermission = (requiredPermission: Permission) => {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    // First ensure authentication
    await requireAuth(request, reply);
    
    if (reply.sent) return; // If auth failed, don't continue
    
    const user = request.user!;
    
    if (!hasPermission(user.role, requiredPermission)) {
      if (shouldLog) {
        console.log(`Auth: User ${user.email} role ${user.role} lacks permission: ${requiredPermission}`);
      }
      return reply.code(403).send({
        error: 'Insufficient privileges',
        message: `Permission ${requiredPermission} required`,
        code: 'FORBIDDEN',
        userRole: user.role,
        requiredPermission
      });
    }
    
    if (shouldLog) {
      console.log(`Auth: User ${user.email} has required permission: ${requiredPermission}`);
    }
  };
};

/**
 * Guard that requires any of multiple permissions
 */
export const requireAnyPermission = (allowedPermissions: Permission[]) => {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    // First ensure authentication
    await requireAuth(request, reply);
    
    if (reply.sent) return; // If auth failed, don't continue
    
    const user = request.user!;
    
    const hasAnyPermission = allowedPermissions.some(permission => 
      hasPermission(user.role, permission)
    );
    
    if (!hasAnyPermission) {
      if (shouldLog) {
        console.log(`Auth: User ${user.email} role ${user.role} lacks any of permissions: ${allowedPermissions.join(', ')}`);
      }
      return reply.code(403).send({
        error: 'Insufficient privileges',
        message: `One of these permissions required: ${allowedPermissions.join(', ')}`,
        code: 'FORBIDDEN',
        userRole: user.role,
        allowedPermissions
      });
    }
    
    if (shouldLog) {
      console.log(`Auth: User ${user.email} has required permissions`);
    }
  };
};

/**
 * Guard for admin-only routes
 */
export const requireAdmin = requireRole(UserRole.ADMIN);

/**
 * Guard for project managers and above
 */
export const requireProjectManagerOrAbove = requireAnyRole([
  UserRole.ADMIN,
  UserRole.PROJECT_MANAGER
]);

/**
 * Guard for developers and above
 */
export const requireDeveloperOrAbove = requireAnyRole([
  UserRole.ADMIN,
  UserRole.PROJECT_MANAGER,
  UserRole.DEVELOPER
]);

/**
 * Optional auth - doesn't fail if no token, but populates user if valid token exists
 */
export const optionalAuth = async (request: FastifyRequest, reply: FastifyReply) => {
  if (request.headers.authorization) {
    try {
      await request.jwtVerify();
      if (shouldLog) {
        console.log(`Optional Auth: User ${request.user?.email} authenticated`);
      }
    } catch (err) {
      // Silently ignore auth errors for optional auth
      if (shouldLog) {
        console.log('Optional Auth: Invalid token ignored');
      }
    }
  } else {
    if (shouldLog) {
      console.log('Optional Auth: No token provided');
    }
  }
}; 