#!/usr/bin/env python3
"""
IdeaFlow Download Package Creator
Creates a downloadable ZIP file with all necessary files
"""

import os
import zipfile
import shutil
from pathlib import Path

def create_download_package():
    """Create a downloadable package of IdeaFlow"""
    
    # Files and directories to include
    files_to_include = [
        'api_server.py',
        'main.py',
        'README.md',
        'utils/',
        'ideaflow-react/dist/',
        'ideaflow-react/package.json',
        'ideaflow-react/package-lock.json'
    ]
    
    # Create package directory
    package_dir = 'ideaflow_package'
    if os.path.exists(package_dir):
        shutil.rmtree(package_dir)
    os.makedirs(package_dir)
    
    print("Creating IdeaFlow download package...")
    
    # Copy files
    for file_path in files_to_include:
        src = Path(file_path)
        if src.exists():
            dst = Path(package_dir) / src
            if src.is_dir():
                shutil.copytree(src, dst, dirs_exist_ok=True)
                print(f"Copied directory: {src}")
            else:
                dst.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(src, dst)
                print(f"Copied file: {src}")
        else:
            print(f"Warning: {src} not found")
    
    # Create requirements.txt
    requirements = """flask==3.0.0
flask-cors==4.0.0
flask-socketio==5.3.6
numpy==1.26.2
pandas==2.1.4
plotly==5.17.0
psycopg2-binary==2.9.9
requests==2.31.0
scikit-learn==1.3.2
spacy==3.7.2
sqlalchemy==2.0.23
websockets==12.0
python-socketio==5.10.0"""
    
    with open(f'{package_dir}/requirements.txt', 'w') as f:
        f.write(requirements)
    print("Created requirements.txt")
    
    # Create startup script
    startup_script = """#!/bin/bash
# IdeaFlow Startup Script

echo "Starting IdeaFlow Collaborative Ideation Platform..."

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install dependencies
echo "Installing Python dependencies..."
pip install -r requirements.txt

# Download spaCy model
echo "Downloading spaCy English model..."
python -m spacy download en_core_web_sm

# Set database URL if not set
if [ -z "$DATABASE_URL" ]; then
    echo "Warning: DATABASE_URL not set. Please set your PostgreSQL connection string:"
    echo "export DATABASE_URL='postgresql://username:password@host:port/database'"
    echo ""
    echo "For development, you can use SQLite (not recommended for production):"
    echo "export DATABASE_URL='sqlite:///ideaflow.db'"
fi

# Start the application
echo "Starting IdeaFlow on http://localhost:5000"
python main.py
"""
    
    with open(f'{package_dir}/start.sh', 'w') as f:
        f.write(startup_script)
    os.chmod(f'{package_dir}/start.sh', 0o755)
    print("Created start.sh")
    
    # Create Windows batch file
    windows_script = """@echo off
REM IdeaFlow Startup Script for Windows

echo Starting IdeaFlow Collaborative Ideation Platform...

REM Check if virtual environment exists
if not exist "venv" (
    echo Creating virtual environment...
    python -m venv venv
)

REM Activate virtual environment
call venv\\Scripts\\activate.bat

REM Install dependencies
echo Installing Python dependencies...
pip install -r requirements.txt

REM Download spaCy model
echo Downloading spaCy English model...
python -m spacy download en_core_web_sm

REM Check database URL
if "%DATABASE_URL%"=="" (
    echo Warning: DATABASE_URL not set. Please set your PostgreSQL connection string:
    echo set DATABASE_URL=postgresql://username:password@host:port/database
    echo.
    echo For development, you can use SQLite (not recommended for production):
    echo set DATABASE_URL=sqlite:///ideaflow.db
)

REM Start the application
echo Starting IdeaFlow on http://localhost:5000
python main.py

pause
"""
    
    with open(f'{package_dir}/start.bat', 'w') as f:
        f.write(windows_script)
    print("Created start.bat")
    
    # Create ZIP file
    zip_name = 'ideaflow_collaborative_platform.zip'
    with zipfile.ZipFile(zip_name, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(package_dir):
            for file in files:
                file_path = os.path.join(root, file)
                arc_name = os.path.relpath(file_path, package_dir)
                zipf.write(file_path, arc_name)
    
    # Cleanup
    shutil.rmtree(package_dir)
    
    print(f"\n✓ Successfully created {zip_name}")
    print(f"✓ Package size: {os.path.getsize(zip_name) / 1024 / 1024:.1f} MB")
    print("\nPackage contents:")
    print("- Complete React frontend (built)")
    print("- Flask API server")
    print("- Database utilities")
    print("- AI processing modules")
    print("- Setup scripts for Windows/Linux/Mac")
    print("- Complete documentation")
    
    return zip_name

if __name__ == "__main__":
    create_download_package()