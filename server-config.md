# Your IdeaFlow Server Configuration

## Your Server Details
- **Your IP Address**: 173.64.31.20
- **Backend Port**: 8000
- **Frontend Port**: 5000
- **Public URL**: http://173.64.31.20:5000

## Quick Start

### 1. Start Your Server
```bash
# Double-click this file to start both servers:
start-server.bat
```

### 2. Access Your Application
- **Local Access**: http://localhost:5000
- **Network Access**: http://173.64.31.20:5000
- **Internet Access**: http://173.64.31.20:5000

## Configuration Files

### Frontend Environment (.env.development)
Create this file in `ideaflow-react/.env.development`:
```
VITE_API_URL=http://173.64.31.20:8000
VITE_SUPABASE_URL=https://gtnrolsbynawoxjypmsc.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0bnJvbHNieW5hd294anlwbXNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg0NTY1NzcsImV4cCI6MjA2NDAzMjU3N30.UmSt8PNv4jHJPycQbMdi6ZdqdebKOF6Kkiz06VP00g8
```

### Backend Environment (.env)
Create this file in the root directory:
```
DATABASE_URL=sqlite:///ideaflow.db
JWT_SECRET_KEY=your-super-secret-jwt-key-change-this-in-production
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
FLASK_ENV=development
PORT=8000
```

## Sharing Your Server

### With People on Your Network
- **URL**: http://173.64.31.20:5000
- **Requirements**: They must be on the same WiFi/network

### With People on the Internet
- **URL**: http://173.64.31.20:5000
- **Requirements**: 
  - Your router must allow port forwarding
  - Ports 8000 and 5000 must be forwarded to your computer
  - Your firewall must allow these ports

## Router Configuration (For Internet Access)

### Port Forwarding Setup
1. **Login to your router** (usually 192.168.1.1 or 192.168.0.1)
2. **Find Port Forwarding settings**
3. **Add these rules**:
   - Port 8000 → 173.64.31.20 (Backend)
   - Port 5000 → 173.64.31.20 (Frontend)
   - Port 80 → 173.64.31.20 (Optional, for standard web access)

### Firewall Configuration
- **Windows Firewall**: Allow Python through firewall
- **Router Firewall**: Ensure ports 8000 and 5000 are open

## Security Considerations

### For Local Network Only
- ✅ **Safe**: Only people on your network can access
- ✅ **Fast**: No internet latency
- ✅ **Private**: Data stays on your network

### For Internet Access
- ⚠️ **Security**: Anyone with the URL can access
- ⚠️ **Firewall**: Must configure properly
- ⚠️ **SSL**: Consider HTTPS for production use

## Monitoring Your Server

### Check if it's running
```bash
# Check backend
curl http://173.64.31.20:8000/api/health

# Check frontend
curl http://173.64.31.20:5000
```

### View logs
- **Backend**: Check the terminal where you started `python api_server.py`
- **Frontend**: Check the terminal where you started `npm run dev`

## Troubleshooting

### Can't access from other devices
1. Check if both servers are running
2. Check Windows Firewall settings
3. Check router port forwarding
4. Try accessing from the same computer first

### Port already in use
1. Stop other applications using ports 8000/5000
2. Or change ports in the configuration files

### Connection refused
1. Make sure both servers are running
2. Check if your IP address is correct
3. Verify firewall settings
