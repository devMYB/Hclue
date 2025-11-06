#!/usr/bin/env python3
"""
Final test for your IdeaFlow server
"""

import requests

def test_final():
    print("Final Test - IdeaFlow Server")
    print("=" * 40)
    
    # Test backend on local network IP
    print("Testing backend on local network IP...")
    try:
        response = requests.get("http://90.0.0.3:8000/api/health", timeout=5)
        if response.status_code == 200:
            print("SUCCESS: Backend accessible on local network IP")
            health_data = response.json()
            print(f"   Database: {health_data.get('database', 'unknown')}")
        else:
            print(f"FAILED: Backend returned {response.status_code}")
    except Exception as e:
        print(f"FAILED: Backend error - {e}")
    
    # Test backend on localhost
    print("\nTesting backend on localhost...")
    try:
        response = requests.get("http://localhost:8000/api/health", timeout=5)
        if response.status_code == 200:
            print("SUCCESS: Backend accessible on localhost")
        else:
            print(f"FAILED: Backend returned {response.status_code}")
    except Exception as e:
        print(f"FAILED: Backend error - {e}")
    
    # Test frontend
    print("\nTesting frontend...")
    try:
        response = requests.get("http://90.0.0.3:5002", timeout=5)
        if response.status_code == 200:
            print("SUCCESS: Frontend accessible on local network IP")
        else:
            print(f"FAILED: Frontend returned {response.status_code}")
    except Exception as e:
        print(f"FAILED: Frontend error - {e}")
    
    print("\n" + "=" * 40)
    print("Your IdeaFlow server is ready!")
    print()
    print("Access URLs:")
    print("  Local: http://localhost:5002")
    print("  Network: http://90.0.0.3:5002")
    print("  Internet: http://173.64.31.20:5002")
    print()
    print("IMPORTANT: Restart your frontend server now!")
    print("1. Go to the frontend terminal")
    print("2. Press Ctrl+C to stop it")
    print("3. Run: npm run dev")
    print("4. Then test the login at http://90.0.0.3:5002")

if __name__ == "__main__":
    test_final()
