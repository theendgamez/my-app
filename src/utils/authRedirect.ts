/**
 * Helper utility to handle admin page authentication and redirects
 * This helps prevent redirect loops between admin pages and login
 */

// Store attempted paths to avoid repeated redirects
export const REDIRECT_ATTEMPTED = 'auth_redirect_attempted';
export const REDIRECT_COOLDOWN = 'redirect_cooldown_time';
export const REDIRECT_COOLDOWN_MS = 3000;

/**
 * Check if the current page requires admin access and handle redirects
 */
export const handleAdminAccess = ({
  isAuthenticated,
  isAdmin,
  loading,
  router,
  currentPath,
}: {
  isAuthenticated: boolean;
  isAdmin: boolean;
  loading: boolean;
  router: { push: (path: string) => void };
  currentPath: string;
}) => {
  // Skip if still loading auth state
  if (loading) return;
  
  // Safety check for server-side execution
  if (typeof window === 'undefined') return;

  // Anti-loop mechanism: Check if we've redirected recently
  const lastRedirectTime = parseInt(localStorage.getItem(REDIRECT_COOLDOWN) || '0', 10);
  const now = Date.now();
  if (now - lastRedirectTime < REDIRECT_COOLDOWN_MS) {
    console.log('Redirect prevented: Too soon after previous redirect');
    return;
  }

  // Get the attempted paths from localStorage
  const attemptedPaths = JSON.parse(localStorage.getItem(REDIRECT_ATTEMPTED) || '[]');
  const hasAttemptedPath = attemptedPaths.includes(currentPath);

  // If authenticated but not admin, redirect to home
  if (isAuthenticated && !isAdmin && !hasAttemptedPath) {
    // Record this redirect attempt
    localStorage.setItem(
      REDIRECT_ATTEMPTED, 
      JSON.stringify([...attemptedPaths, currentPath])
    );
    localStorage.setItem(REDIRECT_COOLDOWN, now.toString());
    router.push('/');
    return;
  }

  // If not authenticated, redirect to login with proper return URL
  if (!isAuthenticated && !hasAttemptedPath) {
    // Record this redirect attempt
    localStorage.setItem(
      REDIRECT_ATTEMPTED, 
      JSON.stringify([...attemptedPaths, currentPath])
    );
    localStorage.setItem(REDIRECT_COOLDOWN, now.toString());
    
    // Include the source parameter to help post-login navigation
    const redirectPath = `/login?redirect=${encodeURIComponent(currentPath)}&source=admin`;
    router.push(redirectPath);
    return;
  }

  // If we've made it to the page successfully, clear the attempted paths
  if ((isAuthenticated && isAdmin) || loading === false) {
    localStorage.removeItem(REDIRECT_ATTEMPTED);
  }
};

/**
 * Unified redirect function that prevents loops
 */
export function safeRedirect(
  router: { push: (path: string) => void }, 
  destination: string, 
  options: { 
    isAuthenticated?: boolean, 
    isAdmin?: boolean,
    protectedRoute?: boolean,
    adminRoute?: boolean,
    loginPath?: string 
  } = {}
) {
  // Skip if we're not in the browser
  if (typeof window === 'undefined') return false;
  
  const {
    isAuthenticated = false,
    isAdmin = false,
    protectedRoute = false,
    adminRoute = false,
    loginPath = '/login'
  } = options;
  
  // If this is an admin route and user is not an admin
  if (adminRoute && !isAdmin) {
    // Check if user is authenticated but not admin
    if (isAuthenticated) {
      router.push('/');
      return true;
    }
    
    // User is not authenticated, redirect to login
    const encodedRedirect = encodeURIComponent(destination);
    router.push(`${loginPath}?redirect=${encodedRedirect}&source=admin`);
    return true;
  }
  
  // If this is a protected route and user is not authenticated
  if (protectedRoute && !isAuthenticated) {
    // Check for redirect cooldown
    const lastRedirectTime = parseInt(localStorage.getItem(REDIRECT_COOLDOWN) || '0', 10);
    const now = Date.now();
    
    if (now - lastRedirectTime < REDIRECT_COOLDOWN_MS) {
      console.log('Redirect prevented: Too soon after previous redirect');
      return false;
    }
    
    // Update redirect tracking
    localStorage.setItem(REDIRECT_COOLDOWN, now.toString());
    
    // Redirect to login with return URL
    const encodedRedirect = encodeURIComponent(destination);
    router.push(`${loginPath}?redirect=${encodedRedirect}`);
    return true;
  }
  
  // Standard redirect
  router.push(destination);
  return true;
}
