import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { apiService, Site, Page } from '@/api/apiService';
import { api } from '@/api/apiWrapper';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

const SiteDetailPage = () => {
  const { siteId } = useParams<{ siteId: string }>();
  
  const [site, setSite] = useState<Site | null>(null);
  const [pages, setPages] = useState<Page[]>([]);
  const [filteredPages, setFilteredPages] = useState<Page[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<any | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 10; // Number of items per page
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPage, setSelectedPage] = useState<Page | null>(null);
  const [contentViewMode, setContentViewMode] = useState<'raw' | 'rendered'>('raw');
  const [contentSource, setContentSource] = useState<'database' | 'live' | 'unknown'>('unknown');
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [databaseContent, setDatabaseContent] = useState<string | null>(null);
  const [liveContent, setLiveContent] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'database' | 'live'>('database');
  const [relatedChunks, setRelatedChunks] = useState<Page[]>([]);
  const [showDebugPanel, setShowDebugPanel] = useState(false);

  useEffect(() => {
    if (siteId) {
      loadSiteDetails(parseInt(siteId));
    }
  }, [siteId]);

  useEffect(() => {
    if (pages.length > 0) {
      applyFilters();
    }
  }, [pages, searchTerm, currentPage]);

  // When a page is selected, find related chunks and fetch content
  useEffect(() => {
    if (selectedPage) {
      // Find related chunks (other chunks of the same parent page)
      if (selectedPage.is_chunk && selectedPage.parent_id) {
        // If this is a chunk, find other chunks with the same parent_id
        const chunks = pages.filter(p => 
          p.parent_id === selectedPage.parent_id && p.id !== selectedPage.id
        );
        setRelatedChunks(chunks);
      } else if (!selectedPage.is_chunk) {
        // If this is a parent page, find all its chunks
        const chunks = pages.filter(p => 
          p.parent_id === selectedPage.id
        );
        setRelatedChunks(chunks);
      } else {
        setRelatedChunks([]);
      }

      // Fetch content if needed and not already loading
      if (selectedPage.id && !isLoadingContent) {
        // Add a flag to prevent multiple fetches
        const contentAlreadyLoaded = selectedPage.content !== undefined && selectedPage.content !== null;
        if (!contentAlreadyLoaded) {
          fetchDatabaseContent(selectedPage.id);
        }
      }
    } else {
      setRelatedChunks([]);
    }
  }, [selectedPage, pages, isLoadingContent]);

  const loadSiteDetails = async (siteId: number) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const siteData = await apiService.getSite(siteId);
      setSite(siteData);
      
      try {
        const pagesData = await apiService.getSitePages(siteId);
        console.log('Pages data:', pagesData);
        
        // Store debug info
        setDebugInfo({
          site: siteData,
          pages: pagesData
        });
        
        // Handle both array response and object with pages property
        let pagesArray = Array.isArray(pagesData) ? pagesData : pagesData.pages;
        
        // Sort pages: non-chunks first, then by title
        pagesArray.sort((a, b) => {
          // First sort by is_chunk (non-chunks first)
          if (a.is_chunk !== b.is_chunk) {
            return a.is_chunk ? 1 : -1;
          }
          
          // Then sort chunks by chunk_index
          if (a.is_chunk && b.is_chunk && a.chunk_index !== null && b.chunk_index !== null) {
            return a.chunk_index - b.chunk_index;
          }
          
          // Finally sort by title
          return (a.title || '').localeCompare(b.title || '');
        });
        
        setPages(pagesArray);
        
        // Calculate total pages for pagination
        const totalPagesCount = Math.ceil(pagesArray.length / pageSize);
        setTotalPages(totalPagesCount > 0 ? totalPagesCount : 1);
      } catch (pagesError) {
        console.error('Error fetching site pages:', pagesError);
        toast.error('Failed to load site pages');
        setPages([]);
      }
    } catch (siteError) {
      console.error('Error fetching site details:', siteError);
      toast.error('Failed to load site details');
      setError('Failed to load site details. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  const checkApiDirectly = async () => {
    if (!siteId) return;
    
    try {
      const response = await axios.get(`/api/sites/${siteId}/pages/`);
      console.log('Direct API response:', response.data);
      toast.success('Check console for API response');
    } catch (error) {
      console.error('Error checking API directly:', error);
      toast.error('Failed to check API directly');
    }
  };

  const applyFilters = () => {
    let filtered = [...pages];
    
    // Apply search filter
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(page => 
        (page.title && page.title.toLowerCase().includes(searchLower)) ||
        (page.url && page.url.toLowerCase().includes(searchLower)) ||
        (page.summary && page.summary.toLowerCase().includes(searchLower)) ||
        (page.content && page.content.toLowerCase().includes(searchLower))
      );
    }
    
    setFilteredPages(filtered);
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'Unknown';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleString();
    } catch (error) {
      return 'Invalid date';
    }
  };

  // Function to fetch database content from the API
  const fetchDatabaseContent = async (pageId: number) => {
    if (!pageId) return null;
    
    setIsLoadingContent(true);
    try {
      // First try to get content directly from the pages API
      try {
        const pageData = await api.getPageById(pageId);
        
        if (pageData && pageData.content) {
          setDatabaseContent(pageData.content);
          setContentSource('database');
          
          // Update the selected page with additional data only if needed
          if (selectedPage && (!selectedPage.content || selectedPage.content.trim() === '')) {
            setSelectedPage({
              ...selectedPage,
              created_at: pageData.created_at || selectedPage.created_at,
              updated_at: pageData.updated_at || selectedPage.updated_at,
              content: pageData.content
            });
          }
          
          // If this is a parent page, fetch its chunks
          if (!pageData.is_chunk) {
            try {
              const chunks = await api.getPageChunks(pageId);
              if (chunks && chunks.length > 0) {
                setRelatedChunks(chunks);
              }
            } catch (chunkError) {
              console.error('Error fetching chunks:', chunkError);
            }
          }
          
          return pageData.content;
        }
      } catch (pageError) {
        console.error('Error fetching from pages API:', pageError);
      }
      
      // If the direct API call didn't work, fall back to the sites API
      if (siteId) {
        try {
          const response = await axios.get(`/api/sites/${siteId}/pages/`, {
            params: { include_chunks: true }
          });
          
          console.log('Sites API response:', response.data);
          
          let pagesData = response.data;
          if (pagesData && typeof pagesData === 'object' && 'pages' in pagesData) {
            pagesData = pagesData.pages;
          }
          
          if (Array.isArray(pagesData)) {
            const pageData = pagesData.find((p: any) => p.id === pageId);
            if (pageData && pageData.content) {
              setDatabaseContent(pageData.content);
              setContentSource('database');
              
              // Update the selected page with additional data if available and needed
              if (selectedPage && (!selectedPage.content || selectedPage.content.trim() === '')) {
                setSelectedPage({
                  ...selectedPage,
                  created_at: pageData.created_at || selectedPage.created_at,
                  updated_at: pageData.updated_at || selectedPage.updated_at,
                  content: pageData.content
                });
              }
              
              return pageData.content;
            }
          }
        } catch (sitesError) {
          console.error('Error fetching from sites API:', sitesError);
        }
      }
      
      // If we still don't have content, try the search API as a last resort
      try {
        const searchResponse = await axios.get('/api/search/', {
          params: {
            query: selectedPage?.url || '',
            text_only: true,
            limit: 1
          }
        });
        
        console.log('Search API response:', searchResponse.data);
        
        let searchResults = searchResponse.data;
        if (searchResponse.data && typeof searchResponse.data === 'object' && 'results' in searchResponse.data) {
          searchResults = searchResponse.data.results;
        }
        
        if (Array.isArray(searchResults) && searchResults.length > 0) {
          const searchResult = searchResults[0];
          if (searchResult.content) {
            setDatabaseContent(searchResult.content);
            setContentSource('database');
            
            // Update the selected page with additional data if available
            if (selectedPage) {
              setSelectedPage({
                ...selectedPage,
                content: searchResult.content
              });
            }
            
            return searchResult.content;
          }
        }
      } catch (searchError) {
        console.error('Error fetching from search API:', searchError);
      }
      
      // If all methods failed, show a message
      setDatabaseContent(null);
      setContentSource('unknown');
      toast.error('No content found in database');
      return null;
    } catch (error) {
      console.error('Error fetching database content:', error);
      setDatabaseContent(null);
      setContentSource('unknown');
      return null;
    } finally {
      setIsLoadingContent(false);
    }
  };

  // Function to fetch content directly from the live URL
  const fetchLiveContent = async (url: string) => {
    if (!url) return null;
    
    setIsLoadingContent(true);
    try {
      const corsProxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
      const response = await axios.get(corsProxyUrl);
      
      if (response.data) {
        const htmlContent = typeof response.data === 'string' 
          ? response.data 
          : JSON.stringify(response.data);
        
        setLiveContent(htmlContent);
        setContentSource('live');
        return htmlContent;
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching live content:', error);
      return null;
    } finally {
      setIsLoadingContent(false);
    }
  };

  // Function to determine if content is likely HTML
  const isHtmlContent = (content: string): boolean => {
    return /<\/?[a-z][\s\S]*>/i.test(content);
  };

  // Function to determine if content is likely Markdown
  const isMarkdownContent = (content: string): boolean => {
    // Check for common markdown patterns
    const markdownPatterns = [
      /^#+ .*$/m, // Headers
      /\[.*\]\(.*\)/, // Links
      /\*\*.*\*\*/, // Bold
      /\*.*\*/, // Italic
      /```[\s\S]*```/, // Code blocks
      /^\s*[-*+] .*$/m, // Lists
      /^\s*\d+\. .*$/m, // Numbered lists
      /^\s*>\s.*$/m, // Blockquotes
    ];
    
    return markdownPatterns.some(pattern => pattern.test(content));
  };

  // Function to detect content type
  const detectContentType = (content: string | undefined): 'html' | 'markdown' | 'text' => {
    if (!content) return 'text';
    if (isHtmlContent(content)) return 'html';
    if (isMarkdownContent(content)) return 'markdown';
    return 'text';
  };

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };

  const handleViewPage = (page: Page) => {
    setSelectedPage(page);
  };

  const handleBackToList = () => {
    setSelectedPage(null);
    setDatabaseContent(null);
    setLiveContent(null);
    setContentSource('unknown');
  };

  const handleViewChunk = (chunk: Page) => {
    setSelectedPage(chunk);
  };

  return (
    <div className="max-w-4xl mx-auto px-4">
      <h1 className="text-2xl font-bold mb-6">
        {site ? site.name : 'Site Details'}
      </h1>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : selectedPage ? (
        <div>
          <button
            onClick={handleBackToList}
            className="btn-secondary mb-4 px-4 py-2"
          >
            ← Back to Pages
          </button>
          
          <div className="card p-6">
            <h2 className="text-xl font-semibold mb-2">{selectedPage.title || 'Untitled'}</h2>
            
            <div className="flex flex-wrap gap-2 mb-4">
              <a
                href={selectedPage.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:underline break-all"
              >
                {selectedPage.url}
              </a>
              
              {selectedPage.is_chunk && (
                <span className="text-sm bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2 py-1 rounded">
                  Chunk {selectedPage.chunk_index}
                </span>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-4 text-sm text-gray-600 dark:text-gray-400">
              <div>
                <span className="font-medium">Created: </span>
                {formatDate(selectedPage.created_at)}
              </div>
              <div>
                <span className="font-medium">Updated: </span>
                {formatDate(selectedPage.updated_at)}
              </div>
              <div>
                <span className="font-medium">Page ID: </span>
                {selectedPage.id}
              </div>
              {selectedPage.parent_id && (
                <div>
                  <span className="font-medium">Parent ID: </span>
                  {selectedPage.parent_id}
                </div>
              )}
            </div>
            
            {selectedPage.summary && (
              <div className="mb-4">
                <h3 className="text-lg font-medium mb-2">Summary</h3>
                <p className="bg-gray-50 dark:bg-gray-800 p-3 rounded">{selectedPage.summary}</p>
              </div>
            )}
            
            {/* Related chunks section */}
            {relatedChunks.length > 0 && (
              <div className="mb-4">
                <h3 className="text-lg font-medium mb-2">
                  {selectedPage.is_chunk ? 'Other Chunks' : 'Chunks'}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {relatedChunks.map(chunk => (
                    <button
                      key={chunk.id}
                      onClick={() => handleViewChunk(chunk)}
                      className="text-left p-2 border border-gray-200 dark:border-gray-700 rounded hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      <div className="text-sm font-medium">
                        Chunk {chunk.chunk_index}
                      </div>
                      {chunk.title && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {chunk.title}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            <div>
              <div className="flex flex-col space-y-2 mb-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium">Content</h3>
                  <div className="flex items-center space-x-4">
                    {contentSource !== 'unknown' && (
                      <div className="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-gray-800">
                        Source: {contentSource === 'database' ? 'Database' : 'Live URL'}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  <div className="flex rounded-md shadow-sm" role="group">
                    <button
                      type="button"
                      onClick={() => {
                        setViewMode('database');
                        if (selectedPage.id) {
                          fetchDatabaseContent(selectedPage.id);
                        }
                      }}
                      className={`px-3 py-1 text-xs font-medium rounded-l-lg ${
                        viewMode === 'database'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      Database Content
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setViewMode('live');
                        if (selectedPage.url) {
                          fetchLiveContent(selectedPage.url);
                        }
                      }}
                      className={`px-3 py-1 text-xs font-medium rounded-r-lg ${
                        viewMode === 'live'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      Live URL Content
                    </button>
                  </div>
                  
                  <div className="flex rounded-md shadow-sm" role="group">
                    <button
                      type="button"
                      onClick={() => setContentViewMode('raw')}
                      className={`px-3 py-1 text-xs font-medium rounded-l-lg ${
                        contentViewMode === 'raw'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      Raw
                    </button>
                    <button
                      type="button"
                      onClick={() => setContentViewMode('rendered')}
                      className={`px-3 py-1 text-xs font-medium rounded-r-lg ${
                        contentViewMode === 'rendered'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      Rendered
                    </button>
                  </div>
                </div>
              </div>
              
              {isLoadingContent ? (
                <div className="flex justify-center items-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                </div>
              ) : (
                <>
                  {viewMode === 'database' ? (
                    <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded overflow-auto max-h-[500px]">
                      {databaseContent ? (
                        contentViewMode === 'raw' ? (
                          <pre className="whitespace-pre-wrap text-sm font-mono">{databaseContent}</pre>
                        ) : (
                          <div className="prose dark:prose-invert max-w-none">
                            {detectContentType(databaseContent) === 'html' ? (
                              <div dangerouslySetInnerHTML={{ __html: databaseContent }} />
                            ) : (
                              <ReactMarkdown>
                                {databaseContent}
                              </ReactMarkdown>
                            )}
                          </div>
                        )
                      ) : (
                        <div className="flex flex-col items-center justify-center py-4">
                          <p className="text-gray-500 dark:text-gray-400 mb-2">No database content available</p>
                          <button 
                            onClick={() => selectedPage.id && fetchDatabaseContent(selectedPage.id)}
                            className="btn-secondary text-xs py-1 px-3"
                          >
                            Try to Fetch Database Content
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded overflow-auto max-h-[500px]">
                      {liveContent ? (
                        contentViewMode === 'raw' ? (
                          <pre className="whitespace-pre-wrap text-sm font-mono">{liveContent}</pre>
                        ) : (
                          <div className="prose dark:prose-invert max-w-none">
                            {detectContentType(liveContent) === 'html' ? (
                              <div dangerouslySetInnerHTML={{ __html: liveContent }} />
                            ) : (
                              <ReactMarkdown>
                                {liveContent}
                              </ReactMarkdown>
                            )}
                          </div>
                        )
                      ) : (
                        <div className="flex flex-col items-center justify-center py-4">
                          <p className="text-gray-500 dark:text-gray-400 mb-2">No live content available</p>
                          <button 
                            onClick={() => selectedPage.url && fetchLiveContent(selectedPage.url)}
                            className="btn-secondary text-xs py-1 px-3"
                          >
                            Try to Fetch Live Content
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
            
            {/* Debug information section */}
            <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-4">
              <details className="text-sm">
                <summary className="cursor-pointer font-medium mb-2">Debug Information</summary>
                <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded overflow-auto max-h-[300px]">
                  <pre className="text-xs whitespace-pre-wrap">
                    {JSON.stringify(selectedPage, null, 2)}
                  </pre>
                </div>
              </details>
            </div>
          </div>
        </div>
      ) : error ? (
        <div className="bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 p-4 rounded mb-6">
          {error}
        </div>
      ) : site ? (
        <div>
          <div className="card p-6 mb-6">
            <h2 className="text-xl font-semibold mb-2">{site.name}</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              <a
                href={site.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                {site.url}
              </a>
            </p>
            
            {site.description && (
              <div className="mb-4">
                <h3 className="text-lg font-medium mb-2">Description</h3>
                <p className="bg-gray-50 dark:bg-gray-800 p-3 rounded">{site.description}</p>
              </div>
            )}
            
            <div className="grid grid-cols-1 gap-4 text-sm text-gray-600 dark:text-gray-400">
              <div>
                <span className="font-medium">Created: </span>
                {formatDate(site.created_at)}
              </div>
            </div>
            
            <div className="mt-4 flex gap-2">
              <button
                onClick={checkApiDirectly}
                className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 px-3 py-1 rounded-md flex items-center"
                title="Fetch raw data from the API for debugging purposes"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Debug API Data
              </button>
              
              <button
                onClick={() => siteId && loadSiteDetails(parseInt(siteId))}
                className="text-xs bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-700 px-3 py-1 rounded-md flex items-center"
                title="Refresh site and pages data"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh Data
              </button>
            </div>
          </div>
          
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center">
                <h3 className="text-lg font-medium">Pages ({pages.length})</h3>
                <button
                  onClick={() => siteId && loadSiteDetails(parseInt(siteId))}
                  className="ml-2 text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 p-1 rounded-full flex items-center"
                  title="Refresh pages data"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </div>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search pages..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 w-full"
                />
              </div>
            </div>
            
            {filteredPages.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                No pages found
              </div>
            ) : (
              <div className="space-y-2">
                {filteredPages
                  .slice((currentPage - 1) * pageSize, currentPage * pageSize)
                  .map((page) => (
                    <div
                      key={page.id}
                      className="p-3 border border-gray-200 dark:border-gray-700 rounded hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                      onClick={() => handleViewPage(page)}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium">
                            {page.title || 'Untitled'}
                            {page.is_chunk && (
                              <span className="ml-2 text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2 py-1 rounded">
                                Chunk {page.chunk_index}
                              </span>
                            )}
                          </h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 truncate">
                            {page.url}
                          </p>
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {formatDate(page.created_at)}
                        </div>
                      </div>
                      {page.summary && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 line-clamp-2">
                          {page.summary}
                        </p>
                      )}
                    </div>
                  ))}
              </div>
            )}
            
            {totalPages > 1 && (
              <div className="flex justify-center mt-4">
                <nav className="flex items-center space-x-2">
                  <button
                    onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 rounded border border-gray-300 dark:border-gray-700 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 rounded border border-gray-300 dark:border-gray-700 disabled:opacity-50"
                  >
                    Next
                  </button>
                </nav>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          No site found
        </div>
      )}
    </div>
  );
};

export default SiteDetailPage; 