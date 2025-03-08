import os
import re
import psycopg2
from urllib.parse import urlparse
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Parse database connection parameters from environment variables
def get_db_params():
    """Get database connection parameters from environment variables."""
    # Check if a full URL is provided
    supabase_url = os.getenv('SUPABASE_URL')
    
    if supabase_url:
        # Parse the URL if it's a full URL with protocol
        if supabase_url.startswith('http://') or supabase_url.startswith('https://'):
            parsed_url = urlparse(supabase_url)
            host = parsed_url.hostname
            port = parsed_url.port or 5432  # Default PostgreSQL port
        else:
            # Handle case where URL is just host:port without protocol
            parts = supabase_url.split(':')
            host = parts[0]
            port = int(parts[1]) if len(parts) > 1 else 5432
        
        return {
            'host': host,
            'port': port,
            'database': os.getenv('SUPABASE_DB', 'postgres'),
            'user': os.getenv('SUPABASE_KEY', 'postgres'),
            'password': os.getenv('SUPABASE_PASSWORD', 'postgres')
        }
    else:
        # Use individual components if no URL is provided
        return {
            'host': os.getenv('SUPABASE_HOST', '192.168.70.90'),
            'port': int(os.getenv('SUPABASE_PORT', '54322')),
            'database': os.getenv('SUPABASE_DB', 'postgres'),
            'user': os.getenv('SUPABASE_KEY', 'postgres'),
            'password': os.getenv('SUPABASE_PASSWORD', 'postgres')
        }

# Get database connection parameters
db_params = get_db_params()

# SQL statements to set up the database
setup_statements = [
    # Enable the vector extension
    "CREATE EXTENSION IF NOT EXISTS vector;",
    
    # Create a table for crawled sites
    """
    CREATE TABLE IF NOT EXISTS crawl_sites (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        url TEXT NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """,
    
    # Create a table for crawled pages with vector embeddings
    """
    CREATE TABLE IF NOT EXISTS crawl_pages (
        id SERIAL PRIMARY KEY,
        site_id INTEGER REFERENCES crawl_sites(id) ON DELETE CASCADE,
        url TEXT NOT NULL,
        title TEXT,
        content TEXT,
        summary TEXT,
        embedding vector(1536),
        metadata JSONB,
        is_chunk BOOLEAN DEFAULT FALSE,
        chunk_index INTEGER,
        parent_id INTEGER REFERENCES crawl_pages(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """,
    
    # Create a function for similarity search
    """
    CREATE OR REPLACE FUNCTION match_page_embeddings(
        query_embedding VECTOR(1536),
        match_threshold FLOAT,
        match_count INT
    )
    RETURNS TABLE (
        id INTEGER,
        site_id INTEGER,
        url TEXT,
        title TEXT,
        content TEXT,
        summary TEXT,
        similarity FLOAT
    )
    LANGUAGE plpgsql
    AS $$
    BEGIN
        RETURN QUERY
        SELECT
            crawl_pages.id,
            crawl_pages.site_id,
            crawl_pages.url,
            crawl_pages.title,
            crawl_pages.content,
            crawl_pages.summary,
            1 - (crawl_pages.embedding <=> query_embedding) AS similarity
        FROM crawl_pages
        WHERE 1 - (crawl_pages.embedding <=> query_embedding) > match_threshold
        ORDER BY crawl_pages.embedding <=> query_embedding
        LIMIT match_count;
    END;
    $$;
    """,
    
    # Create an index for faster vector searches
    """
    CREATE INDEX IF NOT EXISTS crawl_pages_embedding_idx ON crawl_pages
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);
    """,
    
    # Add indexes for better performance
    """
    CREATE INDEX IF NOT EXISTS idx_pages_site_id ON crawl_pages(site_id);
    CREATE INDEX IF NOT EXISTS idx_pages_url ON crawl_pages(url);
    CREATE INDEX IF NOT EXISTS idx_pages_parent_id ON crawl_pages(parent_id);
    CREATE INDEX IF NOT EXISTS idx_pages_is_chunk ON crawl_pages(is_chunk);
    """,
    
    # Create a function to update the updated_at timestamp
    """
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
    END;
    $$ language 'plpgsql'
    """,
    
    # Create triggers to update the updated_at column
    """
    DROP TRIGGER IF EXISTS update_sites_updated_at ON crawl_sites;
    CREATE TRIGGER update_sites_updated_at
    BEFORE UPDATE ON crawl_sites
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column()
    """,
    
    """
    DROP TRIGGER IF EXISTS update_pages_updated_at ON crawl_pages;
    CREATE TRIGGER update_pages_updated_at
    BEFORE UPDATE ON crawl_pages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column()
    """
]

def setup_database():
    """Set up the database with the required tables and extensions."""
    conn = None
    try:
        # Connect to the database
        conn = psycopg2.connect(**db_params)
        conn.autocommit = True
        cur = conn.cursor()
        
        # Check if the vector extension is available
        try:
            cur.execute("SELECT 1 FROM pg_available_extensions WHERE name = 'vector'")
            vector_available = cur.fetchone() is not None
            
            if not vector_available:
                print("WARNING: The 'vector' extension is not available in this PostgreSQL installation.")
                print("Vector search functionality will not work without it.")
                print("You may need to install the pgvector extension in your PostgreSQL instance.")
                print("For more information, visit: https://github.com/pgvector/pgvector")
                
                # Continue with setup but skip the vector extension
                setup_statements_no_vector = [stmt for stmt in setup_statements if "CREATE EXTENSION" not in stmt]
                
                # Modify the crawl_pages table to use TEXT instead of vector if needed
                for i, stmt in enumerate(setup_statements_no_vector):
                    if "CREATE TABLE IF NOT EXISTS crawl_pages" in stmt:
                        # Replace vector type with TEXT
                        setup_statements_no_vector[i] = re.sub(
                            r'embedding vector\(1536\)',
                            'embedding TEXT',
                            stmt
                        )
                
                # Execute the modified statements
                for statement in setup_statements_no_vector:
                    try:
                        cur.execute(statement)
                        print(f"Executed: {statement[:60]}...")
                    except Exception as e:
                        print(f"Error executing statement: {e}")
                        print(f"Statement: {statement}")
                
                print("Database setup completed with limited functionality (no vector search).")
                return
        except Exception as e:
            print(f"Error checking for vector extension: {e}")
            # Continue with normal setup
        
        # Execute all setup statements
        for statement in setup_statements:
            try:
                cur.execute(statement)
                print(f"Executed: {statement[:60]}...")
            except Exception as e:
                print(f"Error executing statement: {e}")
                print(f"Statement: {statement}")
        
        # Create indexes for better performance
        try:
            # Index for site_id in crawl_pages
            cur.execute("CREATE INDEX IF NOT EXISTS idx_crawl_pages_site_id ON crawl_pages(site_id);")
            
            # Index for parent_id in crawl_pages
            cur.execute("CREATE INDEX IF NOT EXISTS idx_crawl_pages_parent_id ON crawl_pages(parent_id);")
            
            # Index for is_chunk in crawl_pages
            cur.execute("CREATE INDEX IF NOT EXISTS idx_crawl_pages_is_chunk ON crawl_pages(is_chunk);")
            
            # Create a unique index on the URL to prevent duplicates
            cur.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_crawl_pages_url ON crawl_pages(url);")
            
            print("Created indexes for better performance.")
        except Exception as e:
            print(f"Error creating indexes: {e}")
        
        # Set up the conversation history table
        try:
            cur.execute("""
            CREATE TABLE IF NOT EXISTS chat_conversations (
                id SERIAL PRIMARY KEY,
                session_id VARCHAR(255) NOT NULL,
                user_id VARCHAR(255),
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                role VARCHAR(50) NOT NULL,
                content TEXT NOT NULL,
                metadata JSONB
            );
            """)
            
            # Create indexes for the conversation history table
            cur.execute("CREATE INDEX IF NOT EXISTS idx_chat_conversations_session_id ON chat_conversations(session_id);")
            cur.execute("CREATE INDEX IF NOT EXISTS idx_chat_conversations_user_id ON chat_conversations(user_id);")
            
            print("✓ Conversation history table set up successfully")
        except Exception as e:
            print(f"Error setting up conversation history table: {e}")
        
        print("Database setup completed successfully.")
        
    except Exception as e:
        print(f"Error setting up database: {e}")
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    setup_database() 