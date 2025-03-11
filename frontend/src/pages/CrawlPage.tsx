import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { apiService, CrawlStatus } from '@/api/apiService';

const CrawlPage = () => {
  const navigate = useNavigate();
  const [url, setUrl] = useState('');
  const [name, setName] = useState('');
  const [depth, setDepth] = useState(2);
  const [maxPages, setMaxPages] = useState(100);
  const [isLoading, setIsLoading] = useState(false);
  const [activeCrawls, setActiveCrawls] = useState<CrawlStatus[]>([]);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [followExternalLinks, setFollowExternalLinks] = useState(false);
  const [includePatterns, setIncludePatterns] = useState('');
  const [excludePatterns, setExcludePatterns] = useState('');

  useEffect(() => {
    // Load active crawls when component mounts
    loadActiveCrawls();

    // Start polling for crawl status updates
    const interval = setInterval(loadActiveCrawls, 5000);
    setPollingInterval(interval);

    // Clean up interval when component unmounts
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, []);

  const loadActiveCrawls = async () => {
    try {
      // First try to get all sites, as they contain the crawl information
      const sitesData = await apiService.getSites();
      console.log('Sites data for crawls:', sitesData);
      
      if (Array.isArray(sitesData) && sitesData.length > 0) {
        // Convert sites to crawl status format
        const crawlsFromSites = sitesData.map(site => ({
          site_id: site.id,
          site_name: site.name,
          name: site.name,
          url: site.url,
          page_count: site.page_count || 0,
          chunk_count: 0,
          total_count: site.page_count || 0,
          created_at: site.created_at,
          updated_at: site.created_at,
          status: 'completed',
          next_steps: {
            view_pages: `/sites/${site.id}/pages`,
            search_content: `/search?site_id=${site.id}`
          }
        }));
        
        setActiveCrawls(crawlsFromSites);
        return;
      }
      
      // If no sites are found, try the crawl status endpoint
      const activeCrawlsData = await apiService.getCrawlStatus();
      console.log('Active crawls data:', activeCrawlsData);
      
      if (Array.isArray(activeCrawlsData)) {
        setActiveCrawls(activeCrawlsData);
      } else if (activeCrawlsData) {
        // If it's a single crawl status, convert to array
        setActiveCrawls([activeCrawlsData]);
      } else {
        // If no data is returned, set empty array
        setActiveCrawls([]);
      }
    } catch (error) {
      console.error('Error loading active crawls:', error);
      // Don't show toast for background polling
      setActiveCrawls([]); // Set empty array on error
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!url.trim()) {
      toast.error('Please enter a URL');
      return;
    }

    if (!name.trim()) {
      toast.error('Please enter a name for this crawl');
      return;
    }

    setIsLoading(true);

    try {
      // Prepare crawl request with all parameters
      const crawlRequest = {
        url,
        name,
        depth,
        max_pages: maxPages,
        follow_external_links: followExternalLinks,
        include_patterns: includePatterns ? includePatterns.split(',').map(p => p.trim()) : undefined,
        exclude_patterns: excludePatterns ? excludePatterns.split(',').map(p => p.trim()) : undefined,
      };

      console.log('Sending crawl request:', crawlRequest);

      // Start the crawl
      const response = await apiService.startCrawl(crawlRequest);
      console.log('Crawl response:', response);
      
      toast.success('Crawl started successfully');
      
      // Add the new crawl to the active crawls list
      if (response) {
        setActiveCrawls(prev => [...prev, response]);
      }
      
      // Reset form
      setUrl('');
      setName('');
      setDepth(2);
      setMaxPages(100);
      setFollowExternalLinks(false);
      setIncludePatterns('');
      setExcludePatterns('');
    } catch (error) {
      console.error('Error starting crawl:', error);
      toast.error('Failed to start crawl. Please check the URL and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewSite = (siteId: number | string) => {
    navigate(`/sites/${siteId}`);
  };

  const getStatusColor = (status: string | undefined) => {
    if (!status) return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    
    switch (status.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200';
      case 'in_progress':
      case 'processing':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200';
      case 'failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200';
      case 'queued':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'Invalid date';
      }
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
      }).format(date);
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid date';
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6 text-foreground">Crawl Websites</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <div className="bg-[#171923] border border-white/[0.05] rounded-lg p-6 shadow-sm">
            <h2 className="text-xl font-semibold mb-4 text-gray-200">Start New Crawl</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="url" className="block text-sm font-medium mb-1 text-gray-300">
                  Website URL
                </label>
                <input
                  type="url"
                  id="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full px-3 py-2 bg-[#0f1117] border border-white/[0.05] rounded-md text-gray-200 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50"
                  disabled={isLoading}
                  required
                />
              </div>
              
              <div>
                <label htmlFor="name" className="block text-sm font-medium mb-1 text-gray-300">
                  Crawl Name
                </label>
                <input
                  type="text"
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="My Website Crawl"
                  className="w-full px-3 py-2 bg-[#0f1117] border border-white/[0.05] rounded-md text-gray-200 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50"
                  disabled={isLoading}
                  required
                />
              </div>
              
              <div className="flex gap-4">
                <div className="flex-1">
                  <label htmlFor="depth" className="block text-sm font-medium mb-1 text-gray-300">
                    Crawl Type
                  </label>
                  <select
                    id="depth"
                    value={depth}
                    onChange={(e) => setDepth(parseInt(e.target.value))}
                    className="w-full px-3 py-2 bg-[#0f1117] border border-white/[0.05] rounded-md text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/50"
                    disabled={isLoading}
                  >
                    <option value="1">URL Only</option>
                    <option value="2">URL + Linked Pages</option>
                    <option value="3">Deep Crawl</option>
                  </select>
                </div>
                
                <div className="flex-1">
                  <label htmlFor="maxPages" className="block text-sm font-medium mb-1 text-gray-300">
                    Max Pages
                  </label>
                  <select
                    id="maxPages"
                    value={maxPages}
                    onChange={(e) => setMaxPages(parseInt(e.target.value))}
                    className="w-full px-3 py-2 bg-[#0f1117] border border-white/[0.05] rounded-md text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/50"
                    disabled={isLoading}
                  >
                    <option value="1">1 page</option>
                    <option value="5">5 pages</option>
                    <option value="10">10 pages</option>
                    <option value="25">25 pages</option>
                    <option value="50">50 pages</option>
                    <option value="100">100 pages</option>
                    <option value="250">250 pages</option>
                  </select>
                </div>
              </div>
              
              <div>
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="text-sm text-primary hover:text-primary/90 hover:underline flex items-center"
                >
                  {showAdvanced ? '− Hide' : '+ Show'} Advanced Options
                </button>
              </div>
              
              {showAdvanced && (
                <div className="space-y-4 border-t border-white/[0.05] pt-4 mt-2">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="followExternal"
                      checked={followExternalLinks}
                      onChange={(e) => setFollowExternalLinks(e.target.checked)}
                      className="h-4 w-4 text-primary focus:ring-primary/50 border-white/[0.05] rounded bg-[#0f1117]"
                      disabled={isLoading}
                    />
                    <label htmlFor="followExternal" className="ml-2 block text-sm text-gray-300">
                      Follow External Links
                    </label>
                  </div>
                  
                  <div>
                    <label htmlFor="includePatterns" className="block text-sm font-medium mb-1 text-gray-300">
                      Include URL Patterns (comma separated)
                    </label>
                    <input
                      type="text"
                      id="includePatterns"
                      value={includePatterns}
                      onChange={(e) => setIncludePatterns(e.target.value)}
                      placeholder="blog/*, docs/*"
                      className="w-full px-3 py-2 bg-[#0f1117] border border-white/[0.05] rounded-md text-gray-200 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50"
                      disabled={isLoading}
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      Only crawl URLs matching these patterns
                    </p>
                  </div>
                  
                  <div>
                    <label htmlFor="excludePatterns" className="block text-sm font-medium mb-1 text-gray-300">
                      Exclude URL Patterns (comma separated)
                    </label>
                    <input
                      type="text"
                      id="excludePatterns"
                      value={excludePatterns}
                      onChange={(e) => setExcludePatterns(e.target.value)}
                      placeholder="login/*, admin/*"
                      className="w-full px-3 py-2 bg-[#0f1117] border border-white/[0.05] rounded-md text-gray-200 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50"
                      disabled={isLoading}
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      Skip URLs matching these patterns
                    </p>
                  </div>
                </div>
              )}
              
              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2 px-4 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors"
                  disabled={isLoading}
                >
                  {isLoading ? 'Starting Crawl...' : 'Start Crawl'}
                </button>
              </div>
            </form>
          </div>
          
          <div className="bg-[#171923] border border-white/[0.05] rounded-lg p-6 shadow-sm mt-6">
            <h2 className="text-xl font-semibold mb-2 text-gray-200">Crawling Tips</h2>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                <span className="text-gray-300">Start with a low depth (2) and increase if needed</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                <span className="text-gray-300">Use include/exclude patterns to focus your crawl</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                <span className="text-gray-300">Limit max pages to avoid long processing times</span>
              </li>
              <li className="flex items-start">
                <span className="text-red-500 mr-2">✗</span>
                <span className="text-gray-300">Avoid crawling login-protected or dynamic content pages</span>
              </li>
              <li className="flex items-start">
                <span className="text-red-500 mr-2">✗</span>
                <span className="text-gray-300">Don't crawl sites you don't have permission to access</span>
              </li>
            </ul>
          </div>
        </div>
        
        <div>
          <div className="bg-[#171923] border border-white/[0.05] rounded-lg p-6 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-200">Recent Crawls</h2>
              <button
                onClick={loadActiveCrawls}
                className="text-sm text-primary hover:text-primary/90 hover:underline"
              >
                Refresh
              </button>
            </div>
            
            {activeCrawls.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <p>No active crawls found</p>
                <p className="text-sm mt-2">Start a new crawl to see it here</p>
              </div>
            ) : (
              <div className="space-y-4">
                {activeCrawls.map((crawl) => (
                  <div key={crawl.site_id} className="bg-[#1e2130] border border-white/[0.05] rounded-lg p-4 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-lg font-medium text-gray-200">{crawl.site_name || crawl.name}</h3>
                      <span className={`text-xs px-2 py-1 rounded ${getStatusColor(crawl.status)}`}>
                        {crawl.status || 'completed'}
                      </span>
                    </div>
                    
                    <p className="text-sm text-gray-400 mb-4 break-all">
                      {crawl.url}
                    </p>
                    
                    <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                      <div className="text-gray-300">
                        <span className="font-medium">Started: </span>
                        {crawl.created_at ? formatDate(crawl.created_at) : 'Unknown'}
                      </div>
                      <div className="text-gray-300">
                        <span className="font-medium">Updated: </span>
                        {crawl.updated_at ? formatDate(crawl.updated_at) : 'Unknown'}
                      </div>
                      <div className="text-gray-300">
                        <span className="font-medium">Depth: </span>
                        {crawl.depth !== undefined ? crawl.depth : 'Unknown'}
                      </div>
                      <div className="text-gray-300">
                        <span className="font-medium">Max Pages: </span>
                        {crawl.max_pages !== undefined ? crawl.max_pages : 'Unknown'}
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-2 mb-4">
                      {crawl.page_count !== undefined && (
                        <span className="text-xs bg-blue-900/30 text-blue-200 px-2 py-1 rounded">
                          {crawl.page_count} pages
                        </span>
                      )}
                      {crawl.chunk_count !== undefined && crawl.chunk_count > 0 && (
                        <span className="text-xs bg-purple-900/30 text-purple-200 px-2 py-1 rounded">
                          {crawl.chunk_count} chunks
                        </span>
                      )}
                      {crawl.progress !== undefined && (
                        <span className="text-xs bg-green-900/30 text-green-200 px-2 py-1 rounded">
                          {Math.round(crawl.progress * 100)}% complete
                        </span>
                      )}
                    </div>
                    
                    {crawl.error && (
                      <div className="mb-4 p-2 bg-red-900/20 text-red-200 text-sm rounded border border-red-500/20">
                        <p className="font-medium">Error:</p>
                        <p>{crawl.error}</p>
                      </div>
                    )}
                    
                    <button
                      onClick={() => handleViewSite(crawl.site_id)}
                      className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors"
                    >
                      View Site
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CrawlPage; 