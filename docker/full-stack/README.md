# Supa-Crawl-Chat Docker Setup

This directory contains Docker configuration for running the Supa-Crawl-Chat application with Supabase services.

## Components

The setup includes the following components:

- **API**: Your custom API service
- **Frontend UI**: Web interface for interacting with the application
- **Crawl4AI**: Service for crawling websites
- **Supabase Studio**: Web UI for managing your Supabase instance (accessible at http://localhost:3001)
- **Kong API Gateway**: API gateway for routing requests to Supabase services
- **REST API**: Supabase REST API for database access
- **Meta**: Supabase Meta service for database metadata
- **Database**: PostgreSQL database with Supabase extensions

## Getting Started

### Prerequisites

- Docker and Docker Compose installed
- `.env` file with required environment variables (see `.env.example`)

### Important Environment Variable Configuration

Before starting the services, make sure your `.env` file is properly configured:

1. **SUPABASE_URL**: This should be commented out or left empty to ensure the API connects directly to the database:
   ```
   # SUPABASE_URL=http://kong:8002
   ```
   
   If this is set, the API will try to connect to Kong for database operations, which will cause SSL negotiation errors.

2. Ensure these database connection parameters are set correctly:
   ```
   SUPABASE_HOST=db
   SUPABASE_PORT=5432
   SUPABASE_KEY=supabase_admin
   SUPABASE_PASSWORD=StrongPassword123!
   ```

### Setup Process

1. Run the setup script to create necessary configuration files:
   ```bash
   ./setup_update.sh
   ```

2. Start all services:
   ```bash
   docker-compose -f full-stack-compose.yml up -d
   ```

### Checking Service Status

To check the status of all services:

```bash
./status.sh
```

### Stopping the Services

To stop all services:

```bash
docker-compose -f full-stack-compose.yml down
```

### Resetting the Setup

If you need to reset the setup (this will remove all data):

```bash
./reset.sh
```

## Accessing the Services

- **API**: http://localhost:8001
- **API Documentation**: http://localhost:8001/docs
- **Frontend UI**: http://localhost:3000
- **Supabase REST API**: http://localhost:8002/rest/v1/ (requires API key)
- **Supabase Studio**: http://localhost:3001
- **Crawl4AI**: http://localhost:11235

## Using the Application

1. Access the Frontend UI at http://localhost:3000
2. Use the interface to:
   - Browse and search crawled websites
   - Chat with AI about the crawled content
   - Manage crawl jobs and view results
3. For database administration, access Supabase Studio at http://localhost:3001
4. For API documentation, visit http://localhost:8001/docs

## Troubleshooting

### Database Connection Issues

If you encounter database connection errors like "connection to server at 'kong', port 8002 failed: received invalid response to SSL negotiation":

1. Check your `.env` file and make sure `SUPABASE_URL` is commented out or empty
2. Verify the API container has the correct environment variables:
   ```bash
   docker exec -it supachat-api env | grep SUPA
   ```
3. Restart the API service after making changes:
   ```bash
   docker-compose -f full-stack-compose.yml restart api
   ```

This seems to work for db

```env
docker exec -it supachat-db psql -U postgres -c "
-- Create supabase_auth_admin if it doesn't exist
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'supabase_auth_admin') THEN
    CREATE USER supabase_auth_admin NOINHERIT CREATEROLE LOGIN NOREPLICATION;
  END IF;
END
\$\$;

-- Set password for supabase_auth_admin
ALTER ROLE supabase_auth_admin WITH PASSWORD 'StrongPassword123!';

-- Set password for authenticator
ALTER ROLE authenticator WITH PASSWORD 'StrongPassword123!';

-- Make sure authenticator has required permissions
GRANT anon TO authenticator;
GRANT authenticated TO authenticator;
GRANT service_role TO authenticator;
"
```

### REST Service Issues

If the REST service is not connecting properly:

```bash
./fix_rest.sh
```

This script will:
- Extract the correct database password from your `.env` file
- Restart the REST service with the correct configuration
- Restart Kong to ensure it connects to the REST service

### Kong Configuration

The Kong configuration file is located at `volumes/api/kong.yml`. This file is mounted to the Kong container and defines the API routes and services.

If you need to modify the Kong configuration:
1. Edit `volumes/api/kong.yml`
2. Restart Kong:
   ```bash
   docker-compose -f full-stack-compose.yml restart kong
   ```

### Other Common Issues

If the frontend is not connecting to the API, verify:
- The API service is running (`docker ps | grep supachat-api`)
- The frontend environment variables are correctly set
- Network connectivity between containers is working

For any other issues, check the container logs:
```bash
docker logs supachat-api
docker logs supachat-kong
docker logs supachat-frontend
```

fix errors in Meta

```bash
in meta container  
   docker-compose -f full-stack-compose.yml restart meta
```  
  
Make sure DB is setup

```bash
   docker exec -it supachat-api python main.py setup
```

Other common commands 

```bash

docker exec -it supachat-db psql -U postgres -c "ALTER ROLE authenticator WITH PASSWORD 'StrongPassword123!';"
```

```bash
docker restart supachat-rest
```

```bash
docker exec -it supachat-db bash -c "psql -U postgres -c \"ALTER ROLE authenticator WITH PASSWORD 'postgres';\""
```