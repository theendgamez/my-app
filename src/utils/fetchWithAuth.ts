/**
 * Utility for making authenticated fetch requests in client components
 */

interface FetchOptions extends RequestInit {
  useToken?: boolean;
  revalidate?: number | false;
  tags?: string[];
}

/**
 * Enhanced fetch function that automatically adds auth headers
 * and supports Next.js 15 caching features
 */
export async function fetchWithAuth<T>(
  url: string, 
  options: FetchOptions = {}
): Promise<T> {
  // Extract and remove custom options
  const { 
    useToken = true, 
    revalidate,
    tags,
    ...fetchOptions 
  }: FetchOptions = options;
  
  // Default headers
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(fetchOptions.headers as Record<string, string>),
  };
  
  // Add auth headers if needed
  if (typeof window !== 'undefined' && useToken) {
    const accessToken = localStorage.getItem('accessToken');
    const userId = localStorage.getItem('userId');
    const userRole = localStorage.getItem('userRole');
    
    // Always send userId as fallback for Vercel deployment
    if (userId) {
      headers['x-user-id'] = userId;
    }
    
    // Add role header for middleware
    if (userRole) {
      headers['x-user-role'] = userRole;
    }
    
    // Add token if available
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }
    
    // Set cookies for middleware (if not already set)
    if (accessToken && userId && userRole) {
      document.cookie = `accessToken=${accessToken}; path=/; max-age=86400; SameSite=Lax`;
      document.cookie = `userId=${userId}; path=/; max-age=86400; SameSite=Lax`;
      document.cookie = `userRole=${userRole}; path=/; max-age=86400; SameSite=Lax`;
    }
  }
  
  // Build the final options with proper typing
  const finalOptions: RequestInit & { next?: { revalidate?: number | false; tags?: string[] } } = {
    ...fetchOptions,
    headers,
    credentials: 'include'
  };
  
  // Add Next.js specific options if provided
  if (revalidate !== undefined || tags) {
    finalOptions.next = {
      ...(revalidate !== undefined && { revalidate }),
      ...(tags && { tags })
    };
  }
  
  // Make the request
  const response = await fetch(url, finalOptions);
  
  // Handle response
  if (!response.ok) {
    if (response.status === 401 && typeof window !== 'undefined') {
      console.error('Authentication failed:', await response.text());
      // Refresh token or redirect to login
      const currentPath = window.location.pathname;
      window.location.href = `/login?redirect=${encodeURIComponent(currentPath)}&auth_error=true`;
      throw new Error('Authentication failed. Redirecting to login...');
    }

    // Specific handling for 404 Not Found
    if (response.status === 404) {
      throw new Error(`Error 404: Resource not found at ${url}`);
    }
    
    // Special handling for health check endpoints
    if (url.includes('/api/health')) {
      const healthError = {
        status: 'unhealthy',
        error: response.statusText,
        statusCode: response.status,
        timestamp: new Date().toISOString()
      };
      throw new Error(`Health check failed: ${JSON.stringify(healthError)}`);
    }
    
    // Try to parse error message
    let errorData: unknown = {};
    try {
      errorData = await response.json();
    } catch {
      // If parsing fails, use status text, including URL and status
      throw new Error(`Request to ${url} failed with status ${response.status}: ${response.statusText}`);
    }
    
    if (typeof errorData === 'object' && errorData !== null) {
      const message = (errorData as { message?: string; error?: string }).message
        || (errorData as { message?:string; error?: string }).error
        || `Request to ${url} failed with status ${response.status}`; // Include URL and status
      throw new Error(message);
    }
    throw new Error(`Request to ${url} failed with status ${response.status}`); // Include URL and status
  }
  
  // Return successful response data
  return await response.json() as T;
}

/**
 * Wrapper for revalidatePath to work with client components via API
 */
export async function revalidatePath(path: string): Promise<void> {
  try {
    await fetchWithAuth('/api/revalidate', {
      method: 'POST',
      body: JSON.stringify({ path }),
    });
  } catch (error) {
    console.error('Failed to revalidate path:', error);
  }
}