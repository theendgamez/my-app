/**
 * Utility function to make authenticated API requests
 * Automatically adds authentication headers from localStorage
 */
export async function fetchWithAuth(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  // Get the userId from localStorage
  const userId = localStorage.getItem('userId');

  // Get access token from localStorage if available
  const accessToken = localStorage.getItem('accessToken');

  // Prepare headers with authentication
  const headers: HeadersInit = {
    ...options.headers,
    'Content-Type': 'application/json',
  };

  // Add Authorization header if access token exists
  if (accessToken) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${accessToken}`;
  }

  // Always add user ID header as fallback authentication method
  if (userId) {
    (headers as Record<string, string>)['x-user-id'] = userId;
  }

  // Make the authenticated request
  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'omit', // Don't include cookies for localStorage-based auth
  });

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
}