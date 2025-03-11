import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { apiService, CrawlRequest, CrawlResponse, CrawlStatus } from '@/api/apiService';

const CrawlPage = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<CrawlRequest>({
    url: '',
    site_name: '',
    site_description: '',
    is_sitemap: false,
    max_urls: 100,
  });
  const [crawlResponse, setCrawlResponse] = useState<CrawlResponse | null>(null);
  const [crawlStatus, setCrawlStatus] = useState<CrawlStatus | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);

  // Auto-refresh crawl status
  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    
    if (autoRefresh && crawlResponse?.site_id) {
      intervalId = setInterval(() => {
        checkCrawlStatus(crawlResponse.site_id);
      }, 5000); // Check every 5 seconds
    }
    
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [autoRefresh, crawlResponse]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target as HTMLInputElement;
    
    if (type === 'checkbox') {
      const { checked } = e.target as HTMLInputElement;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else if (type === 'number') {
      setFormData((prev) => ({ ...prev, [name]: parseInt(value) || 0 }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.url) {
      toast.error('URL is required');
      return;
    }

    setIsLoading(true);
    setCrawlResponse(null);
    setCrawlStatus(null);

    try {
      // If site name is not provided, use the domain name
      const requestData = { ...formData };
      if (!requestData.site_name) {
        try {
          const url = new URL(requestData.url);
          requestData.site_name = url.hostname;
        } catch (error) {
          // If URL parsing fails, just use the URL as is
          requestData.site_name = requestData.url;
        }
      }

      const response = await apiService.startCrawl(requestData);
      setCrawlResponse(response);
      toast.success('Crawl started successfully!');
      
      // Start auto-refresh
      setAutoRefresh(true);
      
      // Immediately check status
      if (response.site_id) {
        checkCrawlStatus(response.site_id);
      }
    } catch (error) {
      console.error('Error starting crawl:', error);
      toast.error('Failed to start crawl');
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewSite = () => {
    if (crawlResponse?.site_id) {
      navigate(`/sites/${crawlResponse.site_id}`);
    }
  };

  const checkCrawlStatus = async (siteId: number) => {
    try {
      const status = await apiService.getCrawlStatus(siteId);
      setCrawlStatus(status);
      
      // If page count is not increasing and we have pages, assume crawl is complete
      if (status.page_count > 0 && crawlStatus && status.page_count === crawlStatus.page_count) {
        setAutoRefresh(false);
        toast.success('Crawl completed!');
      }
    } catch (error) {
      console.error('Error checking status:', error);
      // Don't show error toast for status checks
      setAutoRefresh(false);
    }
  };

  const handleCheckStatus = async () => {
    if (!crawlResponse?.site_id) return;

    setIsLoading(true);
    try {
      await checkCrawlStatus(crawlResponse.site_id);
      toast.success(`Crawled ${crawlStatus?.page_count || 0} pages so far`);
    } catch (error) {
      console.error('Error checking status:', error);
      toast.error('Failed to check crawl status');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleAutoRefresh = () => {
    setAutoRefresh(!autoRefresh);
  };

  return (
    <div className="max-w-4xl mx-auto px-4">
      <h1 className="text-2xl font-bold mb-6">Crawl a Website</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <form onSubmit={handleSubmit} className="card p-6 space-y-4">
            <div>
              <label htmlFor="url" className="block text-sm font-medium mb-1">
                URL to Crawl <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="url"
                name="url"
                value={formData.url}
                onChange={handleChange}
                placeholder="https://example.com"
                className="input w-full"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter a website URL or sitemap URL
              </p>
            </div>

            <div>
              <label htmlFor="site_name" className="block text-sm font-medium mb-1">
                Site Name
              </label>
              <input
                type="text"
                id="site_name"
                name="site_name"
                value={formData.site_name}
                onChange={handleChange}
                placeholder="My Website"
                className="input w-full"
              />
              <p className="text-xs text-gray-500 mt-1">
                Leave blank to use domain name
              </p>
            </div>

            <div>
              <label htmlFor="site_description" className="block text-sm font-medium mb-1">
                Site Description
              </label>
              <textarea
                id="site_description"
                name="site_description"
                value={formData.site_description}
                onChange={handleChange}
                placeholder="Description of the website"
                className="textarea w-full"
                rows={3}
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_sitemap"
                name="is_sitemap"
                checked={formData.is_sitemap}
                onChange={handleChange}
                className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
              />
              <label htmlFor="is_sitemap" className="ml-2 block text-sm">
                This is a sitemap URL
              </label>
            </div>

            <div>
              <label htmlFor="max_urls" className="block text-sm font-medium mb-1">
                Max URLs to Crawl
              </label>
              <input
                type="number"
                id="max_urls"
                name="max_urls"
                value={formData.max_urls}
                onChange={handleChange}
                min="1"
                max="1000"
                className="input w-full"
              />
              <p className="text-xs text-gray-500 mt-1">
                Limit the number of pages to crawl (max 1000)
              </p>
            </div>

            <button
              type="submit"
              className="btn-primary w-full"
              disabled={isLoading || !formData.url}
            >
              {isLoading ? 'Starting Crawl...' : 'Start Crawl'}
            </button>
          </form>
        </div>

        <div>
          {crawlResponse ? (
            <div className="card p-6 space-y-4">
              <h2 className="text-xl font-semibold">Crawl Status</h2>
              
              <div>
                <p className="text-sm font-medium">Site Name</p>
                <p>{crawlResponse.site_name}</p>
              </div>
              
              <div>
                <p className="text-sm font-medium">URL</p>
                <p className="break-all">{crawlResponse.url}</p>
              </div>
              
              {crawlStatus ? (
                <>
                  <div>
                    <p className="text-sm font-medium">Status</p>
                    <p className="flex items-center">
                      {autoRefresh ? (
                        <span className="inline-block mr-2 h-2 w-2 bg-green-500 rounded-full animate-pulse"></span>
                      ) : (
                        <span className="inline-block mr-2 h-2 w-2 bg-blue-500 rounded-full"></span>
                      )}
                      {autoRefresh ? 'Crawling in progress...' : 'Crawl completed'}
                    </p>
                  </div>
                  
                  <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
                    <div className="flex justify-between mb-2">
                      <span className="text-sm">Progress</span>
                      <span className="text-sm font-medium">{crawlStatus.page_count} pages</span>
                    </div>
                    
                    {crawlStatus.chunk_count > 0 && (
                      <div className="flex justify-between mb-2">
                        <span className="text-sm">Chunks</span>
                        <span className="text-sm font-medium">{crawlStatus.chunk_count} chunks</span>
                      </div>
                    )}
                    
                    <div className="flex justify-between">
                      <span className="text-sm">Last Updated</span>
                      <span className="text-sm font-medium">
                        {new Date(crawlStatus.updated_at).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                <div>
                  <p className="text-sm font-medium">Status</p>
                  <p>{crawlResponse.status}</p>
                </div>
              )}
              
              <div className="flex flex-col space-y-2 pt-4">
                <div className="flex items-center justify-between">
                  <button
                    onClick={handleCheckStatus}
                    className="btn-secondary"
                    disabled={isLoading}
                  >
                    Check Status Manually
                  </button>
                  
                  <label className="flex items-center cursor-pointer">
                    <span className="mr-2 text-sm">Auto-refresh</span>
                    <div className={`relative inline-block w-10 h-5 transition-colors duration-200 ease-in-out rounded-full ${autoRefresh ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={autoRefresh}
                        onChange={toggleAutoRefresh}
                      />
                      <span className={`absolute left-0.5 top-0.5 bg-white w-4 h-4 rounded-full transition-transform duration-200 ease-in-out ${autoRefresh ? 'transform translate-x-5' : ''}`}></span>
                    </div>
                  </label>
                </div>
                
                <button
                  onClick={handleViewSite}
                  className="btn-outline"
                >
                  View Site Details
                </button>
              </div>
            </div>
          ) : (
            <div className="card p-6 space-y-4">
              <h2 className="text-xl font-semibold">Crawling Instructions</h2>
              <ul className="list-disc list-inside space-y-2 text-sm">
                <li>Enter the URL of the website you want to crawl</li>
                <li>For sitemaps, check the "This is a sitemap URL" option</li>
                <li>Limit the number of pages to avoid long crawl times</li>
                <li>Crawled content will be processed for chat and search</li>
                <li>Large websites may take several minutes to crawl</li>
              </ul>
              
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg mt-4">
                <h3 className="text-sm font-medium text-blue-800 dark:text-blue-300">Tips</h3>
                <ul className="list-disc list-inside space-y-1 text-xs text-blue-700 dark:text-blue-400 mt-2">
                  <li>Use sitemaps for more efficient crawling</li>
                  <li>Start with a small number of pages for testing</li>
                  <li>Check the crawl status to monitor progress</li>
                  <li>You can chat with your data once crawling is complete</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CrawlPage; 