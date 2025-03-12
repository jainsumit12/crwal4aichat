from fastapi import APIRouter, Query, HTTPException, status
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
import json

# Import from main project
from crawler import WebCrawler

# Create router
router = APIRouter()

# Define models
class SearchResult(BaseModel):
    id: int
    url: str
    title: Optional[str] = None
    snippet: Optional[str] = None
    similarity: Optional[float] = None
    context: Optional[str] = None
    is_chunk: Optional[bool] = None
    chunk_index: Optional[int] = None
    parent_id: Optional[int] = None
    parent_title: Optional[str] = None

class SearchResponse(BaseModel):
    results: List[SearchResult]
    count: int
    query: str
    threshold: float
    use_embedding: bool

@router.get("", response_model=SearchResponse)
async def search(
    query: str = Query(..., description="The search query"),
    threshold: float = Query(0.3, description="Similarity threshold (0-1)"),
    limit: int = Query(10, description="Maximum number of results"),
    text_only: bool = Query(False, description="Use text search instead of embeddings"),
    site_id: Optional[int] = Query(None, description="Optional site ID to filter results by")
):
    """
    Search for content using semantic search or text search.
    
    - **query**: The search query
    - **threshold**: Similarity threshold (0-1)
    - **limit**: Maximum number of results
    - **text_only**: Use text search instead of embeddings
    - **site_id**: Optional site ID to filter results by
    """
    try:
        crawler = WebCrawler()
        results = crawler.search(
            query=query,
            use_embedding=not text_only,
            threshold=threshold,
            limit=limit,
            site_id=site_id
        )
        
        # Convert results to SearchResult model
        search_results = []
        for result in results:
            search_results.append(SearchResult(
                id=result.get("id"),
                url=result.get("url"),
                title=result.get("title"),
                snippet=result.get("snippet"),
                similarity=result.get("similarity"),
                context=result.get("context"),
                is_chunk=result.get("is_chunk"),
                chunk_index=result.get("chunk_index"),
                parent_id=result.get("parent_id"),
                parent_title=result.get("parent_title")
            ))
        
        return SearchResponse(
            results=search_results,
            count=len(search_results),
            query=query,
            threshold=threshold,
            use_embedding=not text_only
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error performing search: {str(e)}"
        ) 