#!/bin/bash

# Create necessary directories
mkdir -p volumes/{db/data,db/init,api,shm}

# Download Supabase initialization scripts for the database
echo "Downloading Supabase initialization scripts..."
curl -s https://raw.githubusercontent.com/supabase/postgres/develop/migrations/db/init-scripts/00000000000000-initial-schema.sql > volumes/db/init/00-initial-schema.sql
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

echo "Created Kong configuration"

# Create a script to set passwords for database roles
cat > volumes/db/init/99-set-passwords.sh << 'EOL'
#!/bin/bash
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
  -- Set passwords for all roles
  ALTER ROLE authenticator WITH PASSWORD '$POSTGRES_PASSWORD';
  ALTER ROLE supabase_admin WITH PASSWORD '$POSTGRES_PASSWORD';
  ALTER ROLE supabase_auth_admin WITH PASSWORD '$POSTGRES_PASSWORD';
  ALTER ROLE supabase_storage_admin WITH PASSWORD '$POSTGRES_PASSWORD';
EOSQL
EOL

chmod +x volumes/db/init/99-set-passwords.sh

echo "Setup complete! You can now start the services with:"
echo "docker-compose -f full-stack-compose.yml up -d" 