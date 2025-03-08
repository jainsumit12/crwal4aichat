"""
Script to migrate the database schema to support content chunking.
"""

import os
import sys
import psycopg2
from dotenv import load_dotenv

# Add the parent directory to the path so we can import from the parent module
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from db_setup import get_db_params

# Load environment variables
load_dotenv()

def migrate_database():
    """Migrate the database schema to support content chunking."""
    # Get database connection parameters
    db_params = get_db_params()
    
    # Connect to the database
    conn = psycopg2.connect(**db_params)
    
    try:
        with conn.cursor() as cur:
            print("Checking if migration is needed...")
            
            # Check if the is_chunk column already exists
            cur.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'crawl_pages' AND column_name = 'is_chunk'
            """)
            
            if cur.fetchone():
                print("Migration already applied. The 'is_chunk' column already exists.")
                return
            
            print("Starting migration...")
            
            # Add new columns for chunking support
            print("Adding new columns for chunking support...")
            cur.execute("""
            ALTER TABLE crawl_pages 
            ADD COLUMN IF NOT EXISTS is_chunk BOOLEAN DEFAULT FALSE,
            ADD COLUMN IF NOT EXISTS chunk_index INTEGER,
            ADD COLUMN IF NOT EXISTS parent_id INTEGER REFERENCES crawl_pages(id) ON DELETE CASCADE,
            ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            """)
            
            # Add updated_at column to sites table if it doesn't exist
            cur.execute("""
            ALTER TABLE crawl_sites
            ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            """)
            
            # Create indexes for better performance
            print("Creating indexes...")
            cur.execute("CREATE INDEX IF NOT EXISTS idx_pages_parent_id ON crawl_pages(parent_id)")
            cur.execute("CREATE INDEX IF NOT EXISTS idx_pages_is_chunk ON crawl_pages(is_chunk)")
            
            # Create a function to update the updated_at timestamp
            print("Creating update_updated_at_column function...")
            cur.execute("""
            CREATE OR REPLACE FUNCTION update_updated_at_column()
            RETURNS TRIGGER AS $$
            BEGIN
                NEW.updated_at = CURRENT_TIMESTAMP;
                RETURN NEW;
            END;
            $$ language 'plpgsql'
            """)
            
            # Create triggers to update the updated_at column
            print("Creating triggers...")
            cur.execute("""
            DROP TRIGGER IF EXISTS update_sites_updated_at ON crawl_sites;
            CREATE TRIGGER update_sites_updated_at
            BEFORE UPDATE ON crawl_sites
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column()
            """)
            
            cur.execute("""
            DROP TRIGGER IF EXISTS update_pages_updated_at ON crawl_pages;
            CREATE TRIGGER update_pages_updated_at
            BEFORE UPDATE ON crawl_pages
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column()
            """)
            
            # Remove the UNIQUE constraint on url if it exists
            print("Removing UNIQUE constraint on url...")
            try:
                cur.execute("""
                ALTER TABLE crawl_pages DROP CONSTRAINT IF EXISTS crawl_pages_url_key
                """)
            except psycopg2.Error as e:
                print(f"Note: Could not drop UNIQUE constraint: {e}")
            
            conn.commit()
            print("Migration completed successfully!")
            
    except Exception as e:
        conn.rollback()
        print(f"Error during migration: {e}")
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    migrate_database() 