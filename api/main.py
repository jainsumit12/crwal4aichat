from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
import os
import sys
import uvicorn
from dotenv import load_dotenv

# Add the parent directory to the path so we can import from the main project
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import routers
from api.routers import search, crawl, chat, sites

# Load environment variables
load_dotenv()

# Create FastAPI app
app = FastAPI(
    title="Supa-Crawl-Chat API",
    description="API for Supa-Crawl-Chat - A web crawling and semantic search solution with chat capabilities",
    version="1.0.0",
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

# Include routers
app.include_router(search.router, prefix="/api/search", tags=["search"])
app.include_router(crawl.router, prefix="/api/crawl", tags=["crawl"])
app.include_router(chat.router, prefix="/api/chat", tags=["chat"])
app.include_router(sites.router, prefix="/api/sites", tags=["sites"])

@app.get("/", tags=["root"])
async def root():
    """Root endpoint that returns basic API information."""
    return {
        "message": "Welcome to the Supa-Crawl-Chat API",
        "version": "1.0.0",
        "docs_url": "/docs",
        "redoc_url": "/redoc",
    }

if __name__ == "__main__":
    uvicorn.run("api.main:app", host="0.0.0.0", port=8001, reload=True) 