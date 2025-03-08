"""
Chat interface for interacting with crawled data using an LLM.
"""

import os
import argparse
import uuid
import json
import yaml
import glob
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv
from openai import OpenAI
from crawler import WebCrawler
from rich.console import Console
from rich.panel import Panel
from rich.markdown import Markdown
from rich.text import Text
from rich.prompt import Prompt
from rich.table import Table

# Create a rich console
console = Console()

# Load environment variables
load_dotenv()

# Define default chat profiles (fallback if files not found)
DEFAULT_PROFILES = {
    "default": {
        "name": "default",
        "description": "General-purpose assistant for all sites",
        "system_prompt": "You are a helpful assistant that answers questions based on the provided context. If the answer is not in the context, say you don't know.",
        "search_settings": {
            "sites": [],  # Empty list means search all sites
            "threshold": 0.5,
            "limit": 5
        }
    }
}

def load_profiles_from_directory(profiles_dir="profiles"):
    """Load profile configurations from YAML files in the profiles directory.
    
    Args:
        profiles_dir: Directory containing profile YAML files.
        
    Returns:
        Dictionary of profile configurations.
    """
    profiles = {}
    
    # First, load the default profiles as fallback
    profiles.update(DEFAULT_PROFILES)
    
    # Check if the profiles directory exists
    if not os.path.exists(profiles_dir):
        console.print(f"[yellow]Profiles directory '{profiles_dir}' not found. Using default profiles.[/yellow]")
        return profiles
    
    # Find all YAML files in the profiles directory
    profile_files = glob.glob(os.path.join(profiles_dir, "*.yaml"))
    profile_files.extend(glob.glob(os.path.join(profiles_dir, "*.yml")))
    
    if not profile_files:
        console.print(f"[yellow]No profile files found in '{profiles_dir}'. Using default profiles.[/yellow]")
        return profiles
    
    # Load each profile file
    for profile_file in profile_files:
        try:
            with open(profile_file, 'r') as f:
                profile_data = yaml.safe_load(f)
            
            # Validate the profile data
            if not profile_data.get('name'):
                console.print(f"[yellow]Profile file '{profile_file}' missing 'name' field. Skipping.[/yellow]")
                continue
            
            # Extract the profile name
            profile_name = profile_data['name']
            
            # Ensure search_settings exists
            if 'search_settings' not in profile_data:
                profile_data['search_settings'] = DEFAULT_PROFILES['default']['search_settings']
            
            # Add the profile to the dictionary
            profiles[profile_name] = profile_data
            
        except Exception as e:
            console.print(f"[red]Error loading profile from '{profile_file}': {e}[/red]")
    
    # Print the number of profiles loaded
    console.print(f"[green]Loaded {len(profiles)} profiles from {profiles_dir}[/green]")
    
    return profiles

# Load profiles from the profiles directory
CHAT_PROFILES = load_profiles_from_directory()

class ChatBot:
    """Chat interface for interacting with crawled data using an LLM."""
    
    def __init__(self, model: str = None, result_limit: int = None, similarity_threshold: float = None, 
                session_id: str = None, user_id: str = None, profile: str = None):
        """Initialize the chat interface.
        
        Args:
            model: OpenAI model to use.
            result_limit: Maximum number of results to return.
            similarity_threshold: Similarity threshold for vector search.
            session_id: Session ID for the conversation.
            user_id: User ID for the conversation.
            profile: Chat profile to use.
        """
        # Load environment variables
        load_dotenv()
        
        # Set up the OpenAI client
        self.client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        
        # Set up the model
        self.model = model or os.getenv("CHAT_MODEL", "gpt-4o")
        
        # Set up the result limit
        self.result_limit = result_limit or int(os.getenv("CHAT_RESULT_LIMIT", "5"))
        
        # Set up the similarity threshold
        self.similarity_threshold = similarity_threshold or float(os.getenv("CHAT_SIMILARITY_THRESHOLD", "0.5"))
        
        # Set up the session ID
        self.session_id = session_id or os.getenv("CHAT_SESSION_ID") or str(uuid.uuid4())
        
        # Set up the user ID
        self.user_id = user_id or os.getenv("CHAT_USER_ID")
        
        # Set up the profile
        self.profile_name = profile or os.getenv("CHAT_PROFILE", "default")
        if self.profile_name not in CHAT_PROFILES:
            console.print(f"[yellow]Warning: Profile '{self.profile_name}' not found, using default profile[/yellow]")
            self.profile_name = "default"
        
        self.profile = CHAT_PROFILES[self.profile_name]
        
        # Get search settings from the profile
        search_settings = self.profile.get('search_settings', {})
        self.search_sites = search_settings.get('sites', [])
        
        # Override result limit and similarity threshold if specified in the profile
        if 'limit' in search_settings:
            self.result_limit = search_settings['limit']
        if 'threshold' in search_settings:
            self.similarity_threshold = search_settings['threshold']
        
        # Print the current profile and settings
        console.print(f"[bold green]Using profile:[/bold green] [blue]{self.profile_name}[/blue] - {self.profile.get('description', '')}")
        console.print(f"[bold blue]Using model:[/bold blue] [green]{self.model}[/green]")
        console.print(f"[bold blue]Result limit:[/bold blue] [green]{self.result_limit}[/green]")
        console.print(f"[bold blue]Similarity threshold:[/bold blue] [green]{self.similarity_threshold}[/green]")
        if self.search_sites:
            console.print(f"[bold blue]Filtering sites:[/bold blue] [green]{', '.join(self.search_sites)}[/green]")
        
        # Set up the crawler
        self.crawler = WebCrawler()
        
        # Set up the conversation history table
        self.crawler.db_client.setup_conversation_history_table()
        
        # Set up the conversation history
        self.conversation_history = []
        
        # Load the conversation history
        self.load_conversation_history()
        
        # Add a system message with the profile's system prompt
        if not self.conversation_history:
            self.add_system_message(self.profile.get('system_prompt', DEFAULT_PROFILES['default']['system_prompt']))
    
    def load_conversation_history(self):
        """Load conversation history from the database."""
        # Get conversation history from the database
        db_messages = self.crawler.db_client.get_conversation_history(self.session_id)
        
        # Convert to the format expected by the OpenAI API
        self.conversation_history = []
        
        for message in db_messages:
            self.conversation_history.append({
                "role": message["role"],
                "content": message["content"]
            })
        
        console.print(f"[bold blue]Loaded[/bold blue] [green]{len(self.conversation_history)}[/green] [bold blue]messages from history[/bold blue]")
    
    def add_system_message(self, content: str):
        """Add a system message to the conversation history.
        
        Args:
            content: The message content.
        """
        # Add to the database with profile metadata
        self.crawler.db_client.save_message(
            session_id=self.session_id,
            user_id=self.user_id,
            role="system",
            content=content,
            metadata={"profile": self.profile_name}
        )
        
        # Add to the in-memory history
        self.conversation_history.append({
            "role": "system",
            "content": content
        })
    
    def add_user_message(self, content: str):
        """Add a user message to the conversation history.
        
        Args:
            content: The message content.
        """
        # Add to the database with profile metadata
        self.crawler.db_client.save_message(
            session_id=self.session_id,
            user_id=self.user_id,
            role="user",
            content=content,
            metadata={"profile": self.profile_name}
        )
        
        # Add to the in-memory history
        self.conversation_history.append({
            "role": "user",
            "content": content
        })
    
    def add_assistant_message(self, content: str):
        """Add an assistant message to the conversation history.
        
        Args:
            content: The message content.
        """
        # Add to the database with profile metadata
        self.crawler.db_client.save_message(
            session_id=self.session_id,
            user_id=self.user_id,
            role="assistant",
            content=content,
            metadata={"profile": self.profile_name}
        )
        
        # Add to the in-memory history
        self.conversation_history.append({
            "role": "assistant",
            "content": content
        })
    
    def clear_conversation_history(self):
        """Clear the conversation history."""
        # Clear from the database
        self.crawler.db_client.clear_conversation_history(self.session_id)
        
        # Clear from memory
        self.conversation_history = []
        
        # Add a system message
        self.add_system_message(self.profile.get('system_prompt', DEFAULT_PROFILES['default']['system_prompt']))
        
        console.print("[bold green]Conversation history cleared[/bold green]")
    
    def change_profile(self, profile_name: str):
        """Change the chat profile.
        
        Args:
            profile_name: The name of the profile to use.
        """
        if profile_name not in CHAT_PROFILES:
            console.print(f"[yellow]Warning: Profile '{profile_name}' not found, using default profile[/yellow]")
            profile_name = "default"
        
        self.profile_name = profile_name
        self.profile = CHAT_PROFILES[profile_name]
        
        # Update settings from profile
        search_settings = self.profile.get('search_settings', {})
        self.result_limit = search_settings.get('limit', 5)
        self.similarity_threshold = search_settings.get('threshold', 0.5)
        self.search_sites = search_settings.get('sites', [])
        
        # Add a system message with the new profile
        self.add_system_message(self.profile.get('system_prompt', DEFAULT_PROFILES['default']['system_prompt']))
        
        console.print(f"[bold green]Changed profile to:[/bold green] [blue]{profile_name}[/blue] - {self.profile.get('description', '')}")
        if self.search_sites:
            console.print(f"[bold blue]Filtering sites:[/bold blue] [green]{', '.join(self.search_sites)}[/green]")
    
    def search_for_context(self, query: str) -> List[Dict[str, Any]]:
        """Search for relevant context based on the query.
        
        Args:
            query: The search query.
            
        Returns:
            List of relevant documents.
        """
        # If the profile specifies specific sites to search, filter by site name
        search_sites = self.search_sites
        
        if search_sites:
            # Get all sites
            all_sites = self.crawler.db_client.get_all_sites()
            
            # Filter sites by name
            filtered_site_ids = []
            for site in all_sites:
                for search_term in search_sites:
                    if search_term.lower() in site["name"].lower():
                        filtered_site_ids.append(site["id"])
                        break
            
            if filtered_site_ids:
                console.print(f"[blue]Searching in {len(filtered_site_ids)} sites matching profile criteria[/blue]")
                
                # Search in each site and combine results
                all_results = []
                for site_id in filtered_site_ids:
                    site_results = self.crawler.search(
                        query, 
                        limit=self.result_limit,
                        threshold=self.similarity_threshold,
                        site_id=site_id
                    )
                    all_results.extend(site_results)
                
                # Sort by similarity and limit results
                all_results.sort(key=lambda x: x.get("similarity", 0), reverse=True)
                return all_results[:self.result_limit]
            else:
                console.print("[yellow]No sites match the profile criteria, searching all sites[/yellow]")
        
        # Default search in all sites
        return self.crawler.search(
            query, 
            limit=self.result_limit,
            threshold=self.similarity_threshold
        )
    
    def format_context(self, results: List[Dict[str, Any]]) -> str:
        """Format search results into a context string.
        
        Args:
            results: List of search results.
            
        Returns:
            Formatted context string.
        """
        if not results:
            return "No relevant information found."
        
        # Group results by site
        sites = {}
        for result in results:
            site_name = result.get('site_name', 'Unknown Site')
            if site_name not in sites:
                sites[site_name] = []
            sites[site_name].append(result)
        
        context_parts = []
        
        # Process each site's results
        for site_name, site_results in sites.items():
            # Sort results by similarity score
            site_results.sort(key=lambda x: x.get('similarity', 0), reverse=True)
            
            # Add site header
            context_parts.append(f"Information from {site_name}:")
            
            # Process each result
            for i, result in enumerate(site_results):
                title = result.get('title', 'No title')
                url = result.get('url', 'No URL')
                content = result.get('content', '')
                similarity = result.get('similarity', 0)
                
                # Clean up the URL by removing the chunk fragment
                if '#chunk-' in url:
                    url = url.split('#chunk-')[0]
                
                # Format the document with similarity scores
                doc_text = f"Document {i+1} (Similarity: {similarity:.4f}):\n"
                doc_text += f"Title: {title}\nURL: {url}\n\nContent:\n{content}\n"
                context_parts.append(doc_text)
        
        return "\n---\n".join(context_parts)
    
    def get_response(self, query: str) -> str:
        """Get a response from the LLM based on the query and relevant context.
        
        Args:
            query: The user's query.
            
        Returns:
            The LLM's response.
        """
        # Add the user message to the conversation history
        self.add_user_message(query)
        
        # Search for relevant context
        results = self.search_for_context(query)
        
        # Format the context
        context = self.format_context(results)
        
        # Get the system prompt from the profile
        system_prompt = self.profile.get('system_prompt', DEFAULT_PROFILES['default']['system_prompt'])
        
        # Create a system message that guides the LLM's behavior
        system_message = f"""You are acting according to this profile: {self.profile_name}

{system_prompt}

When answering, use the provided context and conversation history. 
If the answer is in the context, respond based on that information.
If the answer is not in the context but you can infer it from the conversation history, use that information.
If the answer is not in either, acknowledge that you don't have specific information about that topic,
but you can provide general information if relevant.

When presenting URLs to users, make sure to remove any '#chunk-X' fragments from the URLs to make them cleaner.
For example, change 'https://example.com/page/#chunk-0' to 'https://example.com/page/'.
"""
        
        # Check if we have relevant results
        if not results or context == "No relevant information found.":
            # If no relevant context was found, update the system message
            system_message += """
No relevant information was found in the database for this query.
You should check if you can answer based on the conversation history.
If not, politely inform the user that you don't have specific information about their query in your database,
but you can try to provide general information if appropriate."""
        
        # Create a new list of messages for this specific query
        messages = [
            {"role": "system", "content": system_message},
        ]
        
        # Add the conversation history (excluding the system message)
        for message in self.conversation_history:
            if message["role"] != "system":
                messages.append(message)
        
        # Add the context as a system message
        messages.append({"role": "system", "content": f"Context for the current query:\n{context}"})
        
        # Get a response from the LLM
        response = self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            temperature=0.7,
            max_tokens=1000
        )
        
        # Extract the response text
        response_text = response.choices[0].message.content
        
        # Add the assistant's response to the conversation history
        self.add_assistant_message(response_text)
        
        return response_text
    
    def show_conversation_history(self):
        """Display the conversation history in a table."""
        table = Table(title="Conversation History")
        
        table.add_column("Role", style="cyan")
        table.add_column("Content", style="green")
        
        for message in self.conversation_history:
            if message["role"] != "system":  # Skip system messages
                table.add_row(
                    message["role"].capitalize(),
                    message["content"][:100] + "..." if len(message["content"]) > 100 else message["content"]
                )
        
        console.print(table)
    
    def show_profiles(self):
        """Display available chat profiles."""
        table = Table(title="Available Chat Profiles")
        
        table.add_column("Name", style="cyan")
        table.add_column("Description", style="green")
        table.add_column("Search Sites", style="yellow")
        
        for name, profile in CHAT_PROFILES.items():
            # Get the description
            description = profile.get('description', 'No description')
            
            # Format the search sites
            search_settings = profile.get('search_settings', {})
            search_sites = search_settings.get('sites', [])
            sites_str = ", ".join(search_sites) if search_sites else "All sites"
            
            table.add_row(
                name,
                description,
                sites_str
            )
        
        console.print(table)
    
    def chat_loop(self):
        """Run an interactive chat loop."""
        console.print(Panel.fit(
            "[bold cyan]Welcome to the Crawl4AI Chat Interface![/bold cyan]\n"
            "Ask questions about the crawled data or use these commands:\n"
            "[bold red]'exit'[/bold red] to quit\n"
            "[bold red]'clear'[/bold red] to clear the conversation history\n"
            "[bold red]'history'[/bold red] to view the conversation history\n"
            "[bold red]'profile <name>'[/bold red] to change the chat profile\n"
            "[bold red]'profiles'[/bold red] to list available profiles",
            border_style="blue"
        ))
        
        while True:
            # Get user input
            query = Prompt.ask("\n[bold green]You[/bold green]")
            
            # Check if the user wants to exit
            if query.lower() in ['exit', 'quit', 'bye']:
                console.print(Panel("[bold cyan]Goodbye![/bold cyan]", border_style="blue"))
                break
            
            # Check if the user wants to clear the conversation history
            if query.lower() == 'clear':
                self.clear_conversation_history()
                continue
            
            # Check if the user wants to view the conversation history
            if query.lower() == 'history':
                self.show_conversation_history()
                continue
            
            # Check if the user wants to list available profiles
            if query.lower() == 'profiles':
                self.show_profiles()
                continue
            
            # Check if the user wants to change the profile
            if query.lower().startswith('profile '):
                profile_name = query.lower().split('profile ')[1].strip()
                self.change_profile(profile_name)
                continue
            
            # Show thinking indicator
            with console.status("[bold blue]Thinking...[/bold blue]", spinner="dots"):
                # Get a response
                response = self.get_response(query)
            
            # Print the response
            console.print("\n[bold purple]Assistant[/bold purple]")
            console.print(Panel(Markdown(response), border_style="purple"))

def main():
    """Main entry point for the script."""
    parser = argparse.ArgumentParser(description="Chat with crawled data using an LLM")
    parser.add_argument("--model", help="OpenAI model to use (default: from CHAT_MODEL env var or gpt-4o)")
    parser.add_argument("--limit", type=int, help="Maximum number of results to return (default: from CHAT_RESULT_LIMIT env var or 5)")
    parser.add_argument("--threshold", type=float, help="Similarity threshold for vector search (default: from CHAT_SIMILARITY_THRESHOLD env var or 0.5)")
    parser.add_argument("--session", help="Session ID for the conversation (default: generate a new one)")
    parser.add_argument("--user", help="User ID for the conversation (default: none)")
    parser.add_argument("--profile", help="Chat profile to use (default: default)")
    parser.add_argument("--profiles-dir", help="Directory containing profile YAML files (default: profiles)")
    
    args = parser.parse_args()
    
    # Load profiles from the specified directory
    if args.profiles_dir:
        global CHAT_PROFILES
        CHAT_PROFILES = load_profiles_from_directory(args.profiles_dir)
    
    # Create a chat interface
    chat_bot = ChatBot(
        model=args.model,
        result_limit=args.limit,
        similarity_threshold=args.threshold,
        session_id=args.session,
        user_id=args.user,
        profile=args.profile
    )
    
    # Start the chat loop
    chat_bot.chat_loop()

if __name__ == "__main__":
    main() 