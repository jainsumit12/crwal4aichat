# Supa-Crawl-Chat Docker Setup

This directory contains Docker configuration for running the Supa-Crawl-Chat application with Supabase services.

## Components

The setup includes the following components:

- **API**: Your custom API service
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

### Starting the Services

To start all services:

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
- **Supabase REST API**: http://localhost:8002/rest/v1/ (requires API key)
- **Supabase Studio**: http://localhost:3001
- **Crawl4AI**: http://localhost:11235

## Troubleshooting

If you encounter issues with the database, you can check the database connections:

```bash
./check_db_connections.sh
```
