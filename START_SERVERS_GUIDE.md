# Server Startup Guide

This guide explains how to start both the frontend and backend servers, along with ngrok tunnels for public access.

## Quick Start Commands

### 1. Start Frontend Server (React/Vite)

**Command:**
```powershell
cd ideaflow-react; Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm run dev"
```

**What it does:**
- Navigates to the `ideaflow-react` directory
- Opens a new PowerShell window that stays open (`-NoExit`)
- Runs `npm run dev` to start the Vite development server
- The frontend will be available at `http://localhost:5173`

**Alternative (if already in ideaflow-react directory):**
```powershell
npm run dev
```

### 2. Start Backend Server (Flask API)

**Command:**
```powershell
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; python api_server.py"
```

**What it does:**
- Opens a new PowerShell window that stays open (`-NoExit`)
- Changes to the current working directory (`cd '$PWD'`)
- Runs `python api_server.py` to start the Flask backend server
- The backend will be available at `http://localhost:8000`

**Alternative (from project root):**
```powershell
python api_server.py
```

### 3. Start ngrok Tunnel for Frontend

**Command:**
```powershell
Start-Process -FilePath "ngrok" -ArgumentList "http", "5173" -WindowStyle Normal
```

**What it does:**
- Starts an ngrok tunnel process in a visible window (`-WindowStyle Normal`)
- Creates a public HTTPS URL that forwards to `http://localhost:5173`
- Provides a public URL like `https://xxxxx.ngrok-free.dev`
- Opens ngrok web interface at `http://localhost:4040` for monitoring

**What ngrok does:**
- Creates a secure tunnel from the internet to your local server
- Allows external users to access your localhost application
- Free plan provides one tunnel at a time

### 4. Start ngrok Tunnel for Backend (Optional)

**Command:**
```powershell
Start-Process -FilePath "ngrok" -ArgumentList "http", "8000" -WindowStyle Normal
```

**What it does:**
- Starts another ngrok tunnel for the backend API server
- Creates a public HTTPS URL that forwards to `http://localhost:8000`
- **Note:** With ngrok free plan, you can typically only run one tunnel at a time
- **Alternative:** The frontend ngrok tunnel can proxy backend API calls through the Vite dev server

## Verification Commands

### Check if Frontend is Running

**Command:**
```powershell
netstat -ano | findstr ":5173"
```

**What it does:**
- Lists all network connections
- Filters for port 5173 (frontend port)
- If you see a line with `LISTENING`, the server is running

**Expected Output:**
```
TCP    0.0.0.0:5173           0.0.0.0:0              LISTENING       23144
```

### Check if Backend is Running

**Command:**
```powershell
netstat -ano | findstr ":8000"
```

**What it does:**
- Lists all network connections
- Filters for port 8000 (backend port)
- If you see a line with `LISTENING`, the server is running

**Expected Output:**
```
TCP    0.0.0.0:8000           0.0.0.0:0              LISTENING       12345
```

### Check ngrok Tunnel Status

**Command:**
```powershell
curl http://localhost:4040/api/tunnels 2>$null | ConvertFrom-Json | Select-Object -ExpandProperty tunnels | ForEach-Object { Write-Host "$($_.config.addr) -> $($_.public_url)" }
```

**What it does:**
- Queries the ngrok API on port 4040 (ngrok's web interface port)
- Retrieves all active tunnels
- Displays each tunnel's local address and public URL

**Expected Output:**
```
http://localhost:5173 -> https://nontemperamentally-supersarcastic-francesca.ngrok-free.dev
```

### Check All Server Status

**Command:**
```powershell
Write-Host "=== Server Status ==="; $frontend = netstat -ano | findstr ":5173" | findstr "LISTENING"; $backend = netstat -ano | findstr ":8000" | findstr "LISTENING"; if ($frontend) { Write-Host "✓ Frontend running on port 5173" } else { Write-Host "✗ Frontend NOT running" }; if ($backend) { Write-Host "✓ Backend running on port 8000" } else { Write-Host "✗ Backend NOT running" }
```

**What it does:**
- Checks both frontend (5173) and backend (8000) ports
- Displays a clear status message for each server
- Shows ✓ (checkmark) if running, ✗ (cross) if not running

## Complete Startup Sequence

Here's the recommended order to start everything:

### Step 1: Start Backend Server
```powershell
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; python api_server.py"
```
Wait 3-5 seconds for the backend to initialize.

### Step 2: Start Frontend Server
```powershell
cd ideaflow-react; Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm run dev"
```
Wait 5-10 seconds for the frontend to compile and start.

### Step 3: Start ngrok Tunnel
```powershell
Start-Process -FilePath "ngrok" -ArgumentList "http", "5173" -WindowStyle Normal
```
Wait 2-3 seconds for ngrok to establish the tunnel.

### Step 4: Verify Everything is Running
```powershell
netstat -ano | findstr ":5173"
netstat -ano | findstr ":8000"
```

## Troubleshooting

### Port Already in Use

If you get an error that a port is already in use:

**Kill process on port 5173:**
```powershell
$processId = (netstat -ano | findstr ":5173" | findstr "LISTENING").Split()[-1]; Stop-Process -Id $processId -Force
```

**Kill process on port 8000:**
```powershell
$processId = (netstat -ano | findstr ":8000" | findstr "LISTENING").Split()[-1]; Stop-Process -Id $processId -Force
```

### Stop All Servers

**Kill all Node.js processes (Frontend):**
```powershell
Stop-Process -Name "node" -Force -ErrorAction SilentlyContinue
```

**Kill all Python processes (Backend):**
```powershell
Stop-Process -Name "python" -Force -ErrorAction SilentlyContinue
Stop-Process -Name "python.exe" -Force -ErrorAction SilentlyContinue
```

**Kill ngrok:**
```powershell
Stop-Process -Name "ngrok" -Force -ErrorAction SilentlyContinue
```

### Check What's Using a Port

**Command:**
```powershell
netstat -ano | findstr ":5173"
```

Look at the last number (PID - Process ID), then:
```powershell
tasklist | findstr "12345"  # Replace 12345 with the PID from above
```

## Using the Batch Script

For convenience, you can use the provided batch script:

**Command:**
```powershell
.\start-with-ngrok.bat
```

**What it does:**
- Automatically starts backend server
- Automatically starts frontend server
- Automatically starts ngrok tunnel for frontend
- Automatically attempts to start ngrok tunnel for backend (may fail on free plan)
- Opens separate windows for each process

## Access URLs

### Local Access
- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:8000
- **Backend Health Check:** http://localhost:8000/api/health

### Public Access (via ngrok)
- **Frontend:** Check the ngrok window for the public URL (e.g., `https://xxxxx.ngrok-free.dev`)
- **Backend:** Usually not needed separately, as frontend proxies API calls

### Monitoring
- **ngrok Web Interface:** http://localhost:4040
  - Shows incoming requests
  - Displays tunnel status
  - Provides request replay functionality

## Important Notes

1. **Start Order:** Always start the backend before the frontend, as the frontend needs to connect to the backend API.

2. **ngrok Free Plan:** The free plan typically allows only one tunnel at a time. If you need multiple tunnels, consider upgrading or use a single frontend tunnel that proxies all traffic.

3. **Vite Proxy:** The frontend uses Vite's proxy configuration to forward `/api/*` requests to the backend. This means you only need the frontend ngrok tunnel for external access.

4. **Environment Variables:** Make sure you have:
   - `.env` file in the project root (backend)
   - `.env.development` file in `ideaflow-react` directory (frontend)
   - Or environment variables set in your system

5. **Database:** Ensure your database (SQLite or PostgreSQL) is accessible and initialized.

6. **Dependencies:** Make sure all dependencies are installed:
   - Backend: `pip install -r python_requirements.txt`
   - Frontend: `cd ideaflow-react && npm install`

## Command Breakdown

### PowerShell Start-Process

- `-FilePath`: The executable to run
- `-ArgumentList`: Arguments to pass to the executable
- `-WindowStyle Normal`: Opens a visible window (vs. hidden)

### Process Windows

- `-NoExit`: Keeps the PowerShell window open after the command completes
- `-Command`: The command(s) to execute

### netstat

- `-ano`: Show all connections with process IDs
- `| findstr`: Filter output (like `grep` in Linux)

### curl (PowerShell alias)

- In PowerShell, `curl` is an alias for `Invoke-WebRequest`
- `2>$null`: Redirects stderr to null (suppresses errors)
- `| ConvertFrom-Json`: Parses JSON response into PowerShell objects

