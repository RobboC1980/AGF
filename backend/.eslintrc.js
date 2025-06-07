module.exports = {
  extends: ['../.eslintrc.js'],
  env: {
    node: true,
    es2022: true,
  },
  rules: {
    // Node.js specific rules
    'no-console': 'off', // Console logging is acceptable in backend
    '@typescript-eslint/no-var-requires': 'off', // Allow require() for dynamic imports
    
    // Backend specific preferences
    '@typescript-eslint/explicit-function-return-type': 'warn',
  },
} 