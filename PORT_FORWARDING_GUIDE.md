# Router Port Forwarding Guide for IdeaFlow

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
