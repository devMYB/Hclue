#!/usr/bin/env python3
"""
Setup script to create essential user accounts for deployment
"""

import requests
import json

def create_deployment_users():
    """Create essential users for the deployed application"""
    base_url = "http://localhost:8000/api"
    
    users = [
        {"username": "facilitator", "password": "password123", "display_name": "Demo Facilitator"},
        {"username": "facilitator2", "password": "password123", "display_name": "Facilitator 2"},
        {"username": "teamlead", "password": "password123", "display_name": "Team Lead"},
        {"username": "participant1", "password": "password123", "display_name": "Test Participant 1"},
        {"username": "participant2", "password": "password123", "display_name": "Test Participant 2"},
        {"username": "john", "password": "password123", "display_name": "John Doe"},
        {"username": "jane", "password": "password123", "display_name": "Jane Smith"},
    ]
    
    print("Creating deployment user accounts...")
    
    for user in users:
        try:
            response = requests.post(f"{base_url}/users", 
                                   headers={"Content-Type": "application/json"},
                                   json=user,
                                   timeout=10)
            
            if response.status_code == 201:
                result = response.json()
                print(f"✓ Created user: {user['username']} (ID: {result.get('id', 'N/A')})")
            else:
                print(f"✗ Failed to create {user['username']}: {response.text}")
                
        except Exception as e:
            print(f"✗ Error creating {user['username']}: {e}")
    
    print("\nUser account setup complete!")
    print("\nDemo login credentials:")
    print("Facilitator access: facilitator / password123")
    print("Participant access: participant1 / password123")

if __name__ == "__main__":
    create_deployment_users()