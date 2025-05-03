/**
 * Utility for making authenticated fetch requests in client components
 */

type FetchOptions = RequestInit & {
  useToken?: boolean;
  revalidate?: number | false;
  tags?: string[];
};

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
    
    // Always send userId as fallback for Vercel deployment
    if (userId) {
      headers['x-user-id'] = userId;
    }
    
    // Add token if available
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }
  }
  
  // Next.js 15 cache options
  const nextFetchOptions: RequestInit & { next?: { revalidate?: number | false, tags?: string[] } } = {
    ...fetchOptions,
    headers,
  };
  
  // Add Next.js 15 cache control options if provided
  if (revalidate !== undefined || tags) {
    nextFetchOptions.next = {
      ...(revalidate !== undefined ? { revalidate } : {}),
      ...(tags ? { tags } : {}),
    };
  }
  
  // Make the request
  const response = await fetch(url, nextFetchOptions);
  
  // Handle response
  if (!response.ok) {
    if (response.status === 401 && typeof window !== 'undefined') {
      console.error('Authentication failed:', await response.text());
      // Refresh token or redirect to login
      const currentPath = window.location.pathname;
      window.location.href = `/login?redirect=${encodeURIComponent(currentPath)}&auth_error=true`;
      throw new Error('Authentication failed. Redirecting to login...');
    }
    
    // Try to parse error message
    let errorData: unknown = {};
    try {
      errorData = await response.json();
    } catch {
      // If parsing fails, use status text
      throw new Error(response.statusText);
    }
    
    if (typeof errorData === 'object' && errorData !== null) {
      const message = (errorData as { message?: string; error?: string }).message
        || (errorData as { message?: string; error?: string }).error
        || 'Request failed';
      throw new Error(message);
    }
    throw new Error('Request failed');
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