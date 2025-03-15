from fastapi import APIRouter, Body, Query, HTTPException, status, BackgroundTasks
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, AnyHttpUrl, field_validator

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
    follow_external_links: Optional[bool] = None
    include_patterns: Optional[List[str]] = None
    exclude_patterns: Optional[List[str]] = None
    
    # Browser options
    headless: Optional[bool] = None
    browser_type: Optional[str] = None
    proxy: Optional[str] = None
    javascript_enabled: Optional[bool] = None
    user_agent: Optional[str] = None
    
    # Page navigation options
    timeout: Optional[int] = None
    wait_for_selector: Optional[str] = None
    wait_for_timeout: Optional[int] = None
    
    # Media handling options
    download_images: Optional[bool] = None
    download_videos: Optional[bool] = None
    download_files: Optional[bool] = None
    
    # Link handling options
    follow_redirects: Optional[bool] = None
    max_depth: Optional[int] = None
    
    # Extraction options
    extraction_type: Optional[str] = None
    css_selector: Optional[str] = None
    
    @field_validator('url')
    def validate_url(cls, v):
        # Simple URL validation
        if not v.startswith(('http://', 'https://')):
            raise ValueError('URL must start with http:// or https://')
        return v
    
    @field_validator('browser_type')
    def validate_browser_type(cls, v):
        if v and v not in ['chromium', 'firefox', 'webkit']:
            raise ValueError('Browser type must be one of: chromium, firefox, webkit')
        return v
    
    @field_validator('extraction_type')
    def validate_extraction_type(cls, v):
        if v and v not in ['basic', 'article', 'custom']:
            raise ValueError('Extraction type must be one of: basic, article, custom')
        return v

class CrawlResponse(BaseModel):
    site_id: int
    site_name: str
    url: str
    message: str
    status: str
    next_steps: Dict[str, str]

# Background task for crawling
def crawl_in_background(
    url: str, 
    site_name: Optional[str], 
    site_description: Optional[str], 
    is_sitemap: bool, 
    max_urls: Optional[int],
    follow_external_links: Optional[bool] = None,
    include_patterns: Optional[List[str]] = None,
    exclude_patterns: Optional[List[str]] = None,
    headless: Optional[bool] = None,
    browser_type: Optional[str] = None,
    proxy: Optional[str] = None,
    javascript_enabled: Optional[bool] = None,
    user_agent: Optional[str] = None,
    timeout: Optional[int] = None,
    wait_for_selector: Optional[str] = None,
    wait_for_timeout: Optional[int] = None,
    download_images: Optional[bool] = None,
    download_videos: Optional[bool] = None,
    download_files: Optional[bool] = None,
    follow_redirects: Optional[bool] = None,
    max_depth: Optional[int] = None,
    extraction_type: Optional[str] = None,
    css_selector: Optional[str] = None
):
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
            
            # Prepare advanced options
            advanced_options = {
                "follow_external_links": follow_external_links,
                "include_patterns": include_patterns,
                "exclude_patterns": exclude_patterns,
                "headless": headless,
                "browser_type": browser_type,
                "proxy": proxy,
                "javascript_enabled": javascript_enabled,
                "user_agent": user_agent,
                "timeout": timeout,
                "wait_for_selector": wait_for_selector,
                "wait_for_timeout": wait_for_timeout,
                "download_images": download_images,
                "download_videos": download_videos,
                "download_files": download_files,
                "follow_redirects": follow_redirects,
                "max_depth": max_depth,
                "extraction_type": extraction_type,
                "css_selector": css_selector
            }
            
            # Remove None values
            advanced_options = {k: v for k, v in advanced_options.items() if v is not None}
            
            # Only proceed with crawling, the site already exists with the description
            if is_sitemap:
                # Pass needs_description=True to force description generation
                site_id = crawler.crawl_sitemap(
                    url, 
                    site_name, 
                    site_description, 
                    max_urls=max_urls,
                    needs_description=needs_description,
                    **advanced_options
                )
            else:
                # Pass needs_description=True to force description generation
                site_id = crawler.crawl_site(
                    url, 
                    site_name, 
                    site_description,
                    needs_description=needs_description,
                    **advanced_options
                )
        else:
            # This shouldn't happen as we create the site before starting the background task,
            # but just in case, create the site and crawl
            
            # Prepare advanced options
            advanced_options = {
                "follow_external_links": follow_external_links,
                "include_patterns": include_patterns,
                "exclude_patterns": exclude_patterns,
                "headless": headless,
                "browser_type": browser_type,
                "proxy": proxy,
                "javascript_enabled": javascript_enabled,
                "user_agent": user_agent,
                "timeout": timeout,
                "wait_for_selector": wait_for_selector,
                "wait_for_timeout": wait_for_timeout,
                "download_images": download_images,
                "download_videos": download_videos,
                "download_files": download_files,
                "follow_redirects": follow_redirects,
                "max_depth": max_depth,
                "extraction_type": extraction_type,
                "css_selector": css_selector
            }
            
            # Remove None values
            advanced_options = {k: v for k, v in advanced_options.items() if v is not None}
            
            if is_sitemap:
                site_id = crawler.crawl_sitemap(
                    url, 
                    site_name, 
                    site_description, 
                    max_urls=max_urls,
                    **advanced_options
                )
            else:
                site_id = crawler.crawl_site(
                    url, 
                    site_name, 
                    site_description,
                    **advanced_options
                )
            
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
    - **follow_external_links**: Whether to follow external links
    - **include_patterns**: List of URL patterns to include
    - **exclude_patterns**: List of URL patterns to exclude
    
    Browser options:
    - **headless**: Whether to run the browser in headless mode
    - **browser_type**: Type of browser to use (chromium, firefox, webkit)
    - **proxy**: Proxy server to use
    - **javascript_enabled**: Whether to enable JavaScript
    - **user_agent**: User agent string to use
    
    Page navigation options:
    - **timeout**: Page load timeout in milliseconds
    - **wait_for_selector**: CSS selector to wait for before considering page loaded
    - **wait_for_timeout**: Time to wait after page load in milliseconds
    
    Media handling options:
    - **download_images**: Whether to download images
    - **download_videos**: Whether to download videos
    - **download_files**: Whether to download files
    
    Link handling options:
    - **follow_redirects**: Whether to follow redirects
    - **max_depth**: Maximum depth for crawling
    
    Extraction options:
    - **extraction_type**: Type of extraction to use (basic, article, custom)
    - **css_selector**: CSS selector for content extraction
    
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
            crawl_data.max_urls,
            crawl_data.follow_external_links,
            crawl_data.include_patterns,
            crawl_data.exclude_patterns,
            crawl_data.headless,
            crawl_data.browser_type,
            crawl_data.proxy,
            crawl_data.javascript_enabled,
            crawl_data.user_agent,
            crawl_data.timeout,
            crawl_data.wait_for_selector,
            crawl_data.wait_for_timeout,
            crawl_data.download_images,
            crawl_data.download_videos,
            crawl_data.download_files,
            crawl_data.follow_redirects,
            crawl_data.max_depth,
            crawl_data.extraction_type,
            crawl_data.css_selector
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