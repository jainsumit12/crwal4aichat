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
from rich.prompt import Prompt, Confirm
from rich.table import Table
import datetime
import sys
from rich.progress import Progress, SpinnerColumn, TextColumn
import time
import re

from utils import print_success, print_error, print_warning, print_info

# Create a rich console
console = Console()

# Load environment variables
load_dotenv()

# Create a flag to control verbose output
VERBOSE_OUTPUT = False

# Override print functions to respect verbose mode
def chat_print_info(text: str):
    """Print info message only if verbose mode is enabled."""
    if VERBOSE_OUTPUT:
        print_info(text)

def chat_print_warning(text: str):
    """Print warning message only if verbose mode is enabled."""
    if VERBOSE_OUTPUT:
        print_warning(text)

def chat_print_error(text: str):
    """Print error message only if verbose mode is enabled."""
    print_error(text)  # Always show errors

def chat_print_success(text: str):
    """Print success message only if verbose mode is enabled."""
    if VERBOSE_OUTPUT:
        print_success(text)


# Replace the original print functions in the modules that need quieter output
import crawler
import db_client
import embeddings

# Store original functions
original_print_info = crawler.print_info
original_print_warning = crawler.print_warning
original_print_error = crawler.print_error
original_print_success = crawler.print_success

def set_quiet_mode():
    """Set quiet mode for the crawler."""
    crawler.print_info = chat_print_info
    crawler.print_warning = chat_print_warning
    crawler.print_error = chat_print_error
    crawler.print_success = chat_print_success
    
    db_client.print_info = chat_print_info
    db_client.print_warning = chat_print_warning
    db_client.print_error = chat_print_error
    db_client.print_success = chat_print_success
    
    embeddings.print_info = chat_print_info
    embeddings.print_warning = chat_print_warning
    embeddings.print_error = chat_print_error
    embeddings.print_success = chat_print_success

def restore_verbose_mode():
    """Restore original print functions."""
    crawler.print_info = original_print_info
    crawler.print_warning = original_print_warning
    crawler.print_error = original_print_error
    crawler.print_success = original_print_success
    
    db_client.print_info = original_print_info
    db_client.print_warning = original_print_warning
    db_client.print_error = original_print_error
    db_client.print_success = original_print_success
    
    embeddings.print_info = original_print_info
    embeddings.print_warning = original_print_warning
    embeddings.print_error = original_print_error
    embeddings.print_success = original_print_success

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
# CHAT_PROFILES = load_profiles_from_directory()

class ChatBot:
    """Chat interface for interacting with crawled data using an LLM."""
    
    def __init__(self, model: Optional[str] = None, 
                result_limit: Optional[int] = None,
                similarity_threshold: Optional[float] = None,
                session_id: Optional[str] = None,
                user_id: Optional[str] = None,
                profile: str = "default",
                profiles_dir: str = "profiles",
                verbose: bool = False):
        """Initialize the chat interface.
        
        Args:
            model: The OpenAI model to use.
            result_limit: Maximum number of search results to return.
            similarity_threshold: Similarity threshold for vector search.
            session_id: Session ID for the conversation.
            user_id: User ID for the conversation.
            profile: Profile to use for the conversation.
            profiles_dir: Directory containing profile YAML files.
            verbose: Whether to show verbose output.
        """
        # Set verbose output flag
        global VERBOSE_OUTPUT
        VERBOSE_OUTPUT = verbose
        
        # Set quiet mode by default for chat
        set_quiet_mode()
        
        # Initialize the crawler
        self.crawler = WebCrawler()
        
        # Set up the OpenAI API key
        self.api_key = os.getenv("OPENAI_API_KEY")
        if not self.api_key:
            console.print("[red]Error: OpenAI API key not found. Please set the OPENAI_API_KEY environment variable.[/red]")
            sys.exit(1)
        
        # Set up the OpenAI client
        try:
            # Try to initialize the client with the standard parameters
            self.client = OpenAI(api_key=self.api_key)
        except TypeError as e:
            # If there's an error about unexpected keyword arguments, try a different approach
            if "unexpected keyword argument" in str(e):
                print(f"Warning: {e}. Trying alternative initialization.")
                # Initialize without the problematic parameter
                import httpx
                http_client = httpx.Client()
                self.client = OpenAI(api_key=self.api_key, http_client=http_client)
            else:
                raise
        
        # Set up the model
        self.model = model or os.getenv("CHAT_MODEL", "gpt-4o")
        
        # Set up the result limit
        self.result_limit = result_limit or int(os.getenv("CHAT_RESULT_LIMIT", "5"))
        
        # Set up the similarity threshold
        self.similarity_threshold = similarity_threshold or float(os.getenv("CHAT_SIMILARITY_THRESHOLD", "0.5"))
        
        # Set up the session ID
        if session_id:
            self.session_id = session_id
        else:
            env_session_id = os.getenv("CHAT_SESSION_ID")
            if env_session_id and env_session_id.strip():
                self.session_id = env_session_id
            else:
                self.session_id = str(uuid.uuid4())
                console.print(f"Generated new session ID: {self.session_id}")
        
        # Set up the user ID
        self.user_id = user_id or os.getenv("CHAT_USER_ID")
        
        # Load profiles
        self.profiles_dir = profiles_dir or os.getenv("CHAT_PROFILES_DIR", "profiles")
        self.profiles = load_profiles_from_directory(self.profiles_dir)
        
        # Initialize the database client
        self.db_client = self.crawler.db_client
        
        # Set up the conversation history table
        self.db_client.setup_conversation_history_table()
        
        # Set up the conversation history
        self.conversation_history = []
        self.load_conversation_history()
        
        # Set up the profile (must be done after conversation_history is initialized)
        profile_name = profile or os.getenv("CHAT_PROFILE", "default")
        self.set_profile(profile_name)
        
        # Print configuration
        console.print(f"Using chat model: {self.model}")
        console.print(f"Result limit: {self.result_limit}")
        console.print(f"Similarity threshold: {self.similarity_threshold}")
        
        # Get search settings from the profile
        self.search_sites = self.profile.get('search_settings', {}).get('sites', [])
        self.search_threshold = self.profile.get('search_settings', {}).get('threshold', self.similarity_threshold)
        self.search_limit = self.profile.get('search_settings', {}).get('limit', self.result_limit)
        
        # Print search settings if they differ from the defaults
        if self.search_threshold != self.similarity_threshold:
            console.print(f"[bold blue]Profile search threshold:[/bold blue] [green]{self.search_threshold}[/green]")
        if self.search_limit != self.result_limit:
            console.print(f"[bold blue]Profile search limit:[/bold blue] [green]{self.search_limit}[/green]")
        if self.search_sites:
            console.print(f"[bold blue]Filtering sites:[/bold blue] [green]{', '.join(self.search_sites)}[/green]")
    
    def load_conversation_history(self):
        """Load conversation history from the database."""
        try:
            # If the crawler is not available, return
            if not self.crawler:
                console.print("[yellow]No database connection, conversation history will not be loaded[/yellow]")
                return
                
            # Get conversation history from the database
            db_messages = self.crawler.db_client.get_conversation_history(self.session_id)
            
            # Convert to the format expected by the OpenAI API
            self.conversation_history = []
            
            # Track user preferences
            all_preferences = []
            
            for message in db_messages:
                # Add the message to the conversation history
                self.conversation_history.append({
                    "role": message["role"],
                    "content": message["content"],
                    "timestamp": message.get("timestamp", ""),
                    "metadata": message.get("metadata", {})
                })
                
                # Extract preferences from metadata
                if message["role"] == "user" and message.get("metadata") and "preference" in message["metadata"]:
                    preference = message["metadata"]["preference"]
                    all_preferences.append(preference)
            
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
                
                # Consolidate and display user preferences if any were found
                if all_preferences:
                    # Remove duplicates while preserving order
                    unique_preferences = []
                    for pref in all_preferences:
                        if pref not in unique_preferences:
                            unique_preferences.append(pref)
                    
                    # Limit to the most recent 5 preferences
                    if len(unique_preferences) > 5:
                        unique_preferences = unique_preferences[-5:]
                    
                    console.print(f"[green]Remembered user preferences:[/green]")
                    for pref in unique_preferences:
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
        # Add the message to the conversation history
        message = {
            "role": "system",
            "content": content,
            "timestamp": datetime.datetime.now().isoformat()
        }
        self.conversation_history.append(message)
        
        # If the crawler is not available, return
        if not self.crawler:
            return
        
        # Save the message to the database
        try:
            self.crawler.db_client.save_message(
                session_id=self.session_id,
                role="system",
                content=content,
                user_id=self.user_id,
                metadata={"profile": self.profile_name}
            )
        except Exception as e:
            console.print(f"[red]Error saving system message to database: {e}[/red]")
    
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
        
        # If the crawler is not available, return
        if not self.crawler:
            return
        
        # Base metadata with profile information
        metadata = {"profile": self.profile_name}
        
        # Extract preferences using LLM if we have a user_id
        if self.user_id and len(self.conversation_history) >= 2:
            try:
                # Get recent conversation context
                recent_messages = self.conversation_history[-5:] if len(self.conversation_history) > 5 else self.conversation_history
                context = []
                for msg in recent_messages:
                    if msg["role"] != "system":  # Skip system messages
                        context.append(f"{msg['role'].capitalize()}: {msg['content']}")
                
                # Extract preferences using LLM
                preferences = self.analyze_for_preferences(content, "\n".join(context))
                
                # If preferences were found, add them to metadata and save to database
                if preferences:
                    for pref in preferences:
                        # Add to metadata
                        metadata["preference"] = f"{pref['preference_type']} {pref['preference_value']}"
                        console.print(f"[dim blue]Extracted preference: {pref['preference_type']} {pref['preference_value']} (confidence: {pref['confidence']:.2f})[/dim blue]")
                        
                        # Save to user preferences database
                        self.crawler.db_client.save_user_preference(
                            user_id=self.user_id,
                            preference_type=pref["preference_type"],
                            preference_value=pref["preference_value"],
                            context=pref["context"],
                            confidence=pref["confidence"],
                            source_session=self.session_id,
                            metadata={"message_content": content}
                        )
            except Exception as e:
                console.print(f"[dim red]Error extracting preferences: {e}[/dim red]")
        
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
    
    def analyze_for_preferences(self, message_content: str, context: str) -> List[Dict[str, Any]]:
        """Analyze message for meaningful preferences using LLM.
        
        Args:
            message_content: The message content to analyze.
            context: Recent conversation context.
            
        Returns:
            List of extracted preferences with confidence scores.
        """
        # Create a prompt for the LLM to extract preferences
        prompt = f"""Analyze this message for meaningful user information, preferences, traits, or characteristics:

Message: "{message_content}"

Recent Context:
{context}

Extract meaningful information about the user that would be helpful to remember for future conversations.
Consider a wide range of information types:
- Preferences (likes, dislikes)
- Expertise areas or skills
- Experience levels
- Background information
- Goals or aspirations
- Challenges or pain points
- Work context or industry
- Tools or technologies used
- Learning interests
- Personal traits or characteristics

Format as a JSON object with a 'preferences' array containing objects with these fields:
- preference_type: (more specific than just like/dislike - use categories like expertise, experience, background, goal, challenge, tool, interest, trait, etc.)
- preference_value: (the specific information)
- confidence: (0.0-1.0)
- context: (brief explanation of why this was extracted)

Only extract information that would be genuinely useful to remember for future conversations.
Return empty preferences array if no meaningful information found.

Example valid response:
{{
  "preferences": [
    {{
      "preference_type": "expertise",
      "preference_value": "Python programming",
      "confidence": 0.95,
      "context": "User mentioned having 5 years of experience with Python"
    }},
    {{
      "preference_type": "challenge",
      "preference_value": "Learning Ruby syntax",
      "confidence": 0.85,
      "context": "User expressed finding Ruby syntax confusing and difficult to learn"
    }},
    {{
      "preference_type": "goal",
      "preference_value": "Building web applications",
      "confidence": 0.8,
      "context": "User mentioned wanting to build web applications as their primary goal"
    }}
  ]
}}
"""
        
        # Use a smaller model for this extraction
        extraction_model = os.getenv("CHAT_MODEL", "gpt-4o-mini")
        
        try:
            console.print(f"[blue]Analyzing message for preferences using {extraction_model}...[/blue]")
            console.print(f"[dim]Prompt: {prompt}[/dim]")
            
            # Create a wrapper for the prompt to ensure we get a JSON array
            response = self.client.chat.completions.create(
                model=extraction_model,
                messages=[
                    {"role": "system", "content": "You are a preference extraction assistant. Always return a JSON object with a 'preferences' array."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                max_tokens=500,
                response_format={"type": "json_object"}
            )
            
            # Extract the response
            response_text = response.choices[0].message.content.strip()
            console.print(f"[dim]Raw response: {response_text}[/dim]")
            
            # Parse the JSON response
            try:
                parsed_response = json.loads(response_text)
                console.print(f"[dim]Parsed response: {json.dumps(parsed_response, indent=2)}[/dim]")
                
                # Handle different response formats
                if isinstance(parsed_response, dict) and 'preferences' in parsed_response:
                    # Standard format with preferences key
                    preferences = parsed_response['preferences']
                    console.print(f"[dim]Response has 'preferences' key with {len(preferences)} items[/dim]")
                elif isinstance(parsed_response, list):
                    # Direct array format
                    preferences = parsed_response
                    console.print(f"[dim]Response is a list with {len(preferences)} items[/dim]")
                elif isinstance(parsed_response, dict) and 'preference_type' in parsed_response and 'preference_value' in parsed_response:
                    # Single preference object
                    preferences = [parsed_response]
                    console.print(f"[dim]Response is a single preference object[/dim]")
                else:
                    # No recognizable format
                    console.print(f"[dim]Response is not in a recognized format[/dim]")
                    preferences = []
                
                # Validate each preference
                valid_preferences = []
                for pref in preferences:
                    if (
                        isinstance(pref, dict) and
                        'preference_type' in pref and
                        'preference_value' in pref
                    ):
                        # Ensure confidence is a float between 0 and 1
                        if 'confidence' not in pref:
                            pref['confidence'] = 0.8  # Default confidence
                        else:
                            pref['confidence'] = float(pref['confidence'])
                            if pref['confidence'] < 0:
                                pref['confidence'] = 0.0
                            elif pref['confidence'] > 1:
                                pref['confidence'] = 1.0
                        
                        # Add context if missing
                        if 'context' not in pref:
                            pref['context'] = f"Extracted from: {message_content}"
                        
                        valid_preferences.append(pref)
                
                return valid_preferences
            except json.JSONDecodeError:
                console.print(f"[dim red]Error parsing preference JSON: {response_text}[/dim red]")
                return []
        except Exception as e:
            console.print(f"[dim red]Error in preference extraction: {e}[/dim red]")
            return []
    
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
        
        # If the crawler is not available, return
        if not self.crawler:
            return
        
        # Save the message to the database
        try:
            self.crawler.db_client.save_message(
                session_id=self.session_id,
                role="assistant",
                content=content,
                user_id=self.user_id,
                metadata={"profile": self.profile_name}
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
        # For backward compatibility, call the new set_profile method
        self.set_profile(profile_name)
    
    def search_for_context(self, query: str) -> List[Dict[str, Any]]:
        """Search for relevant context based on the query.
        
        Args:
            query: The user's query.
            
        Returns:
            A list of relevant documents.
        """
        # If the crawler is not available, return an empty list
        if not self.crawler:
            console.print("[yellow]No database connection, search functionality is disabled[/yellow]")
            return []
        
        # For website domain queries, use a more direct approach
        if ".com" in query or ".org" in query or ".net" in query or ".io" in query:
            console.print("[blue]Domain name detected in query, searching directly...[/blue]")
            # Extract the domain part
            domain_parts = re.findall(r'[\w\.-]+\.\w+', query)
            if domain_parts:
                domain = domain_parts[0]
                console.print(f"[blue]Searching for domain: {domain}[/blue]")
                
                # First try to find sites with this domain in the name or URL
                all_sites = self.crawler.db_client.get_all_sites()
                site_ids = []
                site_names = []
                
                for site in all_sites:
                    site_name = site.get("name", "").lower()
                    site_url = site.get("url", "").lower()
                    
                    if domain.lower() in site_name or domain.lower() in site_url:
                        site_ids.append(site["id"])
                        site_names.append(site_name)
                
                if site_ids:
                    console.print(f"[blue]Found {len(site_ids)} sites matching domain: {', '.join(site_names)}[/blue]")
                    
                    all_results = []
                    for i, site_id in enumerate(site_ids):
                        try:
                            # Get pages for this site
                            pages = self.crawler.db_client.get_pages_by_site_id(
                                site_id=site_id,
                                limit=self.result_limit,
                                include_chunks=True
                            )
                            
                            # Add site information to each page
                            for page in pages:
                                page["site_name"] = site_names[i]
                                page["similarity"] = 0.9  # High similarity for direct matches
                                all_results.append(page)
                        except Exception as e:
                            console.print(f"[red]Error getting pages for site {site_names[i]}: {e}[/red]")
                    
                    if all_results:
                        console.print(f"[green]Found {len(all_results)} pages from sites matching domain[/green]")
                        return all_results[:self.result_limit]
        
        # For website name queries without domain extensions
        # Check if the query might be a website name
        if len(query.split()) <= 3 and not query.startswith("what") and not query.startswith("how") and not query.startswith("why"):
            console.print("[blue]Short query detected, checking for site name matches...[/blue]")
            
            # Get all sites
            all_sites = self.crawler.db_client.get_all_sites()
            site_ids = []
            site_names = []
            
            # Clean the query for matching
            clean_query = query.lower().replace("about ", "").replace("tell me about ", "").strip()
            
            for site in all_sites:
                site_name = site.get("name", "").lower()
                
                # Check if the site name contains the query or vice versa
                if clean_query in site_name or any(word in site_name for word in clean_query.split()):
                    site_ids.append(site["id"])
                    site_names.append(site.get("name", ""))
            
            if site_ids:
                console.print(f"[blue]Found {len(site_ids)} sites matching name: {', '.join(site_names)}[/blue]")
                
                all_results = []
                for i, site_id in enumerate(site_ids):
                    try:
                        # Get pages for this site
                        pages = self.crawler.db_client.get_pages_by_site_id(
                            site_id=site_id,
                            limit=self.result_limit,
                            include_chunks=True
                        )
                        
                        # Add site information to each page
                        for page in pages:
                            page["site_name"] = site_names[i]
                            page["similarity"] = 0.85  # High similarity for name matches
                            all_results.append(page)
                    except Exception as e:
                        console.print(f"[red]Error getting pages for site {site_names[i]}: {e}[/red]")
                
                if all_results:
                    console.print(f"[green]Found {len(all_results)} pages from sites matching name[/green]")
                    return all_results[:self.result_limit]
        
        # Use the LLM to understand the query intent for more complex queries
        try:
            # Only use this for more complex queries
            if len(query.split()) > 3 and any(word in query.lower() for word in ["best", "top", "recommend", "favorite", "good", "great", "url", "link", "site"]):
                console.print("[blue]Analyzing query intent with LLM...[/blue]")
                
                # Create a prompt for the LLM
                prompt = f"""Analyze this search query and determine the best search strategy:

Query: "{query}"

Choose ONE of these search strategies:
1. REGULAR_SEARCH - Standard semantic search for information
2. URL_SEARCH - The user is specifically asking for URLs or links
3. BEST_CONTENT - The user is asking for the best/top/recommended content

Respond with ONLY the strategy name (e.g., "REGULAR_SEARCH").
"""
                
                # Use a smaller model for this analysis
                analysis_model = os.getenv("CHAT_MODEL", "gpt-4o-mini")
                
                response = self.client.chat.completions.create(
                    model=analysis_model,
                    messages=[{"role": "user", "content": prompt}],
                    temperature=0.1,
                    max_tokens=20
                )
                
                # Extract the strategy
                strategy = response.choices[0].message.content.strip()
                console.print(f"[blue]Query intent: {strategy}[/blue]")
            else:
                # For simple queries, use regular search
                strategy = "REGULAR_SEARCH"
        except Exception as e:
            console.print(f"[red]Error analyzing query intent: {e}[/red]")
            strategy = "REGULAR_SEARCH"
        
        # Execute the appropriate search strategy
        if strategy == "URL_SEARCH":
            return self._search_for_urls(query)
        elif strategy == "BEST_CONTENT":
            return self._search_for_best_content(query)
        else:  # REGULAR_SEARCH
            return self._regular_search(query)
    
    def _search_for_urls(self, query: str) -> List[Dict[str, Any]]:
        """Search for URLs based on the query.
        
        Args:
            query: The user's query.
            
        Returns:
            A list of URL results.
        """
        console.print(f"[blue]URL query detected, searching for URLs...[/blue]")
        
        all_urls = []
        
        # If we have specific sites in the profile, search those
        if self.search_sites:
            for site_pattern in self.search_sites:
                try:
                    urls = self.crawler.db_client.get_urls_by_site_name(site_pattern, limit=self.result_limit)
                    all_urls.extend(urls)
                except Exception as e:
                    console.print(f"[red]Error getting URLs for site pattern '{site_pattern}': {e}[/red]")
        else:
            # Get URLs from all sites
            try:
                all_sites = self.crawler.db_client.get_all_sites()
                for site in all_sites:
                    urls = self.crawler.db_client.get_urls_by_site_name(site["name"], limit=5)
                    all_urls.extend(urls)
            except Exception as e:
                console.print(f"[red]Error getting URLs from all sites: {e}[/red]")
        
        # Sort by ID (most recent first) and limit to result_limit
        all_urls.sort(key=lambda x: x.get("id", 0), reverse=True)
        all_urls = all_urls[:self.result_limit]
        
        # Add a flag to indicate these are URL results
        for url in all_urls:
            url["is_url_result"] = True
        
        if all_urls:
            console.print(f"[green]Found {len(all_urls)} URLs[/green]")
        else:
            console.print("[yellow]No URLs found, falling back to regular search[/yellow]")
            return self._regular_search(query)
            
        return all_urls
    
    def _search_for_best_content(self, query: str) -> List[Dict[str, Any]]:
        """Search for the best content based on the query.
        
        Args:
            query: The user's query.
            
        Returns:
            A list of the best content results.
        """
        console.print(f"[blue]Best content query detected, retrieving quality content...[/blue]")
        
        # Get all sites or filter by profile
        site_ids = []
        if self.search_sites:
            # Get all sites
            all_sites = self.crawler.db_client.get_all_sites()
            
            # Filter sites based on the patterns in the profile
            for site in all_sites:
                site_name = site.get("name", "").lower()
                for pattern in self.search_sites:
                    pattern = pattern.lower()
                    if pattern in site_name or site_name in pattern:
                        site_ids.append(site["id"])
                        break
        
        try:
            # Get pages with titles and summaries, sorted by quality indicators
            quality_pages = []
            
            # For each site (or all sites if no filter)
            if site_ids:
                for site_id in site_ids:
                    # Get pages for this site
                    pages = self.crawler.db_client.get_pages_by_site_id(
                        site_id=site_id, 
                        limit=20,  # Get more pages to select from
                        include_chunks=False  # Only get parent pages
                    )
                    quality_pages.extend(pages)
            else:
                # Get pages from all sites
                all_sites = self.crawler.db_client.get_all_sites()
                for site in all_sites:
                    pages = self.crawler.db_client.get_pages_by_site_id(
                        site_id=site["id"], 
                        limit=10,  # Get more pages to select from
                        include_chunks=False  # Only get parent pages
                    )
                    quality_pages.extend(pages)
            
            # Filter pages that have titles and summaries
            quality_pages = [p for p in quality_pages if p.get("title") and p.get("summary")]
            
            # Sort by a quality heuristic (here we're using content length as a simple proxy)
            # In a real system, you might use more sophisticated metrics
            quality_pages.sort(key=lambda x: len(x.get("content", "")), reverse=True)
            
            # Take the top results
            top_results = quality_pages[:self.result_limit]
            
            if top_results:
                console.print(f"[green]Found {len(top_results)} quality pages[/green]")
                
                # Add a flag to indicate these are "best" results
                for result in top_results:
                    result["is_best_result"] = True
                
                return top_results
            else:
                console.print("[yellow]No quality pages found, falling back to regular search[/yellow]")
                return self._regular_search(query)
        except Exception as e:
            console.print(f"[red]Error retrieving quality pages: {e}[/red]")
            return self._regular_search(query)
    
    def _regular_search(self, query: str) -> List[Dict[str, Any]]:
        """Perform a regular search based on the query.
        
        Args:
            query: The user's query.
            
        Returns:
            A list of search results.
        """
        # If the profile specifies specific sites to search, filter by site name
        if self.search_sites:
            console.print(f"[blue]Filtering search to {len(self.search_sites)} sites...[/blue]")
            
            # Get all sites
            all_sites = self.crawler.db_client.get_all_sites()
            
            # Filter sites based on the patterns in the profile
            site_ids = []
            site_names = []
            for site in all_sites:
                site_name = site.get("name", "").lower()
                for pattern in self.search_sites:
                    pattern = pattern.lower()
                    if pattern in site_name or site_name in pattern:
                        site_ids.append(site["id"])
                        site_names.append(site_name)
                        break
            
            console.print(f"[blue]Found {len(site_ids)} matching sites: {', '.join(site_names)}[/blue]")
            
            # If we have site IDs, search each site separately
            if site_ids:
                console.print(f"[blue]Searching {len(site_ids)} sites...[/blue]")
                
                all_results = []
                for i, site_id in enumerate(site_ids):
                    try:
                        console.print(f"[blue]Searching site: {site_names[i]} (ID: {site_id})[/blue]")
                        
                        # Use the crawler's search method for each site
                        site_results = self.crawler.search(
                            query, 
                            limit=self.result_limit,
                            threshold=self.similarity_threshold,
                            site_id=site_id
                        )
                        
                        all_results.extend(site_results)
                    except Exception as e:
                        console.print(f"[red]Error searching site {site_names[i]} (ID: {site_id}): {e}[/red]")
                
                # Sort by similarity score and limit to result_limit
                all_results.sort(key=lambda x: x.get("similarity", 0), reverse=True)
                all_results = all_results[:self.result_limit]
                
                if all_results:
                    console.print(f"[green]Found {len(all_results)} results across {len(site_ids)} sites[/green]")
                    return all_results
                else:
                    console.print("[yellow]No results found across specified sites, searching all sites[/yellow]")
        
        # If no site IDs or no results from site-specific search, do a general search
        console.print("[blue]Searching all sites...[/blue]")
        
        # Use the crawler's search method for all sites
        results = self.crawler.search(
            query, 
            limit=self.result_limit,
            threshold=self.similarity_threshold
        )
        
        if results:
            console.print(f"[green]Found {len(results)} results[/green]")
        else:
            console.print("[red]No results found[/red]")
            
        return results
    
    def format_context(self, results: List[Dict[str, Any]]) -> str:
        """Format search results into a context string for the LLM.
        
        Args:
            results: The search results.
            
        Returns:
            A formatted context string.
        """
        if not results:
            return "No relevant information found."
            
        # Check if the first result is a URL result
        if results and results[0].get("is_url_result", False):
            # Format URL results
            context = "Here are some URLs that might be relevant to your query:\n\n"
            
            for i, result in enumerate(results, 1):
                title = result.get("title", "Untitled")
                url = result.get("url", "")
                site_name = result.get("site_name", "Unknown site")
                summary = result.get("summary", "")
                
                context += f"{i}. {title}\n"
                context += f"   URL: {url}\n"
                context += f"   Site: {site_name}\n"
                if summary:
                    context += f"   Summary: {summary}\n"
                context += "\n"
            
            return context
            
        # Check if these are "best" results
        if results and results[0].get("is_best_result", False):
            # Format best results
            context = "Here are some of the best articles from the database:\n\n"
            
            for i, result in enumerate(results, 1):
                title = result.get("title", "Untitled")
                url = result.get("url", "")
                site_name = result.get("site_name", "Unknown site")
                summary = result.get("summary", "")
                content = result.get("content", "")
                
                # Clean up the URL by removing chunk fragments
                if "#chunk-" in url:
                    url = url.split("#chunk-")[0]
                
                context += f"{i}. {title}\n"
                context += f"   URL: {url}\n"
                context += f"   Site: {site_name}\n"
                
                if summary:
                    context += f"   Summary: {summary}\n"
                elif content:
                    # Create a brief summary from the content if no summary exists
                    brief_content = content[:300] + "..." if len(content) > 300 else content
                    context += f"   Content preview: {brief_content}\n"
                
                context += "\n"
            
            return context
        
        # Check if we have site information in the results
        site_info = {}
        for result in results:
            site_id = result.get("site_id")
            site_name = result.get("site_name", "Unknown")
            
            if site_id and site_id not in site_info:
                site_info[site_id] = {
                    "name": site_name,
                    "url": result.get("url", "").split("/")[0] + "//" + result.get("url", "").split("/")[2] if "/" in result.get("url", "") else "",
                    "description": ""
                }
        
        # If we have site information, add it to the context
        if site_info:
            context = "Site Information:\n\n"
            for site_data in site_info.values():
                context += f"Site: {site_data['name']}\n"
                if site_data['url']:
                    context += f"URL: {site_data['url']}\n"
                if site_data['description']:
                    context += f"Description: {site_data['description']}\n"
                context += "\n"
            
            context += "Content from these sites:\n\n"
        else:
            context = ""
        
        # Group results by site
        results_by_site = {}
        for result in results:
            site_name = result.get("site_name", "Unknown")
            if site_name not in results_by_site:
                results_by_site[site_name] = []
            results_by_site[site_name].append(result)
        
        # Format the context
        for site_name, site_results in results_by_site.items():
            # Sort by similarity score
            site_results.sort(key=lambda x: x.get("similarity", 0), reverse=True)
            
            context += f"Information from {site_name}:\n\n"
            
            for result in site_results:
                title = result.get("title", "Untitled")
                url = result.get("url", "")
                content = result.get("content", "")
                summary = result.get("summary", "")
                
                # Clean up the URL by removing chunk fragments
                if "#chunk-" in url:
                    url = url.split("#chunk-")[0]
                
                context += f"Document: {title}\n"
                context += f"URL: {url}\n"
                
                # Use summary if available, otherwise use content
                if summary:
                    context += f"Summary: {summary}\n"
                    # If we have both summary and content, include the content too
                    if content:
                        context += f"Content: {content}\n"
                else:
                    context += f"Content: {content}\n"
                
                context += "\n"
        
        return context
    
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
        
        # Check if this is a follow-up question about something the assistant just mentioned
        is_followup = False
        last_assistant_message = None
        last_user_message = None
        
        # Get the last few messages to check for follow-up context
        recent_messages = self.conversation_history[-10:] if len(self.conversation_history) > 10 else self.conversation_history
        
        # Find the last assistant and user messages
        for msg in reversed(recent_messages):
            if msg["role"] == "assistant" and not last_assistant_message:
                last_assistant_message = msg["content"]
            elif msg["role"] == "user" and not last_user_message and msg["content"] != query:
                last_user_message = msg["content"]
            
            if last_assistant_message and last_user_message:
                break
        
        # If we have both messages, check if this is a follow-up
        if last_assistant_message and last_user_message:
            try:
                # Use the LLM to determine if this is a follow-up question about something mentioned in the assistant's previous response
                followup_prompt = f"""Determine if this user query is a follow-up question about something mentioned in the assistant's previous response.

Previous assistant response: 
{last_assistant_message}

User's current query: 
{query}

Respond with ONLY "YES" if it's a follow-up question about something the assistant just mentioned, or "NO" if it's a new topic.
"""
                
                # Use a smaller model for this analysis
                analysis_model = os.getenv("CHAT_MODEL", "gpt-4o-mini")
                
                response = self.client.chat.completions.create(
                    model=analysis_model,
                    messages=[{"role": "user", "content": followup_prompt}],
                    temperature=0.1,
                    max_tokens=10
                )
                
                # Extract the response
                is_followup = "YES" in response.choices[0].message.content.strip().upper()
                
                if is_followup:
                    console.print("[blue]Detected follow-up question about previous response[/blue]")
            except Exception as e:
                console.print(f"[red]Error analyzing follow-up question: {e}[/red]")
        
        # If it's a follow-up question, prioritize searching for content related to what was just discussed
        if is_followup and last_assistant_message:
            # Extract key entities from the last assistant message to use as search terms
            try:
                entity_prompt = f"""Extract the key entities (names, products, technologies, concepts) mentioned in this text:

{last_assistant_message}

List ONLY the 3-5 most important entities, separated by commas. No explanations.
"""
                
                entity_response = self.client.chat.completions.create(
                    model=analysis_model,
                    messages=[{"role": "user", "content": entity_prompt}],
                    temperature=0.1,
                    max_tokens=50
                )
                
                # Extract the entities
                entities = entity_response.choices[0].message.content.strip()
                console.print(f"[blue]Extracted entities from previous response: {entities}[/blue]")
                
                # Create an enhanced query combining the original query with the entities
                enhanced_query = f"{query} {entities}"
                console.print(f"[blue]Enhanced query: {enhanced_query}[/blue]")
                
                # Search with the enhanced query
                results = self.search_for_context(enhanced_query)
            except Exception as e:
                console.print(f"[red]Error enhancing query with entities: {e}[/red]")
                # Fall back to regular search
                results = self.search_for_context(query)
        else:
            # Regular search for non-follow-up questions
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
        
        # Get user preferences from the database
        user_preferences = []
        if self.user_id:
            try:
                # Get preferences from the database with a minimum confidence of 0.7
                db_preferences = self.crawler.db_client.get_user_preferences(
                    user_id=self.user_id,
                    min_confidence=0.7,
                    active_only=True
                )
                
                # Format preferences for the system prompt
                for pref in db_preferences:
                    pref_type = pref.get("preference_type", "")
                    pref_value = pref.get("preference_value", "")
                    confidence = pref.get("confidence", 0.0)
                    context = pref.get("context", "")
                    
                    # Update the last_used timestamp for this preference
                    self.crawler.db_client.update_preference_last_used(pref.get("id"))
                    
                    # Add to the list of preferences
                    user_preferences.append({
                        "type": pref_type,
                        "value": pref_value,
                        "confidence": confidence,
                        "context": context
                    })
            except Exception as e:
                console.print(f"[red]Error getting user preferences from database: {e}[/red]")
        
        # Add user preferences to the system prompt if available
        if user_preferences:
            system_prompt += "\n\nUser information from previous conversations:"
            
            # Group preferences by type for better organization
            preference_by_type = {}
            for pref in user_preferences:
                pref_type = pref['type']
                if pref_type not in preference_by_type:
                    preference_by_type[pref_type] = []
                preference_by_type[pref_type].append(pref)
            
            # Add preferences by type
            for pref_type, prefs in preference_by_type.items():
                system_prompt += f"\n\n{pref_type.capitalize()}:"
                for pref in prefs:
                    system_prompt += f"\n- {pref['value']} (confidence: {pref['confidence']:.2f})"
                    if pref.get('context'):
                        system_prompt += f" - {pref['context']}"
        
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

CRITICAL: If the user asks a follow-up question about something you just mentioned in your previous response,
make sure to provide detailed information about that topic. Never claim ignorance about something you just discussed.
Always maintain continuity in the conversation.

When presenting URLs to users, make sure to remove any '#chunk-X' fragments from the URLs to make them cleaner.
For example, change 'https://example.com/page/#chunk-0' to 'https://example.com/page/'.
"""
        
        # Create a new list of messages for this specific query
        messages = [
            {"role": "system", "content": system_message},
        ]
        
        # Add the conversation history (excluding the system message)
        # Use a sliding window approach to avoid token limit issues
        MAX_HISTORY_MESSAGES = 20  # Adjust this value based on your needs
        
        # Get user and assistant messages, excluding the current query
        history_messages = [
            msg for msg in self.conversation_history 
            if msg["role"] != "system" and msg["content"] != query
        ]
        
        # If we have more messages than the limit, keep only the most recent ones
        if len(history_messages) > MAX_HISTORY_MESSAGES:
            # Always include the first few messages for context
            first_messages = history_messages[:2]
            # And the most recent messages
            recent_messages = history_messages[-(MAX_HISTORY_MESSAGES-2):]
            history_messages = first_messages + recent_messages
            console.print(f"[dim blue]Using {len(history_messages)} messages from conversation history (truncated)[/dim blue]")
        else:
            console.print(f"[dim blue]Using {len(history_messages)} messages from conversation history[/dim blue]")
        
        # Add the selected history messages
        for message in history_messages:
            messages.append({
                "role": message["role"],
                "content": message["content"]
            })
        
        # Add the current query
        messages.append({"role": "user", "content": query})
        
        # If this is a follow-up question, add a special reminder about the previous response
        if is_followup and last_assistant_message:
            messages.append({
                "role": "system", 
                "content": f"IMPORTANT: This is a follow-up question about something you mentioned in your previous response. Your previous response was:\n\n{last_assistant_message}\n\nMake sure to provide detailed information about the topic the user is asking about."
            })
        
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
        """Show available profiles."""
        table = Table(title="Available Profiles")
        table.add_column("Name", style="cyan")
        table.add_column("Description", style="green")
        table.add_column("Search Sites", style="yellow")
        
        for name, profile in self.profiles.items():
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
    
    def clear_all_conversation_history(self):
        """Clear all conversation history from the database."""
        if not self.crawler:
            console.print("[yellow]No database connection, cannot clear conversation history[/yellow]")
            return
            
        try:
            if self.crawler.db_client.clear_all_conversation_history():
                console.print("[green]All conversation history has been cleared from the database[/green]")
                # Also clear the in-memory history for the current session
                self.conversation_history = []
                # Add a new system message
                system_prompt = self.profile.get('system_prompt', DEFAULT_PROFILES['default']['system_prompt'])
                if self.user_id:
                    system_prompt += f"\n\nThe user's name is {self.user_id}."
                self.add_system_message(system_prompt)
            else:
                console.print("[red]Failed to clear all conversation history[/red]")
        except Exception as e:
            console.print(f"[red]Error clearing all conversation history: {e}[/red]")

    def chat_loop(self):
        """Run an interactive chat loop."""
        console.print(Panel.fit(
            "[bold cyan]Welcome to the Supa Chat Interface![/bold cyan]\n"
            "Ask questions about the crawled data or use these commands:\n"
            "[bold red]'exit'[/bold red] to quit\n"
            "[bold red]'clear'[/bold red] to clear the current session's conversation history\n"
            "[bold red]'clear all'[/bold red] to clear ALL conversation history from the database\n"
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
        
        try:
            while True:
                try:
                    # Get user input with a timeout
                    query = Prompt.ask("\n[bold green]You[/bold green]")
                    
                    # Skip empty queries
                    if not query.strip():
                        console.print("[yellow]Please enter a question or command.[/yellow]")
                        continue
                    
                    # Check for exit commands
                    if query.lower() in ["exit", "quit", "bye", "goodbye", "q"]:
                        console.print("[green]Exiting chat. Goodbye![/green]")
                        break
                    
                    # Check for clear command
                    if query.lower() == "clear":
                        self.clear_conversation_history()
                        console.print("[green]Conversation history cleared for this session[/green]")
                        continue
                    
                    # Check for clear all command
                    if query.lower() == "clear all":
                        if Confirm.ask("[bold red]Are you sure you want to clear ALL conversation history?[/bold red]"):
                            self.clear_all_conversation_history()
                        console.print("[green]All conversation history cleared[/green]")
                        continue
                    
                    # Check for history command
                    if query.lower() == "history":
                        self.show_conversation_history()
                        continue
                    
                    # Check for profiles command
                    if query.lower() == "profiles":
                        self.show_profiles()
                        continue
                    
                    # Check for profile command
                    if query.lower().startswith("profile "):
                        profile_name = query.split(" ", 1)[1].strip()
                        self.change_profile(profile_name)
                        continue
                    
                    # Check for preferences command
                    if query.lower() == "preferences":
                        if not self.user_id:
                            console.print("[yellow]No user ID provided. Preferences are only stored for identified users.[/yellow]")
                            console.print("[yellow]Restart with --user <name> to use preferences.[/yellow]")
                        else:
                            # Get preferences from the database
                            try:
                                preferences = self.crawler.db_client.get_user_preferences(
                                    user_id=self.user_id,
                                    min_confidence=0.0,
                                    active_only=True
                                )
                                
                                if not preferences:
                                    console.print("[yellow]No preferences found for this user.[/yellow]")
                                else:
                                    # Create a table for the preferences
                                    table = Table(title=f"Preferences for {self.user_id}")
                                    table.add_column("ID", style="cyan")
                                    table.add_column("Type", style="green")
                                    table.add_column("Value", style="blue")
                                    table.add_column("Confidence", style="yellow")
                                    table.add_column("Context", style="magenta")
                                    table.add_column("Last Used", style="dim")
                                    
                                    for pref in preferences:
                                        table.add_row(
                                            str(pref.get("id", "")),
                                            pref.get("preference_type", ""),
                                            pref.get("preference_value", ""),
                                            f"{pref.get('confidence', 0.0):.2f}",
                                            pref.get("context", "")[:50] + ("..." if len(pref.get("context", "")) > 50 else ""),
                                            str(pref.get("last_used", ""))
                                        )
                                    
                                    console.print(table)
                            except Exception as e:
                                console.print(f"[red]Error getting preferences: {e}[/red]")
                        continue
                    
                    # Check for add preference command
                    if query.lower().startswith("add preference "):
                        if not self.user_id:
                            console.print("[yellow]No user ID provided. Preferences are only stored for identified users.[/yellow]")
                            console.print("[yellow]Restart with --user <name> to use preferences.[/yellow]")
                        else:
                            # Parse the preference
                            try:
                                # Format: add preference <type> <value> [confidence]
                                parts = query[14:].strip().split(" ", 2)
                                if len(parts) < 2:
                                    console.print("[yellow]Invalid format. Use: add preference <type> <value> [confidence][/yellow]")
                                    console.print("[yellow]Example: add preference like Python 0.9[/yellow]")
                                else:
                                    pref_type = parts[0]
                                    
                                    # Check if confidence is provided
                                    if len(parts) == 3 and parts[2].replace(".", "", 1).isdigit():
                                        pref_value = parts[1]
                                        confidence = float(parts[2])
                                    else:
                                        # If no confidence or not a valid number, combine the rest as the value
                                        pref_value = " ".join(parts[1:])
                                        confidence = 0.9  # Default confidence
                                    
                                    # Add the preference
                                    pref_id = self.crawler.db_client.save_user_preference(
                                        user_id=self.user_id,
                                        preference_type=pref_type,
                                        preference_value=pref_value,
                                        context="Manually added via CLI",
                                        confidence=confidence,
                                        source_session=self.session_id,
                                        metadata={"source": "cli_manual_entry"}
                                    )
                                    
                                    if pref_id > 0:
                                        console.print(f"[green]Preference added with ID: {pref_id}[/green]")
                                    else:
                                        console.print("[red]Failed to add preference[/red]")
                            except Exception as e:
                                console.print(f"[red]Error adding preference: {e}[/red]")
                        continue
                    
                    # Check for delete preference command
                    if query.lower().startswith("delete preference "):
                        if not self.user_id:
                            console.print("[yellow]No user ID provided. Preferences are only stored for identified users.[/yellow]")
                            console.print("[yellow]Restart with --user <name> to use preferences.[/yellow]")
                        else:
                            # Parse the preference ID
                            try:
                                pref_id = int(query[17:].strip())
                                
                                # Delete the preference
                                success = self.crawler.db_client.delete_user_preference(pref_id)
                                
                                if success:
                                    console.print(f"[green]Preference with ID {pref_id} deleted[/green]")
                                else:
                                    console.print(f"[red]Failed to delete preference with ID {pref_id}[/red]")
                            except ValueError:
                                console.print("[yellow]Invalid preference ID. Use: delete preference <id>[/yellow]")
                            except Exception as e:
                                console.print(f"[red]Error deleting preference: {e}[/red]")
                        continue
                    
                    # Check for clear preferences command
                    if query.lower() == "clear preferences":
                        if not self.user_id:
                            console.print("[yellow]No user ID provided. Preferences are only stored for identified users.[/yellow]")
                            console.print("[yellow]Restart with --user <name> to use preferences.[/yellow]")
                        else:
                            if Confirm.ask("[bold red]Are you sure you want to clear ALL preferences for this user?[/bold red]"):
                                try:
                                    success = self.crawler.db_client.clear_user_preferences(self.user_id)
                                    
                                    if success:
                                        console.print(f"[green]All preferences cleared for user {self.user_id}[/green]")
                                    else:
                                        console.print("[red]Failed to clear preferences[/red]")
                                except Exception as e:
                                    console.print(f"[red]Error clearing preferences: {e}[/red]")
                        continue
                    
                    # Check for help command
                    if query.lower() in ["help", "?"]:
                        console.print("\n[bold]Available Commands:[/bold]")
                        console.print("  [cyan]exit, quit, bye, goodbye, q[/cyan] - Exit the chat")
                        console.print("  [cyan]clear[/cyan] - Clear conversation history for this session")
                        console.print("  [cyan]clear all[/cyan] - Clear ALL conversation history")
                        console.print("  [cyan]history[/cyan] - View conversation history")
                        console.print("  [cyan]profiles[/cyan] - List available profiles")
                        console.print("  [cyan]profile <name>[/cyan] - Change to a different profile")
                        console.print("  [cyan]preferences[/cyan] - List your preferences")
                        console.print("  [cyan]add preference <type> <value> [confidence][/cyan] - Add a new preference")
                        console.print("  [cyan]delete preference <id>[/cyan] - Delete a preference")
                        console.print("  [cyan]clear preferences[/cyan] - Clear all your preferences")
                        console.print("  [cyan]help, ?[/cyan] - Show this help message")
                        continue
                    
                    # Show thinking indicator
                    with console.status("[bold blue]Thinking...[/bold blue]", spinner="dots"):
                        # Get a response with a timeout
                        try:
                            response = self.get_response(query)
                        except Exception as e:
                            console.print(f"[red]Error getting response: {e}[/red]")
                            response = "I'm sorry, I encountered an error while processing your request. Please try again."
                    
                    # Print the response
                    console.print("\n[bold purple]Assistant[/bold purple]")
                    console.print(Panel(Markdown(response), border_style="purple"))
                
                except KeyboardInterrupt:
                    # Handle Ctrl+C gracefully
                    console.print("\n[yellow]Interrupted by user. Type 'exit' to quit or continue with your next question.[/yellow]")
                    continue
                except Exception as e:
                    console.print(f"\n[red]An error occurred: {e}[/red]")
                    console.print("[yellow]Please try again or type 'exit' to quit.[/yellow]")
                    continue
        
        except KeyboardInterrupt:
            # Final exit on Ctrl+C
            console.print("\n[bold cyan]Goodbye![/bold cyan]")
        except Exception as e:
            console.print(f"\n[red]Fatal error: {e}[/red]")
        finally:
            # Make sure we always exit cleanly
            console.print("[dim]Chat session ended.[/dim]")

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
        
        try:
            # Extract preferences from metadata
            preferences = []
            for message in self.conversation_history:
                if message.get("metadata") and "preference" in message.get("metadata", {}):
                    preference = message["metadata"]["preference"]
                    if preference not in preferences:
                        preferences.append(preference)
            
            # Format the conversation history for the LLM
            history_text = ""
            
            # Limit the amount of history to analyze to avoid token limits
            max_history_messages = 10
            history_to_analyze = self.conversation_history[-max_history_messages:] if len(self.conversation_history) > max_history_messages else self.conversation_history
            
            for message in history_to_analyze:
                if message["role"] != "system":  # Skip system messages
                    role = "User" if message["role"] == "user" else "Assistant"
                    # Truncate very long messages
                    content = message["content"]
                    if len(content) > 500:
                        content = content[:500] + "..."
                    history_text += f"{role}: {content}\n\n"
            
            # Create a prompt for the LLM
            prompt = f"""Analyze the following conversation history and extract relevant information that would help answer the user's current query: "{query}"

Focus on:
1. User preferences (likes, dislikes, favorites)
2. Personal information the user has shared
3. Previous topics discussed that relate to the current query
4. Any commitments or promises made by the assistant

"""

            # Add extracted preferences if available
            if preferences:
                prompt += "Known user preferences from previous messages:\n"
                for pref in preferences:
                    prompt += f"- {pref}\n"
                prompt += "\n"

            prompt += f"""Conversation History:
{history_text}

Provide a concise summary of ONLY the information that is directly relevant to the current query.
Focus especially on preferences and personal information that would help answer the query.
If there is no relevant information, respond with "No relevant information found."
"""
            
            # Use a smaller, faster model for this analysis
            analysis_model = os.getenv("CHAT_MODEL", "gpt-4o-mini")
            
            # Get a response from the LLM with a timeout
            response = self.client.chat.completions.create(
                model=analysis_model,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.3,
                max_tokens=500,
                timeout=10  # 10 second timeout
            )
            
            # Extract the response text
            analysis = response.choices[0].message.content
            
            if analysis and analysis != "No relevant information found.":
                console.print(f"[blue]Found relevant information in conversation history[/blue]")
            
            return analysis
        except Exception as e:
            console.print(f"[red]Error analyzing conversation history: {e}[/red]")
            return "Error analyzing conversation history. Proceeding without historical context."

    def set_profile(self, profile_name: str):
        """Set the profile for the chat interface.
        
        Args:
            profile_name: The name of the profile to use.
        """
        if profile_name not in self.profiles:
            console.print(f"[yellow]Warning: Profile '{profile_name}' not found, using default profile[/yellow]")
            profile_name = "default"
        
        self.profile_name = profile_name
        self.profile = self.profiles[profile_name]
        
        # Update search settings from the profile
        self.search_sites = self.profile.get('search_settings', {}).get('sites', [])
        self.search_threshold = self.profile.get('search_settings', {}).get('threshold', self.similarity_threshold)
        self.search_limit = self.profile.get('search_settings', {}).get('limit', self.result_limit)
        
        console.print(f"[green]Using profile: {self.profile['name']} - {self.profile['description']}[/green]")
        
        # If we have a conversation history, add a new system message with the profile's system prompt
        if self.conversation_history:
            # Add user information to the system prompt if available
            system_prompt = self.profile.get('system_prompt', DEFAULT_PROFILES['default']['system_prompt'])
            if self.user_id:
                system_prompt += f"\n\nThe user's name is {self.user_id}."
            
            # Add a new system message
            self.add_system_message(system_prompt)
    
    @property
    def current_profile(self):
        """Get the current profile name.
        
        Returns:
            The name of the current profile.
        """
        return self.profile_name

def main():
    """Main function for the chat interface."""
    parser = argparse.ArgumentParser(description="Chat with crawled data using an LLM")
    parser.add_argument("--model", help="Model to use for chat")
    parser.add_argument("--limit", type=int, help="Maximum number of results")
    parser.add_argument("--threshold", type=float, help="Similarity threshold for vector search")
    parser.add_argument("--session", help="Session ID for the conversation")
    parser.add_argument("--user", help="User ID for the conversation")
    parser.add_argument("--profile", help="Chat profile to use")
    parser.add_argument("--profiles-dir", help="Directory containing profile YAML files")
    parser.add_argument("--new-session", action="store_true", help="Start a new session (ignore saved session ID)")
    parser.add_argument("--verbose", action="store_true", help="Show verbose debug output")
    args = parser.parse_args()
    
    # If new-session is specified, ignore any saved session ID
    session_id = None if args.new_session else args.session
    
    # Get verbose flag from .env if not provided in args
    verbose = args.verbose
    if not verbose and os.getenv("CHAT_VERBOSE", "").lower() == "true":
        verbose = True
    
    # Create the chat bot
    chat_bot = ChatBot(
        model=args.model,
        result_limit=args.limit,
        similarity_threshold=args.threshold,
        session_id=session_id,
        user_id=args.user,
        profile=args.profile,
        profiles_dir=args.profiles_dir,
        verbose=verbose
    )
    
    # Print welcome message
    console.print(Panel(
        "[bold green]Welcome to the Supa Chat Interface![/bold green]\n"
        "Ask questions about the crawled data or use these commands:\n"
            "[bold red]'exit'[/bold red] to quit\n"
            "[bold red]'clear'[/bold red] to clear the current session's conversation history\n"
            "[bold red]'clear all'[/bold red] to clear ALL conversation history from the database\n"
            "[bold red]'history'[/bold red] to view the conversation history\n"
            "[bold red]'profile <name>'[/bold red] to change the chat profile\n"
            "[bold red]'profiles'[/bold red] to list available profiles",
            border_style="blue"
    ))
    
    # Print session ID
    console.print(f"Session ID: {chat_bot.session_id}")
    
    # Print user ID or instructions to set one
    if chat_bot.user_id:
        console.print(f"User: {chat_bot.user_id}")
    else:
        console.print("To save your name for future sessions, use --user parameter (e.g., python chat.py --user YourName)")
    
    # Start the chat loop
    try:
        while True:
            # Get user input
            user_input = Prompt.ask("\nYou")
            
            # Check for exit commands
            if user_input.lower() in ["exit", "quit", "bye", "goodbye", "q"]:
                console.print("[green]Exiting chat. Goodbye![/green]")
                break
            
            # Check for clear command
            if user_input.lower() == "clear":
                chat_bot.clear_conversation_history()
                console.print("[green]Conversation history cleared for this session[/green]")
                continue
            
            # Check for clear all command
            if user_input.lower() == "clear all":
                if Confirm.ask("[bold red]Are you sure you want to clear ALL conversation history?[/bold red]"):
                    chat_bot.clear_all_conversation_history()
                    console.print("[green]All conversation history cleared[/green]")
                continue
            
            # Check for history command
            if user_input.lower() == "history":
                chat_bot.show_conversation_history()
                continue
            
            # Check for profiles command
            if user_input.lower() == "profiles":
                chat_bot.show_profiles()
                continue
            
            # Check for profile command
            if user_input.lower().startswith("profile "):
                profile_name = user_input.split(" ", 1)[1].strip()
                chat_bot.change_profile(profile_name)
                continue
            
            # Check for preferences command
            if user_input.lower() == "preferences":
                if not chat_bot.user_id:
                    console.print("[yellow]No user ID provided. Preferences are only stored for identified users.[/yellow]")
                    console.print("[yellow]Restart with --user <name> to use preferences.[/yellow]")
                else:
                    # Get preferences from the database
                    try:
                        preferences = chat_bot.crawler.db_client.get_user_preferences(
                            user_id=chat_bot.user_id,
                            min_confidence=0.0,
                            active_only=True
                        )
                        
                        if not preferences:
                            console.print("[yellow]No preferences found for this user.[/yellow]")
                        else:
                            # Create a table for the preferences
                            table = Table(title=f"Preferences for {chat_bot.user_id}")
                            table.add_column("ID", style="cyan")
                            table.add_column("Type", style="green")
                            table.add_column("Value", style="blue")
                            table.add_column("Confidence", style="yellow")
                            table.add_column("Context", style="magenta")
                            table.add_column("Last Used", style="dim")
                            
                            for pref in preferences:
                                table.add_row(
                                    str(pref.get("id", "")),
                                    pref.get("preference_type", ""),
                                    pref.get("preference_value", ""),
                                    f"{pref.get('confidence', 0.0):.2f}",
                                    pref.get("context", "")[:50] + ("..." if len(pref.get("context", "")) > 50 else ""),
                                    str(pref.get("last_used", ""))
                                )
                            
                            console.print(table)
                    except Exception as e:
                        console.print(f"[red]Error getting preferences: {e}[/red]")
                continue
            
            # Check for add preference command
            if user_input.lower().startswith("add preference "):
                if not chat_bot.user_id:
                    console.print("[yellow]No user ID provided. Preferences are only stored for identified users.[/yellow]")
                    console.print("[yellow]Restart with --user <name> to use preferences.[/yellow]")
                else:
                    # Parse the preference
                    try:
                        # Format: add preference <type> <value> [confidence]
                        parts = user_input[14:].strip().split(" ", 2)
                        if len(parts) < 2:
                            console.print("[yellow]Invalid format. Use: add preference <type> <value> [confidence][/yellow]")
                            console.print("[yellow]Example: add preference like Python 0.9[/yellow]")
                        else:
                            pref_type = parts[0]
                            
                            # Check if confidence is provided
                            if len(parts) == 3 and parts[2].replace(".", "", 1).isdigit():
                                pref_value = parts[1]
                                confidence = float(parts[2])
                            else:
                                # If no confidence or not a valid number, combine the rest as the value
                                pref_value = " ".join(parts[1:])
                                confidence = 0.9  # Default confidence
                            
                            # Add the preference
                            pref_id = chat_bot.crawler.db_client.save_user_preference(
                                user_id=chat_bot.user_id,
                                preference_type=pref_type,
                                preference_value=pref_value,
                                context="Manually added via CLI",
                                confidence=confidence,
                                source_session=chat_bot.session_id,
                                metadata={"source": "cli_manual_entry"}
                            )
                            
                            if pref_id > 0:
                                console.print(f"[green]Preference added with ID: {pref_id}[/green]")
                            else:
                                console.print("[red]Failed to add preference[/red]")
                    except Exception as e:
                        console.print(f"[red]Error adding preference: {e}[/red]")
                continue
            
            # Check for delete preference command
            if user_input.lower().startswith("delete preference "):
                if not chat_bot.user_id:
                    console.print("[yellow]No user ID provided. Preferences are only stored for identified users.[/yellow]")
                    console.print("[yellow]Restart with --user <name> to use preferences.[/yellow]")
                else:
                    # Parse the preference ID
                    try:
                        pref_id = int(user_input[17:].strip())
                        
                        # Delete the preference
                        success = chat_bot.crawler.db_client.delete_user_preference(pref_id)
                        
                        if success:
                            console.print(f"[green]Preference with ID {pref_id} deleted[/green]")
                        else:
                            console.print(f"[red]Failed to delete preference with ID {pref_id}[/red]")
                    except ValueError:
                        console.print("[yellow]Invalid preference ID. Use: delete preference <id>[/yellow]")
                    except Exception as e:
                        console.print(f"[red]Error deleting preference: {e}[/red]")
                continue
            
            # Check for clear preferences command
            if user_input.lower() == "clear preferences":
                if not chat_bot.user_id:
                    console.print("[yellow]No user ID provided. Preferences are only stored for identified users.[/yellow]")
                    console.print("[yellow]Restart with --user <name> to use preferences.[/yellow]")
                else:
                    if Confirm.ask("[bold red]Are you sure you want to clear ALL preferences for this user?[/bold red]"):
                        try:
                            success = chat_bot.crawler.db_client.clear_user_preferences(chat_bot.user_id)
                            
                            if success:
                                console.print(f"[green]All preferences cleared for user {chat_bot.user_id}[/green]")
                            else:
                                console.print("[red]Failed to clear preferences[/red]")
                        except Exception as e:
                            console.print(f"[red]Error clearing preferences: {e}[/red]")
                continue
            
            # Check for help command
            if user_input.lower() in ["help", "?"]:
                console.print("\n[bold]Available Commands:[/bold]")
                console.print("  [cyan]exit, quit, bye, goodbye, q[/cyan] - Exit the chat")
                console.print("  [cyan]clear[/cyan] - Clear conversation history for this session")
                console.print("  [cyan]clear all[/cyan] - Clear ALL conversation history")
                console.print("  [cyan]history[/cyan] - View conversation history")
                console.print("  [cyan]profiles[/cyan] - List available profiles")
                console.print("  [cyan]profile <name>[/cyan] - Change to a different profile")
                console.print("  [cyan]preferences[/cyan] - List your preferences")
                console.print("  [cyan]add preference <type> <value> [confidence][/cyan] - Add a new preference")
                console.print("  [cyan]delete preference <id>[/cyan] - Delete a preference")
                console.print("  [cyan]clear preferences[/cyan] - Clear all your preferences")
                console.print("  [cyan]help, ?[/cyan] - Show this help message")
                continue
            
            # Process the user input
            console.print("Searching all sites...")
            
            # Show a spinner while processing
            with Progress(
                SpinnerColumn(),
                TextColumn("[bold blue]Thinking...[/bold blue]"),
                transient=True,
            ) as progress:
                progress.add_task("thinking", total=None)
                response = chat_bot.get_response(user_input)
            
            # Print the response
            console.print("\nAssistant", style="bold")
            console.print(Panel(Markdown(response), border_style="green"))
            
    except KeyboardInterrupt:
        console.print("\n[yellow]Chat session interrupted[/yellow]")
    except Exception as e:
        console.print(f"\n[red]Error: {e}[/red]")
    
    console.print("[green]Chat session ended[/green]")

if __name__ == "__main__":
    main() 