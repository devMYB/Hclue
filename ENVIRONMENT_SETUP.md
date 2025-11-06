# Environment Setup Guide

## Frontend Environment Variables

Create the following files in the `ideaflow-react/` directory:

### `.env.development`
```bash
VITE_API_URL=http://localhost:8000
```

### `.env.production`
```bash
VITE_API_URL=https://your-production-domain.com
```

### `.env.example`
```bash
VITE_API_URL=http://localhost:8000
```

## Backend Environment Variables

Set the following environment variables:

### Required Variables
```bash
# Database
DATABASE_URL=postgresql://username:password@host:port/database

# JWT Authentication
JWT_SECRET_KEY=your-secret-key-change-in-production

# Redis (Optional - for WebSocket scaling)
REDIS_URL=redis://localhost:6379

# Stripe (Optional - for payments)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Development Setup
```bash
# For local development
export DATABASE_URL="sqlite:///ideaflow.db"
export JWT_SECRET_KEY="dev-secret-key"
export REDIS_URL="redis://localhost:6379"
```

### Production Setup
```bash
# For production deployment
export DATABASE_URL="postgresql://user:pass@host:5432/ideaflow"
export JWT_SECRET_KEY="your-production-secret-key"
export REDIS_URL="redis://your-redis-host:6379"
export STRIPE_SECRET_KEY="sk_live_..."
```

## Docker Compose Setup

For local development with Redis and PostgreSQL:

```bash
# Start Redis and PostgreSQL
docker-compose up -d

# Set environment variables
export DATABASE_URL="postgresql://ideaflow:ideaflow123@localhost:5432/ideaflow"
export REDIS_URL="redis://localhost:6379"
```

## Health Check

After setup, verify the system is working:

```bash
# Check API health
curl http://localhost:8000/api/health

# Expected response:
{
  "status": "ok",
  "database": "connected",
  "timestamp": "2024-01-01T00:00:00"
}
```
