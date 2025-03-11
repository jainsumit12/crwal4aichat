import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { CrawlStatus } from '@/api/apiService';
import { api } from '@/api/apiWrapper';
import { createNotification } from '@/utils/notifications';
import { Button } from '@/components/ui/button';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import { Eye, Search, RefreshCw } from 'lucide-react';

const DebugPanel = ({ isOpen, onClose, data }: { isOpen: boolean; onClose: () => void; data: any }) => {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="debug-panel w-full max-w-4xl bg-[#171923] border border-white/[0.05] rounded-lg shadow-lg overflow-hidden">
        <div className="debug-panel-header flex justify-between items-center p-4 border-b border-white/[0.05]">
          <h3 className="text-lg font-medium text-gray-200">API Debug Info</h3>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            Close
          </Button>
        </div>
        <div className="p-4 max-h-[70vh] overflow-auto">
          <pre className="bg-[#0f1117] text-foreground p-4 rounded-md overflow-auto text-sm">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
};

const CrawlPage = () => {
  const navigate = useNavigate();
  const [url, setUrl] = useState('');
  const [name, setName] = useState('');
  const [depth, setDepth] = useState(2);
  const [maxPages, setMaxPages] = useState(25);
  const [followExternalLinks, setFollowExternalLinks] = useState(false);
  const [includePatterns, setIncludePatterns] = useState('');
  const [excludePatterns, setExcludePatterns] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeCrawls, setActiveCrawls] = useState<CrawlStatus[]>([]);
  const [debugData, setDebugData] = useState<any>(null);
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Initial load
    loadActiveCrawls();
    
    // Set up polling every 10 seconds to check for new crawls
    const interval = setInterval(loadActiveCrawls, 10000);
    setPollingInterval(interval);
    
    // Clean up interval when component unmounts
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, []);

  const loadActiveCrawls = async (bypassCache = false) => {
    try {
      let sitesData;
      
      if (bypassCache) {
        // Bypass cache by making a direct API call
        const response = await axios.get('/api/sites/');
        console.log('Direct API response for crawls (bypass cache):', response.data);
        
        // Handle the response format with a sites array
        if (response.data && response.data.sites && Array.isArray(response.data.sites)) {
          sitesData = response.data.sites;
        } else {
          sitesData = response.data;
        }
      } else {
        // First try to get all sites, as they contain the crawl information
        sitesData = await api.getSites();
        console.log('Sites data for crawls:', sitesData);
      }
      
      // Handle different response formats
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
            view_pages: `/sites/${site.id}`,
            search_content: `/search?site_id=${site.id}`
          }
        }));
        
        // Sort crawls by created_at date (newest first)
        const sortedCrawls = [...crawlsFromSites].sort((a, b) => {
          // Convert dates to timestamps for comparison
          const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
          const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
          // Sort in descending order (newest first)
          return dateB - dateA;
        });
        
        setActiveCrawls(sortedCrawls);
        return;
      } else if (sitesData && typeof sitesData === 'object' && !Array.isArray(sitesData)) {
        // If it's a single site object, convert to array
        console.log('Single site object received, converting to crawl status');
        const site = sitesData;
        const crawlStatus = {
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
            view_pages: `/sites/${site.id}`,
            search_content: `/search?site_id=${site.id}`
          }
        };
        setActiveCrawls([crawlStatus]);
        return;
      }
      
      // If no sites are found or the format is unexpected, set empty array
      console.log('No valid sites data found, setting empty array');
      setActiveCrawls([]);
    } catch (error) {
      console.error('Error loading active crawls:', error);
      // Don't show toast for background polling
      setActiveCrawls([]); // Set empty array on error
    }
  };

  const manualRefresh = async () => {
    setRefreshing(true);
    try {
      await loadActiveCrawls(true); // Pass true to bypass cache
      toast.success('Crawl list refreshed');
    } catch (error) {
      console.error('Error refreshing crawls:', error);
      toast.error('Failed to refresh crawls');
    } finally {
      setRefreshing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!url) {
      toast.error('Please enter a URL');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Prepare the crawl parameters
      const crawlParams = {
        url,
        name: name || url,
        depth,
        max_pages: maxPages,
        follow_external_links: followExternalLinks,
        include_patterns: includePatterns ? includePatterns.split(',').map(p => p.trim()) : [],
        exclude_patterns: excludePatterns ? excludePatterns.split(',').map(p => p.trim()) : []
      };
      
      // Log the parameters for debugging
      console.log('Starting crawl with params:', crawlParams);
      setDebugData(crawlParams);
      
      // Start the crawl
      const result = await api.startCrawl(crawlParams);
      console.log('Crawl started:', result);
      
      // Reset the form
      resetForm();
      
      // Refresh the crawl list
      await loadActiveCrawls(true);
      
    } catch (error) {
      console.error('Error starting crawl:', error);
      toast.error('Failed to start crawl. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setUrl('');
    setName('');
    setDepth(2);
    setMaxPages(25);
    setFollowExternalLinks(false);
    setIncludePatterns('');
    setExcludePatterns('');
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
      // Check if dateString is null, undefined, or empty
      if (!dateString) {
        return 'No date';
      }
      
      // Check for epoch dates (1970-01-01 or close to it)
      const date = new Date(dateString);
      if (date.getFullYear() < 1980) {
        console.log('Epoch date detected:', dateString);
        return 'Recent';
      }
      
      // Check if the date is valid (not Invalid Date)
      if (isNaN(date.getTime())) {
        console.error('Invalid date string:', dateString);
        return 'No date';
      }
      
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error('Error formatting date:', error, 'Date string:', dateString);
      return 'No date';
    }
  };

  // Add debug API handler
  const handleDebugApi = async () => {
    try {
      const sitesData = await api.getSites();
      setDebugData(sitesData);
      setShowDebugPanel(true);
      
      // Add to notification center
      createNotification('API Debug', 'API debug information loaded', 'info', true);
    } catch (error) {
      createNotification('API Debug Error', 'Failed to load API debug information', 'error', true);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-5">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Start a Crawl</h2>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setShowDebugPanel(!showDebugPanel)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                {showDebugPanel ? 'Hide Debug' : 'Show Debug'}
              </Button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="url" className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                  Website URL
                </label>
                <input
                  type="url"
                  id="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com"
                  required
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
              
              <div>
                <label htmlFor="name" className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                  Site Name (Optional)
                </label>
                <input
                  type="text"
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="My Website"
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="depth" className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                    Crawl Type
                  </label>
                  <select
                    id="depth"
                    value={depth}
                    onChange={(e) => setDepth(parseInt(e.target.value))}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    <option value="1">URL Only</option>
                    <option value="2">URL + Linked Pages</option>
                    <option value="3">Deep Crawl</option>
                  </select>
                </div>
                
                <div>
                  <label htmlFor="maxPages" className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                    Max Pages
                  </label>
                  <select
                    id="maxPages"
                    value={maxPages}
                    onChange={(e) => setMaxPages(parseInt(e.target.value))}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
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
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center"
                >
                  {showAdvanced ? '− Hide' : '+ Show'} Advanced Options
                </button>
              </div>
              
              {showAdvanced && (
                <div className="space-y-4 border-t border-gray-200 dark:border-gray-700 pt-4 mt-2">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="followExternal"
                      checked={followExternalLinks}
                      onChange={(e) => setFollowExternalLinks(e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="followExternal" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                      Follow External Links
                    </label>
                  </div>
                  
                  <div>
                    <label htmlFor="includePatterns" className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                      Include URL Patterns (comma separated)
                    </label>
                    <input
                      type="text"
                      id="includePatterns"
                      value={includePatterns}
                      onChange={(e) => setIncludePatterns(e.target.value)}
                      placeholder="blog/*, docs/*"
                      className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Only crawl URLs matching these patterns
                    </p>
                  </div>
                  
                  <div>
                    <label htmlFor="excludePatterns" className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                      Exclude URL Patterns (comma separated)
                    </label>
                    <input
                      type="text"
                      id="excludePatterns"
                      value={excludePatterns}
                      onChange={(e) => setExcludePatterns(e.target.value)}
                      placeholder="login/*, admin/*"
                      className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Skip URLs matching these patterns
                    </p>
                  </div>
                </div>
              )}
              
              <Button 
                type="submit" 
                disabled={isSubmitting || !url}
                className="w-full"
              >
                {isSubmitting ? (
                  <div className="flex items-center justify-center">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent mr-2"></div>
                    <span>Starting Crawl...</span>
                  </div>
                ) : (
                  'Start Crawl'
                )}
              </Button>
            </form>
          </div>
        </div>
        
        <div className="lg:col-span-7">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Recent Crawls</h2>
              <Button 
                variant="outline" 
                size="sm"
                onClick={manualRefresh}
                disabled={refreshing}
                className="flex items-center gap-2"
              >
                {refreshing ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-500 border-t-transparent"></div>
                    <span>Refreshing...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" />
                    <span>Refresh Crawls</span>
                  </>
                )}
              </Button>
            </div>
            
            <div className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              <p>Click "Refresh Crawls" to update the list with the latest crawl data.</p>
            </div>
            
            {activeCrawls.length > 0 ? (
              <div className="space-y-4">
                {activeCrawls.map((crawl, index) => (
                  <div
                    key={index}
                    className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-medium">
                          {crawl.name || crawl.site_name || "Unnamed Site"}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          {crawl.url || "No URL"}
                        </p>
                        <div className="flex items-center mt-2 text-sm">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            crawl.status === 'completed' 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                              : crawl.status === 'in_progress' 
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                          }`}>
                            {crawl.status === 'completed' ? 'Completed' : 
                             crawl.status === 'in_progress' ? 'In Progress' : 
                             crawl.status || 'Unknown'}
                          </span>
                          <span className="mx-2">•</span>
                          <span className="text-gray-500 dark:text-gray-400">
                            {formatDate(crawl.created_at)}
                          </span>
                        </div>
                        <div className="mt-2 text-sm">
                          <span className="text-gray-600 dark:text-gray-300">
                            Pages: {crawl.page_count || 0}
                          </span>
                        </div>
                      </div>
                      <div className="mt-4 md:mt-0 flex flex-col sm:flex-row gap-2">
                        {crawl.next_steps && crawl.next_steps.view_pages && (
                          <Link
                            to={crawl.next_steps.view_pages}
                            className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            View Site
                          </Link>
                        )}
                        {crawl.next_steps && crawl.next_steps.search_content && (
                          <Link
                            to={crawl.next_steps.search_content}
                            className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600"
                          >
                            <Search className="w-4 h-4 mr-2" />
                            Search
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500 dark:text-gray-400">No recent crawls found.</p>
                <p className="text-gray-500 dark:text-gray-400 mt-2">
                  Start a new crawl using the form above.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <DebugPanel 
        isOpen={showDebugPanel} 
        onClose={() => setShowDebugPanel(false)} 
        data={debugData} 
      />
    </div>
  );
};

export default CrawlPage; 