import { Link } from 'react-router-dom';
import {
  ChatBubbleLeftRightIcon,
  MagnifyingGlassIcon,
  GlobeAltIcon,
  ServerStackIcon,
} from '@heroicons/react/24/outline';
import { useState } from 'react';

const features = [
  {
    name: 'Chat with Your Data',
    description: 'Interact with your crawled content using natural language. Ask questions and get answers based on your data.',
    icon: ChatBubbleLeftRightIcon,
    href: '/chat',
  },
  {
    name: 'Crawl Websites',
    description: 'Crawl websites and sitemaps to extract content and store it in your database with vector embeddings.',
    icon: GlobeAltIcon,
    href: '/crawl',
  },
  {
    name: 'Semantic Search',
    description: 'Search your crawled content using semantic search to find the most relevant information.',
    icon: MagnifyingGlassIcon,
    href: '/search',
  },
  {
    name: 'Manage Sites',
    description: 'View and manage your crawled sites and pages. See statistics and details about your content.',
    icon: ServerStackIcon,
    href: '/sites',
  },
];

const HomePage = () => {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <div 
            className="relative inline-block"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            <h1 className={`text-3xl sm:text-4xl font-extrabold tracking-tight transition-all duration-300 ease-in-out ${
              isHovered 
                ? 'bg-clip-text text-transparent bg-gradient-to-r from-primary-500 to-primary-700 dark:from-primary-400 dark:to-primary-600 scale-105' 
                : 'text-gray-900 dark:text-white'
            }`}>
              Welcome to Supa Crawl Chat
            </h1>
            <div className={`h-1 bg-gradient-to-r from-primary-500 to-primary-700 dark:from-primary-400 dark:to-primary-600 mt-2 transition-all duration-300 ease-in-out ${
              isHovered ? 'w-full opacity-100' : 'w-0 opacity-0'
            }`}></div>
          </div>
          <p className="mt-6 text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            Crawl websites, search content, and chat with your data using AI.
          </p>
        </div>

        <div className="mt-12">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-2">
            {features.map((feature) => (
              <Link
                key={feature.name}
                to={feature.href}
                className="block group"
              >
                <div className="card h-full flex flex-col justify-between transition-all duration-200 hover:shadow-lg dark:hover:shadow-dark p-6">
                  <div className="space-y-4">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 p-2 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
                        <feature.icon
                          className="h-8 w-8 text-primary-600 dark:text-primary-400"
                          aria-hidden="true"
                        />
                      </div>
                      <h3 className="ml-4 text-lg font-medium text-gray-900 dark:text-white">
                        {feature.name}
                      </h3>
                    </div>
                    <p className="text-gray-600 dark:text-gray-300 pl-14">
                      {feature.description}
                    </p>
                  </div>
                  <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-800 text-sm font-medium text-primary-600 dark:text-primary-400 group-hover:underline flex items-center">
                    Get started 
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage; 