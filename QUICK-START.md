# 🚀 Quick Start: Your IdeaFlow Server

## Your Server Details
- **Your IP**: 173.64.31.20
- **Public URL**: http://173.64.31.20:5000

## Step 1: Start Your Server

### Option A: Use the Batch File (Easiest)
```bash
# Double-click this file:
start-server.bat
```

### Option B: Manual Start
```bash
# Terminal 1: Start Backend
python api_server.py

# Terminal 2: Start Frontend
cd ideaflow-react
npm run dev
```

## Step 2: Test Your Server
```bash
# Run the test script
python test-server.py
```

## Step 3: Access Your Application

### Local Access (Same Computer)
- **URL**: http://localhost:5000
- **Login**: facilitator / password123

### Network Access (Same WiFi)
- **URL**: http://173.64.31.20:5000
- **Login**: facilitator / password123

### Internet Access (Anyone)
- **URL**: http://173.64.31.20:5000
- **Login**: facilitator / password123

## Step 4: Share with Others

### For People on Your Network
- Share: http://173.64.31.20:5000
- They can access immediately

### For People on the Internet
- Share: http://173.64.31.20:5000
- Requires router port forwarding (see server-config.md)

## Step 5: Create Environment Files

### Frontend (.env.development)
Create `ideaflow-react/.env.development`:
```
VITE_API_URL=http://173.64.31.20:8000
```

### Backend (.env)
Create `.env` in root directory:
```
DATABASE_URL=sqlite:///ideaflow.db
JWT_SECRET_KEY=your-super-secret-jwt-key
STRIPE_SECRET_KEY=sk_test_your_stripe_key
FLASK_ENV=development
PORT=8000
```

## Troubleshooting

### Can't Access from Other Devices
1. ✅ Both servers running?
2. ✅ Windows Firewall allows Python?
3. ✅ Router allows ports 8000/5000?

### Port Already in Use
1. Stop other applications using ports 8000/5000
2. Or change ports in configuration

### Connection Refused
1. Check if servers are actually running
2. Verify IP address is correct
3. Check firewall settings

## Security Notes

### For Local Network Only
- ✅ Safe and private
- ✅ Fast access
- ✅ No internet required

### For Internet Access
- ⚠️ Anyone with URL can access
- ⚠️ Configure firewall properly
- ⚠️ Consider HTTPS for production

## Next Steps

1. **Test locally**: http://localhost:5000
2. **Test network**: http://173.64.31.20:5000
3. **Share URL**: http://173.64.31.20:5000
4. **Configure router**: For internet access (optional)

## Demo Accounts
- **Facilitator**: facilitator / password123
- **Participant**: participant1 / password123

Your IdeaFlow server is ready! 🎉
