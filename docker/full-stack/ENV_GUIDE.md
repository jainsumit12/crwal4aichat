# Environment File Guide

This document explains the environment file structure for the Supa-Crawl-Chat project, particularly focusing on the differences between the standard setup and the full-stack Docker setup.

## Environment File Structure

The project uses two separate `.env` files for different deployment scenarios:

1. **Root `.env` file** (in the project root directory)
2. **Docker-specific `.env` file** (in the `docker/` directory)

### Why Two Different .env Files?

The separation of environment files serves a specific purpose:

- **Root `.env`**: For standard setup or API-only Docker setup
  - Contains variables for connecting to external Supabase and Crawl4AI instances
  - Used when you already have Supabase running elsewhere

- **Docker `.env`**: For the full-stack Docker setup only
  - Contains additional variables needed for self-hosted Supabase
  - Includes JWT secrets, authentication keys, and database passwords
  - Uses container names for service URLs instead of localhost

This separation allows users to easily switch between different deployment scenarios without having to modify a single `.env` file repeatedly.

## Which .env File Should I Use?

### Use the Root `.env` File If:

- You're running the application directly on your machine (not in Docker)
- You're using the API-only Docker setup (`docker-compose.yml` or `crawl4ai-docker-compose.yml`)
- You have an external Supabase instance that you want to connect to

### Use the Docker-specific `.env` File If:

- You're using the full-stack Docker setup (`full-stack-compose.yml`)
- You want to run Supabase, the API, and Crawl4AI all in Docker containers
- You don't have an external Supabase instance

## Environment Variables Comparison

| Variable | Root `.env` | Docker `.env` | Notes |
|----------|-------------|---------------|-------|
| `OPENAI_API_KEY` | ✅ | ✅ | Required in both |
| `CRAWL4AI_API_TOKEN` | ✅ | ✅ | Required in both |
| `CRAWL4AI_BASE_URL` | ✅ (external URL) | ✅ (container name) | Different values |
| `SUPABASE_URL` | ✅ (external URL) | ✅ (container name) | Different values |
| `SUPABASE_KEY` | ✅ | ✅ | Same in both |
| `SUPABASE_DB` | ✅ | ✅ | Same in both |
| `SUPABASE_PASSWORD` | ✅ | ✅ | Same in both |
| `JWT_SECRET` | ❌ | ✅ | Only needed for self-hosted Supabase |
| `ANON_KEY` | ❌ | ✅ | Only needed for self-hosted Supabase |
| `SERVICE_ROLE_KEY` | ❌ | ✅ | Only needed for self-hosted Supabase |
| `DASHBOARD_PASSWORD` | ❌ | ✅ | Only needed for self-hosted Supabase |

## Setup Instructions

### Standard Setup

1. Copy `.env.example` to `.env` in the project root
2. Fill in your external Supabase and Crawl4AI details

### Full-Stack Docker Setup

1. Navigate to the `docker/` directory
2. Run `./setup.sh` to create the necessary files
3. Edit the Docker-specific `.env` file with your values
4. Run `docker-compose -f full-stack-compose.yml up -d`

## Switching Between Setups

If you switch between the standard setup and the full-stack Docker setup, you don't need to modify your existing `.env` files. Each setup will use its respective `.env` file automatically.

## Troubleshooting

### Connection Issues in Full-Stack Docker Setup

If you're experiencing connection issues in the full-stack Docker setup:

1. Make sure your Docker-specific `.env` file uses container names for URLs:
   ```
   SUPABASE_URL=http://kong:8002
   CRAWL4AI_BASE_URL=http://crawl4ai:11235
   ```

2. Check that all services are running:
   ```
   docker-compose -f docker/full-stack-compose.yml ps
   ```

### Connection Issues in Standard Setup

If you're experiencing connection issues in the standard setup:

1. Make sure your root `.env` file uses proper external URLs:
   ```
   SUPABASE_URL=https://your-project.supabase.co
   CRAWL4AI_BASE_URL=http://localhost:11235
   ```

2. Verify that your external services are running and accessible 