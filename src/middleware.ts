import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { rateLimitConfigs, securityHeaders } from '@/lib/security';

// Define admin and protected routes patterns
const adminRoutePattern = /^\/admin(?:\/|$)/;
const apiProtectedPattern = /^\/api\/(?!auth\/login|auth\/register|auth\/verify-email|events$)/;
const pathTraversalPattern = /\.\.\//;

// Helper to check if a path is a protected route
const isProtectedRoute = (path: string, type: 'admin' | 'api'): boolean => {
  if (type === 'admin') return adminRoutePattern.test(path);
  return apiProtectedPattern.test(path);
};

// Check for suspicious patterns in URL
const containsSuspiciousPatterns = (path: string): boolean => {
  const suspiciousPatterns = [
    /\.\.\//, // Path traversal
    /;/,      // Command injection
    /`/,      // Command injection
    /\|/,     // Pipe
    />/,      // Redirect
    /</       // Potential XSS
  ];
  
  return suspiciousPatterns.some(pattern => pattern.test(path));
};

// Check for URL bypass attempts
const containsBypassAttempts = (path: string): boolean => {
  return path.includes('%2e%2e%2f')  // ../ URL encoded
    || path.includes('%252e%252e%252f')  // ../ double URL encoded
    || /\/\.+\//.test(path);  // Path manipulation
};

// Basic security checks middleware
export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const rawPathname = request.url;
  
  // Clone the response at the start to prepare for modifications
  const response = NextResponse.next();
  
  // Add security headers to all responses
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  
  // Get client IP for rate limiting
  const clientIP = request.headers.get('x-forwarded-for') || 
                   request.headers.get('x-real-ip') || 
                   'unknown';
  
  // Apply rate limiting to API routes
  if (pathname.startsWith('/api/')) {
    const rateLimit = rateLimitConfigs.api.check(`api:${clientIP}`);
    if (!rateLimit.allowed) {
      return new NextResponse(rateLimit.message, { status: 429 });
    }
    
    // Apply stricter rate limiting to auth endpoints
    if (pathname.startsWith('/api/auth/')) {
      const authRateLimit = rateLimitConfigs.auth.check(`auth:${clientIP}`);
      if (!authRateLimit.allowed) {
        return new NextResponse(authRateLimit.message, { status: 429 });
      }
    }
  }

  // Security checks for all routes
  if (pathTraversalPattern.test(pathname)) {
    return new NextResponse('Bad Request', { status: 400 });
  }

  // Check for bypass attempts using URL or Unicode tricks
  if (containsBypassAttempts(rawPathname)) {
    return new NextResponse('Bad Request', { status: 400 });
  }

  // Protect admin routes with stricter validation
  if (isProtectedRoute(pathname, 'admin')) {
    console.log('Middleware: Checking admin route access for:', pathname);
    
    // Get tokens from multiple sources (cookies, headers, localStorage via headers)
    const cookieAccessToken = request.cookies.get('accessToken')?.value;
    const cookieUserRole = request.cookies.get('userRole')?.value;
    const cookieUserId = request.cookies.get('userId')?.value;
    
    // Also check headers (for API calls)
    const headerAuth = request.headers.get('authorization');
    const headerUserId = request.headers.get('x-user-id');
    const headerUserRole = request.headers.get('x-user-role');
    
    const accessToken = cookieAccessToken || (headerAuth?.replace('Bearer ', ''));
    const userRole = cookieUserRole || headerUserRole;
    const userId = cookieUserId || headerUserId;
    
    console.log('Middleware: Auth check results:', {
      hasAccessToken: !!accessToken,
      userRole: userRole || 'none',
      hasUserId: !!userId,
      source: cookieAccessToken ? 'cookie' : headerAuth ? 'header' : 'none'
    });
    
    // If no access token, deny access
    if (!accessToken) {
      console.log('Middleware: No access token found for admin route. Access will be denied.');
      return NextResponse.redirect(new URL('/', request.url));
    }
    
    // If no admin role, deny access
    if (userRole !== 'admin') {
      console.log('Middleware: Admin access denied for path', pathname, '. User not authenticated as admin. Redirecting to /.');
      return NextResponse.redirect(new URL('/', request.url));
    }
    
    console.log('Middleware: Admin access granted for:', pathname);
  }
  
  // Block requests to API routes that have suspicious patterns
  if (isProtectedRoute(pathname, 'api') && containsSuspiciousPatterns(pathname)) {
    return new NextResponse('Bad Request', { status: 400 });
  }

  return response;
}

// Define which routes to apply the middleware to
export const config = {
  matcher: [
    '/admin/:path*',
    '/api/:path*',
  ],
};
