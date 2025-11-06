# Docker Deployment Guide for IdeaFlow

## Why Docker?
- ✅ Consistent environment across platforms
- ✅ Easy to deploy anywhere (AWS, GCP, Azure, DigitalOcean)
- ✅ Production-ready configuration
- ✅ Easy scaling

## Step 1: Create Docker Configuration

### 1.1 Update Dockerfile
```dockerfile
# Dockerfile
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY python_requirements.txt .
RUN pip install --no-cache-dir -r python_requirements.txt

# Copy application code
COPY . .

# Build React frontend
WORKDIR /app/ideaflow-react
RUN npm install && npm run build

# Go back to app directory
WORKDIR /app

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/api/health || exit 1

# Start application
CMD ["python", "api_server.py"]
```

### 1.2 Create docker-compose.yml
```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://postgres:password@db:5432/ideaflow
      - JWT_SECRET_KEY=your-super-secret-jwt-key
      - STRIPE_SECRET_KEY=sk_test_your_stripe_key
      - FLASK_ENV=production
    depends_on:
      - db
    restart: unless-stopped

  db:
    image: postgres:15
    environment:
      - POSTGRES_DB=ideaflow
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

volumes:
  postgres_data:
```

## Step 2: Deploy Options

### 2.1 DigitalOcean App Platform
```yaml
# .do/app.yaml
name: ideaflow
services:
- name: web
  source_dir: /
  github:
    repo: your-username/ideaflow
    branch: main
  run_command: python api_server.py
  environment_slug: python
  instance_count: 1
  instance_size_slug: basic-xxs
  envs:
  - key: DATABASE_URL
    value: ${db.DATABASE_URL}
  - key: JWT_SECRET_KEY
    value: your-secret-key
databases:
- name: db
  engine: PG
  version: "15"
```

### 2.2 AWS ECS
```bash
# Build and push to ECR
aws ecr create-repository --repository-name ideaflow
docker build -t ideaflow .
docker tag ideaflow:latest your-account.dkr.ecr.region.amazonaws.com/ideaflow:latest
docker push your-account.dkr.ecr.region.amazonaws.com/ideaflow:latest
```

### 2.3 Google Cloud Run
```bash
# Build and deploy
gcloud builds submit --tag gcr.io/your-project/ideaflow
gcloud run deploy --image gcr.io/your-project/ideaflow --platform managed
```

## Step 3: Production Database

### 3.1 Use Managed PostgreSQL
- **AWS RDS**: Managed PostgreSQL
- **Google Cloud SQL**: Managed PostgreSQL  
- **DigitalOcean Managed Databases**: PostgreSQL
- **Railway**: PostgreSQL with connection pooling

### 3.2 Update Database Configuration
```python
# utils/postgres_db_manager.py
DATABASE_URL = os.getenv('DATABASE_URL', 'sqlite:///ideaflow.db')
# Production will use PostgreSQL from environment
```

## Step 4: Environment Variables

### 4.1 Required Variables
```bash
DATABASE_URL=postgresql://user:pass@host:port/db
JWT_SECRET_KEY=your-super-secret-jwt-key
STRIPE_SECRET_KEY=sk_live_your_stripe_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
FLASK_ENV=production
```

### 4.2 Optional Variables
```bash
REDIS_URL=redis://your-redis-host:6379
SENTRY_DSN=your-sentry-dsn
LOG_LEVEL=INFO
```

## Benefits
- ✅ **Portable**: Run anywhere Docker runs
- ✅ **Scalable**: Easy horizontal scaling
- ✅ **Production-ready**: Industry standard
- ✅ **Monitoring**: Easy to add monitoring tools
