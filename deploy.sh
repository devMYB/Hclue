#!/bin/bash
# IdeaFlow Deployment Script

echo "🚀 IdeaFlow Deployment Helper"
echo "=============================="

# Check if we're in the right directory
if [ ! -f "api_server.py" ]; then
    echo "❌ Error: Please run this script from the IdeaFlow root directory"
    exit 1
fi

echo "📋 Choose your deployment option:"
echo "1. Railway (Easiest - Full stack)"
echo "2. Vercel + Railway (Professional)"
echo "3. Render (All-in-one)"
echo "4. Docker (Advanced)"
echo "5. Manual setup instructions"

read -p "Enter your choice (1-5): " choice

case $choice in
    1)
        echo "🚂 Setting up for Railway deployment..."
        
        # Create Procfile
        echo "web: python api_server.py" > Procfile
        echo "✅ Created Procfile"
        
        # Check if requirements.txt exists
        if [ -f "python_requirements.txt" ]; then
            echo "✅ Requirements file found"
        else
            echo "❌ python_requirements.txt not found"
        fi
        
        echo ""
        echo "📝 Next steps:"
        echo "1. Push your code to GitHub"
        echo "2. Go to railway.app"
        echo "3. Connect your GitHub repo"
        echo "4. Railway will auto-deploy!"
        echo ""
        echo "🔧 Environment variables to set in Railway:"
        echo "   DATABASE_URL=sqlite:///ideaflow.db"
        echo "   JWT_SECRET_KEY=your-super-secret-jwt-key"
        echo "   STRIPE_SECRET_KEY=sk_test_your_stripe_key"
        echo "   FLASK_ENV=production"
        ;;
        
    2)
        echo "⚡ Setting up for Vercel + Railway deployment..."
        
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
        echo "✅ Created railway.json"
        
        # Create vercel.json for frontend
        cat > ideaflow-react/vercel.json << EOF
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
        echo "✅ Created vercel.json for frontend"
        
        echo ""
        echo "📝 Next steps:"
        echo "1. Deploy backend to Railway"
        echo "2. Deploy frontend to Vercel"
        echo "3. Update VITE_API_URL in Vercel with Railway URL"
        ;;
        
    3)
        echo "🎨 Setting up for Render deployment..."
        
        # Create render.yaml
        cat > render.yaml << EOF
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
EOF
        echo "✅ Created render.yaml"
        
        echo ""
        echo "📝 Next steps:"
        echo "1. Push your code to GitHub"
        echo "2. Go to render.com"
        echo "3. Connect your GitHub repo"
        echo "4. Render will auto-deploy everything!"
        ;;
        
    4)
        echo "🐳 Setting up for Docker deployment..."
        
        # Create Dockerfile if it doesn't exist
        if [ ! -f "Dockerfile" ]; then
            cat > Dockerfile << EOF
FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y gcc && rm -rf /var/lib/apt/lists/*

COPY python_requirements.txt .
RUN pip install --no-cache-dir -r python_requirements.txt

COPY . .

WORKDIR /app/ideaflow-react
RUN npm install && npm run build

WORKDIR /app

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \\
    CMD curl -f http://localhost:8000/api/health || exit 1

CMD ["python", "api_server.py"]
EOF
            echo "✅ Created Dockerfile"
        fi
        
        # Create docker-compose.yml
        cat > docker-compose.yml << EOF
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
EOF
        echo "✅ Created docker-compose.yml"
        
        echo ""
        echo "📝 Next steps:"
        echo "1. Run: docker-compose up -d"
        echo "2. Or deploy to your preferred cloud platform"
        ;;
        
    5)
        echo "📚 Manual setup instructions:"
        echo ""
        echo "🔧 Environment Variables:"
        echo "   DATABASE_URL=postgresql://user:pass@host:port/db"
        echo "   JWT_SECRET_KEY=your-super-secret-jwt-key"
        echo "   STRIPE_SECRET_KEY=sk_live_your_stripe_key"
        echo "   FLASK_ENV=production"
        echo ""
        echo "🚀 Deployment platforms:"
        echo "   • Railway: railway.app"
        echo "   • Vercel: vercel.com"
        echo "   • Render: render.com"
        echo "   • DigitalOcean: digitalocean.com"
        echo "   • AWS: aws.amazon.com"
        echo "   • Google Cloud: cloud.google.com"
        echo ""
        echo "📖 See the deployment guides in this directory for detailed instructions"
        ;;
        
    *)
        echo "❌ Invalid choice. Please run the script again."
        exit 1
        ;;
esac

echo ""
echo "🎉 Setup complete! Check the generated files and follow the next steps."
echo "📖 For detailed instructions, see the .md files in this directory."
