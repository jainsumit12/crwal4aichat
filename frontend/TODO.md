# Supa Crawl Chat Frontend TODOs

## Content Display Issues

### Current Problems

1. **Missing API Endpoint**: The `/api/pages/{pageId}/` endpoint returns 404, making it impossible to directly fetch a single page's content.
   - This forces us to use workarounds like fetching from `/api/sites/{siteId}/pages/` with `include_chunks=true` or using the search API.

2. **Inconsistent Content Storage**: Some pages have content in the database, while others only have metadata (URL, title, summary).
   - This is likely by design for chunking purposes (vector search for AI), but makes UI display challenging.

3. **Content Rendering**: Need better detection and rendering of HTML/Markdown content from the database.

### Desired Behavior

- The UI should show exactly what's in the database for each page/chunk to understand what was crawled and chunked.
- Users should be able to see individual chunks (chunk 0, chunk 1, etc.) for a page.
- The UI should replace the need to use Supabase Studio to view page content.
- Live URL viewing is secondary - users can click the URL to visit the actual page if needed.

## Docker and API Issues

### Current Problems

1. **Profiles Endpoint Redirect Issue**: The `/api/chat/profiles/` endpoint returns a 307 Temporary Redirect in Docker.
   - When accessed through nginx in the Docker setup, requests with trailing slashes cause redirect loops.
   - This affects the profiles dropdown in the chat interface, preventing users from selecting different AI personalities.
   - The issue only occurs in the Docker environment, not when running the app natively.
   - Multiple attempted fixes (rewriting URLs, modifying FastAPI settings, updating frontend code) have not resolved the issue.

### Workarounds

- For now, users should be aware that the profiles dropdown may not work in the Docker environment.
- When developing locally (non-Docker), the profiles feature works as expected.
- Future investigation is needed to determine if this is related to how FastAPI handles trailing slashes or how nginx proxies requests.

## Future Improvements

### Backend Enhancements

1. Implement a proper `/api/pages/{pageId}/` endpoint that returns full page data including content.
2. Add an endpoint to fetch all chunks for a specific page.
3. Ensure consistent metadata (created_at, updated_at) is returned for all pages.
4. **Fix Docker API Redirect Issues**: Resolve the 307 redirect issue with trailing slashes in the Docker environment.
   - Investigate FastAPI's `redirect_slashes` setting and its interaction with nginx.
   - Consider modifying the API to explicitly handle both versions of endpoints (with and without trailing slashes).
   - Ensure consistent behavior between Docker and native environments.

### Frontend Enhancements

1. **Content View Improvements**:
   - Better toggle between raw and rendered content
   - Fix MIME type issues with rendered content
   - Add syntax highlighting for code blocks

2. **Chunk Navigation**:
   - Add a chunk selector to easily navigate between chunks of the same page
   - Show chunk relationships and context

3. **Database Explorer**:
   - Create a more comprehensive database explorer view
   - Show vector embeddings and similarity scores
   - Allow editing of page metadata

4. **User Experience**:
   - Add loading states for all async operations
   - Improve error handling and user feedback
   - Add pagination for large result sets
   - **API Robustness**: Make frontend more resilient to API inconsistencies, especially in Docker environments.

5. **User Profile**:
   - Complete user profile functionality
   - Add preferences for default view modes

## Implementation Priority

1. Fix content display issues by improving the existing workarounds
2. Implement backend API enhancements
3. Add chunk navigation
4. Improve content rendering
5. Develop database explorer features
6. Complete user profile functionality
7. **Resolve Docker API issues** for consistent behavior across environments

## Notes for Development

- The current implementation uses multiple approaches to fetch content:
  1. Try to get content from the sites API with `include_chunks=true`
  2. Try the search API as a fallback
  3. Fetch from the live URL as a last resort

- Remember that the primary goal is to show what's in the database, not to recreate the original page.
- Keep the UI simple and focused on the data exploration use case.
- **Docker Environment**: Be cautious when making changes that might affect the Docker environment differently than the native environment. Test both scenarios when possible. 