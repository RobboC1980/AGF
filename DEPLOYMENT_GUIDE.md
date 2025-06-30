# AgileForge Deployment & Operations Guide

## 🚀 Quick Deployment

### One-Command Deployment
```bash
# Development environment
python deploy.py --environment development

# Production environment  
python deploy.py --environment production --verify-only  # Health check first
python deploy.py --environment production               # Full deployment
```

### Environment-Specific Deployments

#### Development
```bash
# Quick setup for development
git clone https://github.com/yourusername/agileforge.git
cd agileforge
python deploy.py --environment development
```

#### Staging
```bash
# Staging deployment with testing
python deploy.py --environment staging
npm run test:e2e:staging
python -m pytest backend/tests/ -m staging
```

#### Production
```bash
# Production deployment with validation
python deploy.py --environment production --phases "Health Checks"
python deploy.py --environment production
```

## 📋 Pre-Deployment Checklist

### Environment Variables
- [ ] `DATABASE_URL` - PostgreSQL connection string
- [ ] `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL  
- [ ] `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key
- [ ] `OPENAI_API_KEY` - OpenAI API key
- [ ] `ANTHROPIC_API_KEY` - Anthropic API key
- [ ] `JWT_SECRET_KEY` - JWT signing secret
- [ ] `ENCRYPTION_KEY` - Data encryption key
- [ ] `REDIS_URL` - Redis connection string

### Infrastructure Requirements
- [ ] PostgreSQL 14+ database
- [ ] Redis 6+ for caching
- [ ] Node.js 18+ runtime
- [ ] Python 3.9+ runtime
- [ ] Docker (optional)
- [ ] Kubernetes cluster (production)

### Security Requirements
- [ ] SSL/TLS certificates configured
- [ ] Firewall rules configured
- [ ] Backup storage (S3) configured
- [ ] Monitoring endpoints secured
- [ ] Log aggregation configured

## 🔧 Component Installation

### Backend Setup
```bash
cd backend
pip install -r requirements.txt
python -m pytest  # Run tests
uvicorn main:app --host 0.0.0.0 --port 8000
```

### Frontend Setup
```bash
npm install
npm run build
npm run test
npm start
```

### Database Setup
```bash
# Performance schema setup
python backend/database/setup_performance_schema.py

# Verify database connection
python -c "
from backend.database.supabase_client import init_supabase, get_supabase
init_supabase()
client = get_supabase()
print('Database connected successfully')
"
```

### Security Setup
```bash
# Generate security keys
python -c "
from cryptography.fernet import Fernet
import secrets
print(f'ENCRYPTION_KEY={Fernet.generate_key().decode()}')
print(f'JWT_SECRET_KEY={secrets.token_urlsafe(32)}')
print(f'SECURITY_SALT={secrets.token_hex(16)}')
"
```

## 📊 Monitoring Setup

### Prometheus Configuration
```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'agileforge-api'
    static_configs:
      - targets: ['localhost:8000']
    metrics_path: '/metrics'
    scrape_interval: 5s
```

### Grafana Dashboard Import
```bash
# Import AgileForge dashboard
curl -X POST \
  http://admin:admin@localhost:3001/api/dashboards/db \
  -H 'Content-Type: application/json' \
  -d @monitoring/grafana-dashboard.json
```

### OpenTelemetry Setup
```bash
# Jaeger setup
docker run -d --name jaeger \
  -p 16686:16686 \
  -p 14268:14268 \
  jaegertracing/all-in-one:latest
```

## 🔒 Security Configuration

### Firewall Rules
```bash
# Allow necessary ports
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw allow 3000  # Frontend (dev only)
sudo ufw allow 8000  # Backend API
sudo ufw deny 5432   # PostgreSQL (internal only)
sudo ufw deny 6379   # Redis (internal only)
```

### SSL Certificate Setup
```bash
# Let's Encrypt setup
sudo certbot --nginx -d api.yourdomain.com
sudo certbot --nginx -d app.yourdomain.com
```

### Security Hardening
```bash
# Set secure file permissions
chmod 600 .env*
chmod 700 backend/logs/
chmod 700 backups/

# Setup log rotation
sudo cp monitoring/logrotate.conf /etc/logrotate.d/agileforge
```

## 💾 Backup Configuration

### Automated Backup Setup
```bash
# Setup backup cron job
crontab -e
# Add: 0 2 * * * /usr/bin/python3 /path/to/agileforge/backend/backup/backup_manager.py create --type incremental
```

### Manual Backup Operations
```bash
# Create full backup
python -m backend.backup.backup_manager create --type full

# Create incremental backup
python -m backend.backup.backup_manager create --type incremental

# List all backups
python -m backend.backup.backup_manager list

# Restore from backup
python -m backend.backup.backup_manager restore --backup-id 20231215_020000

# Verify backup integrity
python -m backend.backup.backup_manager verify --backup-id 20231215_020000
```

### S3 Backup Configuration
```bash
# Configure AWS credentials
aws configure
# or export AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY

# Test S3 connectivity
aws s3 ls s3://your-backup-bucket/
```

## 🧪 Testing & Validation

### Health Check Endpoints
```bash
# Application health
curl http://localhost:8000/health

# Detailed health with metrics
curl http://localhost:8000/api/performance/health

# Database connectivity
curl http://localhost:8000/api/performance/database-health

# Prometheus metrics
curl http://localhost:8000/metrics
```

### Load Testing
```bash
# Install k6
sudo apt-get install k6

# Run load tests
k6 run tests/load/api-load-test.js
k6 run tests/load/frontend-load-test.js
```

### Security Testing
```bash
# Run security scans
bandit -r backend/
safety check
semgrep --config=auto backend/

# OWASP ZAP scan
docker run -t owasp/zap2docker-stable zap-api-scan.py \
  -t http://localhost:8000/openapi.json \
  -f openapi
```

## 🔄 CI/CD Pipeline

### GitHub Actions Secrets
Configure these secrets in GitHub repository:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `DATABASE_URL`
- `DOCKER_USERNAME`
- `DOCKER_PASSWORD`
- `SLACK_WEBHOOK_URL` (optional)

### Pipeline Triggers
```yaml
# Automatic triggers configured:
on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]
  schedule:
    - cron: '0 2 * * *'  # Nightly builds
```

### Manual Pipeline Execution
```bash
# Trigger CI/CD pipeline
gh workflow run ci.yml

# Check pipeline status
gh run list --workflow=ci.yml
```

## 🐳 Docker Deployment

### Development with Docker Compose
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Production Docker Deployment
```bash
# Build production images
docker build -t agileforge-frontend:latest .
docker build -t agileforge-backend:latest ./backend

# Run production stack
docker-compose -f docker-compose.prod.yml up -d

# Health check
docker-compose -f docker-compose.prod.yml exec api curl http://localhost:8000/health
```

## ☸️ Kubernetes Deployment

### Namespace Setup
```bash
kubectl create namespace agileforge
kubectl config set-context --current --namespace=agileforge
```

### ConfigMap and Secrets
```bash
# Create secrets
kubectl create secret generic agileforge-secrets \
  --from-literal=database-url="$DATABASE_URL" \
  --from-literal=jwt-secret="$JWT_SECRET_KEY" \
  --from-literal=openai-key="$OPENAI_API_KEY"

# Create configmap
kubectl create configmap agileforge-config \
  --from-literal=environment=production \
  --from-literal=log-level=INFO
```

### Application Deployment
```bash
# Deploy application
kubectl apply -f k8s/

# Check deployment status
kubectl get pods
kubectl get services
kubectl get ingress

# View logs
kubectl logs -f deployment/agileforge-api
kubectl logs -f deployment/agileforge-frontend
```

### Helm Deployment (Recommended)
```bash
# Install with Helm
helm install agileforge ./helm-chart \
  --set image.tag=latest \
  --set database.url="$DATABASE_URL" \
  --set secrets.jwtSecret="$JWT_SECRET_KEY"

# Upgrade deployment
helm upgrade agileforge ./helm-chart

# Check status
helm status agileforge
```

## 📈 Performance Optimization

### Database Optimization
```bash
# Run query analysis
python -c "
from backend.database.query_optimizer import QueryOptimizer
from backend.database.supabase_client import get_supabase
optimizer = QueryOptimizer(get_supabase())
optimizer.analyze_slow_queries()
"

# Apply index suggestions
python -c "
from backend.database.query_optimizer import QueryOptimizer
from backend.database.supabase_client import get_supabase
optimizer = QueryOptimizer(get_supabase())
optimizer.apply_index_suggestions()
"
```

### Cache Management
```bash
# Redis cache stats
redis-cli info stats

# Clear cache
redis-cli flushall

# Monitor cache hit ratio
redis-cli info stats | grep keyspace
```

### Performance Monitoring
```bash
# Check API response times
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:8000/api/projects

# Monitor resource usage
htop
docker stats
kubectl top pods
```

## 🚨 Troubleshooting

### Common Issues

#### Database Connection Issues
```bash
# Check database connectivity
pg_isready -h localhost -p 5432

# Test Supabase connection
python -c "
from backend.database.supabase_client import init_supabase
try:
    init_supabase()
    print('✅ Database connection successful')
except Exception as e:
    print(f'❌ Database connection failed: {e}')
"
```

#### Redis Connection Issues
```bash
# Check Redis connectivity
redis-cli ping

# Check Redis logs
docker logs redis-container
```

#### API Issues
```bash
# Check API logs
tail -f backend/logs/api.log

# Test API endpoints
curl http://localhost:8000/health
curl http://localhost:8000/docs
```

#### Frontend Issues
```bash
# Check frontend logs
npm run dev  # View console output

# Check build
npm run build
npm run start
```

### Log Analysis
```bash
# Backend logs
tail -f backend/logs/api.log
tail -f backend/logs/security.log
tail -f backend/logs/performance.log

# System logs
sudo journalctl -u agileforge-api -f
sudo journalctl -u agileforge-frontend -f

# Docker logs
docker logs agileforge-api
docker logs agileforge-frontend
```

### Performance Issues
```bash
# Check system resources
free -h
df -h
iostat 1

# Check process usage
ps aux | grep python
ps aux | grep node

# Database performance
SELECT * FROM pg_stat_activity WHERE state = 'active';
```

## 📞 Emergency Procedures

### System Recovery
```bash
# Emergency backup restore
python -m backend.backup.backup_manager restore --backup-id latest --force

# Database recovery
pg_restore -d agileforge backup.sql

# Service restart
systemctl restart agileforge-api
systemctl restart agileforge-frontend
```

### Security Incident Response
```bash
# Check security logs
grep "SECURITY_ALERT" backend/logs/security.log

# Block suspicious IPs
sudo ufw insert 1 deny from suspicious.ip.address

# Rotate secrets
python deploy.py --phases "Security Components"
```

### Monitoring Alerts
```bash
# Check Prometheus alerts
curl http://localhost:9090/api/v1/alerts

# View Grafana dashboards
open http://localhost:3001/d/agileforge-overview

# Check health endpoints
for endpoint in health performance/health metrics; do
  echo "Checking /$endpoint"
  curl -s http://localhost:8000/$endpoint | jq .
done
```

## 📋 Maintenance Schedule

### Daily
- [ ] Check health endpoints
- [ ] Review error logs
- [ ] Monitor resource usage
- [ ] Verify backup completion

### Weekly
- [ ] Security scan
- [ ] Performance analysis
- [ ] Dependency updates
- [ ] Backup verification

### Monthly
- [ ] Full system backup test
- [ ] Security audit
- [ ] Performance optimization
- [ ] Capacity planning review

### Quarterly
- [ ] Disaster recovery test
- [ ] Security penetration test
- [ ] Architecture review
- [ ] Cost optimization review

---

## 📞 Support Contacts

- **Infrastructure Issues**: infrastructure@agileforge.com
- **Security Incidents**: security@agileforge.com  
- **Performance Issues**: performance@agileforge.com
- **General Support**: support@agileforge.com

**Emergency Hotline**: +1-555-AGILE-99 (24/7) 