'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import authEvents from '@/utils/authEvents';
import { REDIRECT_COOLDOWN} from '@/utils/authRedirect';

// Constants to prevent auth check loops
const AUTH_CHECK_FLAG = 'auth_check_in_progress';
const MAX_AUTH_ATTEMPTS = 3;

// Add a new constant for permissions check cooldown
const PERMISSIONS_CHECK_FLAG = 'permissions_check_in_progress';
const MAX_PERMISSIONS_ATTEMPTS = 3;

// NEW: Add timestamps for API calls to enforce minimum spacing
const LAST_AUTH_CHECK_TIME = 'last_auth_check_time';
const LAST_PERMISSIONS_CHECK_TIME = 'last_permissions_check_time';
const MIN_TIME_BETWEEN_CALLS_MS = 5000; // 5 seconds

// NEW: Anti-loop flags
const isAuthCheckRunning = { current: false };
const isPermissionsCheckRunning = { current: false };

interface UserType {
  userId: string;
  role: string;
  userName?: string;
  email?: string;
  phoneNumber?: string;
  realName?: string;
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
  permissions: string[];
  permissionsLoaded: boolean;
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
  permissions: [],
  permissionsLoaded: false,
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
  const [userPermissions, setUserPermissions] = useState<string[]>([]);
  const [permissionsLoaded, setPermissionsLoaded] = useState(false);
  const router = useRouter();
  
  // NEW: Add a ref to track if we should check permissions after auth
  const shouldCheckPermissionsRef = useRef(false);
  // NEW: Track initialization status
  const initialized = useRef(false);

  // Define logout first using useCallback
  const logout = useCallback(async () => {
    if (typeof window === 'undefined') return;

    try {
      // Call logout API
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });

      // Clear local storage
      localStorage.removeItem('accessToken');
      localStorage.removeItem('userId');
      localStorage.removeItem('userRole');
      localStorage.removeItem(AUTH_CHECK_FLAG);
      localStorage.removeItem(REDIRECT_COOLDOWN);
      localStorage.removeItem(PERMISSIONS_CHECK_FLAG);

      setUser(null);
      setIsAuthenticated(false);
      setIsAdmin(false);
      setUserPermissions([]);
      setPermissionsLoaded(false);

      authEvents.emit();
    } catch (error) {
      console.error('Logout error:', error);
    }
  }, []);

  // Memoize fetchUserData with anti-loop protection
  const fetchUserData = useCallback(async () => {
    // NEW: Check if an auth check is already in progress
    if (isAuthCheckRunning.current) {
      console.log('Auth check already in progress, skipping duplicate call');
      return false;
    }

    // NEW: Check if we've made a request too recently
    const lastAuthCheckTime = parseInt(localStorage.getItem(LAST_AUTH_CHECK_TIME) || '0', 10);
    const now = Date.now();
    if (now - lastAuthCheckTime < MIN_TIME_BETWEEN_CALLS_MS) {
      console.log('Auth check skipped: Too soon after previous check');
      return false;
    }

    try {
      isAuthCheckRunning.current = true;
      localStorage.setItem(LAST_AUTH_CHECK_TIME, now.toString());
      setLoading(true);
      const token = localStorage.getItem('accessToken');
      const userId = localStorage.getItem('userId');
      const storedRole = localStorage.getItem('userRole');

      if (!token || !userId) {
        setIsAuthenticated(false);
        setIsAdmin(false);
        setUser(null);
        return false;
      }

      // Set cookies for middleware access
      if (token && userId) {
        document.cookie = `accessToken=${token}; path=/; max-age=86400; SameSite=Lax`;
        document.cookie = `userId=${userId}; path=/; max-age=86400; SameSite=Lax`;
        if (storedRole) {
          document.cookie = `userRole=${storedRole}; path=/; max-age=86400; SameSite=Lax`;
        }
      }

      // Add loop prevention logic
      const authCheckCount = parseInt(localStorage.getItem(AUTH_CHECK_FLAG) || '0', 10);
      if (authCheckCount > MAX_AUTH_ATTEMPTS) {
        console.error('Too many authentication check attempts, possible loop detected');
        localStorage.removeItem(AUTH_CHECK_FLAG);
        setLoading(false);
        return false;
      }

      localStorage.setItem(AUTH_CHECK_FLAG, (authCheckCount + 1).toString());

      // Check token validity
      const checkResponse = await fetch('/api/auth/check', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-user-id': userId,
        },
      });

      if (checkResponse.ok) {
        const userData = await checkResponse.json();

        // Update user state with complete data
        setUser({
          userId,
          userName: userData.userName,
          email: userData.email,
          phoneNumber: userData.phoneNumber,
          realName: userData.realName,
          role: userData.role || 'user',
        });

        // Update authentication state
        setIsAuthenticated(true);
        setIsAdmin(userData.role === 'admin');

        // Update local storage and cookies if role changed
        if (storedRole !== userData.role) {
          localStorage.setItem('userRole', userData.role);
          document.cookie = `userRole=${userData.role}; path=/; max-age=86400; SameSite=Lax`;
        }

        // NEW: Mark that we should check permissions but don't do it immediately
        if (!permissionsLoaded) {
          shouldCheckPermissionsRef.current = true;
        }

        localStorage.removeItem(AUTH_CHECK_FLAG);
        return true;
      } else {
        // Clear cookies on auth failure
        document.cookie = 'accessToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        document.cookie = 'userId=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        document.cookie = 'userRole=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        
        // Token invalid, clear auth state
        console.log('Auth token invalid, clearing state');
        await logout();
        localStorage.removeItem(AUTH_CHECK_FLAG);
        return false;
      }
    } catch (error) {
      console.error('Authentication check error:', error);
      setIsAuthenticated(false);
      setIsAdmin(false);
      setUser(null);
      localStorage.removeItem(AUTH_CHECK_FLAG);
      return false;
    } finally {
      setLoading(false);
      isAuthCheckRunning.current = false;
    }
  }, [setLoading, setIsAuthenticated, setIsAdmin, setUser, logout, permissionsLoaded]);

  // Add a fetchPermissions function with anti-loop protection
  const fetchPermissions = useCallback(async () => {
    // NEW: Check if a permissions check is already in progress
    if (isPermissionsCheckRunning.current) {
      console.log('Permissions check already in progress, skipping duplicate call');
      return false;
    }

    // NEW: Check if we've made a request too recently
    const lastPermissionsCheckTime = parseInt(localStorage.getItem(LAST_PERMISSIONS_CHECK_TIME) || '0', 10);
    const now = Date.now();
    if (now - lastPermissionsCheckTime < MIN_TIME_BETWEEN_CALLS_MS) {
      console.log('Permissions check skipped: Too soon after previous check');
      return false;
    }

    try {
      isPermissionsCheckRunning.current = true;
      localStorage.setItem(LAST_PERMISSIONS_CHECK_TIME, now.toString());
      
      // Prevent excessive permission checks
      const permissionsCheckCount = parseInt(localStorage.getItem(PERMISSIONS_CHECK_FLAG) || '0', 10);
      if (permissionsCheckCount > MAX_PERMISSIONS_ATTEMPTS) {
        console.error('Too many permission check attempts, possible loop detected');
        localStorage.removeItem(PERMISSIONS_CHECK_FLAG);
        return false;
      }

      localStorage.setItem(PERMISSIONS_CHECK_FLAG, (permissionsCheckCount + 1).toString());

      // Don't attempt to fetch permissions if not authenticated
      if (!isAuthenticated) {
        localStorage.removeItem(PERMISSIONS_CHECK_FLAG);
        return false;
      }

      const response = await fetch('/api/permissions', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken') || ''}`,
          'x-user-id': localStorage.getItem('userId') || '',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUserPermissions(data.permissions || []);
        setPermissionsLoaded(true);
        localStorage.removeItem(PERMISSIONS_CHECK_FLAG);
        return true;
      }

      localStorage.removeItem(PERMISSIONS_CHECK_FLAG);
      return false;
    } catch (error) {
      console.error('Permission check error:', error);
      localStorage.removeItem(PERMISSIONS_CHECK_FLAG);
      return false;
    } finally {
      isPermissionsCheckRunning.current = false;
      // Reset flag to prevent immediate re-fetch
      shouldCheckPermissionsRef.current = false;
    }
  }, [isAuthenticated]);

  // Modified refreshAuthState function to prevent loops
  const refreshAuthState = useCallback(async () => {
    // Don't refresh if we've done so recently
    const lastAuthTime = parseInt(localStorage.getItem(LAST_AUTH_CHECK_TIME) || '0', 10);
    const now = Date.now();
    
    if (now - lastAuthTime < MIN_TIME_BETWEEN_CALLS_MS) {
      console.log('Auth refresh skipped: Too frequent');
      return;
    }
    
    const authSuccess = await fetchUserData();
    return authSuccess;
  }, [fetchUserData]);

  // Scheduled permissions check that runs after auth completes
  useEffect(() => {
    // Only run if permissions should be checked and auth is complete
    if (shouldCheckPermissionsRef.current && isAuthenticated && !isPermissionsCheckRunning.current) {
      const timer = setTimeout(() => {
        fetchPermissions();
      }, 1000); // Delay by 1 second to break potential loops
      
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, fetchPermissions]);

  // One-time initialization effect
  useEffect(() => {
    // Skip if already initialized or running on server
    if (initialized.current || typeof window === 'undefined') return;
    
    initialized.current = true;
    
    const initialize = async () => {
      try {
        // Check if we have authenticated in localStorage
        const hasToken = !!localStorage.getItem('accessToken');
        const hasUserId = !!localStorage.getItem('userId');
        
        if (hasToken && hasUserId) {
          await fetchUserData();
          
          // Delay permissions fetch to avoid potential loop
          setTimeout(() => {
            if (isAuthenticated && !permissionsLoaded) {
              fetchPermissions();
            }
          }, 1500);
        } else {
          setLoading(false);
        }
      } catch (error) {
        console.error('Initialization error:', error);
        setLoading(false);
      }
    };
    
    initialize();
  }, [fetchUserData, fetchPermissions, isAuthenticated, permissionsLoaded]);

  const login = useCallback(async (credentials: LoginCredentials): Promise<LoginResult> => {
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
      if (userData.role) { // Ensure userRole is stored on login
        localStorage.setItem('userRole', userData.role);
      }

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
  }, [refreshAuthState, setUser, setIsAuthenticated, setIsAdmin]);

  const redirectToLogin = useCallback((returnPath?: string) => {
    if (typeof window === 'undefined') return;
    if (returnPath) {
      localStorage.setItem('postLoginRedirect', returnPath);
    }
    localStorage.setItem(REDIRECT_COOLDOWN, Date.now().toString());
    router.push('/login');
  }, [router]);

  const contextValue = useMemo(() => ({
    isAuthenticated,
    isAdmin,
    user,
    loading,
    permissions: userPermissions,
    permissionsLoaded,
    login,
    logout,
    redirectToLogin,
    refreshAuthState,
  }), [
    isAuthenticated,
    isAdmin,
    user,
    loading,
    userPermissions,
    permissionsLoaded,
    login,
    logout,
    redirectToLogin,
    refreshAuthState,
  ]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);