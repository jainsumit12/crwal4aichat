from fastapi import APIRouter, Body, Query, HTTPException, status, BackgroundTasks
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, AnyHttpUrl, validator

# Import from main project
from crawler import WebCrawler

# Create router
router = APIRouter()

# Define models
class CrawlRequest(BaseModel):
    url: str
    site_name: Optional[str] = None
    site_description: Optional[str] = None
    is_sitemap: bool = False
    max_urls: Optional[int] = None
    
    @validator('url')
    def validate_url(cls, v):
        # Simple URL validation
        if not v.startswith(('http://', 'https://')):
            raise ValueError('URL must start with http:// or https://')
        return v

class CrawlResponse(BaseModel):
    site_id: int
    site_name: str
    url: str
    message: str
    status: str
    next_steps: Dict[str, str]

# Background task for crawling
def crawl_in_background(url: str, site_name: Optional[str], site_description: Optional[str], is_sitemap: bool, max_urls: Optional[int]):
    try:
        crawler = WebCrawler()
        
        # Get the site ID from the database
        existing_site = crawler.db_client.get_site_by_url(url)
        if existing_site:
            site_id = existing_site['id']
            
            # Check if we need to generate a description
            needs_description = (
                not site_description and 
                (not existing_site.get('description') or 
                 existing_site.get('description') == "AI is generating a description... (refresh in a moment)")
            )
            
            # Only proceed with crawling, the site already exists with the description
            if is_sitemap:
                # Pass needs_description=True to force description generation
                site_id = crawler.crawl_sitemap(
                    url, 
                    site_name, 
                    site_description, 
                    max_urls=max_urls,
                    needs_description=needs_description
                )
            else:
                # Pass needs_description=True to force description generation
                site_id = crawler.crawl_site(
                    url, 
                    site_name, 
                    site_description,
                    needs_description=needs_description
                )
        else:
            # This shouldn't happen as we create the site before starting the background task,
            # but just in case, create the site and crawl
            if is_sitemap:
                site_id = crawler.crawl_sitemap(url, site_name, site_description, max_urls=max_urls)
            else:
                site_id = crawler.crawl_site(url, site_name, site_description)
            
        # Get the final page count
        page_count = crawler.db_client.get_page_count_by_site_id(site_id, include_chunks=True)
        parent_page_count = crawler.db_client.get_page_count_by_site_id(site_id, include_chunks=False)
        
        # Print a completion message
        print("\n" + "="*80)
        print("✅  CRAWL COMPLETED SUCCESSFULLY!")
        print("="*80)
        print(f"📊  Site ID: {site_id}")
        print(f"📄  Pages crawled: {parent_page_count}")
        print(f"🧩  Total chunks: {page_count - parent_page_count}")
        print(f"🔍  To check status: GET /api/crawl/status/{site_id}")
        print(f"📚  To view pages: GET /api/sites/{site_id}/pages")
        print(f"🔎  To search content: GET /api/search/?query=your_query&site_id={site_id}")
        print("="*80 + "\n")
    except Exception as e:
        print(f"Error in background crawl task: {str(e)}")

@router.post("", response_model=CrawlResponse)
async def crawl(
    background_tasks: BackgroundTasks,
    crawl_data: CrawlRequest = Body(...),
):
    """
    Crawl a website or sitemap.
    
    - **url**: URL to crawl
    - **site_name**: Optional name for the site
    - **site_description**: Optional description of the site
    - **is_sitemap**: Whether the URL is a sitemap
    - **max_urls**: Maximum number of URLs to crawl from a sitemap
    
    The crawling process will be executed in the background.
    """
    try:
        crawler = WebCrawler()
        
        # Check if the site already exists
        existing_site = crawler.db_client.get_site_by_url(crawl_data.url)
        site_id = None
        
        if existing_site:
            print(f"Site already exists with ID: {existing_site['id']}. Updating existing site.")
            site_id = existing_site['id']
            
            # Update the site description if provided
            if crawl_data.site_description:
                crawler.db_client.update_site_description(site_id, crawl_data.site_description)
            elif not existing_site.get('description'):
                # Set a placeholder indicating an AI description is coming
                crawler.db_client.update_site_description(site_id, "AI is generating a description... (refresh in a moment)")
        else:
            # Create the site with the provided description or a placeholder
            description = crawl_data.site_description
            if not description:
                # Set a placeholder indicating an AI description is coming
                description = "AI is generating a description... (refresh in a moment)"
                
            site_id = crawler.db_client.add_site(
                crawl_data.site_name or crawler.generate_site_name(crawl_data.url),
                crawl_data.url,
                description
            )
        
        # Start the crawl process
        if crawl_data.is_sitemap:
            if not site_id:
                site_id = crawler.crawl_sitemap(
                    crawl_data.url, 
                    crawl_data.site_name, 
                    crawl_data.site_description, 
                    max_urls=crawl_data.max_urls,
                    start_only=True  # Only start the crawl, don't wait for completion
                )
        else:
            if not site_id:
                site_id = crawler.crawl_site(
                    crawl_data.url, 
                    crawl_data.site_name, 
                    crawl_data.site_description,
                    start_only=True  # Only start the crawl, don't wait for completion
                )
        
        # Add the full crawl to background tasks
        background_tasks.add_task(
            crawl_in_background,
            crawl_data.url,
            crawl_data.site_name,
            crawl_data.site_description,
            crawl_data.is_sitemap,
            crawl_data.max_urls
        )
        
        # Get site details
        site = crawler.db_client.get_site_by_id(site_id)
        
        return CrawlResponse(
            site_id=site_id,
            site_name=site.get("name", ""),
            url=site.get("url", ""),
            message="Crawl started successfully",
            status="in_progress",
            next_steps={
                "check_status": f"GET /api/crawl/status/{site_id}",
                "view_pages": f"GET /api/sites/{site_id}/pages",
                "search_content": f"GET /api/search/?query=your_query&site_id={site_id}"
            }
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error starting crawl: {str(e)}"
        )

@router.get("/status/{site_id}", response_model=Dict[str, Any])
async def crawl_status(site_id: int):
    """
    Get the status of a crawl by site ID.
    
    - **site_id**: The ID of the site
    
    Returns detailed information about the site, including the number of pages crawled,
    chunks created, and suggested next steps for working with the crawled content.
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
        
        # Get page count
        page_count = crawler.db_client.get_page_count_by_site_id(site_id)
        parent_page_count = crawler.db_client.get_page_count_by_site_id(site_id, include_chunks=False)
        chunk_count = page_count - parent_page_count
        
        return {
            "site_id": site_id,
            "site_name": site.get("name", ""),
            "url": site.get("url", ""),
            "page_count": parent_page_count,
            "chunk_count": chunk_count,
            "total_count": page_count,
            "created_at": site.get("created_at", ""),
            "updated_at": site.get("updated_at", ""),
            "next_steps": {
                "view_pages": f"GET /api/sites/{site_id}/pages",
                "search_content": f"GET /api/search/?query=your_query&site_id={site_id}"
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting crawl status: {str(e)}"
        ) 