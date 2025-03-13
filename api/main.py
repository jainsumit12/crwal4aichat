from fastapi import FastAPI, Depends, HTTPException, status, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
import os
import sys
import uvicorn
from dotenv import load_dotenv

# Add the parent directory to the path so we can import from the main project
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import routers
from api.routers import search, crawl, chat, sites, pages

# Load environment variables
load_dotenv()

# Custom middleware to handle trailing slashes
class TrailingSlashMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Remove trailing slash if present (except for root path)
        if request.url.path != "/" and request.url.path.endswith("/"):
            # Simply modify the request scope directly
            path_without_slash = request.url.path.rstrip("/")
            print(f"Removing trailing slash: {request.url.path} -> {path_without_slash}")
            
            # Modify the request path in the scope
            request.scope["path"] = path_without_slash
            request.scope["raw_path"] = path_without_slash.encode()
            
            # Update the URL in the scope to avoid redirect
            if "url" in request.scope:
                url_parts = list(request.scope["url"])
                url_parts[2] = path_without_slash  # Update the path component
                request.scope["url"] = tuple(url_parts)
        
        # Continue processing the request
        response = await call_next(request)
        return response

# Create FastAPI app
app = FastAPI(
    title="Supa-Crawl-Chat API",
    description="API for Supa-Crawl-Chat - A web crawling and semantic search solution with chat capabilities",
    version="1.0.0",
    # Disable automatic redirection for trailing slashes since we handle it in middleware
    redirect_slashes=False,
)

# Add trailing slash middleware first
app.add_middleware(TrailingSlashMiddleware)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

# Include routers
# print("Registering routers...")
# print(f"Search router: {search.router}")
# print(f"Crawl router: {crawl.router}")
# print(f"Chat router: {chat.router}")
# print(f"Sites router: {sites.router}")
# print(f"Pages router: {pages.router}")

app.include_router(search.router, prefix="/api/search", tags=["search"])
app.include_router(crawl.router, prefix="/api/crawl", tags=["crawl"])
app.include_router(chat.router, prefix="/api/chat", tags=["chat"])
app.include_router(sites.router, prefix="/api/sites", tags=["sites"])
app.include_router(pages.router, prefix="/api/pages", tags=["pages"])

@app.get("/api")
async def root():
    """
    Root endpoint for the API.
    """
    return {
        "message": "Welcome to the Supa-Crawl-Chat API",
        "version": app.version,
        "docs_url": "/docs",
        "redoc_url": "/redoc",
    }

if __name__ == "__main__":
    # Get port from environment variable or use default
    port = int(os.getenv("API_PORT", 8001))
    
    # Run the API server
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True) 