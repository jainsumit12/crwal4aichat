"""
Example script demonstrating how to use the crawler programmatically.
"""

import os
from dotenv import load_dotenv
from crawler import WebCrawler
from db_setup import setup_database

# Load environment variables
load_dotenv()

def main():
    """Main function demonstrating crawler usage."""
    # First, make sure the database is set up
    print("Setting up the database...")
    setup_database()
    
    # Create a crawler instance
    crawler = WebCrawler()
    
    # Example 1: Crawl a website
    print("\n--- Example 1: Crawling a website ---")
    site_url = "https://example.com"
    site_name = "Example Website"
    site_description = "A simple example website for demonstration"
    
    print(f"Crawling {site_url}...")
    site_id = crawler.crawl_site(site_url, site_name, site_description)
    print(f"Crawl completed. Site ID: {site_id}")
    
    # Example 2: Search the crawled content
    print("\n--- Example 2: Searching the crawled content ---")
    search_query = "example information"
    
    print(f"Searching for: {search_query}")
    results = crawler.search(search_query)
    
    print(f"Found {len(results)} results:")
    for i, result in enumerate(results[:3]):  # Show top 3 results
        print(f"\nResult {i+1}:")
        print(f"Title: {result.get('title', 'No title')}")
        print(f"URL: {result.get('url', 'No URL')}")
        if 'similarity' in result:
            print(f"Similarity: {result['similarity']:.4f}")
        
        # Print a snippet of the content
        content = result.get('content', '')
        if content:
            snippet = content[:150] + "..." if len(content) > 150 else content
            print(f"Snippet: {snippet}")
    
    # Example 3: Get pages for a specific site
    print("\n--- Example 3: Getting pages for a specific site ---")
    pages = crawler.get_site_pages(site_id, limit=5)
    
    print(f"Found {len(pages)} pages for site ID {site_id}:")
    for i, page in enumerate(pages[:3]):  # Show top 3 pages
        print(f"\nPage {i+1}:")
        print(f"Title: {page.get('title', 'No title')}")
        print(f"URL: {page.get('url', 'No URL')}")
        
        # Print a snippet of the content
        content = page.get('content', '')
        if content:
            snippet = content[:150] + "..." if len(content) > 150 else content
            print(f"Snippet: {snippet}")

if __name__ == "__main__":
    main() 