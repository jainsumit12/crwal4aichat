#!/usr/bin/env python3
"""
Script to check and fix embeddings in the database.
This script will:
1. Check if the pgvector extension is installed
2. Check the embedding column type
3. Verify existing embeddings
4. Fix any issues with the embeddings
"""

import os
import sys
import json
import psycopg2
from dotenv import load_dotenv
from typing import List, Dict, Any, Optional
from urllib.parse import urlparse

# Load environment variables
load_dotenv()

# ANSI color codes for terminal output
class Colors:
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'

def print_header(message: str):
    """Print a header message."""
    print(f"{Colors.HEADER}{Colors.BOLD}{message}{Colors.ENDC}")

def print_info(message: str):
    """Print an info message."""
    print(f"{Colors.BLUE}[INFO] {message}{Colors.ENDC}")

def print_success(message: str):
    """Print a success message."""
    print(f"{Colors.GREEN}[SUCCESS] {message}{Colors.ENDC}")

def print_warning(message: str):
    """Print a warning message."""
    print(f"{Colors.YELLOW}[WARNING] {message}{Colors.ENDC}")

def print_error(message: str):
    """Print an error message."""
    print(f"{Colors.RED}[ERROR] {message}{Colors.ENDC}")

def get_connection():
    """Get a connection to the database."""
    try:
        # Check if a full URL is provided
        supabase_url = os.getenv('SUPABASE_URL')
        
        if not supabase_url:
            print_error("SUPABASE_URL environment variable not set")
            sys.exit(1)
        
        # Parse the connection parameters
        if supabase_url.startswith('http://') or supabase_url.startswith('https://'):
            parsed_url = urlparse(supabase_url)
            host = parsed_url.hostname
            port = parsed_url.port or 5432  # Default PostgreSQL port
        else:
            # Handle case where URL is just host:port without protocol
            parts = supabase_url.split(':')
            host = parts[0]
            port = int(parts[1]) if len(parts) > 1 else 5432
        
        # Get other connection parameters
        database = os.getenv('SUPABASE_DB', 'postgres')
        user = os.getenv('SUPABASE_USER', 'postgres')
        password = os.getenv('SUPABASE_KEY', '')
        
        if not password:
            password = os.getenv('SUPABASE_PASSWORD', '')
        
        print_info(f"Connecting to database at {host}:{port}")
        
        # Connect to the database
        conn = psycopg2.connect(
            host=host,
            port=port,
            dbname=database,
            user=user,
            password=password
        )
        
        return conn
    except Exception as e:
        print_error(f"Error connecting to database: {e}")
        sys.exit(1)

def check_pgvector_extension():
    """Check if the pgvector extension is installed."""
    conn = None
    try:
        conn = get_connection()
        cur = conn.cursor()
        
        # Check if pgvector extension is installed
        cur.execute("SELECT extname FROM pg_extension WHERE extname = 'vector'")
        result = cur.fetchone()
        
        if result:
            print_success("pgvector extension is installed")
            return True
        else:
            print_error("pgvector extension is NOT installed")
            print_info("To install pgvector, run: CREATE EXTENSION vector;")
            return False
    except Exception as e:
        print_error(f"Error checking pgvector extension: {e}")
        return False
    finally:
        if conn:
            conn.close()

def check_embedding_column():
    """Check the embedding column type."""
    conn = None
    try:
        conn = get_connection()
        cur = conn.cursor()
        
        # Check the embedding column type
        cur.execute("""
            SELECT column_name, data_type, udt_name 
            FROM information_schema.columns 
            WHERE table_name = 'crawl_pages' AND column_name = 'embedding'
        """)
        result = cur.fetchone()
        
        if result:
            column_name, data_type, udt_name = result
            print_info(f"Embedding column: {column_name}, Type: {data_type}, UDT: {udt_name}")
            
            # Check if the column is of vector type
            if data_type == 'USER-DEFINED' and udt_name == 'vector':
                print_success("Embedding column is correctly defined as vector type")
                return True
            else:
                print_warning(f"Embedding column is not of vector type: {data_type}, {udt_name}")
                return False
        else:
            print_error("Embedding column not found in crawl_pages table")
            return False
    except Exception as e:
        print_error(f"Error checking embedding column: {e}")
        return False
    finally:
        if conn:
            conn.close()

def check_existing_embeddings():
    """Check existing embeddings in the database."""
    conn = None
    try:
        conn = get_connection()
        cur = conn.cursor()
        
        # Count total pages
        cur.execute("SELECT COUNT(*) FROM crawl_pages")
        total_pages = cur.fetchone()[0]
        print_info(f"Total pages in database: {total_pages}")
        
        # Count pages with embeddings
        cur.execute("SELECT COUNT(*) FROM crawl_pages WHERE embedding IS NOT NULL")
        pages_with_embeddings = cur.fetchone()[0]
        print_info(f"Pages with embeddings: {pages_with_embeddings}")
        
        # Check if any pages have embeddings
        if pages_with_embeddings == 0:
            print_warning("No pages have embeddings")
            return False
        
        # Try to get the type of the embedding column
        try:
            cur.execute("SELECT pg_typeof(embedding) FROM crawl_pages WHERE embedding IS NOT NULL LIMIT 1")
            embedding_type = cur.fetchone()[0]
            print_info(f"Embedding column type: {embedding_type}")
        except Exception as e:
            print_error(f"Error checking embedding type: {e}")
            
        # Try to get the dimension of the embeddings using vector-specific function
        try:
            # For pgvector, we can use the vector_dims function
            cur.execute("SELECT vector_dims(embedding) FROM crawl_pages WHERE embedding IS NOT NULL LIMIT 1")
            embedding_dim = cur.fetchone()[0]
            print_info(f"Embedding dimension: {embedding_dim}")
        except Exception as e:
            print_error(f"Error checking embedding dimension: {e}")
            print_info("This is expected if using an older version of pgvector. Trying alternative approach...")
            
            # Alternative approach: try to cast to text and check length
            try:
                cur.execute("SELECT length(embedding::text) FROM crawl_pages WHERE embedding IS NOT NULL LIMIT 1")
                embedding_text_length = cur.fetchone()[0]
                print_info(f"Embedding text representation length: {embedding_text_length}")
            except Exception as e2:
                print_error(f"Error with alternative dimension check: {e2}")
        
        # Try a simple vector operation to see if it works
        try:
            # Try a simple cosine similarity operation
            cur.execute("""
                SELECT 1 
                FROM crawl_pages 
                WHERE embedding IS NOT NULL 
                LIMIT 1
            """)
            print_success("Basic embedding query works")
            
            # Try a more complex vector operation
            try:
                # Get a sample page ID first
                cur.execute("SELECT id FROM crawl_pages WHERE embedding IS NOT NULL LIMIT 1")
                page_id = cur.fetchone()[0]
                
                # Use the page ID to perform a self-similarity check
                cur.execute("""
                    SELECT 1 - (p.embedding <=> p.embedding) as self_similarity
                    FROM crawl_pages p
                    WHERE p.id = %s
                """, (page_id,))
                similarity = cur.fetchone()[0]
                print_success(f"Vector similarity operation works (self-similarity: {similarity})")
            except Exception as e:
                print_error(f"Error with vector similarity operation: {e}")
                conn.rollback()  # Reset the transaction
        except Exception as e:
            print_error(f"Error with basic embedding query: {e}")
        
        return True
    except Exception as e:
        print_error(f"Error checking existing embeddings: {e}")
        return False
    finally:
        if conn:
            conn.close()

def fix_embeddings():
    """Fix embeddings in the database."""
    conn = None
    try:
        conn = get_connection()
        conn.autocommit = False  # Start transaction mode
        cur = conn.cursor()
        
        # Check if the embedding column is of vector type
        cur.execute("""
            SELECT column_name, data_type, udt_name 
            FROM information_schema.columns 
            WHERE table_name = 'crawl_pages' AND column_name = 'embedding'
        """)
        result = cur.fetchone()
        
        if not result:
            print_error("Embedding column not found in crawl_pages table")
            return False
        
        column_name, data_type, udt_name = result
        
        # If the column is not of vector type, we need to recreate it
        if data_type != 'USER-DEFINED' or udt_name != 'vector':
            print_warning("Embedding column is not of vector type, recreating it...")
            
            # First, check if the pgvector extension is installed
            cur.execute("SELECT extname FROM pg_extension WHERE extname = 'vector'")
            if not cur.fetchone():
                print_error("pgvector extension is not installed, cannot fix embeddings")
                print_info("To install pgvector, run: CREATE EXTENSION vector;")
                return False
            
            # Backup the existing embeddings
            print_info("Backing up existing embeddings...")
            cur.execute("ALTER TABLE crawl_pages ADD COLUMN embedding_backup text")
            cur.execute("UPDATE crawl_pages SET embedding_backup = embedding::text WHERE embedding IS NOT NULL")
            
            # Drop the existing embedding column
            print_info("Dropping existing embedding column...")
            cur.execute("ALTER TABLE crawl_pages DROP COLUMN embedding")
            
            # Create a new embedding column of vector type
            print_info("Creating new embedding column of vector type...")
            cur.execute("ALTER TABLE crawl_pages ADD COLUMN embedding vector(1536)")
            
            # Restore the embeddings from the backup
            print_info("Restoring embeddings from backup...")
            cur.execute("""
                UPDATE crawl_pages 
                SET embedding = embedding_backup::vector 
                WHERE embedding_backup IS NOT NULL
            """)
            
            # Drop the backup column
            print_info("Dropping backup column...")
            cur.execute("ALTER TABLE crawl_pages DROP COLUMN embedding_backup")
            
            print_success("Embedding column recreated as vector type")
        else:
            print_info("Embedding column is already of vector type, checking for invalid embeddings...")
            
            # Check for invalid embeddings by trying to use them in a vector operation
            try:
                cur.execute("""
                    SELECT id, url 
                    FROM crawl_pages p
                    WHERE p.embedding IS NOT NULL
                    AND NOT (p.embedding <=> p.embedding)::text = '0'
                """)
                invalid_embeddings = cur.fetchall()
                
                if invalid_embeddings:
                    print_warning(f"Found {len(invalid_embeddings)} pages with invalid embeddings")
                    
                    # Set invalid embeddings to NULL
                    for page_id, url in invalid_embeddings:
                        print_info(f"Setting NULL for invalid embedding in page {page_id} ({url})")
                        cur.execute("UPDATE crawl_pages SET embedding = NULL WHERE id = %s", (page_id,))
                else:
                    print_success("All embeddings are valid")
            except Exception as e:
                print_error(f"Error checking for invalid embeddings: {e}")
                conn.rollback()
                
                # Try an alternative approach
                print_info("Trying alternative approach to check embeddings...")
                try:
                    # Get a sample of embeddings to check
                    cur.execute("SELECT id, url FROM crawl_pages WHERE embedding IS NOT NULL LIMIT 10")
                    pages = cur.fetchall()
                    
                    for page_id, url in pages:
                        try:
                            # Try to use the embedding in a simple operation
                            cur.execute("""
                                SELECT 1 - (p.embedding <=> p.embedding) as self_similarity
                                FROM crawl_pages p
                                WHERE p.id = %s
                            """, (page_id,))
                            similarity = cur.fetchone()[0]
                            print_info(f"Page {page_id} has valid embedding (self-similarity: {similarity})")
                        except Exception as e2:
                            print_warning(f"Page {page_id} ({url}) has invalid embedding: {e2}")
                            print_info(f"Setting NULL for invalid embedding in page {page_id}")
                            cur.execute("UPDATE crawl_pages SET embedding = NULL WHERE id = %s", (page_id,))
                except Exception as e2:
                    print_error(f"Alternative approach also failed: {e2}")
                    return False
        
        # Commit the changes
        conn.commit()
        
        return True
    except Exception as e:
        print_error(f"Error fixing embeddings: {e}")
        if conn:
            conn.rollback()
        return False
    finally:
        if conn:
            conn.close()

def main():
    """Main function."""
    print_header("Checking and fixing embeddings in the database")
    
    # Check if the pgvector extension is installed
    if not check_pgvector_extension():
        print_error("pgvector extension is not installed, cannot proceed")
        sys.exit(1)
    
    # Check the embedding column type
    check_embedding_column()
    
    # Check existing embeddings
    check_existing_embeddings()
    
    # Ask if the user wants to fix the embeddings
    response = input("\nDo you want to fix the embeddings? (y/n): ")
    if response.lower() == 'y':
        print_header("Fixing embeddings...")
        if fix_embeddings():
            print_success("Embeddings fixed successfully")
        else:
            print_error("Failed to fix embeddings")
    else:
        print_info("Skipping embedding fix")
    
    print_header("Done")

if __name__ == "__main__":
    main() 