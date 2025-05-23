/**
 * Utility functions for admin API calls
 */

type AdminFetchOptions = RequestInit & {
  fallbackToUserId?: boolean;
};

/**
 * Enhanced fetch function for admin endpoints with error handling
 * @param apiUrl API endpoint to call
 * @param options Fetch options
 * @returns Response data or error object
 */
export async function adminFetch<T>(
  apiUrl: string,
  options: AdminFetchOptions = {}
): Promise<T> {
  const { fallbackToUserId = true, ...fetchOptions } = options;
  
  // Default headers
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(fetchOptions.headers as Record<string, string> || {})
  };
  
  // Add auth headers
  if (typeof window !== 'undefined') {
    const accessToken = localStorage.getItem('accessToken');
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    } 
    
    if (fallbackToUserId) {
      const userId = localStorage.getItem('userId');
      if (userId) {
        headers['x-user-id'] = userId;
      }
    }
  }
  
  try {
    console.log(`Fetching ${apiUrl}...`);
    const response = await fetch(apiUrl, {
      ...fetchOptions,
      headers,
      credentials: 'include'
    });
    
    // Handle not found responses more gracefully
    if (response.status === 404) {
      console.error(`API endpoint not found: ${apiUrl}`);
      const message = `API endpoint ${apiUrl} not found. Check that the API route exists.`;
      console.info('Tip: For admin routes, try using direct API paths like "/api/events" instead of "/api/admin/events"');
      return { 
        error: message, 
        status: 404,
        endpoint: apiUrl
      } as unknown as T;
    }
    
    // Handle other error responses
    if (!response.ok) {
      const errorData = await response.text();
      let parsedError;
      
      try {
        parsedError = JSON.parse(errorData);
      } catch {
        parsedError = { error: errorData || response.statusText };
      }
      
      return {
        ...parsedError,
        status: response.status
      } as unknown as T;
    }
    
    // Return successful response
    const text = await response.text();
    try {
      return text ? JSON.parse(text) : {} as T;
    } catch (e) {
      console.error('Error parsing JSON response:', e);
      console.log('Raw response:', text.substring(0, 200) + '...');
      return { 
        error: 'Invalid JSON response', 
        rawResponse: text.substring(0, 100) + '...' 
      } as unknown as T;
    }
  } catch (error) {
    console.error('API call error:', error);
    return { 
      error: error instanceof Error ? error.message : 'Unknown error',
      status: 0
    } as unknown as T;
  }
}

/**
 * Check if user has specific permissions
 * This handles the case when the permissions endpoint doesn't exist yet
 * @param permission Permission to check
 * @returns Boolean indicating if user has permission
 */
export async function checkPermission(permission: string): Promise<boolean> {
  try {
    // Attempt to fetch permissions, but handle gracefully if endpoint doesn't exist
    const response = await adminFetch<{permissions?: string[], status?: number, error?: string}>('/api/permissions');
    
    // If endpoint doesn't exist, fallback to admin check
    if (response.status === 404) {
      console.info('Permissions API not implemented yet, falling back to admin role check');
      // Fall back to role-based check
      const userResponse = await fetch('/api/users/me', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken') || ''}`,
          'x-user-id': localStorage.getItem('userId') || ''
        }
      });
      
      if (userResponse.ok) {
        const userData = await userResponse.json();
        // If user is admin, grant all permissions
        return userData.role === 'admin';
      }
      return false;
    }
    
    // If permissions endpoint exists but had other errors
    if ('error' in response) {
      return false;
    }
    
    // Check if user has the specific permission
    return Array.isArray(response.permissions) && response.permissions.includes(permission);
  } catch (error) {
    console.error('Permission check failed:', error);
    return false;
  }
}
