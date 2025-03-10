#!/bin/bash

echo "Checking database connection settings..."
docker exec -it supachat-db psql -U postgres -c "SHOW listen_addresses;"

echo ""
echo "Checking if database is accessible from other containers..."
docker exec -it supachat-api bash -c "nc -zv db 5432" 2>/dev/null || echo "Database is not accessible from API container"

echo ""
echo "Checking database logs..."
docker logs supachat-db | grep "listening on" | tail -n 5

echo ""
echo "Checking database roles..."
docker exec -it supachat-db psql -U postgres -c "SELECT rolname FROM pg_roles WHERE rolname IN ('postgres', 'authenticator', 'anon', 'supabase_admin', 'supabase_auth_admin', 'supabase_storage_admin');"

echo ""
echo "Checking database extensions..."
docker exec -it supachat-db psql -U postgres -c "SELECT extname FROM pg_extension;"

echo ""
echo "Checking database schemas..."
docker exec -it supachat-db psql -U postgres -c "SELECT schema_name FROM information_schema.schemata WHERE schema_name IN ('public', 'auth', 'storage');"

echo ""
echo "Checking initialization scripts..."
docker exec -it supachat-db bash -c "ls -la /docker-entrypoint-initdb.d/"

echo ""
echo "Checking if initialization scripts contain the necessary content..."
docker exec -it supachat-db bash -c "grep -l 'supabase_replication_admin' /docker-entrypoint-initdb.d/*" || echo "Could not find supabase_replication_admin role in initialization scripts"
docker exec -it supachat-db bash -c "grep -l 'supabase_storage_admin' /docker-entrypoint-initdb.d/*" || echo "Could not find supabase_storage_admin role in initialization scripts" 