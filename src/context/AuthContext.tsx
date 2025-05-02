'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useRouter } from 'next/navigation';

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

interface AuthContextType {
  isAuthenticated: boolean;
  isAdmin: boolean;
  user: UserType | null;
  loading: boolean;
  login: (token: string, userData: UserType) => void;
  logout: () => void;
  redirectToLogin: (returnPath?: string) => void;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  isAdmin: false,
  user: null,
  loading: true,
  login: () => {},
  logout: () => {},
  redirectToLogin: () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserType | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const router = useRouter();

  // Function to redirect to login with protection against loops
  const redirectToLogin = useCallback((returnPath?: string) => {
    // Skip if not in browser environment
    if (typeof window === 'undefined') return;
    
    // Check if we've redirected recently
    const lastRedirectTime = parseInt(localStorage.getItem(REDIRECT_COOLDOWN) || '0', 10);
    const now = Date.now();
    
    if (now - lastRedirectTime < REDIRECT_COOLDOWN_MS) {
      console.log('Redirect prevented: Too soon after previous redirect');
      return;
    }
    
    // Store the timestamp of this redirect
    localStorage.setItem(REDIRECT_COOLDOWN, now.toString());
    
    // Build the redirect URL
    const redirectPath = returnPath ? `/login?redirect=${encodeURIComponent(returnPath)}` : '/login';
    router.push(redirectPath);
  }, [router]);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      const userId = localStorage.getItem('userId');
      const accessToken = localStorage.getItem('accessToken');
      
      // Add validation for the user ID
      if (!userId || userId.includes('...') || userId.length < 4) {
        console.error('Invalid user ID found in localStorage:', userId);
        // Clear invalid data and set unauthenticated state
        localStorage.removeItem('userId');
        localStorage.removeItem('accessToken');
        setIsAuthenticated(false);
        setIsAdmin(false);
        setUser(null);
        setLoading(false);
        return;
      }

      // Get user data from API with cache busting
      const cacheBuster = new Date().getTime();
      const response = await fetch(`/api/users/${userId}?_=${cacheBuster}`, {
        headers: {
          Authorization: `Bearer ${accessToken || ''}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          'x-user-id': userId // Add user ID as fallback auth mechanism
        },
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        setIsAuthenticated(true);
        setIsAdmin(userData.role === 'admin');
      } else {
        // Handle expired tokens or authentication failures
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

  // Check authentication status
  useEffect(() => {
    // Skip effect during server-side rendering
    if (typeof window === 'undefined') return;
    
    const checkAuth = async () => {
      try {
        // Skip the check if we just redirected to prevent loops
        const lastRedirectTime = parseInt(localStorage.getItem(REDIRECT_COOLDOWN) || '0', 10);
        const now = Date.now();
        if (now - lastRedirectTime < REDIRECT_COOLDOWN_MS) {
          console.log('Auth check skipped: Too soon after redirect');
          setLoading(false);
          return;
        }
        
        // Check if we're already in an auth check to prevent loops
        const authCheckCount = parseInt(localStorage.getItem(AUTH_CHECK_FLAG) || '0', 10);
        
        if (authCheckCount > MAX_AUTH_ATTEMPTS) {
          console.error('Too many authentication check attempts, possible loop detected');
          localStorage.removeItem(AUTH_CHECK_FLAG);
          setLoading(false);
          return;
        }
        
        // Increment the auth check counter
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

  const login = (token: string, userData: UserType) => {
    if (typeof window === 'undefined') return;
    
    localStorage.setItem('accessToken', token);
    localStorage.setItem('userId', userData.userId);
    
    // Reset any redirect timestamps to allow navigation after login
    localStorage.removeItem(REDIRECT_COOLDOWN);
    localStorage.removeItem(AUTH_CHECK_FLAG);
    
    setUser(userData);
    setIsAuthenticated(true);
    setIsAdmin(userData.role === 'admin');
  };

  const logout = async () => {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('userId');
      
      // Reset any auth flags
      localStorage.removeItem(AUTH_CHECK_FLAG);
      localStorage.removeItem(REDIRECT_COOLDOWN);
      
      setUser(null);
      setIsAuthenticated(false);
      setIsAdmin(false);
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
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);