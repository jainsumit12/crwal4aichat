import { Fragment } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Dialog, Transition } from '@headlessui/react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Home, 
  MessageSquare, 
  Globe, 
  Search, 
  Database, 
  X,
  Menu,
  Github,
  UserCog
} from 'lucide-react';
import { useMediaQuery } from '@/hooks/use-media-query';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const location = useLocation();
  const pathname = location.pathname;
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  
  const navItems = [
    { name: 'Home', href: '/', icon: Home },
    { name: 'Chat', href: '/chat', icon: MessageSquare },
    { name: 'Crawl', href: '/crawl', icon: Globe },
    { name: 'Search', href: '/search', icon: Search },
    { name: 'Sites', href: '/sites', icon: Database },
    { name: 'Preferences', href: '/preferences', icon: UserCog }
  ];
  
  // Custom X (Twitter) icon component
  const TwitterX = () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 4L3 20" />
      <path d="M6 4L21 20" />
    </svg>
  );

  return (
    <>
      {/* Mobile sidebar */}
      <Transition.Root show={isOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50 lg:hidden" onClose={onClose}>
          <Transition.Child
            as={Fragment}
            enter="transition-opacity ease-linear duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="transition-opacity ease-linear duration-300"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
          </Transition.Child>

          <div className="fixed inset-0 flex">
            <Transition.Child
              as={Fragment}
              enter="transition ease-in-out duration-300 transform"
              enterFrom="-translate-x-full"
              enterTo="translate-x-0"
              leave="transition ease-in-out duration-300 transform"
              leaveFrom="translate-x-0"
              leaveTo="-translate-x-full"
            >
              <Dialog.Panel className="relative mr-16 flex w-full max-w-xs flex-1 flex-col bg-background pb-4">
                <Transition.Child
                  as={Fragment}
                  enter="ease-in-out duration-300"
                  enterFrom="opacity-0"
                  enterTo="opacity-100"
                  leave="ease-in-out duration-300"
                  leaveFrom="opacity-100"
                  leaveTo="opacity-0"
                >
                  <div className="absolute right-0 top-0 -mr-12 pt-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={onClose}
                      className="ml-1 flex h-10 w-10 items-center justify-center"
                    >
                      <X className="h-6 w-6" />
                    </Button>
                  </div>
                </Transition.Child>
                
                <div className="border-b border-border px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 overflow-hidden rounded-full">
                      <img 
                        src="https://imagedelivery.net/WfhVb8dSNAAvdXUdMfBuPQ/92227574-9331-49d0-535f-1f21c9b14f00/public" 
                        alt="SupaChat Logo" 
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <h1 className="text-xl font-semibold tracking-tight">Supa Crawl Chat</h1>
                  </div>
                </div>
                
                <ScrollArea className="flex-1 py-2">
                  <nav className="grid gap-1 px-4 pt-8">
                    {navItems.map((item) => (
                      <Link
                        key={item.name}
                        to={item.href}
                        className={cn(
                          "flex items-center gap-3 rounded-md px-3 py-2.5 text-base font-medium hover:bg-accent transition-colors",
                          pathname === item.href ? "bg-accent text-primary" : "text-foreground/60"
                        )}
                        onClick={onClose}
                      >
                        <item.icon className="h-5 w-5" />
                        <span>{item.name}</span>
                      </Link>
                    ))}
                  </nav>
                </ScrollArea>
                
                <div className="border-t border-border p-4">
                  <div className="flex items-center gap-4">
                    <a 
                      href="https://github.com/bigsk1/supa-crawl-chat" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-primary transition-colors"
                      title="GitHub Repository"
                    >
                      <Github className="h-5 w-5" />
                    </a>
                    <a 
                      href="https://x.com/bigsk1_com" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-primary transition-colors"
                      title="X (Twitter) Profile"
                    >
                      <TwitterX />
                    </a>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition.Root>

      {/* Desktop sidebar */}
      <div className="hidden border-r border-white/[0.05] bg-[#0f1117] lg:fixed lg:inset-y-0 lg:z-10 lg:flex lg:w-64 lg:flex-col">
        <div className="border-b border-white/[0.05] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 overflow-hidden rounded-full">
              <img 
                src="https://imagedelivery.net/WfhVb8dSNAAvdXUdMfBuPQ/92227574-9331-49d0-535f-1f21c9b14f00/public" 
                alt="SupaChat Logo" 
                className="h-full w-full object-cover"
              />
            </div>
            <h1 className="text-xl font-semibold tracking-tight">Supa Crawl Chat</h1>
          </div>
        </div>
        
        <ScrollArea className="flex-1 py-2">
          <nav className="grid gap-1 px-4 pt-8">
            {navItems.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2.5 text-base font-medium hover:bg-accent transition-colors",
                  pathname === item.href ? "bg-accent text-primary" : "text-foreground/60"
                )}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.name}</span>
              </Link>
            ))}
          </nav>
        </ScrollArea>
        
        <div className="border-t border-white/[0.05] p-4">
          <div className="flex items-center gap-4">
            <a 
              href="https://github.com/bigsk1/supa-crawl-chat" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-primary transition-colors"
              title="GitHub Repository"
            >
              <Github className="h-5 w-5" />
            </a>
            <a 
              href="https://x.com/bigsk1_com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-primary transition-colors"
              title="X (Twitter) Profile"
            >
              <TwitterX />
            </a>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar; 