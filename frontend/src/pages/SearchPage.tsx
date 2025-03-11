import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { apiService, SearchResult } from '@/api/apiService';

const SearchPage = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!query.trim()) {
      toast.error('Please enter a search query');
      return;
    }

    setIsLoading(true);
    setResults([]);

    try {
      const searchResults = await apiService.search(query);
      setResults(searchResults);
      setHasSearched(true);
    } catch (error) {
      console.error('Error searching:', error);
      toast.error('Failed to perform search');
    } finally {
      setIsLoading(false);
    }
  };

  const highlightQuery = (text: string) => {
    if (!query.trim()) return text;
    
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(regex, '<mark class="bg-yellow-200 dark:bg-yellow-800">$1</mark>');
  };

  return (
    <div className="max-w-4xl mx-auto px-4">
      <h1 className="text-2xl font-bold mb-6">Semantic Search</h1>

      <form onSubmit={handleSearch} className="mb-8">
        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search your crawled content..."
            className="input flex-1"
            disabled={isLoading}
          />
          <button
            type="submit"
            className="btn-primary px-6"
            disabled={isLoading || !query.trim()}
          >
            {isLoading ? 'Searching...' : 'Search'}
          </button>
        </div>
      </form>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin text-4xl">↻</div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Searching...</p>
        </div>
      ) : hasSearched ? (
        results.length > 0 ? (
          <div className="space-y-6">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Found {results.length} results
            </p>
            {results.map((result) => (
              <div key={result.id} className="card p-6">
                <div className="flex justify-between items-start mb-2">
                  <h2 className="text-lg font-semibold">
                    <span
                      dangerouslySetInnerHTML={{
                        __html: highlightQuery(result.title || 'Untitled'),
                      }}
                    />
                  </h2>
                  <span className="text-sm bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
                    {Math.round(result.similarity * 100)}% match
                  </span>
                </div>
                
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  <Link
                    to={`/sites/${result.site_id}`}
                    className="hover:underline text-blue-600 dark:text-blue-400"
                  >
                    {result.site_name}
                  </Link>{' '}
                  • {new URL(result.url).hostname}
                </p>
                
                <div className="text-sm mb-4">
                  <span
                    dangerouslySetInnerHTML={{
                      __html: highlightQuery(result.content.substring(0, 300) + '...'),
                    }}
                  />
                </div>
                
                <div className="flex justify-between items-center">
                  <a
                    href={result.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {result.url.length > 50 ? result.url.substring(0, 50) + '...' : result.url}
                  </a>
                  
                  {result.is_chunk && (
                    <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2 py-1 rounded">
                      Chunk {result.chunk_index}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-xl font-medium mb-2">No results found</p>
            <p className="text-gray-600 dark:text-gray-400">
              Try a different search term or crawl more content
            </p>
          </div>
        )
      ) : (
        <div className="card p-6">
          <h2 className="text-xl font-semibold mb-4">Search Instructions</h2>
          <p className="mb-4">
            Use semantic search to find content in your crawled websites. Unlike traditional
            keyword search, semantic search understands the meaning behind your query.
          </p>
          <ul className="list-disc list-inside space-y-2 text-sm">
            <li>Enter natural language queries like "What is machine learning?"</li>
            <li>Results are ranked by semantic similarity to your query</li>
            <li>Click on site names to view all pages from that site</li>
            <li>Click on URLs to visit the original page</li>
          </ul>
          
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg mt-6">
            <h3 className="text-sm font-medium text-blue-800 dark:text-blue-300">Tips for Better Results</h3>
            <ul className="list-disc list-inside space-y-1 text-xs text-blue-700 dark:text-blue-400 mt-2">
              <li>Be specific in your queries</li>
              <li>Use complete sentences for better semantic matching</li>
              <li>Try different phrasings if you don't get the results you expect</li>
              <li>Crawl more content to improve search coverage</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchPage; 