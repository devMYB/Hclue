# Railway Deployment Guide for IdeaFlow

## Prerequisites
- GitHub account
- Railway account (free tier available)

## Steps

### 1. Prepare Your Code
```bash
# Create a Procfile for Railway
echo "web: python api_server.py" > Procfile

# Create requirements.txt (already exists)
# Make sure all dependencies are listed
```

### 2. Push to GitHub
```bash
git add .
git commit -m "Ready for deployment"
git push origin main
```

### 3. Deploy on Railway
1. Go to [railway.app](https://railway.app)
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your repository
4. Railway will automatically detect it's a Python app

### 4. Configure Environment Variables
In Railway dashboard, add these environment variables:
```
DATABASE_URL=sqlite:///ideaflow.db
JWT_SECRET_KEY=your-super-secret-jwt-key-change-this
STRIPE_SECRET_KEY=sk_test_your_stripe_key
FLASK_ENV=production
PORT=8000
```

### 5. Build Frontend
Railway will automatically:
- Install Python dependencies
- Build the React frontend
- Start the server

### 6. Access Your App
Railway will give you a URL like: `https://your-app.railway.app`

## Frontend Configuration
Update your frontend to use the Railway URL:
```typescript
// In ideaflow-react/src/services/api.ts
const API_BASE_URL = process.env.VITE_API_URL || 'https://your-app.railway.app';
```

## Database Considerations
- Railway provides PostgreSQL databases
- You can upgrade from SQLite to PostgreSQL later
- For now, SQLite will work for small deployments
