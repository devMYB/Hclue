# Railway Deployment Guide for IdeaFlow

## 🚀 Quick Deploy to Railway

### Prerequisites
- Railway account (free tier available)
- GitHub repository with your code
- Stripe account for payments

### Step 1: Prepare Your Code
1. Ensure your `package.json` has proper build scripts
2. Add `railway.json` configuration file
3. Set up environment variables

### Step 2: Deploy to Railway
1. Go to [railway.app](https://railway.app)
2. Connect your GitHub repository
3. Railway will auto-detect your stack
4. Add environment variables
5. Deploy!

### Step 3: Configure Environment Variables
```bash
# Database
DATABASE_URL=postgresql://user:pass@host:port/db

# Authentication
JWT_SECRET_KEY=your-secret-key

# Stripe
STRIPE_SECRET_KEY=sk_live_...

# Frontend
VITE_API_URL=https://your-app.railway.app
```

### Step 4: Database Setup
Railway provides PostgreSQL automatically:
- No manual database setup needed
- Automatic backups
- Connection pooling included

### Step 5: Custom Domain (Optional)
1. Go to Railway dashboard
2. Select your project
3. Go to Settings > Domains
4. Add your custom domain
5. Railway handles SSL automatically

## 💰 Pricing
- **Free Tier**: $5 credit monthly
- **Pro Plan**: $20/month + usage
- **Team Plan**: $99/month + usage

## 🔧 Configuration Files

### railway.json
```json
{
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "python api_server.py",
    "healthcheckPath": "/api/health"
  }
}
```

### Dockerfile (Alternative)
```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install -r requirements.txt

# Install Node.js for frontend build
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs

# Copy and build frontend
COPY ideaflow-react/ ./ideaflow-react/
WORKDIR /app/ideaflow-react
RUN npm install && npm run build

# Copy backend code
WORKDIR /app
COPY . .

# Expose port
EXPOSE 8000

# Start application
CMD ["python", "api_server.py"]
```

## 🚀 Deployment Commands

### Using Railway CLI
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Deploy
railway up

# View logs
railway logs

# Open in browser
railway open
```

### Using Git Push
```bash
# Add Railway remote
git remote add railway https://railway.app/deploy

# Deploy
git push railway main
```

## 🔍 Monitoring & Logs
- Real-time logs in Railway dashboard
- Built-in metrics and monitoring
- Automatic error tracking
- Performance insights

## 🔒 Security Features
- Automatic HTTPS/SSL
- Environment variable encryption
- Database connection security
- Built-in DDoS protection

## 📈 Scaling
- Automatic horizontal scaling
- Load balancing included
- Database connection pooling
- CDN for static assets

## 🆘 Support
- 24/7 support on paid plans
- Community Discord
- Comprehensive documentation
- Video tutorials available

## ✅ Why Railway is Perfect for IdeaFlow
1. **Full-Stack Support**: Handles both React frontend and Flask backend
2. **Database Included**: PostgreSQL with automatic backups
3. **Real-time Features**: WebSocket support for live collaboration
4. **Easy Scaling**: Handles traffic spikes automatically
5. **Developer Experience**: Simple deployment, great tooling
6. **Cost Effective**: Free tier covers development, reasonable pricing for production

## 🎯 Next Steps
1. Create Railway account
2. Connect GitHub repository
3. Deploy your IdeaFlow app
4. Configure custom domain
5. Set up monitoring
6. Scale as needed!

Railway makes deploying IdeaFlow as easy as pushing code to GitHub! 🚀
