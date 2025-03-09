# Supa-Crawl-Chat API Documentation

This document provides detailed information about the Supa-Crawl-Chat API endpoints, their usage, and the overall flow for integrating with external applications.

## Table of Contents

- [Overview](#overview)
- [Base URL](#base-url)
- [Authentication](#authentication)
- [API Endpoints](#api-endpoints)
  - [Crawl](#crawl)
  - [Sites](#sites)
  - [Search](#search)
  - [Chat](#chat)
- [Workflow Examples](#workflow-examples)
- [Docker Deployment](#docker-deployment)
- [Troubleshooting](#troubleshooting)

## Overview

The Supa-Crawl-Chat API provides a RESTful interface to interact with the Supa-Crawl-Chat system. It allows you to:

- Crawl websites and sitemaps
- Retrieve information about crawled sites
- Search through crawled content
- Interact with the chat interface

The API is built using FastAPI and follows RESTful principles.

## Base URL

By default, the API is available at:

```
http://localhost:8001
```

The interactive API documentation is available at:

```
http://localhost:8001/docs
```

## Authentication

Currently, the API does not require authentication. However, the Crawl4AI service used by the API requires an API token, which should be configured in your `.env` file.

## API Endpoints

### Crawl

#### Start a Crawl

```
POST /api/crawl/
```

Starts a crawl for a website or sitemap. The crawl process runs in the background, and the endpoint returns immediately with a site ID that can be used to check the status.

**Request Body:**

```json
{
  "url": "https://example.com",
  "site_name": "Example Site",
  "site_description": "An example website",
  "is_sitemap": false,
  "max_urls": 50
}
```

**Parameters:**

- `url` (string, required): The URL to crawl
- `site_name` (string, optional): Name for the site. If not provided, one will be generated from the URL
- `site_description` (string, optional): Description of the site. If not provided, one will be generated from the content
- `is_sitemap` (boolean, optional): Whether the URL is a sitemap. Default: false
- `max_urls` (integer, optional): Maximum number of URLs to crawl from a sitemap. Default: 50

**Response:**

```json
{
  "site_id": 4,
  "site_name": "Example Site",
  "url": "https://example.com",
  "message": "Crawl started successfully",
  "status": "in_progress"
}
```

**Status Codes:**

- `200 OK`: Crawl started successfully
- `500 Internal Server Error`: Error starting the crawl

#### Check Crawl Status

```
GET /api/crawl/status/{site_id}
```

Checks the status of a crawl by site ID.

**Path Parameters:**

- `site_id` (integer, required): The ID of the site

**Response:**

```json
{
  "site_id": 4,
  "site_name": "Example Site",
  "url": "https://example.com",
  "page_count": 1,
  "created_at": "2025-03-09T12:13:01.828635",
  "updated_at": "2025-03-09T12:13:01.828635"
}
```

**Status Codes:**

- `200 OK`: Status retrieved successfully
- `404 Not Found`: Site not found
- `500 Internal Server Error`: Error getting crawl status

### Sites

#### List All Sites

```
GET /api/sites
```

Lists all crawled sites.

**Query Parameters:**

- `include_chunks` (boolean, optional): Whether to include chunks in the page count. Default: false

**Response:**

```json
[
  {
    "id": 4,
    "name": "Example Site",
    "url": "https://example.com",
    "description": "Example Domain for Illustrative Use",
    "page_count": 1,
    "created_at": "2025-03-09T12:13:01.828635"
  }
]
```

**Status Codes:**

- `200 OK`: Sites retrieved successfully
- `500 Internal Server Error`: Error retrieving sites

#### Get Site by ID

```
GET /api/sites/{site_id}
```

Gets a site by ID.

**Path Parameters:**

- `site_id` (integer, required): The ID of the site

**Query Parameters:**

- `include_chunks` (boolean, optional): Whether to include chunks in the page count. Default: false

**Response:**

```json
{
  "id": 4,
  "name": "Example Site",
  "url": "https://example.com",
  "description": "Example Domain for Illustrative Use",
  "page_count": 1,
  "created_at": "2025-03-09T12:13:01.828635"
}
```

**Status Codes:**

- `200 OK`: Site retrieved successfully
- `404 Not Found`: Site not found
- `500 Internal Server Error`: Error retrieving site

#### Get Pages for a Site

```
GET /api/sites/{site_id}/pages
```

Gets pages for a specific site.

**Path Parameters:**

- `site_id` (integer, required): The ID of the site

**Query Parameters:**

- `include_chunks` (boolean, optional): Whether to include chunks in the results. Default: false
- `limit` (integer, optional): Maximum number of pages to return. Default: 100

**Response:**

```json
[
  {
    "id": 331,
    "url": "https://example.com/",
    "title": "Example Domain for Illustrative Use",
    "content": "This domain is for use in illustrative examples in documents...",
    "summary": "A placeholder domain for documentation and examples.",
    "is_chunk": false,
    "chunk_index": null,
    "parent_id": null,
    "created_at": "2025-03-09T12:13:02.828635",
    "updated_at": "2025-03-09T12:13:02.828635"
  }
]
```

**Status Codes:**

- `200 OK`: Pages retrieved successfully
- `404 Not Found`: Site not found
- `500 Internal Server Error`: Error retrieving pages

### Search

#### Search Content

```
GET /api/search
```

Searches for content using semantic search or text search.

**Query Parameters:**

- `query` (string, required): The search query
- `threshold` (float, optional): Similarity threshold (0-1). Default: 0.5
- `limit` (integer, optional): Maximum number of results. Default: 10
- `text_only` (boolean, optional): Use text search instead of embeddings. Default: false
- `site_id` (integer, optional): Filter results by site ID

**Response:**

```json
[
  {
    "id": 331,
    "url": "https://example.com/",
    "title": "Example Domain for Illustrative Use",
    "content": "This domain is for use in illustrative examples in documents...",
    "summary": "A placeholder domain for documentation and examples.",
    "similarity": 0.85,
    "is_chunk": false,
    "chunk_index": null,
    "parent_id": null,
    "site_id": 4,
    "site_name": "Example Site"
  }
]
```

**Status Codes:**

- `200 OK`: Search completed successfully
- `500 Internal Server Error`: Error during search

### Chat

#### Send a Message

```
POST /api/chat
```

Sends a message to the chat bot and gets a response.

**Request Body:**

```json
{
  "message": "Tell me about example.com",
  "session_id": "a24b6b72-e526-4a09-b662-0f85e82f78a7",
  "user_id": "John",
  "profile": "default"
}
```

**Parameters:**

- `message` (string, required): The user's message
- `session_id` (string, optional): Session ID for persistent conversations. If not provided, a new one will be generated
- `user_id` (string, optional): User ID for tracking conversations
- `profile` (string, optional): Profile to use. Default: "default"

**Query Parameters:**

- `model` (string, optional): Model to use. Default: from .env
- `result_limit` (integer, optional): Maximum number of search results. Default: from .env
- `similarity_threshold` (float, optional): Similarity threshold (0-1). Default: from .env
- `include_context` (boolean, optional): Whether to include search context in the response. Default: false
- `include_history` (boolean, optional): Whether to include conversation history in the response. Default: false

**Response:**

```json
{
  "response": "Example.com is a domain reserved for use in documentation and examples...",
  "session_id": "a24b6b72-e526-4a09-b662-0f85e82f78a7",
  "context": [
    {
      "url": "https://example.com/",
      "title": "Example Domain for Illustrative Use",
      "content": "This domain is for use in illustrative examples in documents...",
      "similarity": 0.85
    }
  ],
  "history": [
    {
      "role": "user",
      "content": "Tell me about example.com"
    },
    {
      "role": "assistant",
      "content": "Example.com is a domain reserved for use in documentation and examples..."
    }
  ]
}
```

**Status Codes:**

- `200 OK`: Message processed successfully
- `500 Internal Server Error`: Error processing message

#### List Profiles

```
GET /api/chat/profiles
```

Lists all available profiles.

**Query Parameters:**

- `session_id` (string, optional): Session ID to get active profile
- `user_id` (string, optional): User ID

**Response:**

```json
{
  "profiles": [
    {
      "name": "default",
      "description": "General-purpose assistant that searches all sites"
    },
    {
      "name": "technical",
      "description": "Provides detailed technical explanations with step-by-step instructions"
    }
  ],
  "active_profile": "default"
}
```

**Status Codes:**

- `200 OK`: Profiles retrieved successfully
- `500 Internal Server Error`: Error retrieving profiles

#### Set Active Profile

```
POST /api/chat/profiles/{profile_name}
```

Sets the active profile for a session.

**Path Parameters:**

- `profile_name` (string, required): The name of the profile to set

**Query Parameters:**

- `session_id` (string, required): Session ID
- `user_id` (string, optional): User ID

**Response:**

```json
{
  "message": "Profile set to technical",
  "profile": {
    "name": "technical",
    "description": "Provides detailed technical explanations with step-by-step instructions"
  }
}
```

**Status Codes:**

- `200 OK`: Profile set successfully
- `404 Not Found`: Profile not found
- `500 Internal Server Error`: Error setting profile

#### Get Conversation History

```
GET /api/chat/history
```

Gets conversation history for a session.

**Query Parameters:**

- `session_id` (string, required): Session ID
- `user_id` (string, optional): User ID

**Response:**

```json
[
  {
    "role": "user",
    "content": "Tell me about example.com",
    "timestamp": "2025-03-09T12:13:02.828635"
  },
  {
    "role": "assistant",
    "content": "Example.com is a domain reserved for use in documentation and examples...",
    "timestamp": "2025-03-09T12:13:03.828635"
  }
]
```

**Status Codes:**

- `200 OK`: History retrieved successfully
- `500 Internal Server Error`: Error retrieving history

#### Clear Conversation History

```
DELETE /api/chat/history
```

Clears conversation history for a session.

**Query Parameters:**

- `session_id` (string, required): Session ID
- `user_id` (string, optional): User ID

**Response:**

```json
{
  "message": "Conversation history cleared"
}
```

**Status Codes:**

- `200 OK`: History cleared successfully
- `500 Internal Server Error`: Error clearing history

## Workflow Examples

### Basic Crawl and Search Workflow

1. **Start a crawl:**

```bash
curl -X 'POST' \
  'http://localhost:8001/api/crawl/' \
  -H 'accept: application/json' \
  -H 'Content-Type: application/json' \
  -d '{
  "url": "https://example.com",
  "site_name": "Example Site",
  "site_description": "An example website",
  "is_sitemap": false,
  "max_urls": 50
}'
```

2. **Check crawl status until page_count stabilizes:**

```bash
curl -X 'GET' \
  'http://localhost:8001/api/crawl/status/4' \
  -H 'accept: application/json'
```

3. **Search the crawled content:**

```bash
curl -X 'GET' \
  'http://localhost:8001/api/search?query=example&threshold=0.5&limit=10' \
  -H 'accept: application/json'
```

### Chat Workflow

1. **Start a chat session:**

```bash
curl -X 'POST' \
  'http://localhost:8001/api/chat' \
  -H 'accept: application/json' \
  -H 'Content-Type: application/json' \
  -d '{
  "message": "Tell me about example.com",
  "user_id": "John"
}'
```

2. **Continue the conversation with the same session ID:**

```bash
curl -X 'POST' \
  'http://localhost:8001/api/chat' \
  -H 'accept: application/json' \
  -H 'Content-Type: application/json' \
  -d '{
  "message": "What is it used for?",
  "session_id": "a24b6b72-e526-4a09-b662-0f85e82f78a7",
  "user_id": "John"
}'
```

3. **Change the profile:**

```bash
curl -X 'POST' \
  'http://localhost:8001/api/chat/profiles/technical?session_id=a24b6b72-e526-4a09-b662-0f85e82f78a7&user_id=John' \
  -H 'accept: application/json'
```

4. **View conversation history:**

```bash
curl -X 'GET' \
  'http://localhost:8001/api/chat/history?session_id=a24b6b72-e526-4a09-b662-0f85e82f78a7&user_id=John' \
  -H 'accept: application/json'
```

## Docker Deployment

The API can be deployed using Docker. Two Docker Compose files are provided:

1. **Standard Deployment:**

```bash
docker-compose -f docker/docker-compose.yml up -d
```

2. **Integrated Crawl4AI Deployment:**

```bash
docker-compose -f docker/crawl4ai-docker-compose.yml up -d
```

The integrated deployment starts both the API and Crawl4AI services in separate containers, with the API configured to connect to the Crawl4AI service.

## Troubleshooting

### Common Issues

1. **"Invalid token" error when crawling:**
   - Ensure the `CRAWL4AI_API_TOKEN` is correctly set in your `.env` file
   - Check that the token is valid and has not expired

2. **API returns 500 error:**
   - Check the logs with `docker logs supa-chat-api`
   - Ensure the database is properly set up with `python main.py setup`

3. **Crawl starts but no pages are found:**
   - Check if the URL is accessible
   - Ensure the Crawl4AI service is running correctly
   - Check the logs with `docker logs crawl4ai`

### Getting Help

If you encounter issues not covered here, please:

1. Check the FastAPI documentation at `/docs` for detailed endpoint information
2. Review the project's GitHub repository for known issues
3. Submit a new issue on GitHub with detailed information about the problem 