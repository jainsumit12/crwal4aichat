#!/bin/bash

echo "Checking status of all services..."
docker-compose -f full-stack-compose.yml ps

echo ""
echo "Checking logs of the database container..."
docker logs supachat-db | tail -n 20

echo ""
echo "Checking if database is healthy..."
if docker exec -it supachat-db pg_isready -U postgres; then
    echo "Database is ready and accepting connections"
else
    echo "Database is not ready"
fi

echo ""
echo "Checking database user..."
docker exec -it supachat-db bash -c "echo Current user: \$(whoami)"
docker exec -it supachat-db bash -c "echo POSTGRES_USER: \$POSTGRES_USER"

echo ""
echo "Checking critical database roles..."
docker exec -it supachat-db psql -U postgres -c "SELECT rolname FROM pg_roles WHERE rolname IN ('postgres', 'authenticator', 'anon', 'supabase_admin', 'supabase_auth_admin')"

echo ""
echo "Checking if auth service is running..."
docker logs supachat-auth 2>/dev/null | tail -n 20 || echo "Auth service is not running yet"

echo ""
echo "To check logs of a specific service, run:"
echo "docker logs supachat-<service-name>"
echo ""
echo "Available services: api, crawl4ai, studio, kong, auth, rest, realtime, storage, meta, functions, db"

echo ""
echo "If you're experiencing issues, try resetting the setup with:"
echo "./reset.sh"
 