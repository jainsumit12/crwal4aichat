"""
Utility functions for the CLI.
"""

import os
from typing import List, Dict, Any, Optional
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich.progress import Progress, TextColumn, BarColumn, TaskProgressColumn
from rich.text import Text

# Create a console for rich output
console = Console()

def print_header(text: str):
    """Print a header with rich formatting.
    
    Args:
        text: The header text.
    """
    console.print(f"\n[bold blue]{text}[/bold blue]")

def print_success(text: str):
    """Print a success message with rich formatting.
    
    Args:
        text: The success message.
    """
    console.print(f"[bold green]✓[/bold green] {text}")

def print_error(text: str):
    """Print an error message with rich formatting.
    
    Args:
        text: The error message.
    """
    console.print(f"[bold red]✗[/bold red] {text}")

def print_warning(text: str):
    """Print a warning message with rich formatting.
    
    Args:
        text: The warning message.
    """
    console.print(f"[bold yellow]![/bold yellow] {text}")

def print_info(text: str):
    """Print an info message with rich formatting.
    
    Args:
        text: The info message.
    """
    console.print(f"[bold cyan]i[/bold cyan] {text}")

def print_sites_table(sites: List[tuple]):
    """Print a table of sites with rich formatting.
    
    Args:
        sites: List of site tuples (id, name, url, description, page_count).
    """
    table = Table(title="Crawled Sites")
    
    table.add_column("ID", style="cyan", justify="right")
    table.add_column("Name", style="green")
    table.add_column("URL", style="blue")
    table.add_column("Description", style="yellow")
    table.add_column("Pages", style="magenta", justify="right")
    
    for site in sites:
        site_id, name, url, description, page_count = site
        table.add_row(
            str(site_id),
            name,
            url,
            description or "N/A",
            str(page_count)
        )
    
    console.print(table)

def print_search_results(results: List[Dict[str, Any]]):
    """Print search results with rich formatting.
    
    Args:
        results: List of search result dictionaries.
    """
    console.print(f"\n[bold]Found {len(results)} results:[/bold]")
    
    for i, result in enumerate(results):
        title = result.get('title', 'No title')
        url = result.get('url', 'No URL')
        similarity = result.get('similarity', None)
        content = result.get('content', '')
        
        # Create a snippet of the content
        snippet = content[:200] + "..." if len(content) > 200 else content
        
        # Create a panel for the result
        panel_title = f"Result {i+1}"
        if similarity:
            panel_title += f" (Similarity: {similarity:.4f})"
        
        panel_content = f"[bold]{title}[/bold]\n[blue]{url}[/blue]\n\n{snippet}"
        
        console.print(Panel(panel_content, title=panel_title, border_style="green"))

def get_rich_progress():
    """Get a rich progress bar.
    
    Returns:
        A rich progress bar.
    """
    return Progress(
        TextColumn("[bold blue]{task.description}"),
        BarColumn(),
        TaskProgressColumn(),
        console=console
    ) 