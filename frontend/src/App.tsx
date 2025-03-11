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

function App() {
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