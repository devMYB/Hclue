#!/usr/bin/env python3
"""
Setup script for running IdeaFlow on your computer as a server
"""

import os
import sys
import subprocess
import socket
import platform

def get_local_ip():
    """Get the local IP address of this computer"""
    try:
        # Connect to a remote server to get local IP
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        local_ip = s.getsockname()[0]
        s.close()
        return local_ip
    except:
        return "localhost"

def check_ports():
    """Check if ports 8000 and 5000 are available"""
    ports = [8000, 5000]
    available = []
    
    for port in ports:
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            s.bind(('localhost', port))
            s.close()
            available.append(port)
        except:
            print(f"⚠️  Port {port} is already in use")
    
    return available

def create_startup_scripts():
    """Create startup scripts for easy server management"""
    
    # Windows batch file
    if platform.system() == "Windows":
        with open("start-server.bat", "w") as f:
            f.write("""@echo off
echo Starting IdeaFlow Server...
echo.

echo Starting Backend Server (Port 8000)...
start "IdeaFlow Backend" cmd /k "python api_server.py"

echo Waiting 3 seconds...
timeout /t 3 /nobreak > nul

echo Starting Frontend Server (Port 5000)...
start "IdeaFlow Frontend" cmd /k "cd ideaflow-react && npm run dev"

echo.
echo ✅ IdeaFlow Server Started!
echo.
echo 🌐 Access your application:
echo    Local: http://localhost:5000
echo    Network: http://{}:5000
echo.
echo Press any key to close this window...
pause > nul
""".format(get_local_ip()))
        
        print("✅ Created start-server.bat")
    
    # Linux/Mac shell script
    with open("start-server.sh", "w") as f:
        f.write("""#!/bin/bash
echo "🚀 Starting IdeaFlow Server..."
echo ""

echo "🔧 Starting Backend Server (Port 8000)..."
python api_server.py &
BACKEND_PID=$!

echo "⏳ Waiting 3 seconds..."
sleep 3

echo "🎨 Starting Frontend Server (Port 5000)..."
cd ideaflow-react
npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅ IdeaFlow Server Started!"
echo ""
echo "🌐 Access your application:"
echo "   Local: http://localhost:5000"
echo "   Network: http://{}:5000"
echo ""
echo "📊 Process IDs:"
echo "   Backend: $BACKEND_PID"
echo "   Frontend: $FRONTEND_PID"
echo ""
echo "🛑 To stop the servers, press Ctrl+C"
echo ""

# Wait for user to stop
wait
""".format(get_local_ip()))
        
        os.chmod("start-server.sh", 0o755)
        print("✅ Created start-server.sh")

def create_environment_file():
    """Create environment configuration file"""
    env_content = """# IdeaFlow Environment Configuration
# Copy this to .env and update with your values

# Database Configuration
DATABASE_URL=sqlite:///ideaflow.db

# JWT Configuration
JWT_SECRET_KEY=your-super-secret-jwt-key-change-this-in-production

# Stripe Configuration (for payments)
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_stripe_webhook_secret

# Flask Configuration
FLASK_ENV=development
PORT=8000

# Frontend Configuration
VITE_API_URL=http://localhost:8000
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
"""
    
    with open("env.example", "w") as f:
        f.write(env_content)
    
    print("✅ Created env.example")

def check_dependencies():
    """Check if required dependencies are installed"""
    print("🔍 Checking dependencies...")
    
    # Check Python packages
    try:
        import flask
        import sqlalchemy
        import jwt
        print("✅ Python dependencies: OK")
    except ImportError as e:
        print(f"❌ Missing Python package: {e}")
        print("   Run: pip install -r python_requirements.txt")
        return False
    
    # Check Node.js and npm
    try:
        result = subprocess.run(["node", "--version"], capture_output=True, text=True)
        if result.returncode == 0:
            print("✅ Node.js: OK")
        else:
            print("❌ Node.js not found")
            return False
    except:
        print("❌ Node.js not found")
        return False
    
    try:
        result = subprocess.run(["npm", "--version"], capture_output=True, text=True)
        if result.returncode == 0:
            print("✅ npm: OK")
        else:
            print("❌ npm not found")
            return False
    except:
        print("❌ npm not found")
        return False
    
    return True

def main():
    print("🖥️  IdeaFlow Local Server Setup")
    print("=" * 40)
    
    # Check dependencies
    if not check_dependencies():
        print("\n❌ Please install missing dependencies first")
        return
    
    # Check ports
    available_ports = check_ports()
    if not available_ports:
        print("\n❌ No available ports found")
        return
    
    # Get local IP
    local_ip = get_local_ip()
    
    # Create startup scripts
    create_startup_scripts()
    
    # Create environment file
    create_environment_file()
    
    print("\n🎉 Setup Complete!")
    print("=" * 40)
    print(f"🌐 Your server will be accessible at:")
    print(f"   Local: http://localhost:5000")
    print(f"   Network: http://{local_ip}:5000")
    print()
    print("🚀 To start your server:")
    if platform.system() == "Windows":
        print("   Double-click: start-server.bat")
    else:
        print("   Run: ./start-server.sh")
    print()
    print("📝 Next steps:")
    print("   1. Copy env.example to .env")
    print("   2. Update .env with your configuration")
    print("   3. Start your server")
    print("   4. Open http://localhost:5000 in your browser")
    print()
    print("🔧 For internet access, see internet-access-setup.md")

if __name__ == "__main__":
    main()
