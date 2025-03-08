import os
import time
import json
import requests
from typing import List, Dict, Any, Optional, Union
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class Crawl4AIClient:
    """Client for interacting with the Crawl4AI API."""
    
    def __init__(self, base_url: Optional[str] = None, api_token: Optional[str] = None):
        """Initialize the Crawl4AI client.
        
        Args:
            base_url: The base URL for the Crawl4AI API. Defaults to environment variable.
            api_token: The API token for authentication. Defaults to environment variable.
        """
        self.base_url = base_url or os.getenv("CRAWL4AI_BASE_URL")
        self.api_token = api_token or os.getenv("CRAWL4AI_API_TOKEN")
        
        if not self.base_url:
            raise ValueError("Crawl4AI base URL not provided and not found in environment variables.")
        if not self.api_token:
            raise ValueError("Crawl4AI API token not provided and not found in environment variables.")
        
        self.headers = {
            "Authorization": f"Bearer {self.api_token}",
            "Content-Type": "application/json"
        }
        
        print(f"Initialized Crawl4AI client with base URL: {self.base_url}")
    
    def start_crawl(self, urls: Union[str, List[str]], priority: int = 10, 
                   extraction_config: Optional[Dict[str, Any]] = None,
                   js_code: Optional[List[str]] = None,
                   wait_for: Optional[str] = None,
                   css_selector: Optional[str] = None) -> Dict[str, Any]:
        """Start a crawl task.
        
        Args:
            urls: A single URL or list of URLs to crawl.
            priority: Priority of the crawl task (1-10).
            extraction_config: Configuration for extraction strategy.
            js_code: JavaScript code to execute on the page.
            wait_for: CSS selector to wait for before considering page loaded.
            css_selector: CSS selector for content extraction.
            
        Returns:
            Dict containing the task_id and other response data.
        """
        # Ensure urls is a list
        if isinstance(urls, str):
            urls = [urls]
        
        # Prepare the request payload according to v0.5.0 format
        payload = {
            "urls": urls,
            "priority": priority
        }
        
        # Add optional parameters if provided
        if extraction_config:
            # Make sure extraction_config has the correct format for v0.5.0
            if "type" not in extraction_config:
                extraction_config["type"] = "basic"
            payload["extraction_config"] = extraction_config
        else:
            # Default extraction config for v0.5.0
            payload["extraction_config"] = {"type": "basic"}
            
        if js_code:
            payload["js_code"] = js_code
        if wait_for:
            payload["wait_for"] = wait_for
        if css_selector:
            payload["css_selector"] = css_selector
        
        print(f"Starting crawl for URLs: {urls}")
        print(f"Extraction config: {extraction_config}")
        
        # Make the API request
        try:
            # Try v0.5.0 endpoint format
            endpoint = f"{self.base_url}/crawl"
            print(f"Sending request to: {endpoint}")
            print(f"Payload: {json.dumps(payload, indent=2)}")
            
            response = requests.post(
                endpoint,
                headers=self.headers,
                json=payload
            )
            
            # Check if the request was successful
            if response.status_code == 200:
                result = response.json()
                print(f"Successfully started crawl task with ID: {result.get('task_id')}")
                return result
            else:
                error_message = f"Failed to start crawl task: {response.text}"
                print(f"Error: {error_message}")
                
                # Try with a simpler payload as fallback
                print("Trying with simplified payload...")
                simple_payload = {
                    "urls": urls,
                    "extraction_config": {"type": "basic"}
                }
                
                response = requests.post(
                    endpoint,
                    headers=self.headers,
                    json=simple_payload
                )
                
                if response.status_code == 200:
                    result = response.json()
                    print(f"Successfully started crawl task with simplified payload. Task ID: {result.get('task_id')}")
                    return result
                else:
                    raise Exception(f"Failed to start crawl task with simplified payload: {response.text}")
                
        except requests.RequestException as e:
            error_message = f"Request error when starting crawl: {str(e)}"
            print(f"Error: {error_message}")
            raise Exception(error_message)
    
    def get_task_status(self, task_id: str) -> Dict[str, Any]:
        """Get the status of a crawl task.
        
        Args:
            task_id: The ID of the task to check.
            
        Returns:
            Dict containing the task status and results if available.
        """
        try:
            # Try v0.5.0 endpoint format
            endpoint = f"{self.base_url}/task/{task_id}"
            print(f"Checking task status at: {endpoint}")
            
            response = requests.get(
                endpoint,
                headers=self.headers
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                error_message = f"Failed to get task status: {response.text}"
                print(f"Error: {error_message}")
                raise Exception(error_message)
        except requests.RequestException as e:
            error_message = f"Request error when checking task status: {str(e)}"
            print(f"Error: {error_message}")
            raise Exception(error_message)
    
    def wait_for_completion(self, task_id: str, polling_interval: int = 5, 
                           timeout: int = 600) -> Dict[str, Any]:
        """Wait for a crawl task to complete.
        
        Args:
            task_id: The ID of the task to wait for.
            polling_interval: How often to check the task status (in seconds).
            timeout: Maximum time to wait (in seconds).
            
        Returns:
            Dict containing the final task status and results.
        """
        start_time = time.time()
        
        while True:
            # Check if we've exceeded the timeout
            if time.time() - start_time > timeout:
                raise TimeoutError(f"Task {task_id} did not complete within {timeout} seconds")
            
            # Get the current task status
            status_data = self.get_task_status(task_id)
            
            # Check if the task has completed or failed
            if status_data.get("status") == "completed":
                print(f"Task {task_id} completed successfully")
                return status_data
            elif status_data.get("status") == "failed":
                error_message = f"Task {task_id} failed: {status_data.get('error', 'Unknown error')}"
                print(f"Error: {error_message}")
                raise Exception(error_message)
            
            # Wait before checking again
            time.sleep(polling_interval)
            
            # Print a status update
            elapsed = time.time() - start_time
            print(f"Task {task_id} still running after {elapsed:.1f} seconds...")
    
    def crawl_and_wait(self, urls: Union[str, List[str]], **kwargs) -> Dict[str, Any]:
        """Start a crawl task and wait for it to complete.
        
        Args:
            urls: A single URL or list of URLs to crawl.
            **kwargs: Additional arguments to pass to start_crawl.
            
        Returns:
            Dict containing the final task status and results.
        """
        # Start the crawl task
        try:
            task_data = self.start_crawl(urls, **kwargs)
            task_id = task_data.get("task_id")
            
            if not task_id:
                raise ValueError("No task_id returned from start_crawl")
            
            print(f"Started crawl task with ID: {task_id}")
            
            # Wait for the task to complete
            return self.wait_for_completion(task_id)
        except Exception as e:
            print(f"Error in crawl_and_wait: {e}")
            
            # If the error is related to extraction_config, try with a simpler config
            if "extraction_config" in str(e):
                print("Trying with a simpler extraction configuration...")
                if "extraction_config" in kwargs:
                    # Simplify the extraction config
                    kwargs["extraction_config"] = {"type": "basic"}
                    return self.start_crawl(urls, **kwargs)
            
            # Re-raise the exception
            raise 
    
    def crawl_sitemap(self, sitemap_url: str, priority: int = 10, max_urls: int = 50) -> Dict[str, Any]:
        """Crawl a sitemap using the Crawl4AI API.
        
        Args:
            sitemap_url: The URL of the sitemap to crawl.
            priority: Priority of the crawl task (1-10).
            max_urls: Maximum number of URLs to crawl from the sitemap.
            
        Returns:
            Dict containing the task results with individual page content.
        """
        print(f"Starting sitemap crawl for: {sitemap_url}")
        
        # First, get the sitemap content to extract URLs
        print(f"Fetching sitemap content from: {sitemap_url}")
        
        # Crawl the sitemap URL first to get its content
        sitemap_result = self.crawl_and_wait(sitemap_url, extraction_config={"type": "basic"})
        
        # Extract URLs from the sitemap result
        urls = []
        
        # Check if we have results
        if 'results' in sitemap_result and sitemap_result['results']:
            # Get the first result (the sitemap)
            sitemap_data = sitemap_result['results'][0]
            
            # Try to parse the HTML as XML
            import xml.etree.ElementTree as ET
            from io import StringIO
            
            try:
                # Try to parse the HTML as XML
                root = ET.fromstring(sitemap_data['html'])
                
                # Define the XML namespace
                namespace = {'ns': 'http://www.sitemaps.org/schemas/sitemap/0.9'}
                
                # Extract URLs from the sitemap
                for url_element in root.findall('.//ns:url/ns:loc', namespace):
                    url = url_element.text.strip()
                    if url not in urls:
                        urls.append(url)
            except Exception as e:
                print(f"Error parsing sitemap XML: {e}")
                
                # If XML parsing fails, try to extract URLs from links
                if 'links' in sitemap_data and sitemap_data['links']:
                    # Get internal links
                    internal_links = sitemap_data['links'].get('internal', [])
                    for link in internal_links:
                        if 'href' in link and link['href'] not in urls:
                            urls.append(link['href'])
                    
                    # Also check external links (some sitemaps might list them as external)
                    external_links = sitemap_data['links'].get('external', [])
                    for link in external_links:
                        if 'href' in link and link['href'] not in urls:
                            urls.append(link['href'])
        
        if not urls:
            print("No URLs found in sitemap. Returning the sitemap result directly.")
            return sitemap_result
        
        print(f"Found {len(urls)} URLs in sitemap")
        
        # Limit the number of URLs to crawl
        if max_urls > 0 and len(urls) > max_urls:
            print(f"Limiting to {max_urls} URLs for crawling")
            urls = urls[:max_urls]
        
        # Now crawl each URL found in the sitemap
        print(f"Crawling {len(urls)} URLs from sitemap")
        
        # Use crawl_and_wait to crawl all URLs
        urls_result = self.crawl_and_wait(urls, extraction_config={"type": "basic"})
        
        # Combine the results
        combined_result = {
            "sitemap_result": sitemap_result,
            "urls_result": urls_result,
            "urls": urls
        }
        
        return combined_result 