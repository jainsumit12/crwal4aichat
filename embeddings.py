import os
import time
import tiktoken
from typing import List, Dict, Any, Optional
from openai import OpenAI
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class EmbeddingGenerator:
    """Class for generating embeddings using OpenAI's API."""
    
    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None):
        """Initialize the embedding generator.
        
        Args:
            api_key: OpenAI API key. Defaults to environment variable.
            model: The embedding model to use. Defaults to environment variable.
        """
        self.api_key = api_key or os.getenv("OPENAI_API_KEY")
        self.model = model or os.getenv("OPENAI_EMBEDDING_MODEL", "text-embedding-3-small")
        
        if not self.api_key:
            raise ValueError("OpenAI API key not provided and not found in environment variables.")
        
        self.client = OpenAI(api_key=self.api_key)
        
        # Initialize tokenizer for the embedding model
        # text-embedding-3-small uses cl100k_base encoding
        self.tokenizer = tiktoken.get_encoding("cl100k_base")
        
        # Set token limits
        self.max_tokens = 8000  # text-embedding-3-small has 8192 token limit, using 8000 to be safe
        
        print(f"Using model {self.model} for embeddings")
    
    def count_tokens(self, text: str) -> int:
        """Count the number of tokens in a text.
        
        Args:
            text: The text to count tokens for.
            
        Returns:
            The number of tokens.
        """
        return len(self.tokenizer.encode(text))
    
    def generate_embedding(self, text: str) -> List[float]:
        """Generate an embedding for a single text.
        
        Args:
            text: The text to generate an embedding for.
            
        Returns:
            A list of floats representing the embedding.
        """
        # Ensure text is not empty
        if not text or not text.strip():
            raise ValueError("Cannot generate embedding for empty text")
        
        # Check token count
        token_count = self.count_tokens(text)
        
        # If text is within token limit, generate embedding directly
        if token_count <= self.max_tokens:
            try:
                response = self.client.embeddings.create(
                    model=self.model,
                    input=text
                )
                return response.data[0].embedding
            except Exception as e:
                print(f"Error generating embedding: {e}")
                # Implement exponential backoff for rate limits
                if "rate limit" in str(e).lower():
                    time.sleep(5)
                    return self.generate_embedding(text)
                raise
        else:
            # Text exceeds token limit, use a chunking strategy
            print(f"Text exceeds token limit ({token_count} > {self.max_tokens}). Chunking text...")
            
            # Strategy 1: Use the first chunk that fits within the token limit
            # This is a simple approach - for more sophisticated approaches, consider:
            # - Averaging embeddings of multiple chunks
            # - Using a hierarchical approach (embedding chunks and then combining)
            
            # Tokenize the text
            tokens = self.tokenizer.encode(text)
            
            # Take the first chunk that fits within the limit
            first_chunk_tokens = tokens[:self.max_tokens]
            first_chunk = self.tokenizer.decode(first_chunk_tokens)
            
            print(f"Using first {self.max_tokens} tokens for embedding generation")
            
            try:
                response = self.client.embeddings.create(
                    model=self.model,
                    input=first_chunk
                )
                return response.data[0].embedding
            except Exception as e:
                print(f"Error generating embedding for chunked text: {e}")
                if "rate limit" in str(e).lower():
                    time.sleep(5)
                    return self.generate_embedding(first_chunk)
                raise
    
    def generate_batch_embeddings(self, texts: List[str], 
                                 batch_size: int = 10) -> List[List[float]]:
        """Generate embeddings for a batch of texts.
        
        Args:
            texts: List of texts to generate embeddings for.
            batch_size: Number of texts to process in each API call.
            
        Returns:
            List of embeddings, one for each input text.
        """
        if not texts:
            return []
        
        all_embeddings = []
        
        # Process in batches to avoid rate limits
        for i in range(0, len(texts), batch_size):
            batch = texts[i:i+batch_size]
            
            # Filter out empty texts
            valid_batch = [text for text in batch if text and text.strip()]
            valid_indices = [j for j, text in enumerate(batch) if text and text.strip()]
            
            if not valid_batch:
                # If all texts in this batch are empty, add None for each
                all_embeddings.extend([None] * len(batch))
                continue
            
            # Process each text in the batch to ensure it's within token limits
            processed_batch = []
            for text in valid_batch:
                token_count = self.count_tokens(text)
                if token_count > self.max_tokens:
                    # Truncate text to fit within token limit
                    tokens = self.tokenizer.encode(text)
                    truncated_tokens = tokens[:self.max_tokens]
                    truncated_text = self.tokenizer.decode(truncated_tokens)
                    processed_batch.append(truncated_text)
                    print(f"Truncated text from {token_count} to {self.max_tokens} tokens")
                else:
                    processed_batch.append(text)
            
            try:
                response = self.client.embeddings.create(
                    model=self.model,
                    input=processed_batch
                )
                
                # Create a list of None values for this batch
                batch_embeddings = [None] * len(batch)
                
                # Fill in the embeddings for valid texts
                for idx, embedding_data in zip(valid_indices, response.data):
                    batch_embeddings[idx] = embedding_data.embedding
                
                all_embeddings.extend(batch_embeddings)
                
                # Sleep to avoid rate limits
                if i + batch_size < len(texts):
                    time.sleep(0.5)
                
            except Exception as e:
                print(f"Error generating batch embeddings: {e}")
                # Implement exponential backoff for rate limits
                if "rate limit" in str(e).lower():
                    time.sleep(5)
                    # Retry this batch
                    i -= batch_size
                else:
                    # For other errors, add None for each text in this batch
                    all_embeddings.extend([None] * len(batch))
        
        return all_embeddings 