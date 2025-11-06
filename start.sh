#!/bin/bash

# IdeaFlow Project Startup Script
echo "🚀 Starting IdeaFlow Collaborative Ideation Platform..."

# Set environment variables
# DATABASE_URL will be automatically set by Replit environment
export STRIPE_SECRET_KEY="sk_test_your_stripe_secret_key_here"

echo "✅ Environment variables configured"

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check Python
if command_exists python3; then
    PYTHON_CMD="python3"
elif command_exists python; then
    PYTHON_CMD="python"
else
    echo "❌ Python not found. Please install Python 3.11 or higher."
    exit 1
fi

# Check Node.js
if ! command_exists node; then
    echo "❌ Node.js not found. Please install Node.js 20 or higher."
    exit 1
fi

# Check NPM
if ! command_exists npm; then
    echo "❌ NPM not found. Please install NPM."
    exit 1
fi

echo "✅ Prerequisites check passed"

# Install Python dependencies
echo "📦 Installing Python dependencies..."
if [ -f "python_requirements.txt" ]; then
    $PYTHON_CMD -m pip install -r python_requirements.txt
elif [ -f "requirements.txt" ]; then
    $PYTHON_CMD -m pip install -r requirements.txt
else
    echo "Installing packages manually..."
    $PYTHON_CMD -m pip install flask flask-cors flask-socketio psycopg2-binary sqlalchemy stripe requests python-socketio python-engineio werkzeug numpy pandas scikit-learn spacy plotly
fi

# Install Node.js dependencies
echo "📦 Installing Node.js dependencies..."
cd ideaflow-react
npm install
cd ..

echo "✅ Dependencies installed"

# Start the servers
echo "🔥 Starting servers..."

# Kill any existing processes on these ports
echo "🧹 Cleaning up existing processes..."
lsof -ti:8000 | xargs kill -9 2>/dev/null || true
lsof -ti:5000 | xargs kill -9 2>/dev/null || true

sleep 2

# Start API server in background
echo "🌐 Starting API server on http://localhost:8000..."
$PYTHON_CMD api_server.py &
API_PID=$!

# Wait for API server to be ready
sleep 5

# Start React frontend
echo "⚛️ Starting React frontend on http://localhost:5000..."
cd ideaflow-react
npm run dev -- --host 0.0.0.0 --port 5000 &
REACT_PID=$!

cd ..

echo ""
echo "🎉 IdeaFlow is now running!"
echo ""
echo "📱 Frontend: http://localhost:5000"
echo "🔌 API: http://localhost:8000"
echo ""
echo "👤 Demo Accounts:"
echo "   Facilitator: facilitator / password123"
echo "   Participant: participant1 / password123"
echo ""
echo "💳 Test Stripe Cards:"
echo "   Visa: 4242 4242 4242 4242"
echo "   Mastercard: 5555 5555 5555 4444"
echo ""
echo "Press Ctrl+C to stop all servers"

# Wait for user to stop
trap "echo '🛑 Stopping servers...'; kill $API_PID $REACT_PID 2>/dev/null; exit" INT

# Keep script running
wait