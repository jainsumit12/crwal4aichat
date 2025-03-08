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

### Vector Search Process
1. Generate an embedding for the query using OpenAI's embedding model
2. Search the database for documents with similar embeddings
3. Filter results based on similarity threshold and site ID (if specified)
4. Sort results by similarity score
5. Return the top results based on the limit

### Text Search Process
1. Parse the query for keywords
2. Search the database for documents containing those keywords
3. Filter results based on site ID (if specified)
4. Sort results by relevance
5. Return the top results based on the limit

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

### Command-Line Parameters
- `--model`: OpenAI model to use
- `--limit`: Maximum number of search results
- `--threshold`: Similarity threshold for vector search
- `--session`: Session ID for the conversation
- `--user`: User ID for the conversation
- `--profile`: Chat profile to use
- `--profiles-dir`: Directory containing profile YAML files
- `--new-session`: Start a new session (ignore saved session ID)

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
   - User starts chat with `python chat.py --user Joe --session abc123`
   - System loads profiles from the profiles directory
   - ChatBot is initialized with the specified user and session
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