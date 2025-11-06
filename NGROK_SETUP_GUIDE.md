# ngrok Setup Guide for IdeaFlow

This guide documents the ngrok setup process for the IdeaFlow application, including common issues encountered and their solutions.

## Table of Contents
- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Common Issues & Solutions](#common-issues--solutions)
- [Step-by-Step Setup](#step-by-step-setup)
- [Troubleshooting](#troubleshooting)
- [Best Practices](#best-practices)

## Overview

ngrok is a tunneling service that allows you to expose your local development server to the internet. This is essential for:
- Testing IdeaFlow with external users
- Webhook testing
- Mobile device testing
- Sharing your development work

## Prerequisites

- IdeaFlow application running locally
- ngrok account (free tier available)
- Frontend running on port 5173
- Backend running on port 8000

## Installation

### 1. Download ngrok
```bash
# Download from https://ngrok.com/download
# Or use package managers:
# Windows (Chocolatey): choco install ngrok
# macOS (Homebrew): brew install ngrok
```

### 2. Sign up and get auth token
1. Go to https://ngrok.com/signup
2. Sign up for a free account
3. Get your auth token from https://dashboard.ngrok.com/get-started/your-authtoken

### 3. Configure ngrok
```bash
ngrok config add-authtoken YOUR_AUTH_TOKEN
```

## Common Issues & Solutions

### Issue 1: Multiple ngrok Processes Running
**Error**: `ERR_NGROK_6030` or `ERR_NGROK_334`

**Problem**: Multiple ngrok processes were running simultaneously, causing URL conflicts.

**Solution**:
```bash
# Check running processes
tasklist | findstr ngrok

# Kill all ngrok processes
taskkill /f /im ngrok.exe

# Start fresh
ngrok http 5173
```

### Issue 2: Vite Host Blocking
**Error**: `Blocked request. This host ("your-ngrok-url.ngrok-free.dev") is not allowed.`

**Problem**: Vite development server was blocking requests from ngrok hosts.

**Solution**: Updated `ideaflow-react/vite.config.ts`:
```typescript
export default defineConfig({
  server: {
    port: 5173,
    allowedHosts: [
      'localhost',
      '127.0.0.1',
      'nontemperamentally-supersarcastic-francesca.ngrok-free.dev',
      '.ngrok-free.dev'  // Allow all ngrok domains
    ]
  }
})
```

### Issue 3: Frontend-Backend Connection Issues
**Error**: `net::ERR_CONNECTION_CLOSED` and `TypeError: Failed to fetch`

**Problem**: Frontend couldn't reach backend through ngrok tunnel.

**Solution**: Updated API configuration to use relative URLs:
```typescript
// In api.ts, AuthContext.tsx, and rbac.ts
const API_BASE_URL = window.location.protocol === 'https:' || 
                     window.location.hostname.includes('ngrok') ? 
                     '' : 'http://90.0.0.3:8000';
```

### Issue 4: Mixed Content Errors
**Error**: `Mixed Content: The page at 'https://...' was loaded over HTTPS, but requested an insecure resource 'http://...'`

**Problem**: HTTPS ngrok URL trying to access HTTP backend.

**Solution**: Use relative URLs for API calls when accessed via ngrok.

## Step-by-Step Setup

### 1. Start the Backend
```bash
# Terminal 1
cd C:\Users\Sravani\Desktop\CreativeScraper
python api_server.py
```

### 2. Start the Frontend
```bash
# Terminal 2
cd C:\Users\Sravani\Desktop\CreativeScraper\ideaflow-react
npm run dev
```

### 3. Start ngrok
```bash
# Terminal 3
ngrok http 5173
```

### 4. Update Vite Configuration
If you get host blocking errors, update `ideaflow-react/vite.config.ts`:
```typescript
export default defineConfig({
  server: {
    port: 5173,
    allowedHosts: [
      'localhost',
      '127.0.0.1',
      '.ngrok-free.dev'  // Allow all ngrok domains
    ],
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('proxy error', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('Sending Request to the Target:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('Received Response from the Target:', proxyRes.statusCode, req.url);
          });
        },
        rewrite: (path) => path.replace(/^\/api/, '/api')
      }
    }
  }
})
```

### 5. Access Your Application
1. Copy the HTTPS URL from ngrok (e.g., `https://abc123.ngrok-free.dev`)
2. Open it in your browser
3. The application should work with full functionality

## Troubleshooting

### Check Running Processes
```bash
# Windows
tasklist | findstr ngrok
tasklist | findstr python
tasklist | findstr node

# Kill specific processes if needed
taskkill /f /im ngrok.exe
taskkill /f /im python.exe
taskkill /f /im node.exe
```

### Verify Ports
```bash
# Check if ports are in use
netstat -an | findstr :5173
netstat -an | findstr :8000
```

### Test API Connection
```bash
# Test backend directly
curl http://localhost:8000/api/health

# Test through ngrok (replace with your ngrok URL)
curl https://your-ngrok-url.ngrok-free.dev/api/health
```

### Common Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| `ERR_NGROK_6030` | Multiple ngrok processes | Kill all ngrok processes and restart |
| `ERR_NGROK_334` | URL conflict | Use different ngrok subdomain |
| `Blocked request` | Vite host blocking | Add ngrok domain to allowedHosts |
| `ERR_CONNECTION_CLOSED` | Frontend-backend connection | Use relative URLs in API calls |
| `Mixed Content` | HTTPS/HTTP mismatch | Use relative URLs for API calls |

## Best Practices

### 1. Process Management
- Always check for existing processes before starting new ones
- Use separate terminals for each service
- Keep ngrok running in a dedicated terminal

### 2. Configuration
- Use relative URLs in frontend API calls
- Add ngrok domains to Vite allowedHosts
- Test both local and ngrok access

### 3. Development Workflow
1. Start backend first
2. Start frontend second
3. Start ngrok last
4. Test functionality through ngrok URL
5. Keep all services running during development

### 4. Security Notes
- ngrok free tier has session limits
- URLs change on restart (unless using paid plan)
- Don't commit ngrok URLs to version control
- Use environment variables for configuration

## Quick Start Script

Create a batch file `start-with-ngrok.bat`:
```batch
@echo off
echo Starting IdeaFlow with ngrok...

echo Starting backend...
start "Backend" cmd /k "cd /d C:\Users\Sravani\Desktop\CreativeScraper && python api_server.py"

echo Waiting 5 seconds...
timeout /t 5 /nobreak > nul

echo Starting frontend...
start "Frontend" cmd /k "cd /d C:\Users\Sravani\Desktop\CreativeScraper\ideaflow-react && npm run dev"

echo Waiting 10 seconds...
timeout /t 10 /nobreak > nul

echo Starting ngrok...
start "ngrok" cmd /k "ngrok http 5173"

echo All services started!
echo Check the ngrok terminal for your public URL.
pause
```

## Environment Variables

Create `.env.local` for ngrok-specific settings:
```bash
# ngrok configuration
NGROK_AUTH_TOKEN=your_auth_token_here
NGROK_SUBDOMAIN=your-custom-subdomain  # Optional, requires paid plan

# Application URLs
VITE_API_URL=  # Empty for relative URLs
VITE_NGROK_URL=https://your-ngrok-url.ngrok-free.dev
```

## Monitoring and Logs

### Backend Logs
- Check Flask console for API requests
- Monitor WebSocket connections
- Watch for authentication errors

### Frontend Logs
- Check browser console for errors
- Monitor network tab for failed requests
- Verify API calls are using correct URLs

### ngrok Logs
- Monitor ngrok dashboard at https://dashboard.ngrok.com/
- Check for connection limits
- Monitor bandwidth usage

## Advanced Configuration

### Custom Subdomain (Paid Plan)
```bash
ngrok http 5173 --subdomain=your-custom-name
```

### Multiple Tunnels
```bash
# Backend tunnel
ngrok http 8000 --subdomain=ideaflow-api

# Frontend tunnel  
ngrok http 5173 --subdomain=ideaflow-app
```

### Authentication
```bash
# Add basic auth to ngrok tunnel
ngrok http 5173 --basic-auth="username:password"
```

## Conclusion

ngrok is essential for testing IdeaFlow with external users. The main issues we encountered were:
1. Multiple processes running simultaneously
2. Vite host blocking
3. Frontend-backend connection problems
4. Mixed content security issues

All these issues were resolved by:
- Proper process management
- Vite configuration updates
- Using relative URLs for API calls
- Adding ngrok domains to allowed hosts

Follow this guide for a smooth ngrok setup experience!
