import React, { Fragment } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
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
  Menu
} from 'lucide-react';

interface SidebarProps {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const navigation = [
  { name: 'Home', href: '/', icon: Home },
  { name: 'Chat', href: '/chat', icon: MessageSquare },
  { name: 'Crawl', href: '/crawl', icon: Globe },
  { name: 'Search', href: '/search', icon: Search },
  { name: 'Sites', href: '/sites', icon: Database },
];

const Sidebar = ({ open, setOpen }: SidebarProps) => {
  const location = useLocation();

  return (
    <>
      {/* Mobile sidebar */}
      <Transition.Root show={open} as={Fragment}>
        <Dialog as="div" className="relative z-50 md:hidden" onClose={setOpen}>
          <Transition.Child
            as={Fragment}
            enter="transition-opacity ease-linear duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="transition-opacity ease-linear duration-300"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-background/80 backdrop-blur-sm" />
          </Transition.Child>

          <div className="fixed inset-0 z-40 flex">
            <Transition.Child
              as={Fragment}
              enter="transition ease-in-out duration-300 transform"
              enterFrom="-translate-x-full"
              enterTo="translate-x-0"
              leave="transition ease-in-out duration-300 transform"
              leaveFrom="translate-x-0"
              leaveTo="-translate-x-full"
            >
              <Dialog.Panel className="relative flex w-full max-w-xs flex-1 flex-col bg-[#0f1117]">
                <Transition.Child
                  as={Fragment}
                  enter="ease-in-out duration-300"
                  enterFrom="opacity-0"
                  enterTo="opacity-100"
                  leave="ease-in-out duration-300"
                  leaveFrom="opacity-100"
                  leaveTo="opacity-0"
                >
                  <div className="absolute right-0 top-0 flex pt-4 pr-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setOpen(false)}
                      className="ml-1 flex h-10 w-10 items-center justify-center rounded-full"
                    >
                      <span className="sr-only">Close sidebar</span>
                      <X className="h-5 w-5" aria-hidden="true" />
                    </Button>
                  </div>
                </Transition.Child>
                
                <div className="border-b border-white/[0.05] px-6 py-4">
                  <h1 className="text-xl font-semibold tracking-tight">Supa Crawl Chat</h1>
                </div>
                
                <ScrollArea className="flex-1 py-2">
                  <nav className="grid gap-1 px-2">
                    {navigation.map((item) => (
                      <NavLink
                        key={item.name}
                        to={item.href}
                        className={({ isActive }) =>
                          cn(
                            "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-white/[0.06] transition-colors",
                            isActive ? "bg-white/[0.08] text-primary" : "text-gray-300"
                          )
                        }
                        onClick={() => setOpen(false)}
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.name}</span>
                      </NavLink>
                    ))}
                  </nav>
                </ScrollArea>
                
                <div className="border-t border-white/[0.05] p-4">
                  <p className="text-xs text-muted-foreground">
                    Powered by Supabase
                  </p>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition.Root>

      {/* Desktop sidebar */}
      <div className="hidden border-r border-white/[0.05] bg-[#0f1117] md:fixed md:inset-y-0 md:z-10 md:flex md:w-64 md:flex-col">
        <div className="border-b border-white/[0.05] px-6 py-4">
          <h1 className="text-xl font-semibold tracking-tight">Supa Crawl Chat</h1>
        </div>
        
        <ScrollArea className="flex-1 py-2">
          <nav className="grid gap-1 px-4">
            {navigation.map((item) => (
              <NavLink
                key={item.name}
                to={item.href}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-white/[0.06] transition-colors",
                    isActive ? "bg-white/[0.08] text-primary" : "text-gray-300"
                  )
                }
              >
                <item.icon className="h-4 w-4" />
                <span>{item.name}</span>
              </NavLink>
            ))}
          </nav>
        </ScrollArea>
        
        <div className="border-t border-white/[0.05] p-4">
          <p className="text-xs text-muted-foreground">
            Powered by Supabase
          </p>
        </div>
      </div>
    </>
  );
};

export default Sidebar; 