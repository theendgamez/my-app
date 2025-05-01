// No import for Router, as it does not exist in 'next/navigation'

/**
 * Safe redirect function that prevents redirect loops
 */
export function safeRedirect(
  router: { push: (path: string) => void }, 
  destination: string, 
  options: { 
    isAuthenticated?: boolean, 
    protectedRoute?: boolean,
    loginPath?: string 
  } = {}
) {
  // Skip if we're not in the browser
  if (typeof window === 'undefined') return false;
  
  const {
    isAuthenticated = false,
    protectedRoute = false,
    loginPath = '/login'
  } = options;
  
  // If this is a protected route and user is not authenticated
  if (protectedRoute && !isAuthenticated) {
    // Check for redirect loop
    const redirectAttemptCount = parseInt(localStorage.getItem('redirect_attempt_count') || '0');
    const lastRedirectTime = parseInt(localStorage.getItem('last_redirect_time') || '0');
    const now = Date.now();
    
    // If we've redirected too many times or too recently, break the loop
    if (redirectAttemptCount > 5 || (now - lastRedirectTime < 2000 && redirectAttemptCount > 1)) {
      console.warn('Redirect loop detected. Breaking out of loop.');
      localStorage.removeItem('redirect_attempt_count');
      localStorage.removeItem('last_redirect_time');
      router.push('/');
      return true;
    }
    
    // Update redirect tracking
    localStorage.setItem('redirect_attempt_count', (redirectAttemptCount + 1).toString());
    localStorage.setItem('last_redirect_time', now.toString());
    
    // Redirect to login with return URL
    const encodedRedirect = encodeURIComponent(destination);
    router.push(`${loginPath}?redirect=${encodedRedirect}`);
    return true;
  }
  
  // Standard redirect
  router.push(destination);
  return true;
}
