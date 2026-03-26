import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { User, LoginRequest, RegisterRequest, AuthResponse } from '@/types';
import { authService, type LoginOTPPendingResponse, type RegisterPendingResponse } from '@/services/auth.service';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<User | null>; // ← now returns User so callers can navigate
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  // Initialize - check if user is already logged in
  useEffect(() => {
    const initAuth = async () => {
      const storedUser = authService.getStoredUser();
      const isAuth = authService.isAuthenticated();

      if (isAuth && storedUser) {
        try {
          // Verify token is still valid by fetching current user
          const currentUser = await authService.getCurrentUser();
          setUser(currentUser);
        } catch {
          // Token invalid, clear everything
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('user');
          setUser(null);
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (data: LoginRequest) => {
    try {
      const response = await authService.login(data);
      
      // Check if OTP is required
      if ('otp_required' in response.data) {
        const otpData = response.data as LoginOTPPendingResponse;
        navigate('/login-otp', { 
          state: { 
            userId: otpData.user_id,
            email: otpData.email,
            rememberMe: otpData.remember_me
          } 
        });
        return;
      }

      // Classic flow
      const authResponse = response as AuthResponse;
      setUser(authResponse.data.user);
      
      toast.success('Login successful!');
      
      // Redirect based on role
      switch (authResponse.data.user.role) {
        case 'user':
          navigate('/user/dashboard');
          break;
        case 'GA':
          navigate('/ga/dashboard');
          break;
        case 'room_admin':
          navigate('/admin/dashboard');
          break;
        default:
          navigate('/');
      }
    } catch (error: any) {
      toast.error(error.message || 'Login failed');
      throw error;
    }
  };

  const register = async (data: RegisterRequest) => {
    try {
      const response = await authService.register(data);
      
      // Check if email verification is required
      if ('verification_required' in response.data) {
        const pendingData = response.data as RegisterPendingResponse;
        toast.success('Registration successful! Please verify your email.');
        navigate('/verify-email', { 
          state: { 
            userId: pendingData.user_id,
            email: pendingData.email 
          } 
        });
        return;
      }

      toast.success('Registration successful! Please login.');
      navigate('/login');
    } catch (error: any) {
      toast.error(error.message || 'Registration failed');
      throw error;
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch {
      // Still clear user even if API call fails
    }
    setUser(null);
    toast.success('Logged out successfully');
    navigate('/login');
  };

  /**
   * Fetches the latest user from the API, updates state, and returns the user
   * so the caller can immediately navigate based on role without waiting for a
   * re-render cycle.
   */
  const refreshUser = async (): Promise<User | null> => {
    try {
      const currentUser = await authService.getCurrentUser();
      setUser(currentUser);
      return currentUser;
    } catch (error) {
      console.error('Failed to refresh user:', error);
      return null;
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Hook harus di export setelah component
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}