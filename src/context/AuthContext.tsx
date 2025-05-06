'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import authEvents from '@/utils/authEvents';

// Constants to prevent auth check loops
const AUTH_CHECK_FLAG = 'auth_check_in_progress';
const MAX_AUTH_ATTEMPTS = 3;
const REDIRECT_COOLDOWN = 'redirect_cooldown_time';
const REDIRECT_COOLDOWN_MS = 3000; // 3 seconds cooldown between redirects

interface UserType {
  userId: string;
  role: string;
  [key: string]: unknown;
}

// Define login result type
interface LoginResult {
  success: boolean;
  token?: string;
  user?: {
    id: string;
    role: string;
  };
  error?: string;
}

interface LoginCredentials {
  email: string;
  password: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  isAdmin: boolean;
  user: UserType | null;
  loading: boolean;
  login: (credentials: LoginCredentials) => Promise<LoginResult>;
  logout: () => void;
  redirectToLogin: (returnPath?: string) => void;
  refreshAuthState: () => Promise<boolean | undefined>;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  isAdmin: false,
  user: null,
  loading: true,
  login: async () => ({ success: false }),
  logout: () => {},
  redirectToLogin: () => {},
  refreshAuthState: async () => false,
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserType | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const router = useRouter();

  // Function to redirect to login with protection against loops
  const redirectToLogin = useCallback((returnPath?: string) => {
    if (typeof window === 'undefined') return;

    const lastRedirectTime = parseInt(localStorage.getItem(REDIRECT_COOLDOWN) || '0', 10);
    const now = Date.now();

    if (now - lastRedirectTime < REDIRECT_COOLDOWN_MS) {
      console.log('Redirect prevented: Too soon after previous redirect');
      return;
    }

    localStorage.setItem(REDIRECT_COOLDOWN, now.toString());

    const redirectPath = returnPath ? `/login?redirect=${encodeURIComponent(returnPath)}` : '/login';
    router.push(redirectPath);
  }, [router]);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      const userId = localStorage.getItem('userId');
      const accessToken = localStorage.getItem('accessToken');

      if (!userId || userId.includes('...') || userId.length < 4) {
        console.error('Invalid user ID found in localStorage:', userId);
        localStorage.removeItem('userId');
        localStorage.removeItem('accessToken');
        setIsAuthenticated(false);
        setIsAdmin(false);
        setUser(null);
        setLoading(false);
        return;
      }

      const cacheBuster = new Date().getTime();
      const response = await fetch(`/api/users/${userId}?_=${cacheBuster}`, {
        headers: {
          Authorization: `Bearer ${accessToken || ''}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          'x-user-id': userId,
        },
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        setIsAuthenticated(true);
        setIsAdmin(userData.role === 'admin');
      } else {
        console.error('Authentication failed:', response.status, response.statusText);
        if (response.status === 401 || response.status === 403) {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('userId');
        }
        setIsAuthenticated(false);
        setIsAdmin(false);
        setUser(null);
      }
    } catch (error) {
      console.error('Error in user authentication:', error);
      setIsAuthenticated(false);
      setIsAdmin(false);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const refreshDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const refreshAuthState = useCallback(async () => {
    if (typeof window === 'undefined') return;

    if (refreshDebounceRef.current) {
      clearTimeout(refreshDebounceRef.current);
    }

    return new Promise<boolean | undefined>((resolve) => {
      refreshDebounceRef.current = setTimeout(async () => {
        const token = localStorage.getItem('accessToken');
        if (!token) {
          setUser(null);
          setIsAuthenticated(false);
          setIsAdmin(false);
          setLoading(false);
          resolve(false);
          return;
        }

        try {
          const response = await fetch('/api/auth/me', {
            headers: {
              Authorization: `Bearer ${token}`,
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache',
            },
          });

          if (response.ok) {
            const userData = await response.json();
            setUser(userData);
            setIsAuthenticated(true);
            setIsAdmin(userData.role === 'admin');
            authEvents.emit();
            resolve(true);
          } else {
            if (response.status === 401 || response.status === 403) {
              localStorage.removeItem('accessToken');
              localStorage.removeItem('userId');
            }
            setUser(null);
            setIsAuthenticated(false);
            setIsAdmin(false);
            resolve(false);
          }
        } catch (error) {
          console.error('Error refreshing auth state:', error);
          setUser(null);
          setIsAuthenticated(false);
          setIsAdmin(false);
          resolve(false);
        } finally {
          setLoading(false);
        }
      }, 300);
    });
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkAuth = async () => {
      try {
        const lastRedirectTime = parseInt(localStorage.getItem(REDIRECT_COOLDOWN) || '0', 10);
        const now = Date.now();
        if (now - lastRedirectTime < REDIRECT_COOLDOWN_MS) {
          console.log('Auth check skipped: Too soon after redirect');
          setLoading(false);
          return;
        }

        const authCheckCount = parseInt(localStorage.getItem(AUTH_CHECK_FLAG) || '0', 10);

        if (authCheckCount > MAX_AUTH_ATTEMPTS) {
          console.error('Too many authentication check attempts, possible loop detected');
          localStorage.removeItem(AUTH_CHECK_FLAG);
          setLoading(false);
          return;
        }

        localStorage.setItem(AUTH_CHECK_FLAG, (authCheckCount + 1).toString());

        const accessToken = localStorage.getItem('accessToken');
        const userId = localStorage.getItem('userId');

        if (!accessToken || !userId) {
          setIsAuthenticated(false);
          setIsAdmin(false);
          setUser(null);
          setLoading(false);
          localStorage.removeItem(AUTH_CHECK_FLAG);
          return;
        }

        await fetchUserData();
      } catch (error) {
        console.error('Auth check error:', error);
        setIsAuthenticated(false);
        setIsAdmin(false);
        setUser(null);
      } finally {
        setLoading(false);
        localStorage.removeItem(AUTH_CHECK_FLAG);
      }
    };

    checkAuth();
  }, []);

  const login = async (credentials: LoginCredentials): Promise<LoginResult> => {
    if (typeof window === 'undefined') return { success: false, error: 'Cannot run on server' };

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || 'Login failed',
        };
      }

      const token = data.accessToken;
      const userData: UserType = {
        userId: data.user.userId,
        role: data.user.role || 'user',
      };

      localStorage.setItem('accessToken', token);
      localStorage.setItem('userId', userData.userId);

      localStorage.removeItem(REDIRECT_COOLDOWN);
      localStorage.removeItem(AUTH_CHECK_FLAG);

      setUser(userData);
      setIsAuthenticated(true);
      setIsAdmin(userData.role === 'admin');

      refreshAuthState();
      authEvents.emit();

      return {
        success: true,
        token: token,
        user: {
          id: userData.userId,
          role: userData.role,
        },
      };
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'An unknown error occurred',
      };
    }
  };

  const logout = async () => {
    if (typeof window === 'undefined') return;

    try {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('userId');

      localStorage.removeItem(AUTH_CHECK_FLAG);
      localStorage.removeItem(REDIRECT_COOLDOWN);

      setUser(null);
      setIsAuthenticated(false);
      setIsAdmin(false);

      authEvents.emit();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isAdmin,
        user,
        loading,
        login,
        logout,
        redirectToLogin,
        refreshAuthState,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);