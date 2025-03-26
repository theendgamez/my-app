'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

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
  const router = useRouter();

  useEffect(() => {
    // Check if user is already logged in
    const checkAuth = async () => {
      try {
        // Try to get user from cookies first (by calling the API)
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.user) {
            setUser(data.user);
          } else {
            // Try localStorage as fallback for existing sessions
            const storedUser = localStorage.getItem('user');
            if (storedUser) {
              setUser(JSON.parse(storedUser));
            }
          }
        }
      } catch (err) {
        console.error('Auth check error:', err);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Ensure cookies are stored
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (res.ok) {
        setUser(data.user);
        // Also store access token if available in the response
        if (data.accessToken) {
          localStorage.setItem('accessToken', data.accessToken);
        }
        localStorage.setItem('user', JSON.stringify(data.user));
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
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
      localStorage.removeItem('user');
      router.push('/login');
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
        localStorage.setItem('user', JSON.stringify(data.user));
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