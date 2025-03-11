import { Bars3Icon, MoonIcon, SunIcon } from '@heroicons/react/24/outline';
import { useTheme } from '@/context/ThemeContext';

interface NavbarProps {
  toggleSidebar: () => void;
}

const Navbar = ({ toggleSidebar }: NavbarProps) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-10 flex h-16 flex-shrink-0 bg-white dark:bg-gray-800 shadow-sm dark:shadow-gray-700/20">
      <div className="flex flex-1 justify-between px-4">
        <div className="flex flex-1">
          <button
            type="button"
            className="px-4 text-gray-500 dark:text-gray-400 md:hidden focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 dark:focus:ring-blue-400"
            onClick={toggleSidebar}
            aria-label="Open sidebar"
          >
            <Bars3Icon className="h-6 w-6" aria-hidden="true" />
          </button>
          <div className="flex items-center md:ml-0">
            <span className="md:hidden text-lg font-semibold text-gray-900 dark:text-white">
              Supa Crawl Chat
            </span>
          </div>
        </div>
        <div className="ml-4 flex items-center md:ml-6">
          <button
            type="button"
            onClick={toggleTheme}
            className="rounded-full bg-white dark:bg-gray-700 p-1 text-gray-500 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
            aria-label="Toggle dark mode"
          >
            {theme === 'dark' ? (
              <SunIcon className="h-6 w-6" aria-hidden="true" />
            ) : (
              <MoonIcon className="h-6 w-6" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};

export default Navbar; 