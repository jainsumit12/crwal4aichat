import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import Sidebar from './Sidebar';

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  // Close sidebar on route change (mobile only)
  useEffect(() => {
    setSidebarOpen(false);
  }, [location]);

  // Close sidebar on mobile when window width is less than 768px
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setSidebarOpen(false);
      }
    };

    // Initial check
    handleResize();
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-white dark:bg-gray-900">
      {/* Sidebar for mobile and desktop */}
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />
      
      {/* Main content area */}
      <div className="flex flex-col flex-1 w-full md:w-0 md:ml-64 overflow-hidden">
        <Navbar toggleSidebar={toggleSidebar} />
        
        <main className="relative flex-1 overflow-y-auto focus:outline-none p-4">
          <div className="py-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout; 