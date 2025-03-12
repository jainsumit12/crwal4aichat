import React, { useState } from 'react';
import { useUser } from '@/context/UserContext';
import UserProfileModal from './UserProfileModal';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Menu, 
  User,
  MessageSquare,
  Home,
  Search,
  Globe,
  Database,
  Bell
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ModeToggle } from '@/components/ui/mode-toggle';
import { NotificationBell } from './NotificationCenter';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useMediaQuery } from '@/hooks/use-media-query';
import { createNotification } from '@/utils/notifications';

interface NavbarProps {
  toggleSidebar: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ toggleSidebar }) => {
  const { userProfile } = useUser();
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const location = useLocation();
  const pathname = location.pathname;
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const isMobile = useMediaQuery('(max-width: 768px)');

  const navItems = [
    { name: 'Home', href: '/', icon: Home },
    { name: 'Chat', href: '/chat', icon: MessageSquare },
    { name: 'Crawl', href: '/crawl', icon: Globe },
    { name: 'Search', href: '/search', icon: Search },
    { name: 'Sites', href: '/sites', icon: Database }
  ];

  const handleTestNotification = () => {
    createNotification(
      'Test Notification',
      'This is a test notification to verify the notification system is working.',
      'info',
      true
    );
  };

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b border-white/[0.05] bg-[#0f1117] px-6">
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleSidebar}
        className={cn("text-gray-300 hover:text-white hover:bg-white/[0.06]", isDesktop && "lg:hidden")}
        aria-label="Toggle sidebar"
      >
        <Menu className="h-5 w-5" />
      </Button>
      
      {!isDesktop && (
        <div className="flex items-center">
          <Link to="/" className="flex items-center gap-2 text-xl font-semibold">
            <MessageSquare className="h-6 w-6" />
            <span>SupaChat</span>
          </Link>
        </div>
      )}
      
      {/* Only show navigation items on mobile/tablet screens */}
      {!isDesktop && (
        <div className="hidden md:flex items-center ml-6 space-x-6 text-sm font-medium">
          {navItems.map((item) => (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                "transition-colors hover:text-foreground/80 flex items-center gap-2",
                pathname === item.href ? "text-foreground" : "text-foreground/60"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.name}
            </Link>
          ))}
        </div>
      )}
      
      <div className="flex-1" />
      
      <div className="flex items-center gap-2">
        <NotificationBell />
        <ModeToggle />
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 w-9 rounded-full hover:bg-white/[0.06]">
              <Avatar className="h-9 w-9">
                {userProfile.avatar ? (
                  <AvatarImage src={userProfile.avatar} alt={userProfile.name} />
                ) : (
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {userProfile.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                )}
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56 bg-[#171923] border-white/[0.05]" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{userProfile.name}</p>
                <p className="text-xs leading-none text-muted-foreground">
                  User Profile
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-white/[0.05]" />
            <DropdownMenuItem 
              onClick={() => setIsProfileModalOpen(true)}
              className="hover:bg-white/[0.06] focus:bg-white/[0.06]"
            >
              <User className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </DropdownMenuItem>
            <DropdownMenuItem 
              asChild
              className="hover:bg-white/[0.06] focus:bg-white/[0.06]"
            >
              <Link to="/notifications">
                <Bell className="mr-2 h-4 w-4" />
                <span>Notification Info</span>
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      <UserProfileModal 
        isOpen={isProfileModalOpen} 
        onClose={() => setIsProfileModalOpen(false)} 
      />
    </header>
  );
};

export default Navbar; 