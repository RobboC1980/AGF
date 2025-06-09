# AgileScribe Deployment Guide

## Render Backend Deployment

### 1. Prerequisites
- Render account (https://render.com)
- GitHub repository with your backend code
- OpenAI API key

### 2. Database Setup
1. Go to Render Dashboard
2. Click "New" → "PostgreSQL"
3. Configure:
   - Name: `agilescribe-db`
   - Plan: Starter (free tier)
   - Database Name: `agilescribe`
   - User: `agilescribe_user`
4. Click "Create Database"
5. Note the connection string for later

### 3. Web Service Setup
1. Click "New" → "Web Service"
2. Connect your GitHub repository
3. Configure:
   - Name: `agilescribe-api`
   - Environment: Python
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn backend.main:app --host 0.0.0.0 --port $PORT`
   - Plan: Starter (free tier)

### 4. Environment Variables
Add these environment variables in Render:

\`\`\`bash
ENVIRONMENT=production
DATABASE_URL=[Your PostgreSQL connection string]
JWT_SECRET=[Generate a secure random string]
OPENAI_API_KEY=[Your OpenAI API key]
FRONTEND_URL=https://your-frontend-domain.vercel.app
\`\`\`

### 5. Deploy
1. Click "Create Web Service"
2. Render will automatically deploy your backend
3. Your API will be available at: `https://agilescribe-api.onrender.com`

## Frontend Configuration

### 1. Update Environment Variables
In your Vercel deployment, add:

\`\`\`bash
NEXT_PUBLIC_API_URL=https://agilescribe-api.onrender.com
\`\`\`

### 2. CORS Configuration
The backend is already configured to accept requests from:
- `localhost:3000` (development)
- `*.vercel.app` (Vercel deployments)
- Your custom domain (if configured)

## Testing the Connection

### 1. Health Check
Visit: `https://agilescribe-api.onrender.com/health`

Expected response:
\`\`\`json
{
  "status": "healthy",
  "environment": "production",
  "version": "1.0.0"
}
\`\`\`

### 2. API Documentation
Visit: `https://agilescribe-api.onrender.com/docs`
(Only available in development mode)

## Monitoring and Logs

### 1. Render Dashboard
- Monitor deployment status
- View application logs
- Check resource usage

### 2. Database Monitoring
- Monitor connection count
- Check query performance
- View database logs

## Scaling Considerations

### Free Tier Limitations
- Backend sleeps after 15 minutes of inactivity
- 750 hours/month limit
- Shared resources

### Upgrade Options
- Starter Plan: $7/month (always on)
- Standard Plan: $25/month (more resources)
- Pro Plan: $85/month (dedicated resources)

## Security Best Practices

### 1. Environment Variables
- Never commit secrets to Git
- Use Render's environment variable management
- Rotate JWT secrets regularly

### 2. Database Security
- Use connection pooling
- Enable SSL connections
- Regular backups

### 3. API Security
- Rate limiting (implement if needed)
- Input validation
- CORS configuration
- HTTPS only

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Check DATABASE_URL format
   - Verify database is running
   - Check connection limits

2. **CORS Errors**
   - Verify FRONTEND_URL is correct
   - Check allowed origins in main.py
   - Ensure HTTPS in production

3. **Authentication Issues**
   - Verify JWT_SECRET is set
   - Check token expiration
   - Validate user permissions

### Logs and Debugging
\`\`\`bash
# View logs in Render dashboard
# Or use Render CLI
render logs -s agilescribe-api
\`\`\`

## Backup and Recovery

### Database Backups
- Render automatically backs up PostgreSQL
- Manual backups available in dashboard
- Point-in-time recovery available

### Code Backups
- GitHub repository serves as backup
- Tag releases for easy rollback
- Use Render's deployment history
