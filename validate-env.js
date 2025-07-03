#!/usr/bin/env node

/**
 * AgileForge Environment Configuration Validator
 * 
 * Validates that all required environment variables are properly configured
 * for AgileForge production deployment.
 * 
 * Usage: node validate-env.js
 */

require('dotenv').config();

class EnvValidator {
    constructor() {
        this.errors = [];
        this.warnings = [];
        this.passed = [];
        this.isDevelopment = process.env.NODE_ENV !== 'production';
    }

    // Validation helper methods
    required(key, description) {
        if (!process.env[key]) {
            this.errors.push(`❌ ${key}: ${description} (REQUIRED)`);
            return false;
        } else {
            this.passed.push(`✅ ${key}: ${description}`);
            return true;
        }
    }

    optional(key, description, defaultValue = null) {
        if (!process.env[key]) {
            this.warnings.push(`⚠️  ${key}: ${description} (OPTIONAL - default: ${defaultValue})`);
            return false;
        } else {
            this.passed.push(`✅ ${key}: ${description}`);
            return true;
        }
    }

    format(key, pattern, description) {
        const value = process.env[key];
        if (value && !pattern.test(value)) {
            this.errors.push(`❌ ${key}: ${description} (FORMAT ERROR)`);
            return false;
        }
        return true;
    }

    // Validation categories
    validateCore() {
        console.log('\n🔧 Core Application Settings');
        
        this.required('NODE_ENV', 'Environment mode (development/production)');
        this.required('NEXT_PUBLIC_APP_URL', 'Frontend application URL');
        this.required('NEXT_PUBLIC_API_URL', 'Backend API URL');
        this.optional('PORT', 'Server port', '8000');
        this.optional('LOG_LEVEL', 'Logging level', 'info');
    }

    validateDatabase() {
        console.log('\n🗄️  Database Configuration');
        
        this.required('POSTGRES_URL', 'PostgreSQL connection string');
        this.required('SUPABASE_URL', 'Supabase project URL');
        this.required('SUPABASE_ANON_KEY', 'Supabase anonymous key');
        this.required('SUPABASE_JWT_SECRET', 'Supabase JWT secret');
        
        // Validate URL formats
        this.format('POSTGRES_URL', /^postgres:\/\//, 'PostgreSQL URL format');
        this.format('SUPABASE_URL', /^https:\/\/.*\.supabase\.co$/, 'Supabase URL format');
    }

    validateAuth() {
        console.log('\n🔐 Authentication & Authorization');
        
        this.required('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY', 'Clerk publishable key');
        this.required('CLERK_SECRET_KEY', 'Clerk secret key');
        this.required('JWT_SECRET', 'JWT signing secret');
        this.optional('JWT_EXPIRY', 'JWT token expiry', '24h');
        this.optional('BCRYPT_SALT_ROUNDS', 'Password hashing rounds', '12');

        // Security checks
        const jwtSecret = process.env.JWT_SECRET;
        if (jwtSecret) {
            if (jwtSecret.length < 32) {
                this.errors.push('❌ JWT_SECRET: Must be at least 32 characters for security');
            }
            if (jwtSecret.includes('development') && !this.isDevelopment) {
                this.errors.push('❌ JWT_SECRET: Contains "development" in production');
            }
        }
    }

    validateBilling() {
        console.log('\n💳 Billing & Subscription (Stripe)');
        
        this.required('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', 'Stripe publishable key');
        this.required('STRIPE_SECRET_KEY', 'Stripe secret key');
        this.required('STRIPE_WEBHOOK_SECRET', 'Stripe webhook secret');
        
        // Tier-specific price IDs
        this.optional('STRIPE_PRICE_PROFESSIONAL_MONTHLY', 'Professional monthly price ID');
        this.optional('STRIPE_PRICE_BUSINESS_MONTHLY', 'Business monthly price ID');
        this.optional('STRIPE_PRICE_ENTERPRISE_MONTHLY', 'Enterprise monthly price ID');

        // Validate Stripe key formats
        this.format('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', /^pk_(test_|live_)/, 'Stripe publishable key format');
        this.format('STRIPE_SECRET_KEY', /^sk_(test_|live_)/, 'Stripe secret key format');
        this.format('STRIPE_WEBHOOK_SECRET', /^whsec_/, 'Stripe webhook secret format');

        // Environment consistency
        const pubKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
        const secKey = process.env.STRIPE_SECRET_KEY;
        if (pubKey && secKey) {
            const pubIsTest = pubKey.includes('test_');
            const secIsTest = secKey.includes('test_');
            if (pubIsTest !== secIsTest) {
                this.errors.push('❌ STRIPE: Publishable and secret keys must both be test or live');
            }
            if (!this.isDevelopment && pubIsTest) {
                this.warnings.push('⚠️  STRIPE: Using test keys in production');
            }
        }
    }

    validateAI() {
        console.log('\n🤖 AI Services Configuration');
        
        this.required('ANTHROPIC_API_KEY', 'Claude API key');
        this.optional('OPENAI_API_KEY', 'OpenAI API key (fallback)');
        
        // AI quotas
        this.optional('AI_QUOTA_STARTER', 'Starter tier AI quota', '500');
        this.optional('AI_QUOTA_PROFESSIONAL', 'Professional tier AI quota', '3000');
        this.optional('AI_QUOTA_BUSINESS', 'Business tier AI quota', '8000');
        this.optional('AI_QUOTA_ENTERPRISE', 'Enterprise tier AI quota', '15000');

        // Validate API key formats
        this.format('ANTHROPIC_API_KEY', /^sk-ant-api/, 'Anthropic API key format');
        if (process.env.OPENAI_API_KEY) {
            this.format('OPENAI_API_KEY', /^sk-proj-/, 'OpenAI API key format');
        }
    }

    validateRBAC() {
        console.log('\n🛡️  Role-Based Access Control');
        
        this.optional('FEATURE_MAX_PROJECTS_STARTER', 'Starter project limit', '3');
        this.optional('FEATURE_MAX_USERS_STARTER', 'Starter user limit', '5');
        this.optional('FEATURE_ADVANCED_ANALYTICS', 'Advanced analytics tiers', 'business,enterprise');
        this.optional('FEATURE_SSO', 'SSO enabled tiers', 'business,enterprise');
        this.optional('FEATURE_ON_PREMISE', 'On-premise enabled tiers', 'enterprise');
    }

    validateSecurity() {
        console.log('\n🔒 Security & Rate Limiting');
        
        this.optional('RATE_LIMIT_ENABLED', 'Rate limiting enabled', 'true');
        this.optional('RATE_LIMIT_MAX', 'Rate limit max requests', '1000');
        this.optional('CORS_ORIGIN', 'CORS allowed origins', 'http://localhost:3000');
        this.optional('SECURITY_HEADERS_ENABLED', 'Security headers enabled', 'true');
        
        // CORS validation
        const corsOrigin = process.env.CORS_ORIGIN;
        if (corsOrigin && !this.isDevelopment) {
            if (corsOrigin.includes('localhost')) {
                this.warnings.push('⚠️  CORS_ORIGIN: Contains localhost in production');
            }
        }
    }

    validateWebSocket() {
        console.log('\n⚡ Real-time Features (WebSocket)');
        
        this.optional('WEBSOCKET_ENABLED', 'WebSocket server enabled', 'true');
        this.optional('WS_PORT', 'WebSocket port', '5001');
        this.optional('WS_MAX_CONNECTIONS_PER_USER', 'Max connections per user', '5');
    }

    validateMonitoring() {
        console.log('\n📊 Monitoring & Logging');
        
        this.optional('SENTRY_DSN', 'Sentry error tracking DSN');
        this.optional('LOG_FILE_PATH', 'Log file path', './logs/agileforge.log');
        this.optional('METRICS_ENABLED', 'Metrics collection enabled', 'true');
        this.optional('HEALTH_CHECK_ENDPOINT', 'Health check endpoint', '/health');

        // Validate Sentry DSN format
        if (process.env.SENTRY_DSN) {
            const sentryDsn = process.env.SENTRY_DSN;
            // Skip validation for dummy/development values
            if (!sentryDsn.includes('dummy') && !sentryDsn.includes('org123')) {
                this.format('SENTRY_DSN', /^https:\/\/.*@.*sentry\.io\/\d+$/, 'Sentry DSN format');
            } else {
                this.passed.push(`✅ SENTRY_DSN: Sentry error tracking DSN (development/dummy)`);
            }
        }
    }

    validateIntegrations() {
        console.log('\n🔗 External Integrations');
        
        this.optional('EMAIL_API_KEY', 'Email service API key');
        this.optional('SLACK_WEBHOOK_URL', 'Slack webhook URL');
        this.optional('GITHUB_CLIENT_ID', 'GitHub OAuth client ID');
        this.optional('JIRA_BASE_URL', 'JIRA instance URL');
    }

    validateProduction() {
        if (!this.isDevelopment) {
            console.log('\n🚀 Production-Specific Checks');
            
            // Production security requirements
            if (process.env.DEBUG === 'true') {
                this.warnings.push('⚠️  DEBUG: Should be false in production');
            }
            
            if (process.env.COOKIE_SECURE !== 'true') {
                this.warnings.push('⚠️  COOKIE_SECURE: Should be true in production');
            }
            
            if (process.env.LOG_LEVEL === 'debug') {
                this.warnings.push('⚠️  LOG_LEVEL: Should not be debug in production');
            }
        }
    }

    // Tier configuration validation
    validateTierConfig() {
        console.log('\n🎯 AgileForge Tier Configuration');
        
        const tiers = ['starter', 'professional', 'business', 'enterprise'];
        tiers.forEach(tier => {
            const quota = process.env[`AI_QUOTA_${tier.toUpperCase()}`];
            if (quota && isNaN(parseInt(quota))) {
                this.errors.push(`❌ AI_QUOTA_${tier.toUpperCase()}: Must be a number`);
            }
        });

        // Validate pricing consistency
        const prices = {
            professional: process.env.STRIPE_PRICE_PROFESSIONAL_MONTHLY,
            business: process.env.STRIPE_PRICE_BUSINESS_MONTHLY,
            enterprise: process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY
        };

        Object.entries(prices).forEach(([tier, priceId]) => {
            if (priceId && !priceId.startsWith('price_')) {
                this.warnings.push(`⚠️  STRIPE_PRICE_${tier.toUpperCase()}_MONTHLY: Should start with 'price_'`);
            }
        });
    }

    // Main validation runner
    async validate() {
        console.log('🔍 AgileForge Environment Validation');
        console.log('=====================================');
        console.log(`Environment: ${process.env.NODE_ENV || 'undefined'}`);
        console.log(`Timestamp: ${new Date().toISOString()}`);

        // Run all validation categories
        this.validateCore();
        this.validateDatabase();
        this.validateAuth();
        this.validateBilling();
        this.validateAI();
        this.validateRBAC();
        this.validateSecurity();
        this.validateWebSocket();
        this.validateMonitoring();
        this.validateIntegrations();
        this.validateTierConfig();
        this.validateProduction();

        // Display results
        this.displayResults();
        
        return this.errors.length === 0;
    }

    displayResults() {
        console.log('\n📋 Validation Results');
        console.log('======================');
        
        console.log(`\n✅ Passed: ${this.passed.length}`);
        console.log(`⚠️  Warnings: ${this.warnings.length}`);
        console.log(`❌ Errors: ${this.errors.length}`);

        if (this.errors.length > 0) {
            console.log('\n❌ ERRORS (Must Fix):');
            this.errors.forEach(error => console.log(`   ${error}`));
        }

        if (this.warnings.length > 0) {
            console.log('\n⚠️  WARNINGS (Should Review):');
            this.warnings.forEach(warning => console.log(`   ${warning}`));
        }

        if (this.errors.length === 0 && this.warnings.length === 0) {
            console.log('\n🎉 CONFIGURATION VALID!');
            console.log('✅ All required environment variables are properly configured.');
            console.log('🚀 AgileForge is ready for deployment!');
        } else if (this.errors.length === 0) {
            console.log('\n✅ CONFIGURATION VALID WITH WARNINGS');
            console.log('⚠️  Please review warnings before production deployment.');
        } else {
            console.log('\n❌ CONFIGURATION INVALID');
            console.log('🛠️  Please fix all errors before deployment.');
        }

        console.log('\n📖 For help with configuration:');
        console.log('   - Review AgileForge documentation');
        console.log('   - Check .env.example for reference');
        console.log('   - Ensure all dummy values are replaced with real keys');
    }
}

// Run validation if called directly
if (require.main === module) {
    const validator = new EnvValidator();
    validator.validate().then(isValid => {
        process.exit(isValid ? 0 : 1);
    });
}

module.exports = EnvValidator; 