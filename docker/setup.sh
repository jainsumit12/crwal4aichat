#!/bin/bash

# Create necessary directories
mkdir -p volumes/{db/data,db/init,api,shm}

# Create the authentication roles script first (00-auth-roles.sql)
cat > volumes/db/init/00-auth-roles.sql << 'EOL'
-- Create all the necessary roles for Supabase and PostgREST
DO $$
BEGIN
  -- First create the basic roles
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon;
    RAISE NOTICE 'Created anon role';
  END IF;

  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated;
    RAISE NOTICE 'Created authenticated role';
  END IF;

  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role;
    RAISE NOTICE 'Created service_role role';
  END IF;

  -- Then create authenticator and grant the basic roles to it
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticator') THEN
    CREATE ROLE authenticator WITH LOGIN;
    RAISE NOTICE 'Created authenticator role';
  END IF;
  
  -- Create admin roles
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'supabase_admin') THEN
    CREATE ROLE supabase_admin WITH LOGIN SUPERUSER CREATEDB CREATEROLE REPLICATION BYPASSRLS;
    RAISE NOTICE 'Created supabase_admin role';
  END IF;
  
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'supabase_auth_admin') THEN
    CREATE ROLE supabase_auth_admin WITH LOGIN;
    RAISE NOTICE 'Created supabase_auth_admin role';
  END IF;
  
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'supabase_storage_admin') THEN
    CREATE ROLE supabase_storage_admin WITH LOGIN;
    RAISE NOTICE 'Created supabase_storage_admin role';
  END IF;

  -- Grant roles to authenticator
  GRANT anon TO authenticator;
  GRANT authenticated TO authenticator;
  GRANT service_role TO authenticator;

  -- Grant privileges
  GRANT ALL PRIVILEGES ON DATABASE postgres TO supabase_admin;
  GRANT USAGE ON SCHEMA public TO authenticator, anon, authenticated, service_role;

  RAISE NOTICE 'All roles created and configured successfully';
END
$$;
EOL

# Download Supabase initialization scripts for the database
echo "Downloading Supabase initialization scripts..."
curl -s https://raw.githubusercontent.com/supabase/postgres/develop/migrations/db/init-scripts/00000000000000-initial-schema.sql > volumes/db/init/00-initial-schema.sql
curl -s https://raw.githubusercontent.com/supabase/postgres/develop/migrations/db/init-scripts/00000000000001-auth-schema.sql > volumes/db/init/01-auth-schema.sql
curl -s https://raw.githubusercontent.com/supabase/postgres/develop/migrations/db/init-scripts/00000000000003-post-setup.sql > volumes/db/init/03-post-setup.sql

# Create database initialization script for our app tables
cat > volumes/db/init/04-app-tables.sql << 'EOL'
-- Create the tables for our app
CREATE TABLE IF NOT EXISTS public.crawl_sites (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.crawl_pages (
    id SERIAL PRIMARY KEY,
    site_id INTEGER REFERENCES public.crawl_sites(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    title TEXT,
    content TEXT,
    summary TEXT,
    embedding VECTOR(1536),
    metadata JSONB,
    is_chunk BOOLEAN DEFAULT FALSE,
    chunk_index INTEGER,
    parent_id INTEGER REFERENCES public.crawl_pages(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(url, site_id, is_chunk, chunk_index)
);

CREATE TABLE IF NOT EXISTS public.chat_conversations (
    id SERIAL PRIMARY KEY,
    session_id TEXT NOT NULL,
    user_id TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    metadata JSONB
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS crawl_pages_site_id_idx ON public.crawl_pages(site_id);
CREATE INDEX IF NOT EXISTS crawl_pages_parent_id_idx ON public.crawl_pages(parent_id);
CREATE INDEX IF NOT EXISTS chat_conversations_session_id_idx ON public.chat_conversations(session_id);
CREATE INDEX IF NOT EXISTS chat_conversations_user_id_idx ON public.chat_conversations(user_id);

-- Grant permissions on our app tables
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO supabase_admin;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO supabase_admin;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO dashboard_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO dashboard_user;

-- Grant access to anon, authenticated, and service_role
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT, USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO service_role;
EOL

echo "Created database initialization scripts"

# Create Kong configuration file
echo "Creating Kong configuration file..."
# First, ensure any existing kong.yml directory is removed
if [ -d "volumes/api/kong.yml" ]; then
  echo "Removing existing kong.yml directory..."
  rm -rf volumes/api/kong.yml
fi

# Create the kong.yml file
cat > volumes/api/kong.yml << 'EOL'
_format_version: "2.1"
_transform: true

services:
  - name: rest
    url: http://rest:3000/
    routes:
      - name: rest-route
        paths:
          - /rest/v1/
    plugins:
      - name: cors
  - name: meta
    url: http://meta:8080/
    routes:
      - name: meta-route
        paths:
          - /pg/
    plugins:
      - name: cors
  - name: dashboard
    url: http://studio:3000/
    routes:
      - name: dashboard-route
        paths:
          - /
    plugins:
      - name: cors
      - name: key-auth
        config:
          hide_credentials: false
      - name: acl
        config:
          hide_groups_header: true
          allow:
            - admin

consumers:
  - username: supabase
    keyauth_credentials:
      - key: ${DASHBOARD_PASSWORD}
    acls:
      - group: admin
EOL

# Verify the kong.yml is a file and not a directory
if [ -d "volumes/api/kong.yml" ]; then
  echo "ERROR: kong.yml is still a directory! Attempting to fix..."
  rm -rf volumes/api/kong.yml
  echo "_format_version: \"2.1\"" > volumes/api/kong.yml
  echo "_transform: true" >> volumes/api/kong.yml
  echo "Created minimal Kong configuration as fallback"
else
  echo "Created Kong configuration file successfully"
fi

# Create a script to set passwords for database roles
cat > volumes/db/init/99-set-passwords.sh << 'EOL'
#!/bin/bash
set -e

echo "=== Setting database roles and passwords ==="

# CRITICAL: Set all passwords to match environment variable
echo "Setting role passwords to match POSTGRES_PASSWORD environment variable"
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
  -- First ensure all roles exist
  DO \$\$
  BEGIN
    -- Create authenticator role if it doesn't exist
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticator') THEN
      CREATE ROLE authenticator WITH LOGIN;
      RAISE NOTICE 'Created authenticator role';
    END IF;

    -- Create supabase_admin role if it doesn't exist
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'supabase_admin') THEN
      CREATE ROLE supabase_admin WITH LOGIN;
      ALTER ROLE supabase_admin WITH SUPERUSER CREATEDB CREATEROLE REPLICATION BYPASSRLS;
      RAISE NOTICE 'Created supabase_admin role';
    END IF;
    
    -- Create other Supabase roles if they don't exist
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'supabase_auth_admin') THEN
      CREATE ROLE supabase_auth_admin WITH LOGIN;
      RAISE NOTICE 'Created supabase_auth_admin role';
    END IF;
    
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'supabase_storage_admin') THEN
      CREATE ROLE supabase_storage_admin WITH LOGIN;
      RAISE NOTICE 'Created supabase_storage_admin role';
    END IF;

    -- Create PostgREST roles if they don't exist
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'anon') THEN
      CREATE ROLE anon;
      RAISE NOTICE 'Created anon role';
    END IF;

    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticated') THEN
      CREATE ROLE authenticated;
      RAISE NOTICE 'Created authenticated role';
    END IF;

    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'service_role') THEN
      CREATE ROLE service_role;
      RAISE NOTICE 'Created service_role role';
    END IF;

    -- Grant roles to authenticator
    GRANT anon TO authenticator;
    GRANT authenticated TO authenticator;
    GRANT service_role TO authenticator;

    -- Grant privileges
    GRANT ALL PRIVILEGES ON DATABASE postgres TO supabase_admin;
    GRANT USAGE ON SCHEMA public TO authenticator, anon, authenticated, service_role;
  END
  \$\$;

  -- Now set passwords for all roles
  ALTER ROLE postgres WITH PASSWORD '$POSTGRES_PASSWORD';
  ALTER ROLE authenticator WITH PASSWORD '$POSTGRES_PASSWORD';
  ALTER ROLE supabase_admin WITH PASSWORD '$POSTGRES_PASSWORD';
  ALTER ROLE supabase_auth_admin WITH PASSWORD '$POSTGRES_PASSWORD';
  ALTER ROLE supabase_storage_admin WITH PASSWORD '$POSTGRES_PASSWORD';

  -- Verify that the authenticator role is set up correctly
  SELECT 
    rolname, 
    rolcanlogin,
    pg_catalog.array_to_string(ARRAY(
      SELECT b.rolname 
      FROM pg_catalog.pg_auth_members m 
      JOIN pg_catalog.pg_roles b ON (m.roleid = b.oid) 
      WHERE m.member = r.oid
    ), ', ') as member_of
  FROM pg_catalog.pg_roles r
  WHERE r.rolname = 'authenticator';
EOSQL

echo "✅ Database roles and passwords set up successfully!"
EOL

# Make the script executable - CRITICAL for proper initialization
chmod +x volumes/db/init/99-set-passwords.sh
echo "Created password configuration script (made executable)"

echo "Setup complete! You can now start the services with:"
echo "docker-compose -f full-stack-compose.yml up -d" 