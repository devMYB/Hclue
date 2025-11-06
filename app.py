#!/usr/bin/env python3
"""
IdeaFlow React Application Entry Point
Serves the React frontend with Flask backend
Works with both direct execution and streamlit command
"""

import os
import sys
import subprocess
from pathlib import Path

def main():
    """Main application entry point - optimized for fast deployment startup"""
    # Set production environment
    os.environ['FLASK_ENV'] = 'production'
    os.environ['PORT'] = str(os.environ.get('PORT', 5000))
    
    # Import and start the Flask server immediately
    from api_server import app, socketio
    
    print("Starting IdeaFlow Application...")
    port = int(os.environ.get('PORT', 5000))
    
    # Start Flask app immediately to open port quickly for deployment
    print(f"Server binding to 0.0.0.0:{port}")
    socketio.run(app, host='0.0.0.0', port=port, debug=False, use_reloader=False, 
                 allow_unsafe_werkzeug=True)

# Handle both direct execution and streamlit execution
if __name__ == '__main__':
    # Check if being run via streamlit (streamlit passes additional arguments)
    if len(sys.argv) > 1 and ('run' in sys.argv or '--server.port' in ' '.join(sys.argv)):
        print("Detected streamlit execution - redirecting to Flask app")
    
    main()