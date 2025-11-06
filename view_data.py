#!/usr/bin/env python3
"""
Data Viewer for IdeaFlow Database
Shows all data stored in your Neon PostgreSQL database
"""

import os
from sqlalchemy import create_engine, text
import pandas as pd

def connect_to_database():
    """Connect to the PostgreSQL database using local environment"""
    # Use the local Replit PostgreSQL database
    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        raise Exception("DATABASE_URL environment variable not set")
    
    database_urls = [database_url]
    
    for i, url in enumerate(database_urls):
        try:
            print(f"Trying database connection {i+1}...")
            engine = create_engine(url, pool_pre_ping=True)
            # Test the connection
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            print(f"✅ Connected to database {i+1}")
            return engine
        except Exception as e:
            print(f"❌ Database {i+1} failed: {e}")
            continue
    
    raise Exception("All database connections failed")

def view_table_data(engine, table_name, limit=50):
    """View data from a specific table"""
    try:
        with engine.connect() as conn:
            query = text(f"SELECT * FROM {table_name} ORDER BY created_at DESC LIMIT :limit")
            result = conn.execute(query, {"limit": limit})
            
            # Convert to pandas DataFrame for better display
            df = pd.DataFrame(result.fetchall(), columns=result.keys())
            
            print(f"\n📊 {table_name.upper()} TABLE ({len(df)} rows)")
            print("=" * 80)
            
            if df.empty:
                print("No data found in this table.")
            else:
                # Display with better formatting
                pd.set_option('display.max_columns', None)
                pd.set_option('display.width', None)
                pd.set_option('display.max_colwidth', 50)
                print(df.to_string(index=False))
                
    except Exception as e:
        print(f"Error viewing {table_name}: {e}")

def get_database_summary(engine):
    """Get a summary of all tables and their row counts"""
    try:
        with engine.connect() as conn:
            # Get all table names
            tables_query = text("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public'
                ORDER BY table_name
            """)
            tables = conn.execute(tables_query).fetchall()
            
            print("\n🗄️  DATABASE SUMMARY")
            print("=" * 50)
            
            for table in tables:
                table_name = table[0]
                count_query = text(f"SELECT COUNT(*) FROM {table_name}")
                count = conn.execute(count_query).scalar()
                print(f"{table_name:<25} {count:>10} rows")
                
    except Exception as e:
        print(f"Error getting database summary: {e}")

def main():
    """Main function to display all data"""
    print("🔍 IdeaFlow Database Viewer")
    print("Connecting to Neon PostgreSQL...")
    
    try:
        engine = connect_to_database()
        
        # Show database summary first
        get_database_summary(engine)
        
        # Main tables to display
        tables_to_show = [
            'users',
            'sessions', 
            'participants',
            'ideas',
            'votes',
            'themes'
        ]
        
        for table in tables_to_show:
            view_table_data(engine, table)
            
        print("\n" + "=" * 80)
        print("✅ Database viewer complete!")
        print("\nTo view specific data:")
        print("- Users: python view_data.py users")
        print("- Sessions: python view_data.py sessions")
        print("- Ideas: python view_data.py ideas")
        
    except Exception as e:
        print(f"Database connection failed: {e}")
        print("\nTroubleshooting:")
        print("1. Check your internet connection")
        print("2. Verify DATABASE_URL environment variable")
        print("3. Ensure psycopg2-binary is installed: pip install psycopg2-binary")

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1:
        # View specific table
        table_name = sys.argv[1]
        engine = connect_to_database()
        view_table_data(engine, table_name, limit=100)
    else:
        # View all data
        main()