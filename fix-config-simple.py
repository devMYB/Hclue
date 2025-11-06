#!/usr/bin/env python3
"""
Fix frontend configuration to use correct local IP
"""

def create_frontend_env():
    """Create .env.development file for frontend with correct IP"""
    
    # Your local network IP
    local_ip = "90.0.0.3"
    
    env_content = f"""# IdeaFlow Frontend Environment Configuration
# Local Network IP: {local_ip}
# Public IP: 173.64.31.20

# API Configuration - Use local network IP for better performance
VITE_API_URL=http://{local_ip}:8000

# Supabase Configuration (if using)
VITE_SUPABASE_URL=https://gtnrolsbynawoxjypmsc.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0bnJvbHNieW5hd294anlwbXNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg0NTY1NzcsImV4cCI6MjA2NDAzMjU3N30.UmSt8PNv4jHJPycQbMdi6ZdqdebKOF6Kkiz06VP00g8
"""
    
    # Create the file in the frontend directory
    frontend_env_path = "ideaflow-react/.env.development"
    
    try:
        with open(frontend_env_path, 'w') as f:
            f.write(env_content)
        print(f"SUCCESS: Created {frontend_env_path}")
        print(f"   API URL: http://{local_ip}:8000")
        return True
    except Exception as e:
        print(f"ERROR: Could not create {frontend_env_path}: {e}")
        return False

def update_api_service():
    """Update the API service to use the correct IP"""
    
    api_file = "ideaflow-react/src/services/api.ts"
    local_ip = "90.0.0.3"
    
    try:
        with open(api_file, 'r') as f:
            content = f.read()
        
        # Replace the localhost URL with the local IP
        old_url = "http://localhost:8000"
        new_url = f"http://{local_ip}:8000"
        
        if old_url in content:
            content = content.replace(old_url, new_url)
            
            with open(api_file, 'w') as f:
                f.write(content)
            print(f"SUCCESS: Updated {api_file}")
            print(f"   Changed API URL to: {new_url}")
            return True
        else:
            print(f"INFO: {api_file} already uses correct URL or uses environment variable")
            return True
            
    except Exception as e:
        print(f"ERROR: Could not update {api_file}: {e}")
        return False

def update_auth_context():
    """Update the AuthContext to use the correct IP"""
    
    auth_file = "ideaflow-react/src/contexts/AuthContext.tsx"
    local_ip = "90.0.0.3"
    
    try:
        with open(auth_file, 'r') as f:
            content = f.read()
        
        # Replace the localhost URL with the local IP
        old_url = "http://localhost:8000"
        new_url = f"http://{local_ip}:8000"
        
        if old_url in content:
            content = content.replace(old_url, new_url)
            
            with open(auth_file, 'w') as f:
                f.write(content)
            print(f"SUCCESS: Updated {auth_file}")
            print(f"   Changed API URL to: {new_url}")
            return True
        else:
            print(f"INFO: {auth_file} already uses correct URL or uses environment variable")
            return True
            
    except Exception as e:
        print(f"ERROR: Could not update {auth_file}: {e}")
        return False

def main():
    print("Fixing Frontend Configuration")
    print("=" * 40)
    print("Local Network IP: 90.0.0.3")
    print("Public IP: 173.64.31.20")
    print()
    
    # Create environment file
    create_frontend_env()
    
    # Update API service
    update_api_service()
    
    # Update Auth context
    update_auth_context()
    
    print()
    print("Configuration Updated!")
    print("=" * 40)
    print("Next steps:")
    print("1. Restart your frontend server (Ctrl+C and run npm run dev again)")
    print("2. Access your app at: http://90.0.0.3:5002")
    print("3. For internet access: http://173.64.31.20:5002")
    print()
    print("The frontend will now connect to the backend using your local network IP")

if __name__ == "__main__":
    main()
