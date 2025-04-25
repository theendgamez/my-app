'use client';

import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';

interface User {
  userId: string;
  userName: string;
  email: string;
  role: string;
  phoneNumber?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (userData: Record<string, unknown>) => Promise<Record<string, unknown>>;
  verifyEmail: (token: string) => Promise<Record<string, unknown>>;
  isAuthenticated: boolean;
  isAdmin: boolean;
  error: string | null;
  setError: (error: string | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add a ref to track API calls and prevent excessive requests
  const isFetchingRef = useRef(false);
  const lastFetchTimeRef = useRef(0);
  const API_COOLDOWN_MS = 2000; // 2 seconds between user data refreshes

  useEffect(() => {
    // Check if user is authenticated based on userId in localStorage
    const checkAuth = async () => {
      try {
        // Skip if we're already fetching or if we fetched recently
        const now = Date.now();
        if (isFetchingRef.current || now - lastFetchTimeRef.current < API_COOLDOWN_MS) {
          return;
        }

        // Get userId from localStorage
        const userId = localStorage.getItem('userId');

        if (!userId) {
          setLoading(false);
          return;
        }

        // Mark that we're fetching data
        isFetchingRef.current = true;
        lastFetchTimeRef.current = now;

        // Fetch complete user data including role from API
        try {
          const accessToken = localStorage.getItem('accessToken');
          const response = await fetch(`/api/users/${userId}`, {
            headers: {
              'Content-Type': 'application/json',
              ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {}),
              'x-user-id': userId
            },
            credentials: 'omit'
          });

          if (response.ok) {
            const userData = await response.json();
            // Ensure userData conforms to User type
            if (userData && typeof userData === 'object' && 'userId' in userData) {
              setUser(userData as User);
            } else {
              console.error('Invalid user data structure received:', userData);
              setUser(null);
            }
          } else {
            // Handle authentication failure
            localStorage.removeItem('userId');
            localStorage.removeItem('accessToken');
          }
        } catch (err) {
          console.error('Error fetching user data:', err);
          setUser(null);
        } finally {
          // Reset fetching flag when done
          isFetchingRef.current = false;
        }
      } catch (err) {
        console.error('Auth check error:', err);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();

    // Set up interval to refresh auth state every 30 seconds
    const interval = setInterval(checkAuth, 30000);

    // Clear interval on unmount
    return () => clearInterval(interval);
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (res.ok) {
        setUser(data.user);

        // Store only userId in localStorage
        localStorage.setItem('userId', data.user.userId);

        // Store access token if provided
        if (data.accessToken) {
          localStorage.setItem('accessToken', data.accessToken);
        }
      } else {
        setError(data.error || '登入失敗');
        throw new Error(data.error || '登入失敗');
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || '登入時發生錯誤');
        throw err;
      } else {
        setError('登入時發生錯誤');
        throw new Error('登入時發生錯誤');
      }
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      setUser(null);
      localStorage.removeItem('userId');
      localStorage.removeItem('accessToken');
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData: Record<string, unknown>) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || '註冊失敗');
        throw new Error(data.error || '註冊失敗');
      }
      return data;
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || '註冊時發生錯誤');
        throw err;
      } else {
        setError('註冊時發生錯誤');
        throw new Error('註冊時發生錯誤');
      }
    } finally {
      setLoading(false);
    }
  };

  const verifyEmail = async (token: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      const data = await res.json();
      if (res.ok) {
        setUser(data.user);
        // Store only userId in localStorage
        localStorage.setItem('userId', data.user.userId);
        return data;
      } else {
        setError(data.error || '驗證失敗');
        throw new Error(data.error || '驗證失敗');
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || '驗證時發生錯誤');
        throw err;
      }
      setError('驗證時發生錯誤');
      throw new Error('驗證時發生錯誤');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        register,
        verifyEmail,
        isAuthenticated: !!user,
        isAdmin: user?.role === 'admin',
        error,
        setError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};