import { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { NotificationDropdown } from '@/components/common/NotificationDropdown';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import {
  CalendarDays,
  LayoutDashboard,
  DoorOpen,
  FileText,
  Calendar,
  Users,
  LogOut,
  Moon,
  Sun,
  Menu,
  X,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
}

// Map role to route path prefix
const getRolePath = (role: string | undefined): string => {
  switch (role) {
    case 'room_admin':
      return 'admin';
    case 'GA':
      return 'ga';
    case 'user':
      return 'user';
    default:
      return 'user'; // Default fallback
  }
};

export const DashboardLayout = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Get navigation items based on role
  const getNavItems = (): NavItem[] => {
    // If user is not loaded yet, return empty array
    if (!user) {
      return [];
    }

    // Map role to route path prefix
    const rolePath = getRolePath(user.role);
    
    const baseItems: NavItem[] = [
      { title: 'Dashboard', href: `/${rolePath}/dashboard`, icon: LayoutDashboard },
      { title: 'Calendar', href: `/${rolePath}/calendar`, icon: Calendar },
    ];

    switch (user.role) {
      case 'user':
        return [
          ...baseItems,
          { title: 'Rooms', href: '/user/rooms', icon: DoorOpen },
          { title: 'My Requests', href: '/user/requests', icon: FileText },
          { title: 'My Bookings', href: '/user/bookings', icon: CalendarDays },
        ];
      
      case 'GA':
        return [
          ...baseItems,
          { title: 'Room Requests', href: '/ga/requests', icon: FileText },
          { title: 'All Bookings', href: '/ga/bookings', icon: CalendarDays },
          { title: 'Users', href: '/ga/users', icon: Users },
        ];
      
      case 'room_admin':
        return [
          ...baseItems,
          { title: 'Manage Rooms', href: '/admin/rooms', icon: DoorOpen },
          { title: 'Manage Users', href: '/admin/users', icon: Users },
        ];
      
      default:
        return baseItems;
    }
  };

  const navItems = getNavItems();

  const getUserInitials = () => {
    if (!user?.name) return 'U';
    return user.name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleBadge = () => {
    switch (user?.role) {
      case 'room_admin':
        return <Badge variant="outline">Room Admin</Badge>;
      case 'GA':
        return <Badge variant="outline">GA</Badge>;
      default:
        return <Badge variant="secondary">User</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <div className="lg:hidden flex items-center justify-between p-4 border-b bg-card">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-6 w-6 text-primary" />
          <span className="font-bold">Room Booking</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        >
          {isSidebarOpen ? <X /> : <Menu />}
        </Button>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={cn(
            'fixed lg:sticky top-0 left-0 z-40 h-screen w-64 border-r bg-card transition-transform lg:translate-x-0',
            isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          <div className="flex flex-col h-full">
            {/* Logo */}
            <div className="p-6 border-b">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-8 w-8 text-primary" />
                <div>
                  <h1 className="font-bold text-lg">Room Booking</h1>
                  <p className="text-xs text-muted-foreground">Management System</p>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
              {navItems.map((item) => {
                const isActive = location.pathname === item.href;
                const Icon = item.icon;
                
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    onClick={() => setIsSidebarOpen(false)}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{item.title}</span>
                    {item.badge && (
                      <Badge className="ml-auto" variant="destructive">
                        {item.badge}
                      </Badge>
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* User Profile */}
            <div className="p-4 border-t">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="w-full justify-start gap-3 h-auto p-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {getUserInitials()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 text-left overflow-hidden">
                      <p className="text-sm font-medium truncate">{user?.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col gap-1">
                      <span>My Account</span>
                      {getRoleBadge()}
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to={`/${getRolePath(user?.role)}/profile`}>
                      <Settings className="mr-2 h-4 w-4" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={toggleTheme}>
                    {theme === 'light' ? (
                      <Moon className="mr-2 h-4 w-4" />
                    ) : (
                      <Sun className="mr-2 h-4 w-4" />
                    )}
                    Toggle Theme
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout} className="text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-h-screen">
          {/* Top Bar */}
          <div className="border-b bg-card sticky top-0 z-30">
            <div className="flex items-center justify-between px-6 py-4">
              <div>
                <h2 className="text-2xl font-bold">
                  {navItems.find((item) => item.href === location.pathname)?.title || 'Dashboard'}
                </h2>
              </div>

              <div className="flex items-center gap-2">
                {/* Notifications */}
                <NotificationDropdown />

                {/* Theme Toggle - Desktop */}
                <Button variant="ghost" size="icon" onClick={toggleTheme} className="hidden lg:flex">
                  {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
                </Button>
              </div>
            </div>
          </div>

          {/* Page Content */}
          <div className="p-6">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
};