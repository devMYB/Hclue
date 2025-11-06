#!/usr/bin/env python3
"""
Configure IdeaFlow for internet access
"""

import os

def create_nginx_config():
    """Create nginx configuration for port forwarding"""
    
    nginx_config = """# Nginx configuration for IdeaFlow
# Place this in your nginx sites-available directory

server {
    listen 80;
    server_name 173.64.31.20;
    
    # Frontend (React app)
    location / {
        proxy_pass http://90.0.0.3:5002;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Backend API
    location /api/ {
        proxy_pass http://90.0.0.3:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # WebSocket support
    location /socket.io/ {
        proxy_pass http://90.0.0.3:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
"""
    
    with open("nginx-ideaflow.conf", "w") as f:
        f.write(nginx_config)
    
    print("✅ Created nginx-ideaflow.conf")
    print("   This can be used if you install nginx on your computer")

def create_port_forwarding_guide():
    """Create a guide for router port forwarding"""
    
    guide = """# Router Port Forwarding Guide for IdeaFlow

## Your Network Details
- Router IP: 90.0.0.1
- Your Computer IP: 90.0.0.3
- Public IP: 173.64.31.20

## Port Forwarding Rules Needed

### Option 1: Standard Ports (Recommended)
| Service | External Port | Internal IP | Internal Port | Protocol |
|---------|---------------|-------------|---------------|----------|
| Web Server | 80 | 90.0.0.3 | 5002 | TCP |
| API Server | 8080 | 90.0.0.3 | 8000 | TCP |

### Option 2: Custom Ports
| Service | External Port | Internal IP | Internal Port | Protocol |
|---------|---------------|-------------|---------------|----------|
| Frontend | 5002 | 90.0.0.3 | 5002 | TCP |
| Backend | 8000 | 90.0.0.3 | 8000 | TCP |

## Router Configuration Steps

1. **Access Router Admin Panel**
   - Open browser: http://90.0.0.1
   - Login with admin credentials

2. **Find Port Forwarding Settings**
   - Look for: "Port Forwarding", "Virtual Server", "NAT", or "Firewall"
   - Different routers have different names

3. **Add Port Forwarding Rules**
   - Add the rules from the table above
   - Make sure to save/apply changes

4. **Test Internet Access**
   - Frontend: http://173.64.31.20:5002 (or :80 if using standard ports)
   - Backend: http://173.64.31.20:8000 (or :8080 if using standard ports)

## Alternative: Use Tunneling Service

If port forwarding doesn't work, use ngrok:

```bash
# Install ngrok
# Download from ngrok.com

# Expose frontend
ngrok http 5002
# This gives you: https://abc123.ngrok.io

# Expose backend  
ngrok http 8000
# This gives you: https://def456.ngrok.io
```

## Troubleshooting

### Can't Access Router
- Try: http://192.168.1.1 or http://192.168.0.1
- Check router manual for default IP

### Port Forwarding Not Working
- Make sure your computer has a static IP (90.0.0.3)
- Check if router has "UPnP" enabled
- Try different external ports

### Still Not Working
- Use ngrok or similar tunneling service
- Or deploy to a cloud platform (Railway, Render, etc.)
"""
    
    with open("PORT_FORWARDING_GUIDE.md", "w") as f:
        f.write(guide)
    
    print("✅ Created PORT_FORWARDING_GUIDE.md")

def create_ngrok_setup():
    """Create ngrok setup for easy internet access"""
    
    ngrok_script = """@echo off
echo Setting up IdeaFlow for Internet Access with ngrok
echo.

echo Starting IdeaFlow servers...
start "IdeaFlow Backend" cmd /k "python api_server.py"

timeout /t 3 /nobreak > nul

echo Starting IdeaFlow Frontend...
start "IdeaFlow Frontend" cmd /k "cd ideaflow-react && npm run dev"

timeout /t 5 /nobreak > nul

echo.
echo Starting ngrok tunnels...
echo.

echo Starting ngrok for Frontend (Port 5002)...
start "ngrok Frontend" cmd /k "ngrok http 5002"

timeout /t 2 /nobreak > nul

echo Starting ngrok for Backend (Port 8000)...
start "ngrok Backend" cmd /k "ngrok http 8000"

echo.
echo ✅ IdeaFlow with ngrok tunnels started!
echo.
echo 🌐 Check the ngrok windows for your public URLs
echo    They will look like: https://abc123.ngrok.io
echo.
echo 📝 Update your frontend to use the ngrok backend URL
echo.
pause
"""
    
    with open("start-with-ngrok.bat", "w") as f:
        f.write(ngrok_script)
    
    print("✅ Created start-with-ngrok.bat")
    print("   This will start IdeaFlow with ngrok tunnels for internet access")

def main():
    print("Configuring IdeaFlow for Internet Access")
    print("=" * 50)
    
    # Create nginx config
    create_nginx_config()
    
    # Create port forwarding guide
    create_port_forwarding_guide()
    
    # Create ngrok setup
    create_ngrok_setup()
    
    print()
    print("🎉 Configuration files created!")
    print("=" * 50)
    print("Choose your method:")
    print()
    print("1. ROUTER PORT FORWARDING (Recommended)")
    print("   - Read: PORT_FORWARDING_GUIDE.md")
    print("   - Configure your router at: http://90.0.0.1")
    print("   - Forward ports 5002 and 8000 to 90.0.0.3")
    print()
    print("2. NGROK TUNNELING (Easiest)")
    print("   - Install ngrok from ngrok.com")
    print("   - Run: start-with-ngrok.bat")
    print("   - Get public URLs from ngrok windows")
    print()
    print("3. CLOUD DEPLOYMENT (Most Reliable)")
    print("   - Deploy to Railway, Render, or Vercel")
    print("   - See deployment guides in this directory")

if __name__ == "__main__":
    main()
