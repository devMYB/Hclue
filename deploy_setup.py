#!/usr/bin/env python3
"""
Deployment setup script for IdeaFlow cloud environment
Automatically creates user accounts when deployed
"""

import requests
import json
import os
import time

def wait_for_api(base_url, max_attempts=30):
    """Wait for API to be available"""
    for attempt in range(max_attempts):
        try:
            response = requests.get(f"{base_url}/sessions", timeout=5)
            if response.status_code in [200, 405]:  # API is responding
                return True
        except:
            pass
        time.sleep(2)
        print(f"Waiting for API... (attempt {attempt + 1}/{max_attempts})")
    return False

def create_deployment_users():
    """Create essential users for the deployed application"""
    # Detect if we're in deployed environment
    base_url = "/api" if os.getenv('REPLIT_DEPLOYMENT') else "http://localhost:8000/api"
    
    # Wait for API to be ready
    if not wait_for_api(base_url):
        print("API not available, skipping user setup")
        return
    
    users = [
        {"username": "facilitator", "password": "password123", "display_name": "Demo Facilitator"},
        {"username": "facilitator2", "password": "password123", "display_name": "Facilitator 2"},
        {"username": "teamlead", "password": "password123", "display_name": "Team Lead"},
        {"username": "participant1", "password": "password123", "display_name": "Test Participant 1"},
        {"username": "participant2", "password": "password123", "display_name": "Test Participant 2"},
        {"username": "john", "password": "password123", "display_name": "John Doe"},
        {"username": "jane", "password": "password123", "display_name": "Jane Smith"},
    ]
    
    print("Setting up deployment user accounts...")
    
    for user in users:
        try:
            response = requests.post(f"{base_url}/users", 
                                   headers={"Content-Type": "application/json"},
                                   json=user,
                                   timeout=10)
            
            if response.status_code == 201:
                result = response.json()
                print(f"✓ Created user: {user['username']}")
            else:
                print(f"User {user['username']} may already exist")
                
        except Exception as e:
            print(f"Error creating {user['username']}: {e}")
    
    print("\nDeployment setup complete!")
    print("Login credentials:")
    print("- Facilitator: facilitator / password123")
    print("- Participant: participant1 / password123")

if __name__ == "__main__":
    create_deployment_users()