#!/bin/bash

# Function to display messages with colors
function echo_color() {
  local color=$1
  local message=$2
  case $color in
    "red") echo -e "\033[0;31m$message\033[0m" ;;
    "green") echo -e "\033[0;32m$message\033[0m" ;;
    "yellow") echo -e "\033[0;33m$message\033[0m" ;;
    "blue") echo -e "\033[0;34m$message\033[0m" ;;
    *) echo "$message" ;;
  esac
}

# Step 1: Check if .env file exists
echo_color "blue" "Step 1: Checking .env file..."
if [ ! -s ".env" ]; then
  echo_color "red" "Error: .env file is missing or empty. Please create it with the necessary environment variables."
  exit 1
fi

# Step 2: Extract POSTGRES_PASSWORD from .env
echo_color "blue" "Step 2: Extracting POSTGRES_PASSWORD from .env..."
POSTGRES_PASSWORD=$(grep -E "^POSTGRES_PASSWORD=" .env | cut -d '=' -f2)
if [ -z "$POSTGRES_PASSWORD" ]; then
  echo_color "red" "Error: POSTGRES_PASSWORD not found in .env file."
  exit 1
fi
echo_color "green" "Found POSTGRES_PASSWORD in .env file."

# Step 3: Update the REST service environment
echo_color "blue" "Step 3: Updating REST service environment..."
docker stop supachat-rest
docker rm supachat-rest

# Step 4: Start the REST service with the correct password
echo_color "blue" "Step 4: Starting REST service with correct password..."
docker run -d --name supachat-rest \
  --network supachat-network \
  -e PGRST_DB_URI="postgres://authenticator:${POSTGRES_PASSWORD}@db:5432/postgres" \
  -e PGRST_DB_SCHEMA="public,storage" \
  -e PGRST_DB_ANON_ROLE="anon" \
  -e PGRST_JWT_SECRET="your-super-secret-jwt-token-with-at-least-32-characters" \
  -e PGRST_DB_USE_LEGACY_GUCS="false" \
  postgrest/postgrest:v11.2.0

# Step 5: Wait for the REST service to start
echo_color "blue" "Step 5: Waiting for REST service to start..."
sleep 5

# Step 6: Check if the REST service is running
echo_color "blue" "Step 6: Checking if REST service is running..."
if docker ps | grep -q supachat-rest; then
  echo_color "green" "REST service is running."
else
  echo_color "red" "REST service failed to start."
  docker logs supachat-rest
  exit 1
fi

# Step 7: Restart Kong to ensure it connects to the REST service
echo_color "blue" "Step 7: Restarting Kong..."
docker restart supachat-kong

echo_color "green" "Fix completed successfully!"
echo_color "yellow" "You can check the logs with 'docker logs supachat-rest' to verify the connection." 