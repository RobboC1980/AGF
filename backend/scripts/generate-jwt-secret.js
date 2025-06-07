#!/usr/bin/env node

/**
 * JWT Secret Generator
 * 
 * This script generates a secure JWT secret for the backend application.
 * Run this script whenever you need to generate a new JWT secret.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Generate a secure 64-byte JWT secret
function generateJWTSecret() {
  return crypto.randomBytes(64).toString('hex');
}

// Main function
function main() {
  const secret = generateJWTSecret();
  
  console.log('🔐 Generated JWT Secret:');
  console.log(secret);
  console.log('');
  console.log('📝 Copy this secret to your .env file:');
  console.log(`JWT_SECRET=${secret}`);
  console.log('');
  console.log('⚠️  Important Security Notes:');
  console.log('- Keep this secret secure and never commit it to version control');
  console.log('- Use different secrets for development, staging, and production');
  console.log('- Rotate secrets periodically for better security');
  console.log('- This secret is used to sign and verify JWT tokens');
  
  // Optional: Update .env file if it exists
  const envPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    console.log('');
    console.log('🔄 Would you like to update your .env file? (Run manually for safety)');
    console.log(`sed -i '' 's/JWT_SECRET=.*/JWT_SECRET=${secret}/' ${envPath}`);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { generateJWTSecret }; 