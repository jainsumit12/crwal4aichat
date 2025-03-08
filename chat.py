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
import datetime

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
        if self.user_id:
            console.print(f"[bold blue]User ID:[/bold blue] [green]{self.user_id}[/green]")
        
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
            # Add user information to the system prompt if available
            system_prompt = self.profile.get('system_prompt', DEFAULT_PROFILES['default']['system_prompt'])
            if self.user_id:
                system_prompt += f"\n\nThe user's name is {self.user_id}."
            
            self.add_system_message(system_prompt)
    
    def load_conversation_history(self):
        """Load conversation history from the database."""
        try:
            # Get conversation history from the database
            db_messages = self.crawler.db_client.get_conversation_history(self.session_id)
            
            # Convert to the format expected by the OpenAI API
            self.conversation_history = []
            
            # Track user preferences
            user_preferences = []
            
            for message in db_messages:
                # Add the message to the conversation history
                self.conversation_history.append({
                    "role": message["role"],
                    "content": message["content"],
                    "timestamp": message.get("timestamp", "")
                })
                
                # Extract preferences from metadata
                if message["role"] == "user" and message.get("metadata") and "preference" in message["metadata"]:
                    user_preferences.append(message["metadata"]["preference"])
            
            # Print the number of messages loaded
            if self.conversation_history:
                console.print(f"[bold green]Loaded {len(self.conversation_history)} messages from history[/bold green]")
                
                # Print a summary of the conversation
                user_messages = [msg for msg in self.conversation_history if msg["role"] == "user"]
                if user_messages:
                    console.print(f"[blue]Previous conversation includes {len(user_messages)} user messages[/blue]")
                    
                    # Show the first and last user message as a preview
                    if len(user_messages) > 1:
                        console.print(f"[blue]First message: '{user_messages[0]['content'][:50]}...'[/blue]")
                        console.print(f"[blue]Last message: '{user_messages[-1]['content'][:50]}...'[/blue]")
                
                # Print user preferences if any were found
                if user_preferences:
                    console.print(f"[green]Remembered user preferences:[/green]")
                    for pref in user_preferences:
                        console.print(f"[green]- {pref}[/green]")
            else:
                console.print("[yellow]No conversation history found for this session[/yellow]")
        except Exception as e:
            console.print(f"[red]Error loading conversation history: {e}[/red]")
            self.conversation_history = []
    
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
        # Add the message to the conversation history
        message = {
            "role": "user",
            "content": content,
            "timestamp": datetime.datetime.now().isoformat()
        }
        self.conversation_history.append(message)
        
        # Save the message to the database with user preferences as metadata
        metadata = {}
        
        # Extract potential preferences from the message
        preference_keywords = ["like", "love", "prefer", "favorite", "enjoy", "hate", "dislike"]
        for keyword in preference_keywords:
            if keyword in content.lower():
                # Simple extraction of preferences
                parts = content.lower().split(keyword)
                if len(parts) > 1 and parts[1].strip():
                    preference = parts[1].strip().split(".")[0].split("!")[0].split("?")[0].strip()
                    metadata["preference"] = f"{keyword} {preference}"
                    console.print(f"[dim blue]Saved preference: {keyword} {preference}[/dim blue]")
                    break
        
        # Save to database
        try:
            self.crawler.db_client.save_message(
                session_id=self.session_id,
                role="user",
                content=content,
                user_id=self.user_id,
                metadata=metadata
            )
        except Exception as e:
            console.print(f"[red]Error saving user message to database: {e}[/red]")
    
    def add_assistant_message(self, content: str):
        """Add an assistant message to the conversation history.
        
        Args:
            content: The message content.
        """
        # Add the message to the conversation history
        message = {
            "role": "assistant",
            "content": content,
            "timestamp": datetime.datetime.now().isoformat()
        }
        self.conversation_history.append(message)
        
        # Save the message to the database
        try:
            self.crawler.db_client.save_message(
                session_id=self.session_id,
                role="assistant",
                content=content,
                user_id=self.user_id
            )
        except Exception as e:
            console.print(f"[red]Error saving assistant message to database: {e}[/red]")
    
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
        # Check if the user is asking for URLs
        url_keywords = ["url", "urls", "link", "links", "website", "websites", "site", "sites", "page", "pages"]
        is_url_request = any(keyword in query.lower() for keyword in url_keywords)
        
        # If the profile specifies specific sites to search, filter by site name
        search_sites = self.search_sites
        
        # If the user is asking for URLs and we have specific sites to search
        if is_url_request and search_sites:
            all_urls = []
            for site_pattern in search_sites:
                urls = self.crawler.db_client.get_urls_by_site_name(site_pattern, limit=self.result_limit)
                all_urls.extend(urls)
            
            if all_urls:
                # Sort by ID (most recent first) and limit
                all_urls.sort(key=lambda x: x.get("id", 0), reverse=True)
                all_urls = all_urls[:self.result_limit]
                
                # Add a special flag to indicate these are URLs
                for url in all_urls:
                    url["is_url_result"] = True
                
                return all_urls
        
        # Regular search if not asking for URLs or no URLs found
        if search_sites:
            # Get all sites
            all_sites = self.crawler.db_client.get_all_sites()
            
            # Filter sites by name
            filtered_site_ids = []
            filtered_site_names = []
            for site in all_sites:
                for search_term in search_sites:
                    if search_term.lower() in site["name"].lower():
                        filtered_site_ids.append(site["id"])
                        filtered_site_names.append(site["name"])
                        break
            
            if filtered_site_ids:
                console.print(f"Searching in {len(filtered_site_ids)} sites matching profile criteria")
                
                # Search in each site and combine results
                all_results = []
                for site_id in filtered_site_ids:
                    try:
                        site_results = self.crawler.search(
                            query, 
                            limit=self.result_limit,
                            threshold=self.similarity_threshold,
                            site_id=site_id
                        )
                        all_results.extend(site_results)
                    except Exception as e:
                        console.print(f"[red]Error searching site ID {site_id}: {e}[/red]")
                
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
        
        # Check if these are URL results
        if results[0].get("is_url_result", False):
            context_parts = ["Here are some URLs from the database:"]
            
            for i, result in enumerate(results):
                title = result.get('title', 'No title')
                url = result.get('url', 'No URL')
                summary = result.get('summary', '')
                site_name = result.get('site_name', 'Unknown Site')
                
                # Format the URL result
                url_text = f"{i+1}. {title}\n   URL: {url}\n   Site: {site_name}"
                if summary:
                    url_text += f"\n   Summary: {summary}"
                
                context_parts.append(url_text)
            
            return "\n\n".join(context_parts)
        
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
        # Check for user-specific queries
        user_queries = ["my name", "who am i", "what's my name", "what is my name"]
        is_user_query = any(user_query in query.lower() for user_query in user_queries)
        
        # Check for time-related queries
        time_queries = ["time", "date", "day", "month", "year", "today", "current time", "current date", "what time", "what day"]
        is_time_query = any(time_query in query.lower() for time_query in time_queries)
        
        # Check for memory-related queries
        memory_queries = ["remember", "said", "told", "mentioned", "earlier", "before", "previous", "last time"]
        preference_queries = ["like", "love", "prefer", "favorite", "enjoy", "hate", "dislike", "my favorite"]
        
        is_memory_query = any(memory_query in query.lower() for memory_query in memory_queries)
        is_preference_query = any(pref_query in query.lower() for pref_query in preference_queries)
        
        # Add the user message to the conversation history
        self.add_user_message(query)
        
        # If it's a user-specific query and we have user information
        if is_user_query and self.user_id:
            response_text = f"Your name is {self.user_id}."
            self.add_assistant_message(response_text)
            return response_text
        
        # If it's a time-related query, provide the current date and time
        if is_time_query:
            now = datetime.datetime.now()
            date_str = now.strftime("%A, %B %d, %Y")
            time_str = now.strftime("%I:%M %p")
            response_text = f"The current date is {date_str} and the time is {time_str}."
            self.add_assistant_message(response_text)
            return response_text
        
        # Search for relevant context from the database
        results = self.search_for_context(query)
        
        # Format the context
        context = self.format_context(results)
        
        # Analyze conversation history for relevant information
        conversation_analysis = ""
        if is_memory_query or is_preference_query or "what" in query.lower() or "do i" in query.lower():
            conversation_analysis = self.analyze_conversation_history(query)
        
        # Get the system prompt from the profile
        system_prompt = self.profile.get('system_prompt', DEFAULT_PROFILES['default']['system_prompt'])
        
        # Add user information to the system prompt if available
        if self.user_id:
            system_prompt += f"\n\nThe user's name is {self.user_id}."
        
        # Add current date and time to the system prompt
        now = datetime.datetime.now()
        date_str = now.strftime("%A, %B %d, %Y")
        time_str = now.strftime("%I:%M %p")
        system_prompt += f"\n\nThe current date is {date_str} and the time is {time_str}."
        
        # Create a system message that guides the LLM's behavior
        system_message = f"""You are acting according to this profile: {self.profile_name}

{system_prompt}

When answering, use the provided context and conversation history. 
If the answer is in the context, respond based on that information.
If the answer is not in the context but you can infer it from the conversation history, use that information.
If the answer is not in either, acknowledge that you don't have specific information about that topic,
but you can provide general information if relevant.

IMPORTANT: Pay close attention to the conversation history. If the user refers to something they mentioned earlier,
make sure to reference that information in your response. Remember user preferences, likes, dislikes, and any
personal information they've shared during the conversation.

When presenting URLs to users, make sure to remove any '#chunk-X' fragments from the URLs to make them cleaner.
For example, change 'https://example.com/page/#chunk-0' to 'https://example.com/page/'.
"""
        
        # Create a new list of messages for this specific query
        messages = [
            {"role": "system", "content": system_message},
        ]
        
        # Add the conversation history (excluding the system message)
        # Make sure to include ALL previous messages to maintain context
        for message in self.conversation_history:
            if message["role"] != "system" and message["content"] != query:  # Skip the current query which was just added
                messages.append({
                    "role": message["role"],
                    "content": message["content"]
                })
        
        # Add the current query
        messages.append({"role": "user", "content": query})
        
        # Add the conversation analysis if available
        if conversation_analysis and conversation_analysis != "No relevant information found.":
            messages.append({
                "role": "system", 
                "content": f"Relevant information from conversation history:\n{conversation_analysis}"
            })
        
        # Add the context from the database search
        messages.append({"role": "system", "content": f"Context from database search:\n{context}"})
        
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
        """Display the conversation history."""
        if not self.conversation_history:
            console.print("[yellow]No conversation history[/yellow]")
            return
        
        # Create a table for the conversation history
        table = Table(title=f"Conversation History (Session: {self.session_id})")
        
        table.add_column("Role", style="cyan")
        table.add_column("Content", style="green")
        table.add_column("Timestamp", style="yellow")
        
        # Add rows for each message
        for message in self.conversation_history:
            role = message.get("role", "unknown")
            content = message.get("content", "")
            timestamp = message.get("timestamp", "")
            
            # Truncate long messages for display
            if len(content) > 100:
                content = content[:97] + "..."
            
            table.add_row(
                role,
                content,
                str(timestamp)
            )
        
        console.print(table)
        
        # Print information about persistence
        console.print(f"[blue]Conversation is stored with session ID: {self.session_id}[/blue]")
        if self.user_id:
            console.print(f"[blue]User ID: {self.user_id}[/blue]")
        console.print("[blue]To continue this conversation later, use:[/blue]")
        console.print(f"[green]python chat.py --session {self.session_id}{' --user ' + self.user_id if self.user_id else ''}[/green]")
    
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
        
        # Show session information
        if self.user_id:
            console.print(f"[bold green]Session ID:[/bold green] [blue]{self.session_id}[/blue] - [bold green]User:[/bold green] [blue]{self.user_id}[/blue]")
            console.print("[green]Your conversation history will be saved and can be continued later.[/green]")
        else:
            console.print(f"[bold green]Session ID:[/bold green] [blue]{self.session_id}[/blue]")
            console.print("[yellow]To save your name for future sessions, use --user parameter (e.g., python chat.py --user YourName)[/yellow]")
        
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

    def analyze_conversation_history(self, query: str) -> str:
        """Analyze the conversation history using an LLM to extract relevant information.
        
        Args:
            query: The user's current query.
            
        Returns:
            A summary of relevant information from the conversation history.
        """
        # If there's no conversation history, return an empty string
        if not self.conversation_history or len(self.conversation_history) < 3:
            return ""
        
        console.print("[blue]Analyzing conversation history with LLM...[/blue]")
        
        # Format the conversation history for the LLM
        history_text = ""
        for message in self.conversation_history:
            if message["role"] != "system":  # Skip system messages
                role = "User" if message["role"] == "user" else "Assistant"
                history_text += f"{role}: {message['content']}\n\n"
        
        # Create a prompt for the LLM
        prompt = f"""Analyze the following conversation history and extract relevant information that would help answer the user's current query: "{query}"

Focus on:
1. User preferences (likes, dislikes, favorites)
2. Personal information the user has shared
3. Previous topics discussed that relate to the current query
4. Any commitments or promises made by the assistant

Conversation History:
{history_text}

Provide a concise summary of ONLY the information that is directly relevant to the current query. 
If there is no relevant information, respond with "No relevant information found."
"""
        
        # Use a smaller, faster model for this analysis
        analysis_model = os.getenv("OPENAI_CONTENT_MODEL", "gpt-4o-mini")
        
        try:
            # Get a response from the LLM
            response = self.client.chat.completions.create(
                model=analysis_model,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.3,
                max_tokens=500
            )
            
            # Extract the response text
            analysis = response.choices[0].message.content
            
            if analysis and analysis != "No relevant information found.":
                console.print(f"[blue]Found relevant information in conversation history[/blue]")
            
            return analysis
        except Exception as e:
            console.print(f"[red]Error analyzing conversation history: {e}[/red]")
            return ""

def main():
    """Run the chat interface."""
    # Parse command line arguments
    parser = argparse.ArgumentParser(description='Chat with the Crawl4AI database.')
    parser.add_argument('--model', type=str, help='OpenAI model to use')
    parser.add_argument('--limit', type=int, help='Maximum number of results to return')
    parser.add_argument('--threshold', type=float, help='Similarity threshold for vector search')
    parser.add_argument('--session', type=str, help='Session ID for the conversation (to continue a previous session)')
    parser.add_argument('--user', type=str, help='User ID for the conversation (e.g., your name)')
    parser.add_argument('--profile', type=str, help='Chat profile to use')
    parser.add_argument('--profiles-dir', type=str, help='Directory containing profile YAML files')
    args = parser.parse_args()
    
    # Load profiles from the specified directory or the default directory
    profiles_dir = args.profiles_dir or os.getenv("CHAT_PROFILES_DIR", "profiles")
    global CHAT_PROFILES
    CHAT_PROFILES = load_profiles_from_directory(profiles_dir)
    
    # Print the number of profiles loaded
    console.print(f"Loaded {len(CHAT_PROFILES)} profiles from {profiles_dir}")
    
    # Create a chat interface
    chat = ChatBot(
        model=args.model,
        result_limit=args.limit,
        similarity_threshold=args.threshold,
        session_id=args.session,
        user_id=args.user,
        profile=args.profile
    )
    
    # Print session continuation information if a session ID was provided
    if args.session:
        console.print(f"[bold green]Continuing session:[/bold green] [blue]{args.session}[/blue]")
        if args.user:
            console.print(f"[bold green]User:[/bold green] [blue]{args.user}[/blue]")
        console.print("[green]Your conversation history has been loaded.[/green]")
    
    # Run the chat loop
    chat.chat_loop()

if __name__ == "__main__":
    main() 