import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { apiService, Site } from '@/api/apiService';

const SitesPage = () => {
  const [sites, setSites] = useState<Site[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSites();
  }, []);

  const loadSites = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const sitesData = await apiService.getSites();
      setSites(sitesData);
    } catch (err) {
      console.error('Error loading sites:', err);
      setError('Failed to load sites. Please try again later.');
      toast.error('Failed to load sites');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="max-w-6xl mx-auto px-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Crawled Sites</h1>
        <Link to="/crawl" className="btn-primary px-4 py-2">
          Crawl New Site
        </Link>
      </div>

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
          <Link to="/crawl" className="btn-primary px-6 py-2">
            Crawl Your First Site
          </Link>
        </div>
      )}
    </div>
  );
};

export default SitesPage; 