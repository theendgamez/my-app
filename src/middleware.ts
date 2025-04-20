import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
// Fix the import path using the @ alias which points to /src
import { verifyToken } from '@/lib/auth';

// Basic security checks middleware
export async function middleware(request: NextRequest) {
  // Get the pathname of the request (normalized)
  const rawPathname = request.nextUrl.pathname;
  
  // Normalize the path - convert to lowercase for case-insensitive matching
  // and normalize any Unicode characters
  const pathname = decodeURIComponent(normalizePath(rawPathname));
  
  // Create a response object
  const response = NextResponse.next();

  // Basic security headers
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  response.headers.set('Content-Security-Policy', "default-src 'self'");
  
  // Prevent path traversal attacks - block requests with suspicious path patterns
  const pathTraversalPattern = /\.\./;
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
      // Verify token and check role
      try {
        const decoded = verifyToken(accessToken);
        isAdmin = decoded?.role === 'admin';
      } catch (e) {
        console.error('Token verification error:', e);
      }
    }

    // If not admin, redirect to home
    if (!isAdmin) {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  // Block requests to API routes that have suspicious patterns
  if (isProtectedRoute(pathname, 'api') && containsSuspiciousPatterns(pathname)) {
    return new NextResponse('Bad Request', { status: 400 });
  }

  return response;
}

// Helper function to detect suspicious patterns
function containsSuspiciousPatterns(path: string): boolean {
  // Look for common attack patterns
  const suspiciousPatterns = [
    /\/\.\.\//,        // Path traversal
    /;/,               // Command injection
    /<script>/i,       // XSS attempt
    /%00/,             // Null byte
    /\/\/\//,          // Multiple slashes
    /\?\?/,            // Multiple question marks
    /\.\.%2f/i,        // URL encoded path traversal
    /\.\.%5c/i,        // URL encoded backslash traversal
  ];

  return suspiciousPatterns.some(pattern => pattern.test(path));
}

// Helper function to detect middleware bypass attempts
function containsBypassAttempts(path: string): boolean {
  const bypassPatterns = [
    // Common bypass patterns
    /%2e%2e/i,         // Double encoded "../"
    /%252e/i,          // Triple encoded "."
    /\/\/+/,           // Multiple consecutive slashes
    /\x00/,            // Null bytes
    /\u0000/,          // Unicode null
    /\u200b/,          // Zero-width space
    /\uff0e\uff0e/,    // Unicode encoded dots
    /\\u002e\\u002e/,  // Another unicode dots format
    // Mix of forward and backward slashes
    /[\/\\]{2,}/,
    // Excessive query parameters
    /\?.*\?.*\?/
  ];

  const decodedPath = decodeURIComponent(path);
  
  return bypassPatterns.some(pattern => 
    pattern.test(path) || 
    pattern.test(decodedPath) || 
    pattern.test(encodeURIComponent(decodedPath))
  );
}

// Normalize path to prevent bypass techniques
function normalizePath(path: string): string {
  // Remove any consecutive slashes
  let normalized = path.replace(/\/+/g, '/');
  
  // Remove trailing slashes
  normalized = normalized.replace(/\/+$/, '');
  
  // Ensure path starts with a slash
  if (!normalized.startsWith('/')) {
    normalized = '/' + normalized;
  }
  
  return normalized;
}

// Check if path is a protected route type (admin, api, etc)
function isProtectedRoute(path: string, routeType: string): boolean {
  // Case insensitive check for various bypass techniques
  path = path.toLowerCase();
  
  // Check for direct match
  if (path.startsWith(`/${routeType}/`)) return true;
  
  // Check for path with different case variations
  const caseVariations = routeType.split('').map(c => 
    `[${c.toLowerCase()}${c.toUpperCase()}]`).join('');
  const caseInsensitiveRegex = new RegExp(`^\\/${caseVariations}\\/`);
  if (caseInsensitiveRegex.test(path)) return true;
  
  // Check for encoded variations
  const encodedType = encodeURIComponent(routeType);
  if (path.startsWith(`/${encodedType}/`)) return true;
  
  return false;
}

// Add more paths to protect as needed
export const config = {
  matcher: [
    // More specific pattern to catch various bypass attempts
    '/((?!_next/static|_next/image|favicon\\.ico|\\.well-known|public/|images/).*)',
    '/api/:path*',
    '/admin/:path*',
    // Include potential uppercase variants
    '/API/:path*',
    '/ADMIN/:path*',
    // Include patterns that might be used for bypasses
    '/:path*/api/:rest*',
    '/:path*/admin/:rest*',
  ],
};
