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
  Users,
  LogOut,
  Moon,
  Sun,
  Menu,
  X,
  Settings,
  Car,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Types ────────────────────────────────────────────────────────────────────

interface NavChild {
  title: string;
  href: string;
}

interface NavItem {
  title: string;
  href?: string;           // undefined → dropdown group
  icon: React.ElementType;
  children?: NavChild[];   // sub-links for dropdown
  badge?: number;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const getRolePath = (role: string | undefined): string => {
  switch (role) {
    case 'room_admin': return 'admin';
    case 'GA':         return 'ga';
    default:           return 'user';
  }
};

// ── Nav builder ───────────────────────────────────────────────────────────────

const getNavItems = (role: string | undefined): NavItem[] => {
  const rolePath = getRolePath(role);

  const dashboard: NavItem = {
    title: 'Dashboard',
    href: `/${rolePath}/dashboard`,
    icon: LayoutDashboard,
  };

  switch (role) {
    case 'user':
      return [
        dashboard,
        {
          title: 'Room',
          icon: DoorOpen,
          children: [
            { title: 'Rooms',            href: '/user/rooms' },
            { title: 'My Room Requests', href: '/user/requests' },
            { title: 'My Room Bookings', href: '/user/bookings' },
            { title: 'Room Calendar',    href: '/user/calendar' },
          ],
        },
        {
          title: 'Car',
          icon: Car,
          children: [
            { title: 'Cars',            href: '/user/cars' },
            { title: 'My Car Requests', href: '/user/car-requests' },
            { title: 'My Car Bookings', href: '/user/car-bookings' },
            { title: 'Car Calendar',    href: '/user/car-calendar' },
          ],
        },
      ];

    case 'GA':
      return [
        dashboard,
        {
          title: 'Room',
          icon: DoorOpen,
          children: [
            { title: 'Room Requests',    href: '/ga/requests' },
            { title: 'All Room Bookings', href: '/ga/bookings' },
            { title: 'Room Calendar',    href: '/ga/calendar' },
          ],
        },
        {
          title: 'Car',
          icon: Car,
          children: [
            { title: 'Car Requests',    href: '/ga/car-requests' },
            { title: 'All Car Bookings', href: '/ga/car-bookings' },
            { title: 'Car Calendar',    href: '/ga/car-calendar' },
          ],
        },
        { title: 'Users', href: '/ga/users', icon: Users },
      ];

    case 'room_admin':
      return [
        dashboard,
        {
          title: 'Room',
          icon: DoorOpen,
          children: [
            { title: 'Manage Rooms',         href: '/admin/rooms' },
            // { title: 'Manage Room Requests', href: '/admin/requests' },
            { title: 'Room Calendar',        href: '/admin/calendar' },
          ],
        },
        {
          title: 'Car',
          icon: Car,
          children: [
            { title: 'Manage Cars',         href: '/admin/cars' },
            // { title: 'Manage Car Requests', href: '/admin/car-requests' },
            { title: 'Car Calendar',        href: '/admin/car-calendar' },
          ],
        },
        { title: 'Manage Users', href: '/admin/users', icon: Users },
      ];

    default:
      return [
        dashboard,
        {
          title: 'Room',
          icon: DoorOpen,
          children: [
            { title: 'Rooms',            href: '/user/rooms' },
            { title: 'My Room Requests', href: '/user/requests' },
            { title: 'My Room Bookings', href: '/user/bookings' },
            { title: 'Room Calendar',    href: '/user/calendar' },
          ],
        },
        {
          title: 'Car',
          icon: Car,
          children: [
            { title: 'Cars',            href: '/user/cars' },
            { title: 'My Car Requests', href: '/user/car-requests' },
            { title: 'My Car Bookings', href: '/user/car-bookings' },
            { title: 'Car Calendar',    href: '/user/car-calendar' },
          ],
        },
      ];
  }
};

// ── NavItemRow ────────────────────────────────────────────────────────────────

interface NavItemRowProps {
  item: NavItem;
  currentPath: string;
  onClose: () => void;
}

const NavItemRow = ({ item, currentPath, onClose }: NavItemRowProps) => {
  const isChildActive = item.children?.some((c) => currentPath === c.href) ?? false;
  const [open, setOpen] = useState(isChildActive);
  const Icon = item.icon;

  // Plain link (no children)
  if (!item.children) {
    const isActive = currentPath === item.href;
    return (
      <Link
        to={item.href!}
        onClick={onClose}
        className={cn(
          'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
          isActive
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
        )}
      >
        <Icon className="h-5 w-5 shrink-0" />
        <span>{item.title}</span>
        {item.badge && (
          <Badge className="ml-auto" variant="destructive">
            {item.badge}
          </Badge>
        )}
      </Link>
    );
  }

  // Dropdown group
  return (
    <div>
      <button
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
          isChildActive
            ? 'text-primary'
            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
        )}
      >
        <Icon className="h-5 w-5 shrink-0" />
        <span className="flex-1 text-left">{item.title}</span>
        {open
          ? <ChevronDown className="h-4 w-4" />
          : <ChevronRight className="h-4 w-4" />
        }
      </button>

      {open && (
        <div className="ml-8 mt-1 flex flex-col gap-0.5 border-l border-border pl-3">
          {item.children.map((child) => {
            const isActive = currentPath === child.href;
            return (
              <Link
                key={child.href}
                to={child.href}
                onClick={onClose}
                className={cn(
                  'block px-3 py-1.5 rounded-md text-sm transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                {child.title}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ── DashboardLayout ───────────────────────────────────────────────────────────

export const DashboardLayout = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const navItems = user ? getNavItems(user.role) : [];

  const closeSidebar = () => setIsSidebarOpen(false);

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
      case 'room_admin': return <Badge variant="outline">Room Admin</Badge>;
      case 'GA':         return <Badge variant="outline">GA</Badge>;
      case 'driver':     return <Badge variant="secondary">Driver</Badge>;
      default:           return <Badge variant="secondary">User</Badge>;
    }
  };

  // Current page title — check flat links and nested children
  const currentTitle = (() => {
    for (const item of navItems) {
      if (item.href && item.href === location.pathname) return item.title;
      if (item.children) {
        const child = item.children.find((c) => c.href === location.pathname);
        if (child) return child.title;
      }
    }
    return 'Dashboard';
  })();

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
              {navItems.map((item, idx) => (
                <NavItemRow
                  key={item.href ?? item.title + idx}
                  item={item}
                  currentPath={location.pathname}
                  onClose={closeSidebar}
                />
              ))}
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
                    {theme === 'light'
                      ? <Moon className="mr-2 h-4 w-4" />
                      : <Sun className="mr-2 h-4 w-4" />
                    }
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
                <h2 className="text-2xl font-bold">{currentTitle}</h2>
              </div>
              <div className="flex items-center gap-2">
                <NotificationDropdown />
                <Button variant="ghost" size="icon" onClick={toggleTheme} className="hidden lg:flex">
                  {theme === 'light'
                    ? <Moon className="h-5 w-5" />
                    : <Sun className="h-5 w-5" />
                  }
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
          onClick={closeSidebar}
        />
      )}
    </div>
  );
};