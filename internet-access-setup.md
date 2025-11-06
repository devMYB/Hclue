# Making Your Computer Accessible from the Internet

## Method 1: Port Forwarding (Router Setup)

### 1. Configure Your Router
1. **Find your router's IP**: Usually `192.168.1.1` or `192.168.0.1`
2. **Login to router admin panel**
3. **Port Forwarding Settings**:
   - Port 8000 → Your computer's IP (for backend)
   - Port 5000 → Your computer's IP (for frontend)
   - Or use port 80/443 for standard web ports

### 2. Find Your Public IP
```bash
# Check your public IP
curl ifconfig.me
# or visit: whatismyipaddress.com
```

### 3. Update Frontend Configuration
```typescript
// In ideaflow-react/src/services/api.ts
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://[YOUR-PUBLIC-IP]:8000';
```

## Method 2: Dynamic DNS (Recommended)

### 1. Use a Dynamic DNS Service
- **No-IP**: Free dynamic DNS
- **DuckDNS**: Free and simple
- **Cloudflare**: Professional option

### 2. Setup DuckDNS (Free)
1. Go to [duckdns.org](https://duckdns.org)
2. Create account and get a subdomain (e.g., `myideaflow.duckdns.org`)
3. Install DuckDNS client on your computer
4. Update your domain automatically

### 3. Configure Your Application
```typescript
// Frontend configuration
const API_BASE_URL = 'http://myideaflow.duckdns.org:8000';
```

## Method 3: Tunneling Services (Easiest)

### 1. ngrok (Popular Choice)
```bash
# Install ngrok
# Download from ngrok.com

# Expose your backend
ngrok http 8000
# This gives you: https://abc123.ngrok.io

# Expose your frontend
ngrok http 5000
# This gives you: https://def456.ngrok.io
```

### 2. Cloudflare Tunnel (Free)
```bash
# Install cloudflared
# Create tunnel
cloudflared tunnel create ideaflow
cloudflared tunnel route dns ideaflow myideaflow.example.com
cloudflared tunnel run ideaflow
```

### 3. LocalTunnel (Simple)
```bash
# Install globally
npm install -g localtunnel

# Expose your backend
lt --port 8000 --subdomain myideaflow-backend

# Expose your frontend
lt --port 5000 --subdomain myideaflow-frontend
```

## Method 4: VPS/Cloud Server (Professional)

### 1. Rent a VPS
- **DigitalOcean**: $5/month droplet
- **Linode**: $5/month instance
- **Vultr**: $3.50/month instance
- **AWS EC2**: Pay-as-you-go

### 2. Deploy Your Application
```bash
# Copy your code to the server
scp -r . user@your-server-ip:/home/user/ideaflow

# SSH into the server
ssh user@your-server-ip

# Install dependencies
pip install -r python_requirements.txt
cd ideaflow-react && npm install && npm run build

# Run your application
python api_server.py
```

## Security Best Practices

### 1. Use HTTPS
```bash
# Get free SSL certificate with Let's Encrypt
sudo apt install certbot
sudo certbot --nginx -d yourdomain.com
```

### 2. Firewall Configuration
```bash
# Ubuntu/Debian
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw enable
```

### 3. Environment Variables
```bash
# Create .env file with secure values
JWT_SECRET_KEY=your-super-secret-jwt-key-here
STRIPE_SECRET_KEY=sk_live_your_stripe_key
DATABASE_URL=postgresql://user:pass@localhost/ideaflow
```

## Monitoring and Maintenance

### 1. Process Management
```bash
# Use PM2 to keep your app running
npm install -g pm2
pm2 start api_server.py --name ideaflow
pm2 startup
pm2 save
```

### 2. Logs and Monitoring
```bash
# Check application logs
pm2 logs ideaflow

# Monitor system resources
htop
```

### 3. Backup Strategy
```bash
# Backup your database
pg_dump ideaflow > backup.sql

# Backup your code
tar -czf ideaflow-backup.tar.gz /path/to/your/app
```

## Cost Comparison

| Method | Cost | Difficulty | Reliability |
|--------|------|------------|-------------|
| Your Computer | $0 | Easy | Medium |
| Port Forwarding | $0 | Medium | Low |
| Dynamic DNS | $0 | Medium | Medium |
| Tunneling | $0-20/month | Easy | High |
| VPS | $3-10/month | Medium | High |
| Cloud Platform | $0-50/month | Easy | Very High |
