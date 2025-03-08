"""
Script to test the database connection.
This script only tests the connection to the database and checks if the vector extension is installed.
It does NOT create any tables - use 'python main.py setup' for that.
"""

import os
import psycopg2
from dotenv import load_dotenv

# Add parent directory to path so we can import utils
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from utils import print_header, print_success, print_error, print_warning, print_info
from db_setup import db_params  # Import the db_params from db_setup.py

# Load environment variables
load_dotenv()

def test_connection():
    """Test the connection to the Supabase database."""
    conn = None
    try:
        # Connect to the database
        print_header("Connecting to the PostgreSQL database...")
        conn = psycopg2.connect(**db_params)
        
        # Create a cursor
        cur = conn.cursor()
        
        # Execute a test query
        print_info("Executing test query...")
        cur.execute("SELECT version();")
        
        # Fetch the result
        db_version = cur.fetchone()
        print_success(f"PostgreSQL database version: {db_version[0]}")
        
        # Check if the vector extension is available
        print_info("Checking for vector extension...")
        cur.execute("SELECT * FROM pg_extension WHERE extname = 'vector';")
        vector_ext = cur.fetchone()
        
        if vector_ext:
            print_success("Vector extension is installed.")
        else:
            print_warning("Vector extension is NOT installed. You need to run 'python main.py setup' first.")
        
        # Check if the tables exist
        print_info("Checking if the required tables exist...")
        cur.execute("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'crawl_sites');")
        sites_table_exists = cur.fetchone()[0]
        
        cur.execute("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'crawl_pages');")
        pages_table_exists = cur.fetchone()[0]
        
        if sites_table_exists and pages_table_exists:
            print_success("Required tables exist.")
        else:
            print_warning("Required tables do NOT exist. You need to run 'python main.py setup' to create them.")
        
        # Close the cursor
        cur.close()
        
        print_header("\nDatabase connection test completed successfully!")
        print_info("\nNOTE: This script only tests the connection and checks if tables exist.")
        print_info("To create the required tables and set up the database, run 'python main.py setup'.")
        
    except (Exception, psycopg2.DatabaseError) as error:
        print_error(f"Error: {error}")
    finally:
        if conn is not None:
            conn.close()
            print_info("Database connection closed.")

if __name__ == "__main__":
    test_connection() 