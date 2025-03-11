import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { apiService, Site } from '@/api/apiService';
import axios from 'axios';

const SitesPage = () => {
  const [sites, setSites] = useState<Site[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);
  const [lastLoadTime, setLastLoadTime] = useState<number>(0);

  // Only load sites when the component mounts
  useEffect(() => {
    // Set a flag in sessionStorage to prevent duplicate API calls
    const hasLoadedSites = sessionStorage.getItem('sitesLoaded');
    const currentTime = Date.now();
    
    // Only load if not loaded before or if it's been more than 5 minutes
    if (!hasLoadedSites || currentTime - lastLoadTime > 5 * 60 * 1000) {
      loadSites();
      sessionStorage.setItem('sitesLoaded', 'true');
      setLastLoadTime(currentTime);
    } else {
      // If we've loaded sites recently, just set loading to false
      setIsLoading(false);
    }
  }, [lastLoadTime]);

  const loadSites = async () => {
    setIsLoading(true);
    setError(null);
    setDebugInfo(null);

    try {
      const sitesData = await apiService.getSites();
      console.log('Sites data:', sitesData); // Debug log
      
      // Check if the response is an array
      if (Array.isArray(sitesData)) {
        setSites(sitesData);
        if (sitesData.length === 0) {
          console.log('No sites found in the response');
        }
      } else {
        // If it's not an array, log the unexpected format and set an empty array
        console.error('Unexpected sites data format:', sitesData);
        setSites([]);
        setError('Received unexpected data format from the server');
      }
    } catch (err) {
      console.error('Error loading sites:', err);
      setError('Failed to load sites. Please try again later.');
      toast.error('Failed to load sites');
    } finally {
      setIsLoading(false);
    }
  };

  const checkApiDirectly = async () => {
    setIsLoading(true);
    setDebugInfo(null);
    
    try {
      // Try to fetch sites directly from the API
      const response = await axios.get('/api/sites/');
      console.log('Direct API response:', response.data);
      
      // If the API call is successful, try to update the sites with the direct data
      if (Array.isArray(response.data)) {
        setSites(response.data);
        toast.success(`Found ${response.data.length} sites directly from API`);
      }
      
      setDebugInfo(JSON.stringify(response.data, null, 2));
    } catch (err) {
      console.error('Error checking API directly:', err);
      setDebugInfo(JSON.stringify(err, null, 2));
      toast.error('API check failed');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      // Check if the date is valid (not Invalid Date)
      if (isNaN(date.getTime())) {
        return 'Invalid date';
      }
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid date';
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Crawled Sites</h1>
        <div className="flex gap-2">
          <button 
            onClick={checkApiDirectly} 
            className="btn-secondary px-4 py-2"
            disabled={isLoading}
          >
            Debug API
          </button>
          <button 
            onClick={loadSites} 
            className="btn-secondary px-4 py-2"
            disabled={isLoading}
          >
            Refresh
          </button>
          <Link to="/crawl" className="btn-secondary bg-green-600 hover:bg-green-700 text-white dark:bg-green-700 dark:hover:bg-green-800 px-4 py-2">
            Crawl New Site
          </Link>
        </div>
      </div>

      {debugInfo && (
        <div className="mb-6 overflow-auto">
          <div className="card p-4">
            <h3 className="text-lg font-semibold mb-2">API Debug Info</h3>
            <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-4 rounded overflow-auto max-h-96">
              {debugInfo}
            </pre>
            <button 
              onClick={() => setDebugInfo(null)} 
              className="mt-2 text-sm text-red-500 hover:text-red-700"
            >
              Close Debug Info
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin text-4xl">↻</div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading sites...</p>
        </div>
      ) : error ? (
        <div className="card p-6 text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <button onClick={loadSites} className="btn-secondary px-4 py-2">
            Try Again
          </button>
        </div>
      ) : sites.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sites.map((site) => (
            <Link
              key={site.id}
              to={`/sites/${site.id}`}
              className="card p-6 hover:shadow-md transition-shadow duration-200"
            >
              <h2 className="text-xl font-semibold mb-2 truncate">{site.name}</h2>
              
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 truncate">
                {site.url}
              </p>
              
              {site.description && (
                <p className="text-sm mb-4 line-clamp-2">{site.description}</p>
              )}
              
              <div className="flex justify-between items-center mt-auto pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center">
                  <span className="text-sm font-medium">{site.page_count}</span>
                  <span className="text-xs text-gray-600 dark:text-gray-400 ml-1">
                    {site.page_count === 1 ? 'page' : 'pages'}
                  </span>
                </div>
                
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  {formatDate(site.created_at)}
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="card p-6 text-center">
          <h2 className="text-xl font-semibold mb-4">No Sites Found</h2>
          <p className="mb-6">
            You haven't crawled any websites yet. Start by crawling your first site.
          </p>
          <Link to="/crawl" className="btn-secondary bg-green-600 hover:bg-green-700 text-white dark:bg-green-700 dark:hover:bg-green-800 px-6 py-2">
            Crawl Your First Site
          </Link>
        </div>
      )}
    </div>
  );
};

export default SitesPage; 