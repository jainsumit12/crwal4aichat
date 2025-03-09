# Crawl4AI with Supabase Vector Search and Chat

This project integrates a Crawl4AI api with Supabase and LLM Chat to create a powerful web crawling and semantic search solution. It crawls websites, stores the content in a Supabase database with vector embeddings, and provides semantic search capabilities with real Chat memory.

## Features

- Crawl websites and sitemaps using Crawl4AI
- Generate vector embeddings using OpenAI's embedding models
- Store crawled content and embeddings in a Supabase database
- Automatically generate titles and summaries for crawled content using OpenAI
- Auto-generate site descriptions if not provided
- Perform semantic search using vector similarity
- Command-line interface for easy usage
- Chat interface for interacting with crawled data using an LLM
- Configuration via `.env` file for easy switching between URLs/sitemaps
- Automatic content chunking for better LLM interaction and search precision
- Configurable limits for sitemap crawling to control resource usage

![Image](https://github.com/user-attachments/assets/34d79a96-2d60-4221-a1f7-3a8582129855)

## Prerequisites

- Python 3.10+
- A running Crawl4AI instance (self-hosted or cloud)
- A Supabase instance (local or cloud)
- OpenAI API key for generating embeddings and content summaries

## Installation

1. Clone this repository:
   ```
   git clone https://github.com/bigsk1/supa-crawl-chat.git
   cd supa-crawl-chat
   ```

2. Install the required dependencies:
   ```
   pip install -r requirements.txt
   ```

3. Create a `.env` file with your configuration:

   ```env
   # Crawl4AI Configuration
   CRAWL4AI_API_TOKEN=your_crawl4ai_api_token
   CRAWL4AI_BASE_URL=your_crawl4ai_base_url

   # Supabase Configuration
   # With protocol (for remote instances)
   # SUPABASE_URL=https://your-project.supabase.co:5432
   
   # Without protocol (for local instances)
   SUPABASE_URL=192.168.xx.xx:54322
   # Database credentials (required for both options)
   SUPABASE_DB=postgres
   SUPABASE_KEY=postgres
   SUPABASE_PASSWORD=postgres

   # OpenAI Configuration
   OPENAI_API_KEY=your_openai_api_key
   # Model to use for embeddings
   OPENAI_EMBEDDING_MODEL=text-embedding-3-small
   # Model to use for title and summary generation
   OPENAI_CONTENT_MODEL=gpt-4o-mini
   
   # Crawl Configuration
   # Set to 'url' for regular website or 'sitemap' for sitemap crawling
   CRAWL_TYPE=url
   # URL to crawl (can be a website URL or sitemap URL)
   CRAWL_URL=https://example.com
   # Maximum number of URLs to crawl from a sitemap (set to 0 for unlimited)
   MAX_URLS=50
   # Optional name for the site (if not provided, one will be generated)
   CRAWL_SITE_NAME=
   # Optional description for the site
   CRAWL_SITE_DESCRIPTION=
   # Number of results to retrieve for each query
   CHAT_RESULT_LIMIT=5
   # Similarity threshold for vector search (0-1)
   CHAT_SIMILARITY_THRESHOLD=0.7 
   # Default session ID (if not provided, a new one will be generated)
   CHAT_SESSION_ID=
   # Default user ID (optional, name, user, i.e. pete)
   CHAT_USER_ID=
   # Default chat profile (default, pydantic, technical, concise,  etc. see profiles directory)
   CHAT_PROFILE=default
   # Directory containing profile YAML files
   CHAT_PROFILES_DIR=profiles 
   ```

## Database Connection Options

The project supports two ways to connect to your Supabase database:

1. **Single URL** (Option 1): Use this for both local and remote connections. The URL can be specified with or without protocol.
   ```
   # With protocol (for remote instances)
   SUPABASE_URL=https://your-project.supabase.co:5432
   
   # Without protocol (for local instances)
   SUPABASE_URL=192.168.xx.xx:54322
   ```

You'll need to provide the database credentials:

   ```env
   SUPABASE_DB=postgres
   SUPABASE_KEY=postgres
   SUPABASE_PASSWORD=postgres
   ```

## Content Chunking for LLM Interaction

The system automatically breaks down large content into smaller, more manageable chunks for better LLM interaction and more precise search results. This provides several benefits:

1. **Improved Search Precision**: Instead of matching against entire pages, the system can find the specific chunk that best answers a query.

2. **Efficient Token Usage**: When interacting with LLMs, only the relevant chunks are sent, reducing token usage and costs.

3. **Better Context Management**: Each chunk maintains a reference to its parent page, preserving the full context.

4. **Automatic Token Limit Handling**: Content is automatically chunked to stay within the token limits of the embedding model (8,192 tokens for text-embedding-3-small).

### How Chunking Works

The system uses a sophisticated semantic chunking strategy:

1. **Semantic Boundary Detection**: Content is first split along natural semantic boundaries:
   - Markdown headers (e.g., `# Section Title`)
   - Paragraph breaks
   - This preserves the meaning and context of each chunk

2. **Token-Based Sizing**: Each section is then analyzed to ensure it fits within token limits:
   - Sections that fit are kept together
   - Sections that exceed limits are further split with token-based chunking
   - A 200-token overlap is maintained between chunks for context continuity

3. **Smart Overlap**: When creating overlaps between chunks, the system looks for natural break points:
   - Paragraph breaks
   - Sentence endings
   - Clause breaks
   - Word boundaries

4. **Metadata Preservation**: Each chunk maintains references to:
   - Its parent document
   - Its position in the sequence (chunk index)
   - Its token count

This approach ensures that chunks are not only sized appropriately for LLMs but also maintain semantic coherence, making them more useful for search and retrieval.

### Configuring Chunking

You can adjust the chunking parameters in the code:

```python
# In crawler.py, enhance_pages method
enhanced_pages = asyncio.run(self.enhance_pages(pages, max_tokens_per_chunk=4000))
```

The default settings are:
- `max_tokens_per_chunk`: 4,000 tokens (half of the 8,192 token limit for safety)
- `overlap_tokens`: 200 tokens (overlap between chunks to maintain context)

## Testing the Setup

Before using the crawler, you can test your setup:

1. Test the database connection:
   ```
   python tests/test_db_connection.py
   ```

2. Test the Crawl4AI API:
   ```
   python tests/test_crawl_api.py
   ```

## Usage

### Setting up the database

Before using the crawler, you need to set up the database:

```
python main.py setup
```

This will create the necessary tables and extensions in your Supabase database.

If you're upgrading from a previous version without chunking support, run the migration script:

```
python tests/migrate_db_for_chunking.py
```

### Crawling a website

You can crawl a website in two ways:

1. Using the command-line interface:
   ```
   python main.py crawl https://example.com --name "Example Site" --description "An example website"
   ```

   To crawl a sitemap:
   ```
   python main.py crawl https://example.com/sitemap.xml --sitemap --name "Example Site"
   ```

   You can limit the number of URLs to crawl from the sitemap:
   ```
   python main.py crawl https://example.com/sitemap.xml --sitemap --max-urls 20
   ```

   Note: If you don't provide a description, the system will automatically generate one based on the content of the homepage or main page.

2. Using the `.env` file configuration:
   
   First, update the `.env` file with your crawl settings:
   ```
   CRAWL_TYPE=url  # or 'sitemap' for sitemap crawling
   CRAWL_URL=https://example.com
   CRAWL_SITE_NAME=Example Site
   CRAWL_SITE_DESCRIPTION=An example website  # Optional - will be auto-generated if empty
   ```

   Then run:
   ```
   python run_crawl.py
   ```


### Title and Summary Generation

The crawler automatically generates titles and summaries for crawled content using OpenAI. You can configure the model used for this in the `.env` file:

```
OPENAI_CONTENT_MODEL=gpt-4o-mini
```

#### Updating Existing Content

If you have existing pages without titles or summaries, or if you want to regenerate them with a different model, you can use the `update_content.py` script:

```
# Update all sites
python update_content.py

# Update a specific site
python update_content.py --site-id 1

# Limit the number of pages to update
python update_content.py --limit 50

# Force update all pages, even if they already have titles and summaries
python update_content.py --force
```

### Searching the crawled content

To search the crawled content using semantic search:

```
python main.py search "your search query"
```

To use text-based search instead of semantic search:

```
python main.py search "your search query" --text-only
```

To adjust the similarity threshold and limit the number of results:

```
python main.py search "your search query" --threshold 0.8 --limit 5
```

To save the search results to a file:

```
python main.py search "your search query" --output results.json
```

### Listing crawled sites

To list all the sites that have been crawled:

```
python main.py list-sites
```

By default, this only counts parent pages (not chunks). To include chunks in the page count:

```
python main.py list-sites --include-chunks
```

### Working with Chunks

When retrieving or searching content, you can control whether chunks are included:

```python
# Get pages for a site (parent pages only)
pages = crawler.get_site_pages(site_id, limit=100)

# Get pages for a site including chunks
pages_with_chunks = crawler.get_site_pages(site_id, limit=100, include_chunks=True)
```

When searching, chunks are automatically included and prioritized for more precise results. Each chunk includes context about its parent document:

```
python main.py search "your search query"
```

The search results will include:
- The content snippet that matched your query
- Which document it came from
- Which part of the document it represents (e.g., "Part 2 of 5")

This makes it easier to understand the context of each search result, even when it's a small chunk of a larger document.

### Using the chat interface

The project includes a chat interface that uses an LLM to answer questions based on the crawled data. The chat interface now supports persistent conversation history, allowing the LLM to remember previous interactions even after restarting the application.

You can start the chat interface using either the dedicated script or the main CLI:

```bash
# Using the dedicated script
python chat.py

# Using the main CLI
python main.py chat
```

#### Chat Interface Options

You can customize the chat interface with various options:

```bash
# Specify a different OpenAI model
python main.py chat --model gpt-4

# Set the maximum number of search results to retrieve
python main.py chat --limit 10

# Adjust the similarity threshold for vector search (0-1)
python main.py chat --threshold 0.6

# Use a specific session ID for persistent conversations
python main.py chat --session my-chat-session

# Associate the conversation with a specific user
python main.py chat --user John
```

#### Persistent Conversation History

The chat interface stores all conversation history in the database, allowing the LLM to remember previous interactions. This enables more natural and contextual conversations over time.

Key features:
- **Session-based conversations**: Each conversation gets a unique session ID
- **User identification**: Optionally associate conversations with specific users
- **Conversation continuity**: Continue conversations where you left off, even after restarting
- **Chat commands**:
  - Type `clear` to clear the conversation history
  - Type `history` to view the conversation history
  - Type `exit` to quit the chat interface

**Important**: To maintain the same conversation across multiple chat sessions, you must use the same session ID. The session ID is displayed when you start the chat interface. You can specify it before starting a new chat session:

```bash
# Start a new chat session
python chat.py --user Joe
# Note the session ID displayed (e.g., "Session ID: a24b6b72-e526-4a09-b662-0f85e82f78a7")

# Later, continue the same conversation by specifying the session ID
python chat.py --user Joe --session a24b6b72-e526-4a09-b662-0f85e82f78a7
```

You can also set a default session ID in your `.env` file:

```
CHAT_SESSION_ID=your-session-id
```

This way, the chat interface will always use the same session ID unless you explicitly specify a different one with the `--session` parameter.

#### User Preferences and Memory

The chat interface can remember user preferences and information shared during conversations, as long as you use the same session ID. For example:
- If you tell the assistant "I like Corvettes" in one session
- Then in a later session (using the same session ID), ask "What cars do I like?"
- The assistant will remember and respond with "You like Corvettes"

This memory persistence works by:
1. Storing all messages in the database with the session ID
2. Analyzing conversation history when relevant questions are asked
3. Extracting user preferences and information from previous messages

To get the most out of this feature, always use the same session ID and user ID when you want the assistant to remember previous conversations.

#### Chat Profiles

The chat interface supports different profiles that customize the behavior of the assistant. Each profile has its own system prompt, search settings, and site filtering capabilities.

Built-in profiles:
- **default**: General-purpose assistant that searches all sites
- **pydantic**: Specialized for Pydantic documentation, focusing on technical details and code examples
- **technical**: Provides detailed technical explanations with step-by-step instructions
- **concise**: Gives brief, to-the-point answers without unnecessary details
- **bigsk1_expert**: Expert on bigsk1.com technical documentation

You can switch profiles during a chat session:
```
profile pydantic
```

Or start with a specific profile:
```bash
python main.py chat --profile technical
```

You can also view all available profiles:
```
profiles
```

#### How Site Filtering Works

The `sites` array in each profile's `search_settings` controls which sites the assistant searches through when answering questions:

```yaml
search_settings:
  sites: ["pydantic"]  # Only search in sites with "pydantic" in the name
  threshold: 0.6
  limit: 8
```

Here's how the filtering works:

1. **Empty array (`sites: []`)**: Searches across ALL sites in the database
2. **Site patterns**: Filters to only include sites where the site name contains any of the specified patterns
3. **Pattern matching**: Uses case-insensitive partial matching, so `"bigsk1"` would match site names like "Bigsk1 Com", "bigsk1.com", etc.
4. **Multiple patterns**: You can include multiple patterns to search across several related sites

The filtering process:
- When a user asks a question, the system looks at the current profile's `sites` setting
- It queries the `crawl_sites` table to find site IDs where the name contains any of the patterns
- It then only searches for content in pages associated with those site IDs
- This allows profiles to focus on specific content sources, making responses more relevant

#### Custom Profiles

You can create your own custom profiles by adding YAML files to the `profiles` directory. Each profile file should include:

- `name`: The name of the profile (used to select it)
- `description`: A brief description of the profile
- `system_prompt`: The system prompt that defines the assistant's behavior
- `search_settings`: Configuration for search behavior
  - `sites`: List of site name patterns to filter by (empty list means search all sites)
  - `threshold`: Similarity threshold for vector search (0-1)
  - `limit`: Maximum number of results to return

Example profile file (`profiles/custom_expert.yaml`):
```yaml
name: custom_expert
description: Custom expert for specific documentation
system_prompt: |
  You are an expert on [specific topic].
  
  Your expertise includes:
  - [Area of expertise 1]
  - [Area of expertise 2]
  - [Area of expertise 3]
  
  When answering questions:
  - [Instruction 1]
  - [Instruction 2]
  - [Instruction 3]

search_settings:
  sites: ["site1", "site2"]  # Only search in sites containing these terms
  threshold: 0.6  # Higher threshold for more precise matches
  limit: 8  # Number of results to return
```

You can specify a custom profiles directory:
```bash
python main.py chat --profiles-dir my_profiles
```

#### Configuration via .env

You can set default values for the chat interface in your `.env` file:

```
# Chat Configuration
CHAT_MODEL=gpt-4o-mini
CHAT_RESULT_LIMIT=5
CHAT_SIMILARITY_THRESHOLD=0.5
CHAT_SESSION_ID=default-session
CHAT_USER_ID=default-user
CHAT_PROFILE=default
CHAT_PROFILES_DIR=profiles
```

This allows you to maintain consistent settings and continue the same conversation across multiple sessions.

### Resetting the database

If you want to start fresh and delete all data or recreate the tables, you can use the `reset_database.py` script:

```
python tests/reset_database.py
```

This script provides two options:
1. Delete all data (keep tables) - This will delete all data from the tables but keep the table structure.
2. Drop and recreate tables - This will drop the tables and recreate them, effectively starting from scratch.

### Programmatic usage

You can also use the crawler programmatically in your own Python code. See `tests/example.py` for a demonstration.

## Project Structure

- `main.py`: Main script with command-line interface
- `crawler.py`: Main crawler class that ties everything together
- `crawl_client.py`: Client for interacting with the Crawl4AI API
- `embeddings.py`: Module for generating OpenAI embeddings
- `content_enhancer.py`: Module for generating titles and summaries using OpenAI
- `db_client.py`: Client for interacting with the Supabase database
- `db_setup.py`: Script for setting up the database
- `chat.py`: Chat interface for interacting with crawled data using an LLM
- `run_crawl.py`: Script to run a crawl using the configuration from the `.env` file
- `update_content.py`: Script to update existing pages with titles and summaries
- `utils.py`: Utility functions for the CLI
- `tests/`: Directory containing test scripts
  - `example.py`: Example script demonstrating programmatic usage
  - `test_db_connection.py`: Script to test the database connection
  - `test_crawl_api.py`: Script to test the Crawl4AI API
  - `reset_database.py`: Script to delete tables or reset the database

## Database Structure

The project uses the following tables in the Supabase database:

1. `crawl_sites`: Stores information about the sites you've crawled
   - `id`: Primary key
   - `name`: Name of the site
   - `url`: URL of the site
   - `description`: Optional description of the site
   - `created_at`: Timestamp when the site was added

2. `crawl_pages`: Stores the actual content, embeddings, titles, and summaries for each page
   - `id`: Primary key
   - `site_id`: Foreign key referencing the `crawl_sites` table
   - `url`: URL of the page (unique)
   - `title`: Title of the page
   - `content`: Content of the page
   - `summary`: Summary of the page
   - `embedding`: Vector embedding of the content
   - `metadata`: Additional metadata about the page
   - `is_chunk`: Boolean indicating if this is a chunk of a larger page
   - `chunk_index`: Index of the chunk within the parent page
   - `parent_id`: Foreign key referencing the parent page
   - `created_at`: Timestamp when the page was added
   - `updated_at`: Timestamp when the page was last updated

3. `chat_conversations`: Stores conversation history for the chat interface
   - `id`: Primary key
   - `session_id`: Unique identifier for the conversation session
   - `user_id`: Optional identifier for the user
   - `timestamp`: Timestamp when the message was sent
   - `role`: Role of the message sender (user, assistant, system)
   - `content`: Content of the message
   - `metadata`: Additional metadata about the message

When you crawl a site multiple times, the system will update existing pages rather than creating duplicates, ensuring you always have the most recent content. Similarly, the chat interface will maintain conversation history across sessions, allowing for more natural and contextual interactions.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
