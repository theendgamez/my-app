import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
// Import jose instead of using crypto-dependent verification
import { jwtVerify } from 'jose';
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

// Edge-compatible JWT verification function
async function verifyJWT(token: string, secret: string) {
  if (!token) return null;
  
  try {
    // Convert secret to Uint8Array for jose
    const secretBytes = new TextEncoder().encode(secret);
    
    // Verify token with jose
    const { payload } = await jwtVerify(token, secretBytes);
    return payload;
  } catch (e) {
    console.error('Edge-compatible token verification failed:', e);
    return null;
  }
}

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
    // Get the authorization header or access token from cookie
    const authHeader = request.headers.get('authorization');
    const accessToken = authHeader?.startsWith('Bearer ') 
      ? authHeader.substring(7)
      : request.cookies.get('accessToken')?.value;
    
    let isAdmin = false;
    
    if (accessToken) {
      // Use Edge-compatible verification
      const JWT_SECRET = process.env.JWT_SECRET;
      if (JWT_SECRET) {
        const decoded = await verifyJWT(accessToken, JWT_SECRET);
        isAdmin = decoded?.role === 'admin';
        if (!decoded) {
            console.warn('Middleware: JWT verification failed. Token might be invalid, malformed, or expired.');
        } else if (decoded.role !== 'admin') {
            console.warn(`Middleware: User (ID from token: ${decoded.userId || 'N/A'}) is not admin. Role: ${decoded.role}`);
        }
      } else {
        console.error('Middleware: JWT_SECRET is not defined. Cannot verify admin status via JWT. Access will be denied.');
        // isAdmin remains false, leading to redirect.
      }
    } else {
        console.warn('Middleware: No access token found for admin route. Access will be denied.');
    }

    // The x-user-id header fallback in middleware is not secure for determining admin role
    // as middleware (especially Edge) cannot reliably perform DB lookups for role verification.
    // API routes are responsible for full DB-backed auth.
    // If JWT check fails or doesn't confirm admin, isAdmin remains false.
    
    // If not admin, redirect to home
    if (!isAdmin) {
      console.log(`Middleware: Admin access denied for path ${pathname}. User not authenticated as admin. Redirecting to /.`);
      return NextResponse.redirect(new URL('/', request.url));
    }
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
