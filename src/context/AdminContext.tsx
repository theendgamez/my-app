'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { adminFetch } from '@/utils/adminApi';

// Define proper types for API responses
interface AdminPermissionsResponse {
  permissions: string[];
  role?: string;
}

interface AdminContextValue {
  adminReady: boolean;
  adminLoading: boolean;
  permissions: string[];
  hasPermission: (permission: string) => boolean;
  refreshAdminData: () => Promise<void>;
}

const AdminContext = createContext<AdminContextValue>({
  adminReady: false,
  adminLoading: true,
  permissions: [],
  hasPermission: () => false,
  refreshAdminData: async () => {},
});

export function AdminProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, isAdmin, loading } = useAuth();
  const [adminReady, setAdminReady] = useState(false);
  const [adminLoading, setAdminLoading] = useState(true);
  const [permissions, setPermissions] = useState<string[]>([]);

  const loadAdminData = useCallback(async () => {
    if (!isAuthenticated || !isAdmin || loading) {
      setAdminLoading(false);
      return;
    }

    try {
      setAdminLoading(true);
      
      // Try the direct API path first (without /admin prefix)
      try {
        // Fetch admin permissions/data from API
        const adminData = await adminFetch<AdminPermissionsResponse>('/api/permissions');

        const permissionsList =
          typeof adminData === 'object' &&
          adminData !== null &&
          'permissions' in adminData &&
          Array.isArray(adminData.permissions)
            ? adminData.permissions
            : [];
        
        setPermissions(permissionsList);
        setAdminReady(true);
      } catch (firstError) {
        // If the first attempt fails, try with the /admin prefix
        try {
          const adminData = await adminFetch<AdminPermissionsResponse>('/api/admin/permissions');
          const permissionsList =
            typeof adminData === 'object' &&
            adminData !== null &&
            'permissions' in adminData &&
            Array.isArray(adminData.permissions)
              ? adminData.permissions
              : [];

          setPermissions(permissionsList);
          setAdminReady(true);
        } catch (secondError) {
          // If both attempts fail, log and use default permissions
          console.warn('Could not load admin permissions - using defaults', { firstError, secondError });
          
          // Set some reasonable default permissions for admin users
          setPermissions(['admin:events', 'admin:users', 'admin:settings']);
          setAdminReady(true); // Still mark as ready so the UI can function
        }
      }
    } catch (error) {
      console.error('Error loading admin data:', error);
      setPermissions([]); // Clear permissions on error
    } finally {
      setAdminLoading(false);
    }
  }, [isAuthenticated, isAdmin, loading]);

  useEffect(() => {
    if (isAuthenticated && isAdmin && !loading) {
      loadAdminData();
    }
  }, [isAuthenticated, isAdmin, loading, loadAdminData]);

  const hasPermission = (permission: string): boolean => {
    return permissions.includes(permission) || permissions.includes('admin:all');
  };

  return (
    <AdminContext.Provider
      value={{
        adminReady,
        adminLoading,
        permissions,
        hasPermission,
        refreshAdminData: loadAdminData,
      }}
    >
      {children}
    </AdminContext.Provider>
  );
}

export const useAdmin = () => useContext(AdminContext);
