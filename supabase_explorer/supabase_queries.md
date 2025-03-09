# Supabase SQL Queries for Supa-Crawl-Chat

This document contains useful SQL queries for exploring and analyzing data in your Supabase database for the Supa-Crawl-Chat project.

## Using the Supabase Explorer Tool

This file is used by the Supabase Explorer Streamlit app to provide an interactive experience for running SQL queries. To use this tool:

1. **Install the requirements**:
   ```bash
   pip install -r requirements.txt
   ```

2. **Run the Streamlit app**:
   ```bash
   streamlit run supabase_explorer.py
   ```

The app will automatically connect to your Supabase database using the credentials in your `.env` file and allow you to run the queries below with a single click. It provides:

- A dropdown menu to select from predefined queries
- A text editor to modify queries before running them
- Data visualization capabilities (bar charts, line charts, pie charts)
- CSV export functionality
- Database statistics and overview

## Site Queries

### List all sites with their page counts

```sql
SELECT 
  s.id, 
  s.name, 
  s.url, 
  COUNT(p.id) as page_count 
FROM 
  crawl_sites s 
LEFT JOIN 
  crawl_pages p ON s.id = p.site_id 
GROUP BY 
  s.id, s.name, s.url 
ORDER BY 
  page_count DESC;
```

### Get site details by ID

```sql
SELECT 
  id, 
  name, 
  url, 
  description, 
  created_at 
FROM 
  crawl_sites 
WHERE 
  id = 1; -- Replace with your site ID
```

### Search for sites by name

```sql
SELECT 
  id, 
  name, 
  url, 
  description, 
  created_at 
FROM 
  crawl_sites 
WHERE 
  name ILIKE '%example%' -- Replace with part of your site name
ORDER BY 
  created_at DESC;
```

## Page Queries

### Get the most recent pages (across all sites)

```sql
SELECT 
  p.id, 
  p.url, 
  p.title, 
  s.name as site_name, 
  p.created_at 
FROM 
  crawl_pages p 
JOIN 
  crawl_sites s ON p.site_id = s.id 
WHERE 
  p.is_chunk = false 
ORDER BY 
  p.created_at DESC 
LIMIT 10;
```

### Get pages for a specific site by site ID

```sql
SELECT 
  p.id, 
  p.url, 
  p.title, 
  p.created_at 
FROM 
  crawl_pages p 
WHERE 
  p.site_id = 1 -- Replace with your site ID
  AND p.is_chunk = false 
ORDER BY 
  p.created_at DESC 
LIMIT 10;
```

### Get pages for a specific site by site name

```sql
SELECT 
  p.id, 
  p.url, 
  p.title, 
  p.created_at 
FROM 
  crawl_pages p 
JOIN 
  crawl_sites s ON p.site_id = s.id 
WHERE 
  s.name ILIKE '%example%' -- Replace with part of your site name
  AND p.is_chunk = false 
ORDER BY 
  p.created_at DESC 
LIMIT 10;
```

### Find pages with specific content (text search)

```sql
SELECT 
  p.id, 
  p.url, 
  p.title, 
  s.name as site_name 
FROM 
  crawl_pages p 
JOIN 
  crawl_sites s ON p.site_id = s.id 
WHERE 
  p.content ILIKE '%search term%' -- Replace with your search term
  AND p.is_chunk = false 
ORDER BY 
  p.created_at DESC 
LIMIT 10;
```

### Get page details with content

```sql
SELECT 
  p.id, 
  p.url, 
  p.title, 
  p.content, 
  p.summary,
  s.name as site_name,
  p.created_at 
FROM 
  crawl_pages p 
JOIN 
  crawl_sites s ON p.site_id = s.id 
WHERE 
  p.id = 123 -- Replace with your page ID
```

## Chunk Queries

### Get chunks for a specific parent page

```sql
SELECT 
  p.id, 
  p.url, 
  p.title, 
  p.chunk_index, 
  p.created_at 
FROM 
  crawl_pages p 
WHERE 
  p.parent_id = 123 -- Replace with your parent page ID
  AND p.is_chunk = true 
ORDER BY 
  p.chunk_index ASC;
```

### Get all chunks with their parent information

```sql
SELECT 
  c.id as chunk_id, 
  c.chunk_index, 
  c.title as chunk_title,
  p.id as parent_id,
  p.url as parent_url,
  p.title as parent_title,
  s.name as site_name
FROM 
  crawl_pages c 
JOIN 
  crawl_pages p ON c.parent_id = p.id 
JOIN 
  crawl_sites s ON p.site_id = s.id 
WHERE 
  c.is_chunk = true 
ORDER BY 
  s.name, p.id, c.chunk_index 
LIMIT 20;
```

## Metadata Queries

### Get pages with metadata

```sql
SELECT 
  p.id, 
  p.url, 
  p.title, 
  p.metadata, 
  p.created_at 
FROM 
  crawl_pages p 
WHERE 
  p.metadata IS NOT NULL 
  AND p.is_chunk = false 
ORDER BY 
  p.created_at DESC 
LIMIT 10;
```

### Get pages with specific metadata field

```sql
SELECT 
  p.id, 
  p.url, 
  p.title, 
  p.metadata->>'source' as source, 
  p.created_at 
FROM 
  crawl_pages p 
WHERE 
  p.metadata->>'source' IS NOT NULL 
  AND p.is_chunk = false 
ORDER BY 
  p.created_at DESC 
LIMIT 10;
```

### Examine metadata structure

```sql
SELECT 
  id, 
  url, 
  metadata 
FROM 
  crawl_pages 
WHERE 
  metadata IS NOT NULL 
LIMIT 10;
```

## Conversation History Queries

### Get conversation history for a specific session

```sql
SELECT 
  c.role, 
  c.content, 
  c.timestamp 
FROM 
  chat_conversations c 
WHERE 
  c.session_id = 'your-session-id' -- Replace with your session ID
ORDER BY 
  c.timestamp ASC;
```

### Get all sessions for a specific user

```sql
SELECT 
  DISTINCT session_id,
  MIN(timestamp) as first_message,
  MAX(timestamp) as last_message,
  COUNT(*) as message_count
FROM 
  chat_conversations 
WHERE 
  user_id = 'your-user-id' -- Replace with your user ID
GROUP BY 
  session_id
ORDER BY 
  last_message DESC;
```

### Get messages with specific content

```sql
SELECT 
  session_id,
  role,
  content,
  timestamp
FROM 
  chat_conversations 
WHERE 
  content ILIKE '%search term%' -- Replace with your search term
ORDER BY 
  timestamp DESC
LIMIT 20;
```

## Statistics Queries

### Get database statistics

```sql
SELECT 
  'Sites' as type, 
  COUNT(*) as count 
FROM 
  crawl_sites 
UNION ALL 
SELECT 
  'Parent Pages' as type, 
  COUNT(*) as count 
FROM 
  crawl_pages 
WHERE 
  is_chunk = false 
UNION ALL 
SELECT 
  'Chunks' as type, 
  COUNT(*) as count 
FROM 
  crawl_pages 
WHERE 
  is_chunk = true 
UNION ALL 
SELECT 
  'Conversations' as type, 
  COUNT(DISTINCT session_id) as count 
FROM 
  chat_conversations;
```

### Get page count by site

```sql
SELECT 
  s.name as site_name,
  COUNT(p.id) FILTER (WHERE p.is_chunk = false) as parent_pages,
  COUNT(p.id) FILTER (WHERE p.is_chunk = true) as chunks,
  COUNT(p.id) as total_pages
FROM 
  crawl_sites s 
LEFT JOIN 
  crawl_pages p ON s.id = p.site_id 
GROUP BY 
  s.id, s.name
ORDER BY 
  total_pages DESC;
```

### Get conversation statistics

```sql
SELECT 
  COUNT(DISTINCT session_id) as total_sessions,
  COUNT(DISTINCT user_id) as total_users,
  COUNT(*) FILTER (WHERE role = 'user') as user_messages,
  COUNT(*) FILTER (WHERE role = 'assistant') as assistant_messages,
  COUNT(*) FILTER (WHERE role = 'system') as system_messages,
  COUNT(*) as total_messages
FROM 
  chat_conversations;
```

## Advanced Queries

### Find duplicate URLs

```sql
SELECT 
  url, 
  COUNT(*) as count 
FROM 
  crawl_pages 
WHERE 
  is_chunk = false 
GROUP BY 
  url 
HAVING 
  COUNT(*) > 1 
ORDER BY 
  count DESC;
```

### Find pages without embeddings

```sql
SELECT 
  id, 
  url, 
  title 
FROM 
  crawl_pages 
WHERE 
  embedding IS NULL 
  AND is_chunk = false 
ORDER BY 
  created_at DESC;
```

### Find pages without titles or summaries

```sql
SELECT 
  id, 
  url, 
  created_at 
FROM 
  crawl_pages 
WHERE 
  (title IS NULL OR title = '') 
  OR (summary IS NULL OR summary = '') 
  AND is_chunk = false 
ORDER BY 
  created_at DESC;
```

### Get average content length by site

```sql
SELECT 
  s.name as site_name,
  AVG(LENGTH(p.content)) as avg_content_length,
  MIN(LENGTH(p.content)) as min_content_length,
  MAX(LENGTH(p.content)) as max_content_length
FROM 
  crawl_pages p 
JOIN 
  crawl_sites s ON p.site_id = s.id 
WHERE 
  p.is_chunk = false 
GROUP BY 
  s.id, s.name
ORDER BY 
  avg_content_length DESC;
```

## Embedding Analysis Queries

### Check embedding dimensions

```sql
SELECT 
  ARRAY_LENGTH(embedding, 1) as embedding_dimension,
  COUNT(*) as count
FROM 
  crawl_pages
WHERE 
  embedding IS NOT NULL
GROUP BY 
  ARRAY_LENGTH(embedding, 1)
ORDER BY 
  count DESC;
```

### Find pages with similar embeddings

```sql
SELECT 
  p1.id as page1_id,
  p1.url as page1_url,
  p1.title as page1_title,
  p2.id as page2_id,
  p2.url as page2_url,
  p2.title as page2_title,
  1 - (p1.embedding <=> p2.embedding) as similarity
FROM 
  crawl_pages p1
JOIN 
  crawl_pages p2 ON p1.id < p2.id
WHERE 
  p1.embedding IS NOT NULL 
  AND p2.embedding IS NOT NULL
  AND p1.is_chunk = false
  AND p2.is_chunk = false
  AND p1.site_id = p2.site_id
  AND 1 - (p1.embedding <=> p2.embedding) > 0.95
ORDER BY 
  similarity DESC
LIMIT 20;
```

### Find most similar pages to a specific page

```sql
SELECT 
  p2.id,
  p2.url,
  p2.title,
  1 - (p1.embedding <=> p2.embedding) as similarity
FROM 
  crawl_pages p1
JOIN 
  crawl_pages p2 ON p1.id != p2.id
WHERE 
  p1.id = 123 -- Replace with your page ID
  AND p1.embedding IS NOT NULL 
  AND p2.embedding IS NOT NULL
ORDER BY 
  similarity DESC
LIMIT 10;
```

## Content Quality Queries

### Find pages with short content

```sql
SELECT 
  p.id,
  p.url,
  p.title,
  LENGTH(p.content) as content_length,
  s.name as site_name
FROM 
  crawl_pages p
JOIN 
  crawl_sites s ON p.site_id = s.id
WHERE 
  p.is_chunk = false
  AND LENGTH(p.content) < 1000
ORDER BY 
  content_length ASC
LIMIT 20;
```

### Find pages with missing or short titles

```sql
SELECT 
  p.id,
  p.url,
  p.title,
  LENGTH(p.title) as title_length,
  s.name as site_name
FROM 
  crawl_pages p
JOIN 
  crawl_sites s ON p.site_id = s.id
WHERE 
  p.is_chunk = false
  AND (p.title IS NULL OR LENGTH(p.title) < 10)
ORDER BY 
  title_length ASC
LIMIT 20;
```

### Find pages with missing or short summaries

```sql
SELECT 
  p.id,
  p.url,
  p.title,
  p.summary,
  LENGTH(p.summary) as summary_length,
  s.name as site_name
FROM 
  crawl_pages p
JOIN 
  crawl_sites s ON p.site_id = s.id
WHERE 
  p.is_chunk = false
  AND (p.summary IS NULL OR LENGTH(p.summary) < 50)
ORDER BY 
  summary_length ASC
LIMIT 20;
```

## Advanced Conversation Analysis

### Get most active users by message count

```sql
SELECT 
  user_id,
  COUNT(*) as message_count,
  MIN(timestamp) as first_message,
  MAX(timestamp) as last_message,
  COUNT(DISTINCT session_id) as session_count
FROM 
  chat_conversations
WHERE 
  user_id IS NOT NULL
GROUP BY 
  user_id
ORDER BY 
  message_count DESC;
```

### Get most active sessions

```sql
SELECT 
  session_id,
  user_id,
  COUNT(*) FILTER (WHERE role = 'user') as user_messages,
  COUNT(*) FILTER (WHERE role = 'assistant') as assistant_messages,
  COUNT(*) as total_messages,
  MIN(timestamp) as first_message,
  MAX(timestamp) as last_message,
  EXTRACT(EPOCH FROM (MAX(timestamp) - MIN(timestamp)))/60 as session_duration_minutes
FROM 
  chat_conversations
GROUP BY 
  session_id, user_id
ORDER BY 
  total_messages DESC
LIMIT 20;
```

### Get conversation topics by keyword

```sql
SELECT 
  session_id,
  user_id,
  timestamp,
  role,
  content
FROM 
  chat_conversations
WHERE 
  content ILIKE '%keyword%' -- Replace with your keyword
ORDER BY 
  session_id, timestamp;
```

### Get user preferences from metadata

```sql
SELECT 
  user_id,
  metadata->>'preference' as preference,
  COUNT(*) as mention_count
FROM 
  chat_conversations
WHERE 
  metadata->>'preference' IS NOT NULL
GROUP BY 
  user_id, metadata->>'preference'
ORDER BY 
  user_id, mention_count DESC;
```

## Performance Queries

### Get page load times by site

```sql
SELECT 
  s.name as site_name,
  COUNT(p.id) as page_count,
  AVG(EXTRACT(EPOCH FROM (p.created_at - p.metadata->>'crawl_start_time')::timestamp)) as avg_load_time_seconds
FROM 
  crawl_pages p
JOIN 
  crawl_sites s ON p.site_id = s.id
WHERE 
  p.is_chunk = false
  AND p.metadata->>'crawl_start_time' IS NOT NULL
GROUP BY 
  s.name
ORDER BY 
  avg_load_time_seconds DESC;
```

### Get database growth over time

```sql
SELECT 
  DATE_TRUNC('day', created_at) as day,
  COUNT(*) as pages_added
FROM 
  crawl_pages
GROUP BY 
  day
ORDER BY 
  day;
```

### Get chunk distribution by parent page

```sql
SELECT 
  p.id as parent_id,
  p.url as parent_url,
  p.title as parent_title,
  COUNT(c.id) as chunk_count,
  AVG(LENGTH(c.content)) as avg_chunk_length
FROM 
  crawl_pages p
JOIN 
  crawl_pages c ON c.parent_id = p.id
WHERE 
  p.is_chunk = false
  AND c.is_chunk = true
GROUP BY 
  p.id, p.url, p.title
ORDER BY 
  chunk_count DESC
LIMIT 20;
```

## Search Performance Analysis

### Get most common search terms

```sql
SELECT 
  metadata->>'query' as search_term,
  COUNT(*) as search_count
FROM 
  chat_conversations
WHERE 
  metadata->>'query' IS NOT NULL
GROUP BY 
  metadata->>'query'
ORDER BY 
  search_count DESC
LIMIT 20;
```

### Get search result counts by threshold

```sql
SELECT 
  ROUND(CAST(metadata->>'threshold' as numeric), 1) as threshold,
  AVG(CAST(metadata->>'result_count' as integer)) as avg_result_count,
  COUNT(*) as search_count
FROM 
  chat_conversations
WHERE 
  metadata->>'threshold' IS NOT NULL
  AND metadata->>'result_count' IS NOT NULL
GROUP BY 
  ROUND(CAST(metadata->>'threshold' as numeric), 1)
ORDER BY 
  threshold;
```

### Get zero-result searches

```sql
SELECT 
  metadata->>'query' as search_term,
  COUNT(*) as search_count
FROM 
  chat_conversations
WHERE 
  metadata->>'query' IS NOT NULL
  AND metadata->>'result_count' = '0'
GROUP BY 
  metadata->>'query'
ORDER BY 
  search_count DESC
LIMIT 20;
``` 