# AgileForge Production Deployment Guide

## Overview

This guide covers deploying AgileForge to production with proper security, scalability, and monitoring.

## Architecture

```
Frontend (Vercel) → Backend API (Render/Railway) → Supabase Database
                                ↓
                    Third-party Services (Stripe, SendGrid, OpenAI)
```

## Prerequisites

1. **Supabase Project** (already set up ✅)
2. **Domain name** (optional but recommended)
3. **Deployment platform account** (Render, Railway, or Heroku)
4. **Third-party service accounts** (Stripe, SendGrid, OpenAI)

## Step 1: Prepare Environment Variables

1. Copy the production environment template:
```bash
cp .env.production .env.prod
```

2. Fill in your actual values in `.env.prod`:
   - Supabase credentials (from your Supabase dashboard)
   - Domain names
   - API keys for integrations

## Step 2: Deploy Backend API

### Option A: Deploy to Render (Recommended)

1. **Connect Repository**:
   - Go to [Render Dashboard](https://dashboard.render.com)
   - Click "New" → "Web Service"
   - Connect your GitHub repository

2. **Configure Service**:
   - **Name**: `agileforge-api`
   - **Environment**: `Python`
   - **Build Command**: `pip install -r requirements-production.txt`
   - **Start Command**: `python production_backend.py`

3. **Set Environment Variables**:
   ```
   ENVIRONMENT=production
   PORT=8000
   SUPABASE_URL=your-supabase-url
   SUPABASE_SERVICE_KEY=your-service-key
   FRONTEND_URL=https://your-frontend-domain.vercel.app
   ALLOWED_HOST=your-api-domain.onrender.com
   ```

4. **Deploy**: Click "Create Web Service"

### Option B: Deploy to Railway

1. **Install Railway CLI**:
```bash
npm install -g @railway/cli
railway login
```

2. **Deploy**:
```bash
railway new agileforge-api
railway add
railway up
```

3. **Set Environment Variables**:
```bash
railway variables set ENVIRONMENT=production
railway variables set SUPABASE_URL=your-url
# ... add all other variables
```

## Step 3: Deploy Frontend

### Deploy to Vercel (Recommended)

1. **Install Vercel CLI**:
```bash
npm install -g vercel
```

2. **Deploy**:
```bash
vercel --prod
```

3. **Set Environment Variables** in Vercel Dashboard:
   - `NEXT_PUBLIC_API_URL=https://your-api-domain.onrender.com`
   - `NEXT_PUBLIC_SUPABASE_URL=your-supabase-url`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key`

## Step 4: Configure Domain & SSL

### Custom Domain (Optional)

1. **Backend Domain**:
   - In Render: Settings → Custom Domains → Add your domain
   - Update DNS: Add CNAME record pointing to Render

2. **Frontend Domain**:
   - In Vercel: Settings → Domains → Add your domain
   - Update DNS: Add CNAME record pointing to Vercel

### SSL Certificates
- Both Render and Vercel provide automatic SSL certificates
- No additional configuration needed

## Step 5: Set Up Integrations

### Stripe (Payment Processing)

1. **Get API Keys**:
   - Go to [Stripe Dashboard](https://dashboard.stripe.com)
   - Get your Secret Key and Webhook Secret

2. **Configure Webhooks**:
   - Endpoint: `https://your-api-domain.com/api/webhooks/stripe`
   - Events: `payment_intent.succeeded`, `customer.subscription.updated`

3. **Add to Environment**:
```bash
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### SendGrid (Email)

1. **Get API Key**:
   - Go to [SendGrid Dashboard](https://app.sendgrid.com)
   - Create API Key with Mail Send permissions

2. **Add to Environment**:
```bash
SENDGRID_API_KEY=SG.xxx
```

### OpenAI (AI Features)

1. **Get API Key**:
   - Go to [OpenAI Dashboard](https://platform.openai.com)
   - Create API Key

2. **Add to Environment**:
```bash
OPENAI_API_KEY=sk-xxx
```

## Step 6: Security Configuration

### 1. Update CORS Settings

In your production backend, ensure CORS is properly configured:
```python
allowed_origins = [
    "https://your-frontend-domain.vercel.app",
    "https://your-custom-domain.com"
]
```

### 2. Enable Authentication

Uncomment and implement the authentication logic in `production_backend.py`:
```python
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    # Implement JWT validation or Supabase auth
    # Return user info
```

### 3. Set Up Row Level Security (RLS) in Supabase

1. Go to Supabase Dashboard → Authentication → Policies
2. Enable RLS on all tables
3. Create policies for user access control

## Step 7: Monitoring & Logging

### Health Checks

Your API includes a health check endpoint at `/health`. Monitor this for:
- Database connectivity
- Service status
- Response times

### Logging

- Production logs are written to `app.log`
- Set up log aggregation (e.g., Papertrail, LogDNA)
- Monitor error rates and performance

### Error Tracking

Add Sentry for error tracking:
```bash
pip install sentry-sdk[fastapi]
```

## Step 8: Testing Production Deployment

1. **API Health Check**:
```bash
curl https://your-api-domain.com/health
```

2. **Frontend Connectivity**:
   - Visit your frontend URL
   - Check browser console for errors
   - Test API calls

3. **Database Operations**:
   - Test CRUD operations
   - Verify data persistence

## Step 9: Performance Optimization

### Backend Optimization

1. **Enable Gunicorn** (already configured in Dockerfile):
   - Multiple workers for better performance
   - Automatic worker restarts

2. **Database Connection Pooling**:
   - Supabase handles this automatically
   - Monitor connection usage

3. **Caching** (Optional):
   - Add Redis for session storage
   - Cache frequently accessed data

### Frontend Optimization

1. **Next.js Optimizations**:
   - Static generation where possible
   - Image optimization
   - Code splitting

2. **CDN**:
   - Vercel provides global CDN automatically
   - Optimize asset delivery

## Step 10: Backup & Recovery

### Database Backups

1. **Supabase Automatic Backups**:
   - Daily backups included in paid plans
   - Point-in-time recovery available

2. **Manual Backups**:
```bash
pg_dump "postgresql://user:pass@host:port/db" > backup.sql
```

### Code Backups

- GitHub repository serves as code backup
- Tag releases for easy rollbacks

## Maintenance

### Regular Tasks

1. **Monitor Performance**:
   - Check API response times
   - Monitor database performance
   - Review error logs

2. **Security Updates**:
   - Update dependencies regularly
   - Monitor security advisories
   - Rotate API keys periodically

3. **Scaling**:
   - Monitor resource usage
   - Upgrade plans as needed
   - Consider horizontal scaling

## Troubleshooting

### Common Issues

1. **CORS Errors**:
   - Check allowed origins configuration
   - Verify frontend URL in environment variables

2. **Database Connection Issues**:
   - Check Supabase credentials
   - Verify network connectivity
   - Check connection limits

3. **Authentication Problems**:
   - Verify JWT configuration
   - Check token expiration
   - Validate user permissions

### Support Resources

- **Render Support**: [render.com/docs](https://render.com/docs)
- **Vercel Support**: [vercel.com/docs](https://vercel.com/docs)
- **Supabase Support**: [supabase.com/docs](https://supabase.com/docs)

## Cost Estimation

### Free Tier (Development/Testing)
- **Render**: Free tier with limitations
- **Vercel**: Generous free tier
- **Supabase**: Free tier with 500MB database
- **Total**: $0/month

### Production Tier
- **Render**: $7/month (Starter plan)
- **Vercel**: $20/month (Pro plan)
- **Supabase**: $25/month (Pro plan)
- **Domain**: $10-15/year
- **Total**: ~$52/month + integrations

## Next Steps

1. Deploy to staging environment first
2. Test all functionality thoroughly
3. Set up monitoring and alerts
4. Plan for scaling and growth
5. Implement additional security measures

Your production setup is now ready for real users! 🚀 