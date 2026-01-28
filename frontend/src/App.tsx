import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { NotificationProvider } from './context/NotificationContext';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { DashboardLayout } from './layouts/DashboardLayout';

// Auth Pages
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';

// User Pages
import { UserDashboard } from './pages/user/UserDashboard';
import { RoomsPage } from './pages/user/RoomsPage';
import { CreateRequestPage } from './pages/user/CreateRequestPage';
import { MyRequestsPage } from './pages/user/MyRequestsPage';
import { MyBookingsPage } from './pages/user/MyBookingsPage';

// GA Pages
import { GADashboard } from './pages/ga/GADashboard';
import { PendingRequestsPage } from './pages/ga/PendingRequestsPage';
import { AllBookingsPage } from './pages/ga/AllBookingsPage';
import { UsersPage as GAUsersPage } from './pages/ga/UsersPage';

// Admin Pages
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { ManageRoomsPage } from './pages/admin/ManageRoomsPage';
import { ManageUsersPage } from './pages/admin/ManageUsersPage';

// Shared Pages
import { CalendarPage } from './pages/CalendarPage';

// Create QueryClient
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ThemeProvider>
          <AuthProvider>
            <NotificationProvider>
              <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />

              {/* User Routes */}
              <Route
                path="/user/*"
                element={
                  <ProtectedRoute allowedRoles={['user']}>
                    <DashboardLayout />
                  </ProtectedRoute>
                }
              >
                <Route path="dashboard" element={<UserDashboard />} />
                <Route path="rooms" element={<RoomsPage />} />
                <Route path="requests" element={<MyRequestsPage />} />
                <Route path="requests/new" element={<CreateRequestPage />} />
                <Route path="bookings" element={<MyBookingsPage />} />
                <Route path="calendar" element={<CalendarPage />} />
                <Route path="profile" element={<div>Profile Page - Coming Soon</div>} />
              </Route>

              {/* GA Routes */}
              <Route
                path="/ga/*"
                element={
                  <ProtectedRoute allowedRoles={['GA']}>
                    <DashboardLayout />
                  </ProtectedRoute>
                }
              >
                <Route path="dashboard" element={<GADashboard />} />
                <Route path="requests" element={<PendingRequestsPage />} />
                <Route path="bookings" element={<AllBookingsPage />} />
                <Route path="users" element={<GAUsersPage />} />
                <Route path="calendar" element={<CalendarPage />} />
                <Route path="profile" element={<div>Profile Page - Coming Soon</div>} />
              </Route>

              {/* Room Admin Routes */}
              <Route
                path="/admin/*"
                element={
                  <ProtectedRoute allowedRoles={['room_admin']}>
                    <DashboardLayout />
                  </ProtectedRoute>
                }
              >
                <Route path="dashboard" element={<AdminDashboard />} />
                <Route path="rooms" element={<ManageRoomsPage />} />
                <Route path="users" element={<ManageUsersPage />} />
                <Route path="calendar" element={<CalendarPage />} />
                <Route path="profile" element={<div>Profile Page - Coming Soon</div>} />
              </Route>

              {/* Default Redirect */}
              <Route path="/" element={<Navigate to="/login" replace />} />
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>

            {/* Toast Notifications */}
            <Toaster position="top-right" richColors closeButton />
            </NotificationProvider>
          </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;