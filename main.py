#!/usr/bin/env python3
"""
Main entry point for IdeaFlow deployment
This file ensures the deployment system recognizes this as a Flask application
"""

import os
import sys
import subprocess
from pathlib import Path

def build_react_if_needed():
    """Build React app if dist folder doesn't exist"""
    react_build = Path('ideaflow-react/dist')
    
    if not react_build.exists():
        print("Building React application for deployment...")
        try:
            subprocess.run(['npm', 'install'], cwd='ideaflow-react', check=True, capture_output=True)
            subprocess.run(['npm', 'run', 'build:prod'], cwd='ideaflow-react', check=True, capture_output=True)
            print("React build completed successfully.")
        except subprocess.CalledProcessError as e:
            print(f"React build failed: {e}")
        except FileNotFoundError:
            print("npm not found - continuing without React build")

# Set production environment
os.environ['FLASK_ENV'] = 'production'
os.environ['PORT'] = str(os.environ.get('PORT', 5000))

# Build React app if needed
build_react_if_needed()

# Import and run the Flask application
from api_server import app, socketio

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    print(f"Starting IdeaFlow on port {port}")
    
    # Run the Flask app with SocketIO
    socketio.run(
        app, 
        host='0.0.0.0', 
        port=port, 
        debug=False, 
        use_reloader=False,
        allow_unsafe_werkzeug=True
    )