/**
 * Utility function to make authenticated API requests
 * Automatically adds authentication headers from localStorage
 */
export async function fetchWithAuth(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  // Skip during server-side rendering
  if (typeof window === 'undefined') {
    return new Response(JSON.stringify({ 
      error: 'Server-side fetch not supported',
      message: 'This function is only available in client components'
    }), {
      status: 400,
      statusText: 'Bad Request',
      headers: new Headers({ 'Content-Type': 'application/json' })
    });
  }

  // Get the userId from localStorage
  const userId = localStorage.getItem('userId');

  // Get access token from localStorage if available
  const accessToken = localStorage.getItem('accessToken');

  // Track redirects to prevent loops
  const redirectKey = `redirect_count_${url.split('?')[0]}`; // Ignore query params in the key
  let redirectCount = Number(sessionStorage.getItem(redirectKey) || '0');
  
  // If we've redirected too many times, return an error response instead
  if (redirectCount >= 3) {
    console.error(`Too many redirects detected for URL: ${url}`);
    // Reset the redirect count to allow future attempts after the user navigates away
    sessionStorage.removeItem(redirectKey);
    
    return new Response(JSON.stringify({ 
      error: 'Too many redirects',
      message: 'Request resulted in a redirect loop. Please try again later or contact support.'
    }), {
      status: 508, // Loop Detected - valid HTTP status code
      statusText: 'Redirect Loop Detected',
      headers: new Headers({ 
        'Content-Type': 'application/json',
        'X-Error-Type': 'redirect-loop'
      })
    });
  }

  // Prepare headers with authentication
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  
  // Add Authorization header if access token exists
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }
  
  // Always add user ID header as fallback authentication method
  if (userId) {
    headers.set('x-user-id', userId);
  }

  // Add timeout to the fetch operation
  const controller = new AbortController();
  const timeoutDuration = 10000; // 10 seconds
  const timeoutId = setTimeout(() => controller.abort(), timeoutDuration);

  try {
    // Increment redirect count before making the request
    redirectCount++;
    sessionStorage.setItem(redirectKey, redirectCount.toString());
    console.debug(`Starting request to ${url} (redirect count: ${redirectCount})`);
    
    // Make the authenticated request with manual redirect handling
    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'omit', // Don't include cookies for localStorage-based auth
      signal: controller.signal,
      redirect: 'manual', // Handle redirects manually to better detect loops
    });
    
    // Handle redirects manually
    if (response.status === 301 || response.status === 302 || response.status === 303 || 
        response.status === 307 || response.status === 308) {
      const location = response.headers.get('Location');
      
      if (location) {
        console.warn(`Redirect detected from ${url} to ${location} (count: ${redirectCount})`);
        
        // For same-origin redirects, follow them manually
        if (location.startsWith('/') || location.startsWith(window.location.origin)) {
          const redirectUrl = location.startsWith('/') 
            ? `${window.location.origin}${location}` 
            : location;
          
          // Use the same options for the redirected request
          return fetchWithAuth(redirectUrl, options);
        } else {
          // For cross-origin redirects, let the browser handle them
          // Reset redirect counter since we won't be handling this internally
          sessionStorage.removeItem(redirectKey);
          
          // Return the redirect response for the browser to handle
          return response;
        }
      }
    }
    
    // If we get here, it's not a redirect, so reset the counter
    sessionStorage.removeItem(redirectKey);

    // Handle auth errors automatically
    if (response.status === 401 || response.status === 403) {
      console.warn('Authentication error accessing:', url);
      
      // Clear tokens on auth error if configured to do so
      if (options.method !== 'GET') {
        // Only clear tokens for non-GET requests
        localStorage.removeItem('accessToken');
      }
    }

    return response;
  } catch (error: unknown) {
    // Reset the redirect counter on errors
    sessionStorage.removeItem(redirectKey);
    
    // Handle network errors with more specific logging
    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      console.warn('Network error fetching:', url, error.message);
      // Create a mock Response object for graceful error handling with valid status code
      return new Response(JSON.stringify({ 
        error: 'Network error', 
        message: 'Failed to connect to server. Please check your connection and try again.',
        isNetworkError: true
      }), {
        status: 503, // Service Unavailable - valid status code
        statusText: 'Network Error',
        headers: new Headers({ 
          'Content-Type': 'application/json',
          'X-Error-Type': 'network'
        })
      });
    }
    
    // Handle abort errors (timeout)
    if (error instanceof Error && error.name === 'AbortError') {
      console.warn('Request timeout for:', url);
      return new Response(JSON.stringify({ 
        error: 'Timeout error', 
        message: 'The request took too long to complete. Please try again.',
        isTimeoutError: true
      }), {
        status: 504, // Gateway Timeout - valid status code
        statusText: 'Timeout Error',
        headers: new Headers({ 
          'Content-Type': 'application/json',
          'X-Error-Type': 'timeout'
        })
      });
    }
    
    // Re-throw other errors
    console.error('Unexpected fetch error:', error);
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Utility function to handle API response
 * Throws an error if the response is not OK
 */
export async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorData: { error?: string; message?: string } = await response.json().catch(() => ({}));
    throw new Error(errorData.error || errorData.message || `Error: ${response.status}`);
  }
  return response.json();
}