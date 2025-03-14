import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTheme } from '@/context/ThemeContext';
import ReactMarkdown from 'react-markdown';

const UserGuidePage: React.FC = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [activeTab, setActiveTab] = useState('overview');

  // Extract sections from markdown
  const sections = {
    overview: "# Supa Crawl Chat Docs\n\nThis document provides a detailed explanation of all the components, flows, and interactions in the Crawl4AI system.\n\n![Crawl4AI System Diagram](https://imagedelivery.net/WfhVb8dSNAAvdXUdMfBuPQ/92227574-9331-49d0-535f-1f21c9b14f00/public)",
    components: "## Core Components\n\n### 1. Database (Supabase)\n- Stores crawled content, embeddings, site information\n- Maintains conversation history\n- Stores user preferences and metadata\n\n### 2. LLM Integration (OpenAI)\n- Used for multiple purposes throughout the system:\n  - Generating embeddings for vector search\n  - Creating titles and summaries for crawled content\n  - Analyzing conversation history\n  - Understanding query intent\n  - Generating responses to user queries\n  - Extracting user preferences\n\n### 3. Crawler\n- Fetches content from websites\n- Processes and chunks content\n- Stores content in the database\n\n### 4. Chat Interface\n- Provides interactive command-line interface\n- Manages conversation flow\n- Handles user commands\n- Displays formatted responses\n\n### 5. Frontend UI\n- Provides a modern web-based user interface\n- Visualizes crawled data and search results\n- Offers an interactive chat experience\n- Manages site and page administration",
    frontend: "## Frontend Architecture and Components\n\nThe frontend is built using React with TypeScript, providing a modern, responsive user interface for interacting with the Crawl4AI system. This section details the architecture, components, and data flows within the frontend.",
    flows: "## Frontend-Specific Flows\n\n### Site Management Flow\n1. User navigates to the Sites page\n2. Frontend fetches the list of sites from `/api/sites`\n3. Sites are displayed in a sortable, filterable table\n4. User can:\n   - Click on a site to view details\n   - Refresh the site list\n   - Delete a site (with confirmation)\n5. When viewing a site, the frontend fetches:\n   - Site details from `/api/sites/{site_id}`\n   - Pages for the site from `/api/sites/{site_id}/pages`\n6. Pages are displayed with pagination, search, and filtering options\n\n### Chat Interface Flow\n1. User navigates to the Chat page\n2. Frontend initializes a chat session:\n   - Generates a new session ID or uses an existing one from local storage\n   - Fetches available profiles from `/api/chat/profiles`\n   - Loads conversation history for the session from `/api/chat/history`\n3. User sends a message:\n   - Message is displayed in the chat interface\n   - Request is sent to `/api/chat` with the message and session information\n   - \"Thinking\" indicator is displayed\n   - Response is received and displayed in the chat\n   - Chat history is updated\n4. User can:\n   - Change the active profile\n   - Clear the conversation history\n   - Copy the session ID for reference\n   - View and manage preferences extracted from the conversation\n\n### Crawl Initiation Flow\n1. User navigates to the Crawl page\n2. Frontend displays the crawl form\n3. User enters:\n   - URL to crawl\n   - Site name (optional)\n   - Site description (optional)\n   - Crawl type (URL or sitemap)\n   - Maximum URLs (for sitemaps)\n4. User submits the form\n5. Frontend sends a request to `/api/crawl`\n6. Progress indicator is displayed\n7. Frontend polls `/api/crawl/status/{site_id}` for updates\n8. Upon completion, success notification is displayed\n9. User is redirected to the site detail page\n\n### Search Flow\n1. User navigates to the Search page\n2. User enters a search query and optional parameters:\n   - Similarity threshold\n   - Result limit\n   - Site filter\n   - Search type (semantic or text-only)\n3. Frontend sends a request to `/api/search`\n4. Results are displayed grouped by site\n5. User can:\n   - Click on a result to view the full content\n   - Adjust search parameters and search again\n   - Sort and filter results",
    notifications: "### Notification System\n\nThe frontend implements a comprehensive notification system:\n\n1. **Types of Notifications**:\n   - Success: Positive action confirmations\n   - Error: Failed operations or system errors\n   - Info: Neutral information\n   - Warning: Potential issues requiring attention\n\n2. **Notification Components**:\n   - Toast notifications: Temporary pop-up messages\n   - Notification center: Persistent list of all notifications\n   - Notification settings: User preferences for notification behavior\n\n3. **Notification Flow**:\n   - Notification is created via `createNotification` function\n   - Notification is added to the notification store\n   - Toast is displayed (if not muted)\n   - Notification is added to the notification center\n   - Notification can be dismissed or marked as read\n\n4. **Mute Functionality**:\n   - Users can mute non-critical notifications\n   - Mute preference is stored in local storage\n   - Error notifications are always shown regardless of mute setting\n   - Muted notifications still appear in the notification center",
    preferences: "## User Preferences\n\n### Extraction\n- When a user expresses a preference (e.g., \"I like Corvettes\"), the system detects it\n- An LLM is used to extract the preference in a clean format\n- The preference is stored as metadata with the message\n\n### Storage and Retrieval\n- Preferences are stored in the database as part of message metadata\n- When loading conversation history, preferences are extracted from metadata\n- Unique preferences are added to the system prompt for the LLM\n- This ensures the LLM remembers user preferences across multiple chat sessions\n\n### Enhanced Preference System\n- Preferences are now stored in a dedicated `user_preferences` table for identified users\n- Each preference includes:\n\n```json\n{\n  \"id\": \"uuid\",\n  \"user_id\": \"uuid\",\n  \"preference_type\": \"like\",  // like, dislike, expertise, experience, goal, etc.\n  \"preference_value\": \"Corvettes\",\n  \"confidence\": 0.95,  // 0.0-1.0\n  \"context\": \"User mentioned liking Corvettes in conversation\",\n  \"created_at\": \"timestamp\",\n  \"updated_at\": \"timestamp\",\n  \"last_used\": \"timestamp\",\n  \"source_session\": \"uuid\",\n  \"is_active\": true,\n  \"metadata\": {}\n}\n```\n\n### Preference Management API\n\n```\nGET    /api/preferences                 # List all preferences\nPOST   /api/preferences                 # Create a new preference\nDELETE /api/preferences/{preference_id} # Delete a preference\nPATCH  /api/preferences/{preference_id} # Deactivate a preference\nDELETE /api/preferences                 # Clear all preferences\n```",
    search: "## Search Process\n\n### Query Intent Analysis\n- For complex queries, an LLM is used to determine the search strategy:\n\n```json\n{\n  \"strategy\": \"REGULAR_SEARCH\",  // Standard semantic search for information\n  // or \"URL_SEARCH\"            // The user is asking for URLs or links\n  // or \"BEST_CONTENT\"          // The user is asking for best/top content\n}\n```\n\n### Direct Site Matching\n- For simple queries that might be website names or domains:\n  - Domain detection for queries containing .com, .org, .net, etc.\n  - Site name matching for short queries without question words\n  - Direct retrieval of pages from matching sites\n  - Higher similarity scores assigned to direct matches\n  - This ensures reliable results for website-specific queries\n\n### Search API\n\n```\nGET /api/search?q={query}&threshold={threshold}&limit={limit}&site_id={site_id}&search_type={search_type}\n```\n\n### Search Strategies\n\n#### URL Search\n- Retrieves URLs from sites matching the profile's site patterns\n- Sorts by recency (most recent first)\n- Formats results as a list of URLs with titles and site names\n\n#### Best Content Search\n- Retrieves pages with titles and summaries from matching sites\n- Sorts by a quality heuristic (currently content length)\n- Formats results as a list of the best articles with summaries\n\n#### Regular Search\n- If the profile specifies site patterns, searches each matching site separately\n- Otherwise, searches all sites\n- Uses hybrid search (vector + text) for best results\n- Formats results grouped by site",
    docker: "## Docker Deployment Options\n\nThe system can be deployed using Docker in three different configurations, each offering different levels of integration and complexity.\n\n### 1. API-Only Docker Deployment\n\nThis is the simplest deployment option, containerizing only the API service while relying on external Supabase and Crawl4AI instances.\n\n### 2. API + Crawl4AI Docker Deployment\n\nThis option containerizes the API service, Frontend UI, and the Crawl4AI service, creating a more integrated deployment while still relying on an external Supabase instance.\n\n### 3. Full-Stack Docker Deployment\n\nThe most comprehensive deployment option, containerizing the entire stack: API service, Frontend UI, Crawl4AI service, and Supabase (including database, Kong API gateway, and other Supabase services).\n\nPlease see the Docker README for more info [Docker ReadMe](https://github.com/bigsk1/supa-crawl-chat/tree/main/docker/full-stack)"
  };

  // Custom renderer components for ReactMarkdown
  const renderers = {
    img: ({ node, ...props }: any) => (
      <span className="block my-6 text-center">
        <img 
          {...props} 
          className="rounded-lg shadow-md max-w-full max-h-[400px] object-contain inline-block" 
          alt={props.alt || 'Documentation image'} 
        />
      </span>
    ),
    h1: ({ node, ...props }: any) => (
      <h1 {...props} className="text-3xl font-bold mb-6 text-foreground" />
    ),
    h2: ({ node, ...props }: any) => (
      <h2 {...props} className="text-2xl font-semibold mt-8 mb-4 text-foreground" />
    ),
    h3: ({ node, ...props }: any) => (
      <h3 {...props} className="text-xl font-medium mt-6 mb-3 text-foreground" />
    ),
    p: ({ node, ...props }: any) => (
      <p {...props} className="mb-4 text-foreground/90 leading-relaxed" />
    ),
    ul: ({ node, ...props }: any) => (
      <ul {...props} className="list-disc pl-6 mb-4 space-y-2" />
    ),
    ol: ({ node, ...props }: any) => (
      <ol {...props} className="list-decimal pl-6 mb-4 space-y-2" />
    ),
    li: ({ node, ...props }: any) => (
      <li {...props} className="text-foreground/90" />
    ),
    code: ({ node, inline, ...props }: any) => (
      inline 
        ? <code {...props} className="px-1 py-0.5 bg-muted rounded text-sm font-mono text-foreground" />
        : <pre className="p-4 bg-muted rounded-md overflow-x-auto my-4 border border-border">
            <code {...props} className="text-sm font-mono text-foreground" />
          </pre>
    ),
    a: ({ node, ...props }: any) => (
      <a {...props} className="text-primary hover:underline" target="_blank" rel="noopener noreferrer" />
    )
  };

  return (
    <div className="container mx-auto py-6 max-w-5xl">
      <div className="bg-card rounded-lg p-6 shadow-sm mb-6">
        <h1 className="text-3xl font-bold mb-4">User Guide</h1>
        <p className="text-muted-foreground">
          This guide provides a detailed explanation of all the components, features, and interactions in the system.
          Learn how to use the various features and understand how they work together.
        </p>
      </div>

      <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-4 md:grid-cols-8 mb-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="components">Components</TabsTrigger>
          <TabsTrigger value="frontend">Frontend</TabsTrigger>
          <TabsTrigger value="flows">Flows</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
          <TabsTrigger value="search">Search</TabsTrigger>
          <TabsTrigger value="docker">Docker</TabsTrigger>
        </TabsList>

        {Object.entries(sections).map(([key, content]) => (
          <TabsContent key={key} value={key} className="mt-0">
            <Card className={`p-6 ${isDark ? 'bg-background' : 'bg-card'} shadow-sm`}>
              <div className="prose dark:prose-invert max-w-none">
                <ReactMarkdown components={renderers}>{content}</ReactMarkdown>
              </div>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default UserGuidePage; 