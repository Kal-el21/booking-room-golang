
import { NavLink } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import {
  LayoutDashboard,
  Calendar,
  DoorOpen,
  FileText,
  BookmarkCheck,
  Users,
} from 'lucide-react';
import { cn } from '../../lib/utils';

const menuItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['user', 'room_admin', 'GA'] },
  { path: '/calendar', label: 'Calendar', icon: Calendar, roles: ['user', 'room_admin', 'GA'] },
  { path: '/rooms', label: 'Rooms', icon: DoorOpen, roles: ['user', 'room_admin', 'GA'] },
  { path: '/requests', label: 'Requests', icon: FileText, roles: ['user', 'room_admin', 'GA'] },
  { path: '/bookings', label: 'Bookings', icon: BookmarkCheck, roles: ['user', 'room_admin', 'GA'] },
  { path: '/users', label: 'Users', icon: Users, roles: ['room_admin', 'GA'] },
];

export default function Sidebar() {
  const { user } = useAuthStore();

  const filteredMenuItems = menuItems.filter(item => 
    item.roles.includes(user?.role || 'user')
  );

  return (
    <aside className="fixed left-0 top-16 w-64 h-[calc(100vh-4rem)] bg-white border-r border-gray-200 hidden lg:block">
      <div className="h-full px-3 py-4 overflow-y-auto">
        <ul className="space-y-2">
          {filteredMenuItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  cn(
                    'flex items-center p-2 rounded-lg hover:bg-gray-100 transition-colors',
                    isActive ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                  )
                }
              >
                <item.icon className="w-5 h-5 mr-3" />
                <span>{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
