import React from 'react';
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
import NotificationInfo from './pages/NotificationInfo';
import { useTheme } from './context/ThemeContext';

// Custom toast container that respects the current theme
const ToastContainer = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 4000,
        className: 'toast-notification',
        style: {
          background: isDark ? 'hsl(220, 26%, 9%)' : 'hsl(var(--background))',
          color: isDark ? 'hsl(var(--card-foreground))' : 'hsl(var(--foreground))',
          border: '1px solid',
          borderColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'hsl(var(--border))',
          fontSize: '14px',
          maxWidth: '380px',
          padding: '12px 16px',
        },
        success: {
          iconTheme: {
            primary: isDark ? '#10b981' : '#059669',
            secondary: isDark ? '#ecfdf5' : '#ffffff',
          },
        },
        error: {
          iconTheme: {
            primary: isDark ? '#ef4444' : '#dc2626',
            secondary: isDark ? '#fef2f2' : '#ffffff',
          },
        },
      }}
    />
  );
};

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
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="chat" element={<ChatPage />} />
          <Route path="crawl" element={<CrawlPage />} />
          <Route path="search" element={<SearchPage />} />
          <Route path="sites" element={<SitesPage />} />
          <Route path="sites/:siteId" element={<SiteDetailPage />} />
          <Route path="notifications" element={<NotificationInfo />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
      <ToastContainer />
    </>
  );
}

export default App; 