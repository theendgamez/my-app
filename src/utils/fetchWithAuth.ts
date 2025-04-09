/**
 * Utility function to make authenticated API requests
 * Automatically adds authentication headers from localStorage and cookies
 */
export async function fetchWithAuth(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  // Get the user from localStorage if available
  const userDataStr = localStorage.getItem('user');
  const userData = userDataStr ? JSON.parse(userDataStr) : null;
  const userId = userData?.userId;

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

  // Add user ID header as fallback authentication method
  if (userId) {
    (headers as Record<string, string>)['x-user-id'] = userId;
  }

  // Make the authenticated request
  return fetch(url, {
    ...options,
    headers,
    credentials: 'include', // Always include cookies for cookie-based auth
  });
}