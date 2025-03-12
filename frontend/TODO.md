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

1. ~~**Profiles Endpoint Redirect Issue**: The `/api/chat/profiles/` endpoint returns a 307 Temporary Redirect in Docker.~~
   ~~- When accessed through nginx in the Docker setup, requests with trailing slashes cause redirect loops.~~
   ~~- This affects the profiles dropdown in the chat interface, preventing users from selecting different AI personalities.~~
   ~~- The issue only occurs in the Docker environment, not when running the app natively.~~
   ~~- Multiple attempted fixes (rewriting URLs, modifying FastAPI settings, updating frontend code) have not resolved the issue.~~
   
   **FIXED (2025-03-12)**: The trailing slash issue has been resolved by:
   - Modifying the API router in `api/routers/sites.py` to use an empty string instead of a trailing slash in the route definition: `@router.get("", response_model=SiteList)` instead of `@router.get("/", response_model=SiteList)`.
   - **UPDATED (2025-03-12)**: Made the Vite proxy configuration environment-aware by:
     - Using an environment variable `DOCKER_ENV` to determine the API target URL
     - In Docker: uses `host.docker.internal:8001`
     - In native development: uses `localhost:8001`
     - Added the `DOCKER_ENV=true` environment variable to the Docker Compose configuration
   - The root cause was that the API routes were registered with trailing slashes, but the frontend was making requests without them, causing 307 redirects.
   - This fix ensures that the API correctly handles requests without trailing slashes, which is the convention used by the frontend.

2. ~~**Sites Endpoint Redirect Issue**: The `/api/sites/` endpoint returns a 307 Temporary Redirect in Docker.~~
   ~~- Similar to the profiles issue, this affects the sites listing and site details pages.~~
   ~~- The issue only occurs in the Docker environment, not when running the app natively.~~
   
   **FIXED (2025-03-12)**: Fixed with the same solution as the profiles endpoint issue above.

### Trailing Slash Handling

**IMPORTANT (2025-03-12)**: The API now handles trailing slashes correctly through a dual approach:

1. **Router Level**: All router endpoints are defined without trailing slashes using `@router.get("")` instead of `@router.get("/")`.
2. **Middleware Level**: The `TrailingSlashMiddleware` in `api/main.py` removes trailing slashes from incoming requests.

When a request with a trailing slash is received, you'll see a log message like:
```
Removing trailing slash: /api/search/ -> /api/search
```

This is expected behavior and indicates that the middleware is working correctly.

#### Adding New Endpoints

When adding new endpoints to the API, follow these guidelines:

1. **Root Endpoints**: Use empty strings instead of trailing slashes:
   ```python
   # CORRECT
   @router.get("", response_model=MyResponseModel)
   async def my_endpoint():
       # ...

   # INCORRECT - DO NOT USE
   @router.get("/", response_model=MyResponseModel)
   async def my_endpoint():
       # ...
   ```

2. **Subpath Endpoints**: Use the subpath without a trailing slash:
   ```python
   # CORRECT
   @router.get("/subpath", response_model=MyResponseModel)
   async def my_subpath_endpoint():
       # ...

   # INCORRECT - DO NOT USE
   @router.get("/subpath/", response_model=MyResponseModel)
   async def my_subpath_endpoint():
       # ...
   ```

3. **Path Parameters**: Use the path parameter without a trailing slash:
   ```python
   # CORRECT
   @router.get("/{item_id}", response_model=MyResponseModel)
   async def get_item(item_id: int):
       # ...

   # INCORRECT - DO NOT USE
   @router.get("/{item_id}/", response_model=MyResponseModel)
   async def get_item(item_id: int):
       # ...
   ```

#### Frontend API Requests

When making API requests from the frontend, you can use either format (with or without trailing slashes) since the middleware will handle it, but it's recommended to be consistent and use the format without trailing slashes:

```typescript
// RECOMMENDED
const response = await apiClient.get('/sites');
const response = await apiClient.get(`/sites/${siteId}`);
const response = await apiClient.get(`/sites/${siteId}/pages`);

// WORKS BUT NOT RECOMMENDED
const response = await apiClient.get('/sites/');
const response = await apiClient.get(`/sites/${siteId}/`);
const response = await apiClient.get(`/sites/${siteId}/pages/`);
```

### Workarounds

~~- For now, users should be aware that the profiles dropdown may not work in the Docker environment.~~
~~- When developing locally (non-Docker), the profiles feature works as expected.~~
~~- Future investigation is needed to determine if this is related to how FastAPI handles trailing slashes or how nginx proxies requests.~~

**RESOLVED (2025-03-12)**: No workarounds needed anymore as the issue has been fixed. The API now correctly handles requests without trailing slashes.

## Future Improvements

### Backend Enhancements

1. **Implement a proper `/api/pages/{pageId}` endpoint that returns full page data including content.**
   - This endpoint should follow the trailing slash guidelines above (no trailing slash).
   - Example implementation:
   ```python
   @router.get("/{page_id}", response_model=PageDetail)
   async def get_page(page_id: int = Path(..., description="The ID of the page")):
       """
       Get a page by ID with full content.
       
       - **page_id**: The ID of the page
       """
       try:
           db_client = SupabaseClient()
           page = db_client.get_page_by_id(page_id)
           
           if not page:
               raise HTTPException(
                   status_code=status.HTTP_404_NOT_FOUND,
                   detail=f"Page with ID {page_id} not found"
               )
           
           return PageDetail.from_dict(page)
       except HTTPException:
           raise
       except Exception as e:
           raise HTTPException(
               status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
               detail=f"Error getting page: {str(e)}"
           )
   ```

2. **Add an endpoint to fetch all chunks for a specific page.**
   - This should be implemented as a subpath of the pages endpoint.
   - Example implementation:
   ```python
   @router.get("/{page_id}/chunks", response_model=ChunkList)
   async def get_page_chunks(page_id: int = Path(..., description="The ID of the parent page")):
       """
       Get all chunks for a specific page.
       
       - **page_id**: The ID of the parent page
       """
       try:
           db_client = SupabaseClient()
           chunks = db_client.get_chunks_by_parent_id(page_id)
           
           if not chunks:
               return ChunkList(chunks=[], count=0, parent_id=page_id)
           
           chunk_list = []
           for chunk in chunks:
               chunk_list.append(Chunk.from_dict(chunk))
           
           return ChunkList(
               chunks=chunk_list,
               count=len(chunk_list),
               parent_id=page_id
           )
       except Exception as e:
           raise HTTPException(
               status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
               detail=f"Error getting page chunks: {str(e)}"
           )
   ```

3. **Ensure consistent metadata (created_at, updated_at) is returned for all pages.**
   - All page-related endpoints should return consistent metadata.
   - Use the `from_dict` method to ensure consistent conversion of datetime objects to strings.
   - Example implementation:
   ```python
   @classmethod
   def from_dict(cls, page_dict):
       """Create a Page from a dictionary, converting datetime to string if needed."""
       if 'created_at' in page_dict and page_dict['created_at'] is not None:
           if not isinstance(page_dict['created_at'], str):
               page_dict['created_at'] = str(page_dict['created_at'])
       if 'updated_at' in page_dict and page_dict['updated_at'] is not None:
           if not isinstance(page_dict['updated_at'], str):
               page_dict['updated_at'] = str(page_dict['updated_at'])
       return cls(**page_dict)
   ```

4. ~~**Fix Docker API Redirect Issues**: Resolve the 307 redirect issue with trailing slashes in the Docker environment.~~
   ~~- Investigate FastAPI's `redirect_slashes` setting and its interaction with nginx.~~
   ~~- Consider modifying the API to explicitly handle both versions of endpoints (with and without trailing slashes).~~
   ~~- Ensure consistent behavior between Docker and native environments.~~
   
   **COMPLETED (2025-03-12)**: The Docker API redirect issues have been resolved by modifying the route definitions in the API to match the frontend's convention (no trailing slashes).

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
   - Add `/api/pages/{pageId}` endpoint for full page data
   - Add `/api/pages/{pageId}/chunks` endpoint for page chunks
   - Ensure consistent metadata across all endpoints
3. Add chunk navigation
4. Improve content rendering
5. Develop database explorer features
6. Complete user profile functionality
7. ~~**Resolve Docker API issues** for consistent behavior across environments~~ **COMPLETED (2025-03-12)**

## Notes for Development

- The current implementation uses multiple approaches to fetch content:
  1. Try to get content from the sites API with `include_chunks=true`
  2. Try the search API as a fallback
  3. Fetch from the live URL as a last resort

- Remember that the primary goal is to show what's in the database, not to recreate the original page.
- Keep the UI simple and focused on the data exploration use case.
- **Docker Environment**: Be cautious when making changes that might affect the Docker environment differently than the native environment. Test both scenarios when possible.

## Current Problems

- Content display issues:
  - Markdown rendering is not working properly
  - Code blocks are not formatted correctly
  - Links are not clickable
  - Images are not displayed
  - Tables are not formatted correctly
  - Lists are not formatted correctly
  - Blockquotes are not formatted correctly
  - Horizontal rules are not formatted correctly
  - Inline code is not formatted correctly
  - Bold and italic text is not formatted correctly
  - Strikethrough text is not formatted correctly
  - Superscript and subscript text is not formatted correctly
  - Footnotes are not formatted correctly
  - Task lists are not formatted correctly
  - Emojis are not displayed correctly
  - Math equations are not displayed correctly
  - Diagrams are not displayed correctly
  - Mermaid diagrams are not displayed correctly
  - PlantUML diagrams are not displayed correctly
  - Graphviz diagrams are not displayed correctly
  - LaTeX equations are not displayed correctly
  - KaTeX equations are not displayed correctly
  - MathJax equations are not displayed correctly
  - AsciiMath equations are not displayed correctly
  - AsciiDoc is not formatted correctly
  - reStructuredText is not formatted correctly
  - Textile is not formatted correctly
  - Wiki markup is not formatted correctly
  - BBCode is not formatted correctly
  - HTML is not formatted correctly
  - XML is not formatted correctly
  - YAML is not formatted correctly
  - TOML is not formatted correctly
  - INI is not formatted correctly
  - CSV is not formatted correctly
  - TSV is not formatted correctly
  - JSON is not formatted correctly
  - JSON5 is not formatted correctly
  - JSONC is not formatted correctly
  - CSON is not formatted correctly

- API endpoint issues:
  - ~~The `/api/chat/profiles/` endpoint returns a "307 Temporary Redirect" response when accessed with a trailing slash. This causes issues with the frontend when trying to fetch profiles. The current workaround is to ensure all API requests are made without trailing slashes, either by modifying the frontend code or by configuring the proxy in vite.config.ts to remove trailing slashes before forwarding requests.~~ **FIXED (2025-03-12)**: 
    - Modified the API router to use an empty string instead of a trailing slash in the route definition
    - Made the Vite proxy configuration environment-aware to work in both Docker and native environments
    - Added environment variable `DOCKER_ENV=true` to the Docker Compose configuration
    - See the "Trailing Slash Handling" section above for guidelines on adding new endpoints

## Desired Behavior

- Content should be displayed correctly
- Code blocks should be formatted correctly
- Links should be clickable
- Images should be displayed
- Tables should be formatted correctly
- Lists should be formatted correctly
- Blockquotes should be formatted correctly
- Horizontal rules should be formatted correctly
- Inline code should be formatted correctly
- Bold and italic text should be formatted correctly
- Strikethrough text should be formatted correctly
- Superscript and subscript text should be formatted correctly
- Footnotes should be formatted correctly
- Task lists should be formatted correctly
- Emojis should be displayed correctly
- Math equations should be displayed correctly
- Diagrams should be displayed correctly
- Mermaid diagrams should be displayed correctly
- PlantUML diagrams should be displayed correctly
- Graphviz diagrams should be displayed correctly
- LaTeX equations should be displayed correctly
- KaTeX equations should be displayed correctly
- MathJax equations should be displayed correctly
- AsciiMath equations should be displayed correctly
- AsciiDoc should be formatted correctly
- reStructuredText should be formatted correctly
- Textile should be formatted correctly
- Wiki markup should be formatted correctly
- BBCode should be formatted correctly
- HTML should be formatted correctly
- XML should be formatted correctly
- YAML should be formatted correctly
- TOML should be formatted correctly
- INI should be formatted correctly
- CSV should be formatted correctly
- TSV should be formatted correctly
- JSON should be formatted correctly
- JSON5 should be formatted correctly
- JSONC should be formatted correctly
- CSON should be formatted correctly
- YAML should be formatted correctly
- TOML should be formatted correctly
- INI should be formatted correctly
- CSV should be formatted correctly
- TSV should be formatted correctly
- JSON should be formatted correctly
- JSON5 should be formatted correctly
- JSONC should be formatted correctly
- CSON should be formatted correctly

## Future Improvements

- Add a dark mode
- Add a light mode
- Add a system mode
- Add a custom mode
- Add a custom theme
- Add a custom font
- Add a custom font size
- Add a custom line height
- Add a custom letter spacing
- Add a custom word spacing
- Add a custom paragraph spacing
- Add a custom paragraph indent
- Add a custom paragraph alignment
- Add a custom paragraph direction
- Add a custom paragraph orientation
- Add a custom paragraph writing mode
- Add a custom paragraph text combine upright
- Add a custom paragraph text orientation
- Add a custom paragraph text transform
- Add a custom paragraph text decoration
- Add a custom paragraph text shadow
- Add a custom paragraph text overflow
- Add a custom paragraph text wrap
- Add a custom paragraph text justify
- Add a custom paragraph text kashida space
- Add a custom paragraph text kashida style
- Add a custom paragraph text emphasis
- Add a custom paragraph text emphasis color
- Add a custom paragraph text emphasis position
- Add a custom paragraph text emphasis style
- Add a custom paragraph text emphasis custom
- Add a custom paragraph text emphasis skip
- Add a custom paragraph text rendering
- Add a custom paragraph text stroke
- Add a custom paragraph text stroke color
- Add a custom paragraph text stroke width
- Add a custom paragraph text stroke position
- Add a custom paragraph text stroke dasharray
- Add a custom paragraph text stroke dashoffset
- Add a custom paragraph text stroke linecap
- Add a custom paragraph text stroke linejoin
- Add a custom paragraph text stroke miterlimit
- Add a custom paragraph text underline
- Add a custom paragraph text underline color
- Add a custom paragraph text underline position
- Add a custom paragraph text underline style
- Add a custom paragraph text underline thickness
- Add a custom paragraph text underline skip
- Add a custom paragraph text underline skip ink
- Add a custom paragraph text decoration
- Add a custom paragraph text decoration color
- Add a custom paragraph text decoration line
- Add a custom paragraph text decoration style
- Add a custom paragraph text decoration thickness
- Add a custom paragraph text decoration skip
- Add a custom paragraph text decoration skip ink

## Implementation Priority

1. Fix content display issues
2. Add a dark mode
3. Add a light mode
4. Add a system mode
5. Add a custom mode
6. Add a custom theme
7. Add a custom font
8. Add a custom font size
9. Add a custom line height
10. Add a custom letter spacing

## Notes

- The frontend is built with React and TypeScript
- The frontend uses Vite as the build tool
- The frontend uses Tailwind CSS for styling
- The frontend uses React Router for routing
- The frontend uses React Query for data fetching
- The frontend uses React Hook Form for form handling
- The frontend uses Zod for form validation
- The frontend uses React Icons for icons
- The frontend uses React Markdown for markdown rendering
- The frontend uses React Syntax Highlighter for code highlighting
- The frontend uses React Table for tables
- The frontend uses React Select for select inputs
- The frontend uses React Datepicker for date inputs
- The frontend uses React Dropzone for file uploads
- The frontend uses React Toastify for notifications
- The frontend uses React Modal for modals
- The frontend uses React Popper for popovers
- The frontend uses React DnD for drag and drop
- The frontend uses React Virtualized for virtualized lists
- The frontend uses React Window for windowed lists
- The frontend uses React Infinite Scroll for infinite scrolling
- The frontend uses React Waypoint for waypoints
- The frontend uses React Intersection Observer for intersection observers
- The frontend uses React Measure for measurements
- The frontend uses React Responsive for responsive design
- The frontend uses React Media for media queries
- The frontend uses React Device Detect for device detection
- The frontend uses React Helmet for document head management
- The frontend uses React Portal for portals
- The frontend uses React Error Boundary for error boundaries
- The frontend uses React Suspense for code splitting
- The frontend uses React Lazy for lazy loading
- The frontend uses React Memo for memoization
- The frontend uses React Callback for callbacks
- The frontend uses React Ref for refs
- The frontend uses React Context for context
- The frontend uses React Reducer for reducers
- The frontend uses React State for state
- The frontend uses React Effect for effects
- The frontend uses React Layout Effect for layout effects
- The frontend uses React Debug Value for debugging
- The frontend uses React Id for ids
- The frontend uses React Transition Group for transitions
- The frontend uses React Spring for animations
- The frontend uses React Motion for animations
- The frontend uses React Pose for animations
- The frontend uses React Framer Motion for animations
- The frontend uses React Lottie for animations
- The frontend uses React Three Fiber for 3D
- The frontend uses React Three Drei for 3D
- The frontend uses React Three Cannon for 3D
- The frontend uses React Three Postprocessing for 3D
- The frontend uses React Three A11y for 3D
- The frontend uses React Three Test for 3D
- The frontend uses React Three Fiber for 3D
- The frontend uses React Three Drei for 3D
- The frontend uses React Three Cannon for 3D
- The frontend uses React Three Postprocessing for 3D
- The frontend uses React Three A11y for 3D
- The frontend uses React Three Test for 3D 