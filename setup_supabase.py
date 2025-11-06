#!/usr/bin/env python3
"""
Supabase Setup Script for IdeaFlow
Configures the application to use only Supabase PostgreSQL
"""

import os
import sys

def setup_supabase_environment():
    """Set up environment variables for Supabase-only configuration"""
    
    print("Setting up Supabase-only configuration...")
    
    # Supabase database connection
    database_url = "postgresql://postgres:Youranidiot54321@db.gtnrolsbynawoxjypmsc.supabase.co:5432/postgres"
    
    # Set environment variables
    os.environ['DATABASE_URL'] = database_url
    os.environ['JWT_SECRET_KEY'] = 'your-supabase-jwt-secret-key-change-in-production'
    os.environ['REDIS_URL'] = 'redis://localhost:6379'  # Optional
    
    print("Environment variables set:")
    print(f"   DATABASE_URL: {database_url[:50]}...")
    print(f"   JWT_SECRET_KEY: Set")
    print(f"   REDIS_URL: redis://localhost:6379")
    
    # Test database connection
    try:
        from utils.postgres_db_manager import PostgresDBManager
        db_manager = PostgresDBManager()
        
        if db_manager.engine:
            print("Supabase database connection successful!")
            return True
        else:
            print("Failed to connect to Supabase database")
            return False
            
    except Exception as e:
        print(f"Database connection error: {e}")
        return False

def create_frontend_env():
    """Create frontend environment file"""
    frontend_env_content = """# Supabase Frontend Configuration
VITE_API_URL=http://localhost:8000
VITE_SUPABASE_URL=https://gtnrolsbynawoxjypmsc.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0bnJvbHNieW5hd294anlwbXNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg0NTY1NzcsImV4cCI6MjA2NDAzMjU3N30.UmSt8PNv4jHJPycQbMdi6ZdqdebKOF6Kkiz06VP00g8
"""
    
    try:
        with open('ideaflow-react/.env.development', 'w') as f:
            f.write(frontend_env_content)
        print("Frontend environment file created: ideaflow-react/.env.development")
        return True
    except Exception as e:
        print(f"Failed to create frontend env file: {e}")
        return False

if __name__ == "__main__":
    print("IdeaFlow Supabase Setup")
    print("=" * 40)
    
    # Setup backend environment
    if setup_supabase_environment():
        print("\nBackend configured for Supabase!")
    else:
        print("\nBackend setup failed!")
        sys.exit(1)
    
    # Setup frontend environment
    if create_frontend_env():
        print("Frontend configured for Supabase!")
    else:
        print("Frontend setup failed!")
        sys.exit(1)
    
    print("\n" + "=" * 40)
    print("Supabase setup complete!")
    print("\nNext steps:")
    print("1. Start the backend: python api_server.py")
    print("2. Start the frontend: cd ideaflow-react && npm run dev")
    print("3. Access your database: https://supabase.com/dashboard/project/gtnrolsbynawoxjypmsc/database/tables")
    print("\nYour IdeaFlow app is now Supabase-powered!")
