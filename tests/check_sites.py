#!/usr/bin/env python3
"""
Script to check what sites are in the database and their content.
"""

import os
import sys
import json
from dotenv import load_dotenv
from db_client import SupabaseClient

# Load environment variables
load_dotenv()

def print_header(message):
    """Print a header message."""
    print(f"\n{'=' * 80}")
    print(f"{message}")
    print(f"{'=' * 80}")

def print_info(message):
    """Print an info message."""
    print(f"[INFO] {message}")

def print_success(message):
    """Print a success message."""
    print(f"[SUCCESS] {message}")

def print_warning(message):
    """Print a warning message."""
    print(f"[WARNING] {message}")

def print_error(message):
    """Print an error message."""
    print(f"[ERROR] {message}")

def check_sites():
    """Check what sites are in the database."""
    client = SupabaseClient()
    
    # Get all sites
    sites = client.get_all_sites()
    
    print_header(f"Found {len(sites)} sites in the database")
    
    # Print site information
    for site in sites:
        print(f"\nSite ID: {site['id']}")
        print(f"Name: {site['name']}")
        print(f"URL: {site['url']}")
        print(f"Description: {site.get('description', 'No description')}")
        
        # Get page count for this site
        pages = client.get_pages_by_site_id(site['id'], limit=1000, include_chunks=False)
        print(f"Pages: {len(pages)}")
        
        # Check if any pages contain "bigsk1" in the URL or content
        bigsk1_pages = [p for p in pages if "bigsk1" in p.get('url', '').lower() or "bigsk1" in p.get('content', '').lower()]
        if bigsk1_pages:
            print(f"Found {len(bigsk1_pages)} pages containing 'bigsk1'")
            for page in bigsk1_pages[:5]:  # Show first 5 only
                print(f"  - {page.get('title', 'No title')} ({page.get('url', 'No URL')})")
                if len(bigsk1_pages) > 5:
                    print(f"  ... and {len(bigsk1_pages) - 5} more")
        else:
            print("No pages containing 'bigsk1' found")

def search_for_term(term):
    """Search for a specific term in the database."""
    client = SupabaseClient()
    
    print_header(f"Searching for '{term}' in the database")
    
    # Use text search
    results = client.search_by_text(term, limit=10)
    
    if results:
        print_success(f"Found {len(results)} results containing '{term}'")
        for i, result in enumerate(results):
            print(f"\nResult {i+1}:")
            print(f"Title: {result.get('title', 'No title')}")
            print(f"URL: {result.get('url', 'No URL')}")
            print(f"Site: {result.get('site_name', 'Unknown site')}")
            
            # Show a snippet of content
            content = result.get('content', '')
            if content:
                # Find the term in the content and show a snippet around it
                term_pos = content.lower().find(term.lower())
                if term_pos >= 0:
                    start = max(0, term_pos - 100)
                    end = min(len(content), term_pos + 100)
                    snippet = content[start:end]
                    print(f"Snippet: ...{snippet}...")
                else:
                    print(f"Snippet: {content[:200]}...")
    else:
        print_warning(f"No results found for '{term}'")

def main():
    """Main function."""
    print_header("Checking database content")
    
    # Check sites
    check_sites()
    
    # Search for specific terms
    search_for_term("bigsk1")
    
    print_header("Done")

if __name__ == "__main__":
    main() 