#!/usr/bin/env python3
"""
Simple test for your IdeaFlow server
"""

import requests

def test_server():
    print("Testing Your IdeaFlow Server")
    print("=" * 40)
    
    # Test backend
    print("Testing backend...")
    try:
        response = requests.get("http://localhost:8000/api/health", timeout=5)
        if response.status_code == 200:
            print("SUCCESS: Backend is running")
        else:
            print(f"FAILED: Backend returned {response.status_code}")
    except Exception as e:
        print(f"FAILED: Backend error - {e}")
    
    # Test frontend
    print("\nTesting frontend...")
    try:
        response = requests.get("http://localhost:5002", timeout=5)
        if response.status_code == 200:
            print("SUCCESS: Frontend is running")
        else:
            print(f"FAILED: Frontend returned {response.status_code}")
    except Exception as e:
        print(f"FAILED: Frontend error - {e}")
    
    print("\n" + "=" * 40)
    print("Your IdeaFlow server is ready!")
    print("Access URLs:")
    print("  Local: http://localhost:5002")
    print("  Network: http://90.0.0.3:5002")
    print("  Internet: http://173.64.31.20:5002")
    print("\nShare this URL with others:")
    print("  http://173.64.31.20:5002")

if __name__ == "__main__":
    test_server()
