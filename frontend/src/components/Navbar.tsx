import React, { useState } from 'react';
import { Bars3Icon, MoonIcon, SunIcon } from '@heroicons/react/24/outline';
import { useTheme } from '@/context/ThemeContext';
import { useUser } from '@/context/UserContext';
import UserProfileModal from './UserProfileModal';

interface NavbarProps {
  toggleSidebar: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ toggleSidebar }) => {
  const { theme, toggleTheme } = useTheme();
  const { userProfile } = useUser();
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  return (
    <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-2.5">
      <div className="flex justify-between items-center">
        <div className="flex items-center">
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 md:hidden"
            aria-label="Toggle sidebar"
          >
            <Bars3Icon className="h-6 w-6" />
          </button>
          <span className="ml-2 text-lg font-semibold text-gray-900 dark:text-white md:hidden">
            Supa Crawl Chat
          </span>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Toggle dark mode"
          >
            {theme === 'dark' ? (
              <SunIcon className="h-6 w-6" />
            ) : (
              <MoonIcon className="h-6 w-6" />
            )}
          </button>
          
          <button
            onClick={() => setIsProfileModalOpen(true)}
            className="flex items-center space-x-2 p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {userProfile.avatar ? (
              <img 
                src={userProfile.avatar} 
                alt={userProfile.name} 
                className="h-8 w-8 rounded-full object-cover"
              />
            ) : (
              <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white">
                {userProfile.name.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="hidden md:inline-block">{userProfile.name}</span>
          </button>
        </div>
      </div>
      
      <UserProfileModal 
        isOpen={isProfileModalOpen} 
        onClose={() => setIsProfileModalOpen(false)} 
      />
    </nav>
  );
};

export default Navbar; 