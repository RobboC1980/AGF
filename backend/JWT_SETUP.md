# JWT Secret Configuration

This document explains how JWT authentication is configured in the AgileForge backend.

## Overview

JSON Web Tokens (JWT) are used for secure authentication and authorization in the AgileForge application. The JWT secret is a cryptographic key used to sign and verify JWT tokens.

## Current Configuration

The JWT secret is configured in the `.env` file:

```bash
JWT_SECRET=your-secure-64-byte-hex-string
```

## Generating a New JWT Secret

### Option 1: Using the npm script (Recommended)
```bash
cd backend
npm run generate-jwt-secret
```

### Option 2: Using Node.js directly
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Option 3: Using the utility script
```bash
node backend/scripts/generate-jwt-secret.js
```

## Security Requirements

### Secret Length
- **Minimum**: 32 bytes (64 hex characters)
- **Recommended**: 64 bytes (128 hex characters)
- **Current**: 64 bytes for maximum security

### Secret Characteristics
- ✅ Cryptographically random
- ✅ Base64 or hexadecimal encoded
- ✅ Minimum 256 bits of entropy
- ❌ Not a dictionary word or predictable pattern

## Environment-Specific Secrets

### Development
```bash
JWT_SECRET=generated-dev-secret-128-hex-chars...
```

### Staging
```bash
JWT_SECRET=generated-staging-secret-128-hex-chars...
```

### Production
```bash
JWT_SECRET=generated-production-secret-128-hex-chars...
```

## Security Best Practices

### 1. Secret Generation
- Always use cryptographically secure random generation
- Never use predictable patterns or dictionary words
- Generate different secrets for each environment

### 2. Secret Storage
- Store in environment variables, never in code
- Use secret management services in production
- Never commit secrets to version control

### 3. Secret Rotation
- Rotate secrets periodically (every 90 days recommended)
- Plan for graceful secret rotation without downtime
- Keep previous secret temporarily during rotation

### 4. Access Control
- Limit access to production secrets
- Use principle of least privilege
- Audit secret access regularly

## JWT Configuration in Code

The JWT secret is used in the Fastify JWT plugin configuration:

```typescript
// src/plugins/auth.ts
await fastify.register(jwt, {
  secret: process.env.JWT_SECRET!
});
```

## Token Validation

JWT tokens are validated using the same secret:

```typescript
const decoded = fastify.jwt.verify(token);
```

## Troubleshooting

### Common Issues

1. **"JWT Secret not configured"**
   - Ensure `JWT_SECRET` is set in your `.env` file
   - Check that the `.env` file is being loaded

2. **"Invalid token signature"**
   - Token was signed with a different secret
   - Secret may have been rotated
   - Token may be from a different environment

3. **"Token expired"**
   - Token has exceeded its expiration time
   - Check token expiration settings

### Debug Commands

```bash
# Check if JWT_SECRET is loaded
node -e "require('dotenv').config(); console.log('JWT_SECRET length:', process.env.JWT_SECRET?.length)"

# Verify secret format
node -e "console.log(/^[a-fA-F0-9]{128}$/.test('your-secret-here'))"
```

## Migration Guide

If you need to update from an old/insecure JWT secret:

1. Generate a new secure secret
2. Update the `.env` file
3. Restart the application
4. All existing tokens will be invalidated
5. Users will need to log in again

## Monitoring

Monitor for JWT-related errors:
- Invalid signature errors
- Expired token errors
- Malformed token errors

These may indicate security issues or configuration problems. 