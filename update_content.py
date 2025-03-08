"""
Script to update existing pages with titles and summaries.
"""

import os
import asyncio
import argparse
from typing import List, Dict, Any
from dotenv import load_dotenv
from tqdm import tqdm

from db_client import SupabaseClient
from content_enhancer import ContentEnhancer

# Load environment variables
load_dotenv()

async def update_pages(site_id: int = None, limit: int = 100, force: bool = False):
    """Update existing pages with titles and summaries.
    
    Args:
        site_id: Optional site ID to filter by. If not provided, all sites will be updated.
        limit: Maximum number of pages to update per site.
        force: Whether to force update pages that already have titles and summaries.
    """
    db_client = SupabaseClient()
    content_enhancer = ContentEnhancer()
    
    # Get sites to update
    if site_id:
        # Get a specific site
        conn = db_client._get_connection()
        cur = conn.cursor()
        cur.execute("SELECT id, name, url FROM crawl_sites WHERE id = %s", (site_id,))
        sites = cur.fetchall()
        conn.close()
    else:
        # Get all sites
        conn = db_client._get_connection()
        cur = conn.cursor()
        cur.execute("SELECT id, name, url FROM crawl_sites ORDER BY id")
        sites = cur.fetchall()
        conn.close()
    
    if not sites:
        print("No sites found.")
        return
    
    print(f"Found {len(sites)} site(s) to update.")
    
    for site in sites:
        site_id, site_name, site_url = site
        print(f"\nUpdating site: {site_name} (ID: {site_id})")
        
        # Get pages for this site
        pages = db_client.get_pages_by_site_id(site_id, limit)
        
        if not pages:
            print("No pages found for this site.")
            continue
        
        # Filter pages that need updating
        if not force:
            pages_to_update = [page for page in pages if not page.get('title') or not page.get('summary')]
            if not pages_to_update:
                print("All pages already have titles and summaries.")
                continue
            print(f"Found {len(pages_to_update)} page(s) that need updating.")
        else:
            pages_to_update = pages
            print(f"Forcing update of {len(pages_to_update)} page(s).")
        
        # Update pages with titles and summaries
        print("Generating titles and summaries...")
        enhanced_pages = await content_enhancer.enhance_pages_async(pages_to_update)
        
        # Update the database
        print("Updating database...")
        page_ids = db_client.add_pages(site_id, enhanced_pages)
        
        print(f"Successfully updated {len(page_ids)} page(s).")

def main():
    """Main entry point for the script."""
    parser = argparse.ArgumentParser(description="Update existing pages with titles and summaries")
    parser.add_argument("--site-id", type=int, help="Site ID to update (optional)")
    parser.add_argument("--limit", type=int, default=100, help="Maximum number of pages to update per site")
    parser.add_argument("--force", action="store_true", help="Force update pages that already have titles and summaries")
    
    args = parser.parse_args()
    
    # Run the update
    asyncio.run(update_pages(args.site_id, args.limit, args.force))

if __name__ == "__main__":
    main() 