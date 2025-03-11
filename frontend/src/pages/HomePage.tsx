import { Link } from 'react-router-dom';
import {
  ChatBubbleLeftRightIcon,
  MagnifyingGlassIcon,
  GlobeAltIcon,
  ServerStackIcon,
} from '@heroicons/react/24/outline';

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
  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white sm:text-4xl">
            Welcome to Supa Crawl Chat
          </h1>
          <p className="mt-4 text-xl text-gray-600 dark:text-gray-300">
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
                <div className="card h-full flex flex-col justify-between transition-all duration-200 hover:shadow-lg dark:hover:shadow-dark">
                  <div>
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <feature.icon
                          className="h-10 w-10 text-primary-600 dark:text-primary-400"
                          aria-hidden="true"
                        />
                      </div>
                      <h3 className="ml-4 text-lg font-medium text-gray-900 dark:text-white">
                        {feature.name}
                      </h3>
                    </div>
                    <p className="mt-4 text-gray-600 dark:text-gray-300">
                      {feature.description}
                    </p>
                  </div>
                  <div className="mt-4 text-sm font-medium text-primary-600 dark:text-primary-400 group-hover:underline">
                    Get started →
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