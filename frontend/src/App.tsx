import { Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import ChatPage from './pages/ChatPage';
import CrawlPage from './pages/CrawlPage';
import SearchPage from './pages/SearchPage';
import SitesPage from './pages/SitesPage';
import SiteDetailPage from './pages/SiteDetailPage';
import NotFoundPage from './pages/NotFoundPage';
import React from 'react';

function App() {
  // Add a flag to disable automatic API calls in development mode
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  // Log once on initial render to help with debugging
  React.useEffect(() => {
    if (isDevelopment) {
      console.log('App running in development mode - some background API calls may occur due to hot reloading');
    }
  }, [isDevelopment]);

  return (
    <>
      <Toaster position="top-right" />
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="chat" element={<ChatPage />} />
          <Route path="crawl" element={<CrawlPage />} />
          <Route path="search" element={<SearchPage />} />
          <Route path="sites" element={<SitesPage />} />
          <Route path="sites/:siteId" element={<SiteDetailPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </>
  );
}

export default App; 