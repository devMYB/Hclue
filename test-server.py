#!/usr/bin/env python3
"""
Test your IdeaFlow server setup
"""

import requests
import time
import socket

def test_server_setup():
    print("🧪 Testing Your IdeaFlow Server Setup")
    print("=" * 50)
    
    your_ip = "173.64.31.20"
    backend_url = f"http://{your_ip}:8000"
    frontend_url = f"http://{your_ip}:5000"
    
    print(f"🌐 Your Server IP: {your_ip}")
    print(f"🔧 Backend URL: {backend_url}")
    print(f"🎨 Frontend URL: {frontend_url}")
    print()
    
    # Test 1: Check if ports are open
    print("1️⃣ Testing port availability...")
    ports = [8000, 5000]
    for port in ports:
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(1)
            result = sock.connect_ex((your_ip, port))
            sock.close()
            if result == 0:
                print(f"   ✅ Port {port}: Open")
            else:
                print(f"   ❌ Port {port}: Closed or filtered")
        except Exception as e:
            print(f"   ❌ Port {port}: Error - {e}")
    
    print()
    
    # Test 2: Check backend health
    print("2️⃣ Testing backend health...")
    try:
        response = requests.get(f"{backend_url}/api/health", timeout=5)
        if response.status_code == 200:
            print(f"   ✅ Backend: Healthy ({response.status_code})")
            health_data = response.json()
            print(f"   📊 Database: {health_data.get('database', 'unknown')}")
        else:
            print(f"   ❌ Backend: Unhealthy ({response.status_code})")
    except requests.exceptions.ConnectionError:
        print("   ❌ Backend: Connection refused (server not running?)")
    except requests.exceptions.Timeout:
        print("   ❌ Backend: Timeout (firewall blocking?)")
    except Exception as e:
        print(f"   ❌ Backend: Error - {e}")
    
    print()
    
    # Test 3: Check frontend
    print("3️⃣ Testing frontend...")
    try:
        response = requests.get(frontend_url, timeout=5)
        if response.status_code == 200:
            print(f"   ✅ Frontend: Accessible ({response.status_code})")
        else:
            print(f"   ❌ Frontend: Error ({response.status_code})")
    except requests.exceptions.ConnectionError:
        print("   ❌ Frontend: Connection refused (server not running?)")
    except requests.exceptions.Timeout:
        print("   ❌ Frontend: Timeout (firewall blocking?)")
    except Exception as e:
        print(f"   ❌ Frontend: Error - {e}")
    
    print()
    
    # Test 4: Test registration endpoint
    print("4️⃣ Testing registration endpoint...")
    try:
        test_data = {
            'username': f'test_{int(time.time())}',
            'password': 'testpass123',
            'display_name': 'Test User'
        }
        response = requests.post(f"{backend_url}/api/auth/register", json=test_data, timeout=5)
        if response.status_code == 201:
            print("   ✅ Registration: Working")
        else:
            print(f"   ❌ Registration: Failed ({response.status_code})")
    except Exception as e:
        print(f"   ❌ Registration: Error - {e}")
    
    print()
    print("🎯 Summary")
    print("=" * 50)
    print(f"🌐 Your IdeaFlow server should be accessible at:")
    print(f"   {frontend_url}")
    print()
    print("📱 Share this URL with others:")
    print(f"   {frontend_url}")
    print()
    print("🔧 If tests failed:")
    print("   1. Make sure both servers are running")
    print("   2. Check Windows Firewall settings")
    print("   3. Check router port forwarding")
    print("   4. Try accessing from the same computer first")

if __name__ == "__main__":
    test_server_setup()
