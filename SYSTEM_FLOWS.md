# Crawl4AI System Flows and Components

This document provides a detailed explanation of all the components, flows, and interactions in the Crawl4AI system. It covers how different parts of the system work together, what happens in different scenarios, and how various settings affect the behavior of the system.

## Core Components

### 1. Database (Supabase)
- Stores crawled content, embeddings, site information
- Maintains conversation history
- Stores user preferences and metadata

### 2. LLM Integration (OpenAI)
- Used for multiple purposes throughout the system:
  - Generating embeddings for vector search
  - Creating titles and summaries for crawled content
  - Analyzing conversation history
  - Understanding query intent
  - Generating responses to user queries
  - Extracting user preferences

### 3. Crawler
- Fetches content from websites
- Processes and chunks content
- Stores content in the database

### 4. Chat Interface
- Provides interactive command-line interface
- Manages conversation flow
- Handles user commands
- Displays formatted responses

## User Identification and Session Management

### User ID
- Set via `--user` parameter or `CHAT_USER_ID` environment variable
- Stored with each message in the conversation history
- Used to personalize responses (e.g., "Your name is Joe")
- Included in system prompts to the LLM
- Persists across multiple chat sessions

### Session ID
- Generated automatically or set via `--session` parameter or `CHAT_SESSION_ID` environment variable
- Used to group related messages in the conversation history
- Allows continuing conversations across multiple chat sessions
- Critical for maintaining context and memory
- auto generated if empty, can set the uuid in the .env or copy generate session id from UI after first run to maintain context and memory

### Combinations and Effects

| User ID | Session ID | Effect |
|---------|------------|--------|
| ✓ | ✓ | Full personalization and conversation continuity. The system remembers both the user's name and all previous conversations in that session. |
| ✓ | ✗ (new) | The system knows the user's name but starts a fresh conversation. |
| ✗ | ✓ | The system remembers previous conversations but doesn't know the user's name. |
| ✗ | ✗ (new) | Completely fresh start with no personalization or history. |

## Chat Profiles

### Profile Components
- **Name**: Identifier used to select the profile
- **Description**: Brief explanation of the profile's purpose
- **System Prompt**: Instructions that guide the LLM's behavior and personality
- **Search Settings**:
  - **Sites**: List of site name patterns to filter search results
  - **Threshold**: Similarity threshold for vector search (0-1)
  - **Limit**: Maximum number of results to return

### Profile Selection
- Set via `--profile` parameter or `CHAT_PROFILE` environment variable
- Can be changed during a chat session with `profile <name>` command
- Profiles are loaded from YAML files in the profiles directory
- Default profile is used if specified profile is not found

### Site Filtering
- If `sites` array is empty, searches ALL sites in the database
- If `sites` array contains patterns, only searches sites with matching names
- Pattern matching is case-insensitive and partial (e.g., "pydantic" matches "Pydantic Docs")
- Multiple patterns can be specified to search across several related sites

## Memory and Conversation History

### Storage
- All messages (user, assistant, system) are stored in the database
- Messages are grouped by session ID
- Messages include metadata (user ID, profile, preferences)
- Messages include timestamps

### Retrieval
- When starting a chat session with an existing session ID, previous messages are loaded
- A sliding window approach is used to manage very long conversations:
  - Always includes the first few messages for context
  - Includes the most recent messages (up to a limit - 20 )
  - This prevents token limit issues with the LLM

### Conversation Analysis
- When a user asks a question, the system may analyze the conversation history
- An LLM is used to extract relevant information from previous messages
- This analysis focuses on:
  - User preferences (likes, dislikes, favorites)
  - Personal information shared by the user
  - Previous topics related to the current query
  - Commitments or promises made by the assistant
- The analysis is included in the context sent to the LLM for generating responses

### Follow-up Detection
- The system detects when a user asks a follow-up question about something just mentioned
- An LLM is used to determine if the current query is a follow-up to the previous response
- If it is a follow-up, the system:
  - Extracts key entities from the previous response
  - Enhances the search query with these entities
  - Adds a special reminder to the LLM about the previous response
- This ensures continuity in the conversation and prevents the LLM from "forgetting" what it just said

## User Preferences

### Extraction
- When a user expresses a preference (e.g., "I like Corvettes"), the system detects it
- An LLM is used to extract the preference in a clean format
- The preference is stored as metadata with the message

### Storage and Retrieval
- Preferences are stored in the database as part of message metadata
- When loading conversation history, preferences are extracted from metadata
- Unique preferences are added to the system prompt for the LLM
- This ensures the LLM remembers user preferences across multiple chat sessions

## Search Process

### Query Intent Analysis
- For complex queries, an LLM is used to determine the search strategy:
  - REGULAR_SEARCH: Standard semantic search for information
  - URL_SEARCH: The user is specifically asking for URLs or links
  - BEST_CONTENT: The user is asking for the best/top/recommended content

### Search Strategies

#### URL Search
- Retrieves URLs from sites matching the profile's site patterns
- Sorts by recency (most recent first)
- Formats results as a list of URLs with titles and site names

#### Best Content Search
- Retrieves pages with titles and summaries from matching sites
- Sorts by a quality heuristic (currently content length)
- Formats results as a list of the best articles with summaries

#### Regular Search
- If the profile specifies site patterns, searches each matching site separately
- Otherwise, searches all sites
- Uses hybrid search (vector + text) for best results
- Formats results grouped by site

### Hybrid Search Process
The system uses a sophisticated hybrid search approach that combines vector similarity with text matching:

1. **Vector Search Component**:
   - Generate an embedding for the query using OpenAI's embedding model
   - Search the database for documents with similar embeddings
   - Filter results based on similarity threshold and site ID (if specified)
   - Sort results by similarity score

2. **Text Search Component**:
   - Parse the query for keywords
   - Search the database for documents containing those keywords
   - Filter results based on site ID (if specified)
   - Sort results by relevance

3. **Combined Results**:
   - Merge results from both search methods
   - Remove duplicates
   - Prioritize results that appear in both search methods
   - Return the top results based on the limit

This hybrid approach ensures that even when vector similarity might not find exact matches, the text search component can still retrieve relevant information. The system automatically adjusts the search strategy based on the query type and available content.

## Response Generation

### Context Assembly
1. System prompt from the profile
2. User information (name, preferences)
3. Current date and time
4. Conversation history (sliding window)
5. Current query
6. Follow-up context (if applicable)
7. Conversation analysis (if applicable)
8. Search results

### LLM Processing
- All context is sent to the LLM (OpenAI API)
- The LLM generates a response based on the context
- The response is formatted and displayed to the user
- The response is saved to the conversation history

## Command Flow

### Starting a Chat Session
1. Parse command-line arguments
2. Load profiles from the specified directory
3. Set up the session ID (from parameter, environment variable, or generate new)
4. Initialize the ChatBot with the specified parameters
5. Load conversation history for the session
6. Display welcome message and session information
7. Start the chat loop

### Chat Loop
1. Get user input
2. Check for special commands (exit, clear, history, profiles, profile)
3. If not a command, process as a query:
   - Show "Thinking..." indicator
   - Get response from the LLM
   - Display the response
4. Repeat until user exits

### Processing a Query
1. Add user message to conversation history
2. Check for special query types (user info, time)
3. Check if it's a follow-up question
4. Search for relevant context
5. Analyze conversation history
6. Assemble context for the LLM
7. Generate response using the LLM
8. Add assistant message to conversation history
9. Return the response

## Configuration Options

### Environment Variables
- `OPENAI_API_KEY`: API key for OpenAI
- `CHAT_MODEL`: OpenAI model to use for chat (default: gpt-4o)
- `CHAT_RESULT_LIMIT`: Maximum number of search results (default: 5)
- `CHAT_SIMILARITY_THRESHOLD`: Similarity threshold for vector search (default: 0.5)
- `CHAT_SESSION_ID`: Default session ID
- `CHAT_USER_ID`: Default user ID
- `CHAT_PROFILE`: Default chat profile (default: default)
- `CHAT_PROFILES_DIR`: Directory containing profile YAML files (default: profiles)
- `CHAT_VERBOSE`: Enable verbose debug output (default: false)

### Command-Line Parameters
- `--model`: OpenAI model to use
- `--limit`: Maximum number of search results
- `--threshold`: Similarity threshold for vector search
- `--session`: Session ID for the conversation
- `--user`: User ID for the conversation
- `--profile`: Chat profile to use
- `--profiles-dir`: Directory containing profile YAML files
- `--new-session`: Start a new session (ignore saved session ID)
- `--verbose`: Enable verbose debug output

### Profile Settings (YAML)
```yaml
name: profile_name
description: Profile description
system_prompt: |
  Instructions for the LLM
search_settings:
  sites: ["site1", "site2"]  # Site patterns to search
  threshold: 0.6  # Similarity threshold
  limit: 8  # Result limit
```

## LLM Usage Throughout the System

| Component | Purpose | Model Used |
|-----------|---------|------------|
| Embeddings | Generate vector embeddings for search | text-embedding-3-small |
| Title/Summary Generation | Create titles and summaries for crawled content | gpt-4o-mini |
| Chat Responses | Generate responses to user queries | gpt-4o (configurable) |
| Conversation Analysis | Extract relevant information from conversation history | Same as chat model |
| Follow-up Detection | Determine if a query is a follow-up question | Same as chat model |
| Entity Extraction | Extract key entities from previous responses | Same as chat model |
| Preference Extraction | Extract user preferences from messages | Same as chat model |
| Query Intent Analysis | Determine the best search strategy | Same as chat model |

## Complete Flow Example

### Scenario: Returning User Asks About a Topic

1. **Startup**:
   - User starts chat with `python chat.py --user Joe --session abc123 --verbose`
   - System loads profiles from the profiles directory
   - ChatBot is initialized with the specified user and session
   - System enables verbose debug output
   - System loads conversation history for session abc123
   - System extracts user preferences from the conversation history
   - Welcome message and session information are displayed

2. **User Query**:
   - User asks "Tell me more about Corvettes"
   - System adds user message to conversation history

3. **Query Processing**:
   - System checks if this is a follow-up question (in this case, it's not)
   - System uses an LLM to analyze the query intent (REGULAR_SEARCH)
   - System searches for relevant context using the regular search strategy
   - System filters search results based on the profile's site patterns
   - System formats the search results

4. **Conversation Analysis**:
   - System analyzes the conversation history using an LLM
   - System extracts that the user likes Corvettes (from previous messages)
   - System includes this information in the context

5. **Response Generation**:
   - System assembles the context:
     - System prompt from the profile
     - User information ("The user's name is Joe")
     - Current date and time
     - User preferences ("User likes Corvettes")
     - Conversation history
     - Current query
     - Conversation analysis
     - Search results
   - System sends the context to the LLM
   - LLM generates a response
   - System adds the response to the conversation history
   - System displays the response to the user

6. **Follow-up Query**:
   - User asks "What's the best model?"
   - System adds user message to conversation history
   - System detects this is a follow-up question about Corvettes
   - System extracts key entities from the previous response (Corvettes, models, etc.)
   - System enhances the search query with these entities
   - System searches for relevant context
   - System includes the previous response in the context
   - System generates and displays a response

This flow demonstrates how the system maintains context, remembers user preferences, and provides continuity in the conversation, even across multiple chat sessions.

## Clearing Conversation History

### Clear Current Session
- Command: `clear`
- Deletes all messages for the current session from the database
- Resets the in-memory conversation history
- Adds a new system message with the profile's system prompt

### Clear All Sessions
- Command: `clear all`
- Requires confirmation
- Deletes all messages for all sessions from the database
- Resets the in-memory conversation history
- Adds a new system message with the profile's system prompt

## Error Handling

- Database connection errors: Fallback to chat-only mode
- LLM API errors: Display error message and continue
- User interruptions (Ctrl+C): Graceful handling with option to continue
- Empty queries: Prompt for valid input
- Invalid commands: Display help message 

## Docker Deployment Options

The system can be deployed using Docker in three different configurations, each offering different levels of integration and complexity. This section provides detailed information about each option, including setup instructions, configuration details, and troubleshooting tips.

### 1. API-Only Docker Deployment

This is the simplest deployment option, containerizing only the API service while relying on external Supabase and Crawl4AI instances.

#### Components
- **Containerized**: API service
- **External**: Supabase database, Crawl4AI service

#### Configuration
The API-only deployment uses the root `.env` file for configuration. Key environment variables:

```env
# External Supabase configuration
SUPABASE_URL=your_supabase_host:port
SUPABASE_DB=postgres
SUPABASE_KEY=postgres
SUPABASE_PASSWORD=postgres

# External Crawl4AI configuration
CRAWL4AI_API_TOKEN=your_crawl4ai_api_token
CRAWL4AI_BASE_URL=your_crawl4ai_base_url
```

#### Setup and Deployment

1. Build and start the container:
   ```bash
   docker-compose -f docker/docker-compose.yml up -d
   ```

2. Access the API:
   - API: http://localhost:8001
   - API Documentation: http://localhost:8001/docs
   - Supabase Explorer: http://localhost:8501

3. Interact with the container:
   ```bash
   # Execute commands inside the container
   docker exec -it supachat-api bash
   
   # Run a crawl from inside the container
   python run_crawl.py
   
   # Start a chat session from inside the container
   python chat.py
   ```

#### Network Architecture
- The API container exposes ports 8001 (API) and 8501 (Supabase Explorer)
- The container connects to external Supabase and Crawl4AI services over the internet
- No internal Docker network is used for service communication

### 2. API + Crawl4AI Docker Deployment

This option containerizes both the API service and the Crawl4AI service, creating a more integrated deployment while still relying on an external Supabase instance.

#### Components
- **Containerized**: API service, Crawl4AI service
- **External**: Supabase database

#### Configuration
This deployment uses the root `.env` file with specific settings for the Crawl4AI service:

```env
# External Supabase configuration
SUPABASE_URL=your_supabase_host:port
SUPABASE_DB=postgres
SUPABASE_KEY=postgres
SUPABASE_PASSWORD=postgres

# Crawl4AI configuration (automatically set in the container)
CRAWL4AI_API_TOKEN=your_crawl4ai_api_token
# CRAWL4AI_BASE_URL=http://crawl4ai:11235  # Uncomment in container, comment out for local use
```

#### Setup and Deployment

1. Build and start the containers:
   ```bash
   docker-compose -f docker/crawl4ai-docker-compose.yml up -d
   ```

2. Access the services:
   - API: http://localhost:8001
   - API Documentation: http://localhost:8001/docs
   - Supabase Explorer: http://localhost:8501
   - Crawl4AI: http://localhost:11235

3. Interact with the containers:
   ```bash
   # Execute commands inside the API container
   docker exec -it supachat-api bash
   
   # Run a crawl from inside the container
   python run_crawl.py
   
   # Check Crawl4AI logs
   docker logs supachat-crawl4ai
   ```

#### Network Architecture
- Both containers are connected via an internal Docker network named `supachat-network`
- The API container communicates with the Crawl4AI container using the service name `crawl4ai`
- The API container connects to the external Supabase instance over the internet
- Ports 8001 (API), 8501 (Supabase Explorer), and 11235 (Crawl4AI) are exposed to the host

### 3. Full-Stack Docker Deployment

The most comprehensive deployment option, containerizing the entire stack: API service, Crawl4AI service, and Supabase (including database, Kong API gateway, and other Supabase services).

#### Components
- **Containerized**: 
  - API service
  - Crawl4AI service
  - Supabase services:
    - PostgreSQL database
    - Kong API gateway
    - Supabase Studio
    - Meta service
    - REST API

#### Configuration
The full-stack deployment uses a separate `.env` file located in the `docker/` directory:

```env
# API Configuration
OPENAI_API_KEY=your_openai_api_key
CRAWL4AI_API_TOKEN=your_crawl4ai_api_token
CRAWL4AI_BASE_URL=http://crawl4ai:11235

# OpenAI Models
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
OPENAI_CONTENT_MODEL=gpt-4o-mini
CHAT_MODEL=gpt-4o

# Supabase Configuration
POSTGRES_PASSWORD=your-super-secret-and-long-postgres-password
JWT_SECRET=your-super-secret-jwt-token-with-at-least-32-characters
ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
DASHBOARD_PASSWORD=your-dashboard-password

# Connection Information for Application
SUPABASE_HOST=db
SUPABASE_PORT=5432
SUPABASE_DB=postgres
SUPABASE_PASSWORD=${POSTGRES_PASSWORD}
```

#### Setup and Deployment

1. Navigate to the docker directory:
   ```bash
   cd docker
   ```

2. Run the setup script to create necessary files:
   ```bash
   chmod +x setup.sh
   ./setup.sh
   ```

3. Edit the Docker-specific `.env` file:
   ```bash
   nano .env
   ```

4. Start all services:
   ```bash
   docker-compose -f full-stack-compose.yml up -d
   ```

5. Access the services:
   - API: http://localhost:8001
   - API Documentation: http://localhost:8001/docs
   - Supabase Studio: http://localhost:3001
   - Kong API Gateway: http://localhost:8002
   - Crawl4AI: http://localhost:11235

6. Check service status:
   ```bash
   ./status.sh
   ```

7. Reset everything (if needed):
   ```bash
   ./reset.sh
   ```

#### Network Architecture
- All containers are connected via an internal Docker network named `supachat-network`
- The API container communicates with the database using direct connection parameters:
  - Host: `db`
  - Port: `5432`
- The API container communicates with Crawl4AI using the service name `crawl4ai`
- Persistent data is stored in Docker volumes:
  - `pgdata`: PostgreSQL database files
  - `volumes/db/init`: Database initialization scripts
  - `volumes/api`: API configuration files
  - `volumes/shm`: Shared memory for Crawl4AI

#### Troubleshooting

1. **Database Connection Issues**:
   - Check if the database container is healthy: `docker ps | grep supachat-db`
   - Verify the database credentials in the `.env` file
   - Ensure the API container is using the correct connection parameters:
     ```
     SUPABASE_HOST=db
     SUPABASE_PORT=5432
     ```

2. **Kong API Gateway Issues**:
   - The API should connect directly to the database, not through Kong
   - If seeing SSL negotiation errors, ensure `SUPABASE_URL` is unset or empty
   - Check Kong logs: `docker logs supachat-kong`

3. **Missing Database Tables**:
   - The setup script should create all necessary tables
   - If tables are missing, you can manually set up the database:
     ```bash
     docker exec -it supachat-api python main.py setup
     ```

4. **Restarting Services**:
   - Restart a specific service:
     ```bash
     docker-compose -f full-stack-compose.yml restart api
     ```
   - Restart all services:
     ```bash
     docker-compose -f full-stack-compose.yml down
     docker-compose -f full-stack-compose.yml up -d
     ```

### Docker Volumes and Data Persistence

The full-stack Docker setup uses several volumes to persist data:

1. **pgdata**: Stores PostgreSQL database files
   - Location: Docker managed volume
   - Content: All database data, including tables, indexes, and stored procedures
   - Persistence: Survives container restarts and rebuilds

2. **volumes/db/init**: Contains database initialization scripts
   - Location: `docker/volumes/db/init/`
   - Content:
     - `00-initial-schema.sql`: Initial Supabase schema
     - `03-post-setup.sql`: Post-setup configuration
     - `04-app-tables.sql`: Application-specific tables
   - Execution: Scripts run in alphabetical order when the database container is first initialized

3. **volumes/api**: Contains API configuration files
   - Location: `docker/volumes/api/`
   - Content: `kong.yml` - Kong API gateway configuration

4. **volumes/shm**: Shared memory for Crawl4AI
   - Location: `docker/volumes/shm/`
   - Content: Temporary files used by Crawl4AI for browser automation
   - Note: This directory should be excluded from version control

### Docker Networking

The full-stack setup creates a custom bridge network named `supachat-network` that allows containers to communicate with each other using service names as hostnames:

- `api` → `db`: Direct PostgreSQL connection (port 5432)
- `api` → `crawl4ai`: HTTP connection (port 11235)
- `studio` → `meta`: HTTP connection (port 8080)
- `studio` → `kong`: HTTP connection (port 8000)
- `kong` → `rest`: HTTP connection (port 3000)
- `kong` → `meta`: HTTP connection (port 8080)

This network isolation provides security benefits and simplifies container communication without exposing unnecessary ports to the host system.

### Environment Variable Precedence

When using Docker, environment variables are resolved in the following order (highest precedence first):

1. Variables defined in the `environment` section of the Docker Compose file
2. Variables defined in the `.env` file in the same directory as the Docker Compose file
3. Variables defined in the container's environment

This precedence order is important to understand when troubleshooting configuration issues. 