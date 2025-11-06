# Render Deployment Guide for IdeaFlow

## Why Render?
- ✅ Deploy both frontend and backend together
- ✅ Managed PostgreSQL database
- ✅ Automatic SSL certificates
- ✅ Free tier available
- ✅ Simple configuration

## Step 1: Prepare for Render

### 1.1 Create render.yaml
```yaml
# render.yaml
services:
  - type: web
    name: ideaflow-backend
    env: python
    buildCommand: pip install -r python_requirements.txt
    startCommand: python api_server.py
    envVars:
      - key: DATABASE_URL
        fromDatabase:
          name: ideaflow-db
          property: connectionString
      - key: JWT_SECRET_KEY
        generateValue: true
      - key: STRIPE_SECRET_KEY
        sync: false
      - key: FLASK_ENV
        value: production

  - type: web
    name: ideaflow-frontend
    env: static
    buildCommand: cd ideaflow-react && npm install && npm run build
    staticPublishPath: ./ideaflow-react/dist
    envVars:
      - key: VITE_API_URL
        value: https://ideaflow-backend.onrender.com

databases:
  - name: ideaflow-db
    databaseName: ideaflow
    user: ideaflow
```

### 1.2 Update package.json for build
```json
{
  "scripts": {
    "build": "vite build",
    "preview": "vite preview"
  }
}
```

## Step 2: Deploy to Render

### 2.1 Connect Repository
1. Go to [render.com](https://render.com)
2. Click "New" → "Web Service"
3. Connect your GitHub repository
4. Render will auto-detect the configuration

### 2.2 Configure Services
- **Backend**: Python service with your Flask app
- **Frontend**: Static site from the React build
- **Database**: PostgreSQL database (free tier)

### 2.3 Environment Variables
Render will automatically:
- Create a PostgreSQL database
- Set `DATABASE_URL` environment variable
- Generate secure keys

## Step 3: Custom Domain (Optional)
1. In Render dashboard, go to your service
2. Click "Settings" → "Custom Domains"
3. Add your domain
4. Update DNS records as instructed

## Step 4: Production Optimizations

### 4.1 Update Database Manager
```python
# utils/postgres_db_manager.py
DATABASE_URL = os.getenv('DATABASE_URL', 'sqlite:///ideaflow.db')
# Render will provide PostgreSQL URL automatically
```

### 4.2 Frontend API Configuration
```typescript
// ideaflow-react/src/services/api.ts
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://your-app.onrender.com';
```

## Benefits
- ✅ **Single Platform**: Everything in one place
- ✅ **Managed Database**: PostgreSQL included
- ✅ **Auto-scaling**: Handles traffic spikes
- ✅ **SSL**: Automatic HTTPS
- ✅ **Monitoring**: Built-in health checks
