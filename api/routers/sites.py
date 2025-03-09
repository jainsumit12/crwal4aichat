from fastapi import APIRouter, Query, HTTPException, status, Path
from typing import List, Dict, Any, Optional
from pydantic import BaseModel

# Import from main project
from crawler import WebCrawler
from db_client import SupabaseClient

# Create router
router = APIRouter()

# Define models
class Site(BaseModel):
    id: int
    name: str
    url: str
    description: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    page_count: Optional[int] = None

class SiteList(BaseModel):
    sites: List[Site]
    count: int

class Page(BaseModel):
    id: int
    url: str
    title: Optional[str] = None
    summary: Optional[str] = None
    is_chunk: bool = False
    chunk_index: Optional[int] = None
    parent_id: Optional[int] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

class PageList(BaseModel):
    pages: List[Page]
    count: int
    site_id: int
    site_name: str

@router.get("/", response_model=SiteList)
async def list_sites(
    include_chunks: bool = Query(False, description="Include chunks in page count")
):
    """
    List all crawled sites.
    
    - **include_chunks**: Whether to include chunks in the page count
    """
    try:
        db_client = SupabaseClient()
        sites = db_client.get_all_sites()
        
        # Get page count for each site
        site_list = []
        for site in sites:
            page_count = db_client.get_page_count_by_site_id(site["id"], include_chunks=include_chunks)
            site_list.append(Site(
                id=site["id"],
                name=site["name"],
                url=site["url"],
                description=site.get("description"),
                created_at=site.get("created_at"),
                updated_at=site.get("updated_at"),
                page_count=page_count
            ))
        
        return SiteList(
            sites=site_list,
            count=len(site_list)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error listing sites: {str(e)}"
        )

@router.get("/{site_id}", response_model=Site)
async def get_site(
    site_id: int = Path(..., description="The ID of the site"),
    include_chunks: bool = Query(False, description="Include chunks in page count")
):
    """
    Get a site by ID.
    
    - **site_id**: The ID of the site
    - **include_chunks**: Whether to include chunks in the page count
    """
    try:
        db_client = SupabaseClient()
        site = db_client.get_site_by_id(site_id)
        
        if not site:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Site with ID {site_id} not found"
            )
        
        # Get page count
        page_count = db_client.get_page_count_by_site_id(site_id, include_chunks=include_chunks)
        
        return Site(
            id=site["id"],
            name=site["name"],
            url=site["url"],
            description=site.get("description"),
            created_at=site.get("created_at"),
            updated_at=site.get("updated_at"),
            page_count=page_count
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting site: {str(e)}"
        )

@router.get("/{site_id}/pages", response_model=PageList)
async def get_site_pages(
    site_id: int = Path(..., description="The ID of the site"),
    include_chunks: bool = Query(False, description="Include chunks in the results"),
    limit: int = Query(100, description="Maximum number of pages to return")
):
    """
    Get pages for a specific site.
    
    - **site_id**: The ID of the site
    - **include_chunks**: Whether to include chunks in the results
    - **limit**: Maximum number of pages to return
    """
    try:
        crawler = WebCrawler()
        
        # Get site details
        site = crawler.db_client.get_site_by_id(site_id)
        if not site:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Site with ID {site_id} not found"
            )
        
        # Get pages
        pages = crawler.get_site_pages(site_id, limit=limit, include_chunks=include_chunks)
        
        # Convert to Page model
        page_list = []
        for page in pages:
            page_list.append(Page(
                id=page["id"],
                url=page["url"],
                title=page.get("title"),
                summary=page.get("summary"),
                is_chunk=page.get("is_chunk", False),
                chunk_index=page.get("chunk_index"),
                parent_id=page.get("parent_id"),
                created_at=page.get("created_at"),
                updated_at=page.get("updated_at")
            ))
        
        return PageList(
            pages=page_list,
            count=len(page_list),
            site_id=site_id,
            site_name=site["name"]
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting site pages: {str(e)}"
        ) 