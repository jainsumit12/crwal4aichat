#!/bin/bash

echo "This script will completely reset your Docker setup, removing all containers, volumes, and data."
echo "This is useful if you're experiencing issues with the setup and want to start fresh."
echo ""
echo "WARNING: This will delete all data in your Docker volumes!"
echo ""
read -p "Are you sure you want to continue? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Stopping and removing all containers..."
    docker-compose -f full-stack-compose.yml down -v

    echo "Making sure all containers are stopped..."
    docker stop $(docker ps -a -q --filter name=supachat-*) 2>/dev/null || true
    docker rm $(docker ps -a -q --filter name=supachat-*) 2>/dev/null || true

    echo "Removing all volumes..."
    rm -rf volumes

    echo "Running setup script to recreate necessary files..."
    ./setup.sh

    echo ""
    echo "Reset complete! You can now start the services with:"
    echo "docker-compose -f full-stack-compose.yml up -d"
    echo ""
    echo "You can check the status of the services with:"
    echo "./status.sh"
    echo ""
    echo "If the database is running but other services can't connect to it, check if it's listening on all interfaces:"
    echo "./check_db_connections.sh"
else
    echo "Reset cancelled."
fi 