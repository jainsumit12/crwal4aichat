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

# Step 1: Clean up existing containers and volumes
echo_color "blue" "Step 1: Cleaning up existing containers and volumes..."
docker-compose -f full-stack-compose.yml down -v
docker volume rm supachat-pgdata 2>/dev/null || true

# Step 2: Run the setup script
echo_color "blue" "Step 2: Running the setup script..."
./setup_update.sh

# Step 3: Start the containers
echo_color "blue" "Step 3: Starting the containers..."
docker-compose -f full-stack-compose.yml up -d

# Step 4: Wait for the database to be ready
echo_color "blue" "Step 4: Waiting for the database to be ready..."
echo_color "yellow" "This may take a minute or two..."
sleep 30

# Step 5: Test the API
echo_color "blue" "Step 5: Testing the API..."
echo_color "yellow" "Testing /api/sites endpoint..."
curl -s http://localhost:8002/api/sites | jq . || echo_color "red" "Failed to get sites"

echo_color "yellow" "Testing /api/chat/preferences endpoint..."
curl -s "http://localhost:8002/api/chat/preferences?user_id=User&min_confidence=0&active_only=false" | jq . || echo_color "red" "Failed to get preferences"

echo_color "green" "Setup test completed!"
echo_color "yellow" "If you see empty arrays for sites and preferences, that's expected - it means the API is working correctly."
echo_color "yellow" "If you see error messages, check the logs with 'docker logs supachat-api' and 'docker logs supachat-db'." 