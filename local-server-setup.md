# Local Server Setup for IdeaFlow

## Quick Setup (Development)

### 1. Start the Backend Server
```bash
# In your CreativeScraper directory
python api_server.py
```
Your backend will be available at: `http://localhost:8000`

### 2. Start the Frontend Server
```bash
# In a new terminal, go to the frontend directory
cd ideaflow-react
npm run dev
```
Your frontend will be available at: `http://localhost:5000`

### 3. Access Your Application
- **Local**: http://localhost:5000
- **Network**: http://[your-ip]:5000 (accessible to other devices on your network)

## Network Access Setup

### 1. Find Your Computer's IP Address
```bash
# Windows
ipconfig

# Look for "IPv4 Address" (usually 192.168.x.x or 10.x.x.x)
```

### 2. Update Frontend Configuration
```typescript
// In ideaflow-react/src/services/api.ts
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://[YOUR-IP]:8000';
```

### 3. Configure Firewall
- **Windows**: Allow Python through Windows Firewall
- **Port 8000**: Make sure it's not blocked
- **Port 5000**: For frontend development

## Production-Style Setup

### 1. Use a Reverse Proxy (Nginx)
```nginx
# nginx.conf
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    location /api/ {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### 2. Use PM2 for Process Management
```bash
# Install PM2
npm install -g pm2

# Create ecosystem file
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [
    {
      name: 'ideaflow-backend',
      script: 'api_server.py',
      interpreter: 'python',
      env: {
        FLASK_ENV: 'production',
        DATABASE_URL: 'sqlite:///ideaflow.db'
      }
    }
  ]
};
EOF

# Start with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## Security Considerations

### 1. Environment Variables
```bash
# Create .env file
DATABASE_URL=sqlite:///ideaflow.db
JWT_SECRET_KEY=your-super-secret-jwt-key
STRIPE_SECRET_KEY=sk_live_your_stripe_key
FLASK_ENV=production
```

### 2. Firewall Rules
- Only open necessary ports (80, 443, 8000)
- Use strong passwords
- Consider VPN access for remote users

### 3. SSL/HTTPS
- Use Let's Encrypt for free SSL certificates
- Or use a reverse proxy with SSL termination

## Benefits of Local Server
- ✅ **Full Control**: Complete control over your server
- ✅ **Cost Effective**: No hosting fees
- ✅ **Fast Development**: Instant updates
- ✅ **Privacy**: Data stays on your machine
- ✅ **Learning**: Great for understanding server management

## Limitations
- ❌ **Uptime**: Depends on your computer being on
- ❌ **Internet Access**: Requires static IP or dynamic DNS
- ❌ **Scaling**: Limited by your computer's resources
- ❌ **Security**: Requires proper configuration
