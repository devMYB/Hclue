# Vercel + Railway Deployment Guide

## Architecture
- **Frontend (React)**: Deploy to Vercel
- **Backend (Flask)**: Deploy to Railway
- **Database**: Railway PostgreSQL

## Step 1: Deploy Backend to Railway

### 1.1 Prepare Backend
```bash
# Create railway.json
cat > railway.json << EOF
{
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "python api_server.py",
    "healthcheckPath": "/api/health"
  }
}
EOF
```

### 1.2 Deploy to Railway
1. Connect your GitHub repo to Railway
2. Railway will auto-detect Python and build
3. Add environment variables:
   ```
   DATABASE_URL=postgresql://... (Railway provides this)
   JWT_SECRET_KEY=your-super-secret-key
   STRIPE_SECRET_KEY=sk_live_your_stripe_key
   FLASK_ENV=production
   ```

## Step 2: Deploy Frontend to Vercel

### 2.1 Prepare Frontend
```bash
cd ideaflow-react

# Create vercel.json
cat > vercel.json << EOF
{
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "dist"
      }
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/index.html"
    }
  ]
}
EOF
```

### 2.2 Environment Variables for Vercel
In Vercel dashboard, add:
```
VITE_API_URL=https://your-railway-app.railway.app
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 2.3 Deploy to Vercel
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

## Step 3: Update Database for Production

### 3.1 Use Railway PostgreSQL
```python
# Update utils/postgres_db_manager.py
DATABASE_URL = os.getenv('DATABASE_URL', 'sqlite:///ideaflow.db')
```

### 3.2 Database Migration
Railway will provide a PostgreSQL connection string automatically.

## Benefits
- ✅ **Vercel**: Excellent for React apps, global CDN
- ✅ **Railway**: Great for Python backends, managed databases
- ✅ **Scalable**: Both platforms scale automatically
- ✅ **Free Tiers**: Both have generous free tiers
