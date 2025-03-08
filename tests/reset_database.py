"""
Script to delete the tables and reset the database.
This will delete all data in the crawl_pages and crawl_sites tables.
"""

import os
import psycopg2
from dotenv import load_dotenv
from rich.console import Console
from rich.prompt import Confirm

# Add parent directory to path so we can import utils
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from utils import print_header, print_success, print_error, print_warning, print_info
from db_setup import db_params  # Import the db_params from db_setup.py

# Load environment variables
load_dotenv()

# Create console for rich output
console = Console()

def reset_database():
    """Delete the tables and reset the database."""
    # Confirm with the user
    if not Confirm.ask("[bold red]WARNING: This will delete all data in the crawl_pages and crawl_sites tables. Continue?[/bold red]"):
        print_warning("Operation cancelled.")
        return
    
    conn = None
    try:
        # Connect to the database
        print_header("Connecting to the PostgreSQL database...")
        conn = psycopg2.connect(**db_params)
        
        # Create a cursor
        cur = conn.cursor()
        
        # Delete all data from the tables
        print_header("Deleting all data from the tables...")
        
        # First delete from crawl_pages (child table)
        print_info("Deleting data from crawl_pages...")
        cur.execute("DELETE FROM crawl_pages")
        pages_deleted = cur.rowcount
        print_success(f"Deleted {pages_deleted} rows from crawl_pages.")
        
        # Then delete from crawl_sites (parent table)
        print_info("Deleting data from crawl_sites...")
        cur.execute("DELETE FROM crawl_sites")
        sites_deleted = cur.rowcount
        print_success(f"Deleted {sites_deleted} rows from crawl_sites.")
        
        # Commit the changes
        conn.commit()
        
        print_success("Database reset completed successfully!")
        
    except (Exception, psycopg2.DatabaseError) as error:
        if conn:
            conn.rollback()
        print_error(f"Error: {error}")
    finally:
        if conn is not None:
            conn.close()
            print_info("Database connection closed.")

def drop_and_recreate_tables():
    """Drop and recreate the tables."""
    # Confirm with the user
    if not Confirm.ask("[bold red]WARNING: This will drop and recreate all tables. All data will be lost. Continue?[/bold red]"):
        print_warning("Operation cancelled.")
        return
    
    conn = None
    try:
        # Connect to the database
        print_header("Connecting to the PostgreSQL database...")
        conn = psycopg2.connect(**db_params)
        
        # Create a cursor
        cur = conn.cursor()
        
        # Drop the tables
        print_header("Dropping tables...")
        
        # First drop crawl_pages (child table)
        print_info("Dropping crawl_pages table...")
        cur.execute("DROP TABLE IF EXISTS crawl_pages")
        
        # Then drop crawl_sites (parent table)
        print_info("Dropping crawl_sites table...")
        cur.execute("DROP TABLE IF EXISTS crawl_sites")
        
        # Commit the changes
        conn.commit()
        
        print_success("Tables dropped successfully!")
        
        # Now run the setup script to recreate the tables
        print_header("Recreating tables...")
        
        # Import the setup_database function from db_setup
        from db_setup import setup_database
        
        # Run the setup
        setup_database()
        
        print_success("Tables recreated successfully!")
        
    except (Exception, psycopg2.DatabaseError) as error:
        if conn:
            conn.rollback()
        print_error(f"Error: {error}")
    finally:
        if conn is not None:
            conn.close()
            print_info("Database connection closed.")

def main():
    """Main entry point for the script."""
    print_header("Database Reset Tool")
    
    print("\nChoose an option:")
    print("1. Delete all data (keep tables)")
    print("2. Drop and recreate tables")
    print("3. Cancel")
    
    choice = input("\nEnter your choice (1-3): ")
    
    if choice == "1":
        reset_database()
    elif choice == "2":
        drop_and_recreate_tables()
    else:
        print_warning("Operation cancelled.")

if __name__ == "__main__":
    main() 