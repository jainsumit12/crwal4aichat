import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { apiService, Site, Page } from '@/api/apiService';

const SiteDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const [site, setSite] = useState<Site | null>(null);
  const [pages, setPages] = useState<Page[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedPage, setSelectedPage] = useState<Page | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const pagesPerPage = 10;

  useEffect(() => {
    if (id) {
      loadSiteDetails(parseInt(id));
    }
  }, [id]);

  const loadSiteDetails = async (siteId: number) => {
    setIsLoading(true);
    setError(null);

    try {
      const siteData = await apiService.getSite(siteId);
      setSite(siteData);

      const pagesData = await apiService.getSitePages(siteId);
      setPages(pagesData);
    } catch (err) {
      console.error('Error loading site details:', err);
      setError('Failed to load site details. Please try again later.');
      toast.error('Failed to load site details');
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
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const filteredPages = pages.filter((page) => {
    if (!searchTerm.trim()) return true;
    
    const term = searchTerm.toLowerCase();
    return (
      page.title?.toLowerCase().includes(term) ||
      page.url.toLowerCase().includes(term) ||
      page.content?.toLowerCase().includes(term)
    );
  });

  const totalPages = Math.ceil(filteredPages.length / pagesPerPage);
  const paginatedPages = filteredPages.slice(
    (currentPage - 1) * pagesPerPage,
    currentPage * pagesPerPage
  );

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
    setSelectedPage(null);
  };

  const handleViewPage = (page: Page) => {
    setSelectedPage(page);
  };

  const handleBackToList = () => {
    setSelectedPage(null);
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin text-4xl">↻</div>
        <p className="mt-4 text-gray-600 dark:text-gray-400">Loading site details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4">
        <div className="card p-6 text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <Link to="/sites" className="btn-secondary px-4 py-2">
            Back to Sites
          </Link>
        </div>
      </div>
    );
  }

  if (!site) {
    return (
      <div className="max-w-4xl mx-auto px-4">
        <div className="card p-6 text-center">
          <p className="mb-4">Site not found</p>
          <Link to="/sites" className="btn-secondary px-4 py-2">
            Back to Sites
          </Link>
        </div>
      </div>
    );
  }

  if (selectedPage) {
    return (
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-4">
          <button onClick={handleBackToList} className="btn-secondary px-4 py-2">
            ← Back to Pages
          </button>
        </div>

        <div className="card p-6">
          <h1 className="text-2xl font-bold mb-2">{selectedPage.title || 'Untitled'}</h1>
          
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            <a
              href={selectedPage.url}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline"
            >
              {selectedPage.url}
            </a>
          </p>
          
          {selectedPage.is_chunk && (
            <div className="bg-gray-100 dark:bg-gray-800 p-2 rounded mb-4 text-sm">
              <span className="font-medium">Chunk {selectedPage.chunk_index}</span>
              {selectedPage.parent_id && (
                <span> • Part of a larger document</span>
              )}
            </div>
          )}
          
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
            <div className="prose dark:prose-invert max-w-none">
              <div className="whitespace-pre-wrap">{selectedPage.content}</div>
            </div>
          </div>
          
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-6">
            <p>Created: {formatDate(selectedPage.created_at)}</p>
            <p>Updated: {formatDate(selectedPage.updated_at)}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4">
      <div className="mb-6">
        <Link to="/sites" className="text-blue-600 dark:text-blue-400 hover:underline">
          ← Back to Sites
        </Link>
      </div>

      <div className="card p-6 mb-8">
        <h1 className="text-2xl font-bold mb-2">{site.name}</h1>
        
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          <a
            href={site.url}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline"
          >
            {site.url}
          </a>
        </p>
        
        {site.description && (
          <p className="mb-4">{site.description}</p>
        )}
        
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="bg-blue-50 dark:bg-blue-900/20 px-3 py-1 rounded">
            <span className="font-medium">{site.page_count}</span> pages
          </div>
          
          <div className="bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded">
            Created {formatDate(site.created_at)}
          </div>
          
          <Link
            to="/chat"
            className="bg-green-50 dark:bg-green-900/20 px-3 py-1 rounded text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30"
          >
            Chat with this site
          </Link>
          
          <Link
            to="/search"
            className="bg-purple-50 dark:bg-purple-900/20 px-3 py-1 rounded text-purple-700 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/30"
          >
            Search this site
          </Link>
        </div>
      </div>

      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-4">Pages ({filteredPages.length})</h2>
        
        <div className="flex mb-4">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search pages..."
            className="input flex-1"
          />
        </div>
        
        {filteredPages.length === 0 ? (
          <div className="card p-6 text-center">
            <p>No pages found{searchTerm ? ' matching your search' : ''}.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100 dark:bg-gray-800">
                    <th className="text-left p-3">Title</th>
                    <th className="text-left p-3">URL</th>
                    <th className="text-left p-3">Type</th>
                    <th className="text-left p-3">Created</th>
                    <th className="text-center p-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedPages.map((page) => (
                    <tr
                      key={page.id}
                      className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    >
                      <td className="p-3 max-w-[200px] truncate">
                        {page.title || 'Untitled'}
                      </td>
                      <td className="p-3 max-w-[200px] truncate">{page.url}</td>
                      <td className="p-3">
                        {page.is_chunk ? (
                          <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2 py-1 rounded">
                            Chunk {page.chunk_index}
                          </span>
                        ) : (
                          <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-1 rounded">
                            Page
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-sm">
                        {new Date(page.created_at).toLocaleDateString()}
                      </td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => handleViewPage(page)}
                          className="text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {totalPages > 1 && (
              <div className="flex justify-center mt-6">
                <div className="flex space-x-1">
                  <button
                    onClick={() => handlePageChange(1)}
                    disabled={currentPage === 1}
                    className="px-3 py-1 rounded border border-gray-300 dark:border-gray-700 disabled:opacity-50"
                  >
                    First
                  </button>
                  
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-3 py-1 rounded border border-gray-300 dark:border-gray-700 disabled:opacity-50"
                  >
                    Prev
                  </button>
                  
                  <span className="px-3 py-1">
                    Page {currentPage} of {totalPages}
                  </span>
                  
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 rounded border border-gray-300 dark:border-gray-700 disabled:opacity-50"
                  >
                    Next
                  </button>
                  
                  <button
                    onClick={() => handlePageChange(totalPages)}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 rounded border border-gray-300 dark:border-gray-700 disabled:opacity-50"
                  >
                    Last
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default SiteDetailPage; 