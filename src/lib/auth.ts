import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { jwtVerify, SignJWT } from 'jose';
import db from '@/lib/db';
import { Users } from '@/types';

// Configuration constants
export const JWT_SECRET = process.env.JWT_SECRET;
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || JWT_SECRET;
const ACCESS_TOKEN_EXPIRY = '12h';
const REFRESH_TOKEN_EXPIRY = '7d';

// Determine if cookies should be marked as Secure
const isNodeEnvProduction = process.env.NODE_ENV === 'production';
const allowInsecureProdCookies = process.env.ALLOW_INSECURE_PROD_COOKIES === 'true';
const useSecureCookies = isNodeEnvProduction && !allowInsecureProdCookies;

// Types
export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  tokenVersion?: number;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  user?: Partial<Users>;
  error?: string;
}

export interface User {
  userId: string;
  userName: string;
  email: string;
  role: 'user' | 'admin';
  realName?: string;
}

// Standardized response creator
export const createResponse = <T extends Record<string, unknown>>(data: T = {} as T, status: number = 200, message: string = '') => {
  const success = status >= 200 && status < 300;
  return NextResponse.json(
    { success, message, ...data }, 
    { status }
  );
};

// Generate tokens
export const generateTokens = async (user: Users) => {
  const payload: JWTPayload = {
    userId: user.userId,
    email: user.email,
    role: user.role || 'user',
    tokenVersion: user.tokenVersion || 0
  };
  
  const accessToken = await signToken(payload, ACCESS_TOKEN_EXPIRY, JWT_SECRET);
  const refreshToken = await signToken(payload, REFRESH_TOKEN_EXPIRY, REFRESH_TOKEN_SECRET);
  
  return { accessToken, refreshToken };
};

// Set auth cookies with improved userRole handling
export const setAuthCookies = async (response: NextResponse, accessToken: string, refreshToken: string) => {
  response.cookies.set('accessToken', accessToken, {
    httpOnly: true,
    secure: useSecureCookies,
    sameSite: 'strict',
    maxAge: 12 * 60 * 60, // 12 hours in seconds
    path: '/'
  });
  
  response.cookies.set('refreshToken', refreshToken, {
    httpOnly: true,
    secure: useSecureCookies,
    sameSite: 'strict',
    maxAge: 15 * 24 * 60 * 60, // 15 days in seconds
    path: '/'
  });

  // Non-HTTP-only cookie for UI purposes - making sure role is extracted
  let role = 'user';
  try {
    const { payload } = await jwtVerify(accessToken, new TextEncoder().encode(JWT_SECRET));
    role = typeof payload.role === 'string' ? payload.role : 'user';
  } catch {
    // fallback to 'user'
  }
  
  // Set the userRole cookie with longer expiry for better persistence
  response.cookies.set('userRole', role, {
    httpOnly: false, // Must be false so client JS can read it
    secure: useSecureCookies,
    sameSite: 'strict',
    maxAge: 15 * 24 * 60 * 60, // Match refresh token expiry
    path: '/'
  });
};

// Verify JWT token with improved error handling
export const verifyToken = async (token: string, secret = JWT_SECRET): Promise<JWTPayload | null> => {
  if (!secret) {
    return null;
  }
  
  try {
    const secretBytes = new TextEncoder().encode(secret);
    const { payload } = await jwtVerify(token, secretBytes, {
      algorithms: ['HS256'],
    });
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
};

// Sign JWT token - updated for Edge Runtime compatibility
export const signToken = async (payload: JWTPayload, expiresIn: string | number, secret = JWT_SECRET): Promise<string> => {
  try {
    // Use jose for all environments to ensure consistency
    const secretBytes = new TextEncoder().encode(secret);
    const token = await new SignJWT(payload as unknown as Record<string, unknown>)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(typeof expiresIn === 'string' ? expiresIn : `${expiresIn}s`)
      .sign(secretBytes);
    return token;
  } catch (error) {
    throw error;
  }
};

// Get current user from request - single implementation
export const getCurrentUser = async (req: NextRequest): Promise<Users | null> => {
  const headers = req.headers;
  let token: string | undefined = undefined;

  // 1. Try Authorization header
  const authHeader = headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  }

  // 2. If no token from header, try accessToken cookie
  if (!token) {
    token = req.cookies.get('accessToken')?.value;
  }
  
  // Get userId from header (less secure, use with caution or phase out)
  const userIdHeader = headers.get('x-user-id');
  
  try {
    // Try using the token first
    if (token) {
      const decoded = await verifyToken(token); // verifyToken uses JWT_SECRET
      if (decoded?.userId) {
        const user = await db.users.findById(decoded.userId);
        
        // Check token version for session invalidation
        if (user && (user.tokenVersion || 0) === (decoded.tokenVersion || 0)) {
          return user;
        }
      }
    }
    
    // Fall back to userId header if token doesn't work or not present
    // Consider security implications of trusting x-user-id without further validation
    if (userIdHeader) {
      const userFromHeader = await db.users.findById(userIdHeader);
      if (userFromHeader) {
        // Potentially add role/permission checks if relying on x-user-id
        return userFromHeader;
      }
    }
    
    return null;
  } catch (error) {
    console.error('[Auth] Error in getCurrentUser:', error);
    return null;
  }
};

// Protected route handler creator
export const createProtectedRouteHandler = (
  handler: (req: NextRequest, user: Users) => Promise<NextResponse>,
  requiredRole: string = 'user'
) => {
  return async (req: NextRequest) => {
    const user = await getCurrentUser(req);
    
    if (!user) {
      return createResponse({ error: '請先登入' }, 401);
    }
    
    if (requiredRole && user.role !== requiredRole && user.role !== 'admin') {
      return createResponse({ error: '權限不足' }, 403);
    }
    
    return handler(req, user);
  };
};

// Clear auth cookies
export const clearAuthCookies = (response: NextResponse) => {
  response.cookies.delete('accessToken');
  response.cookies.delete('refreshToken');
  response.cookies.delete('userRole');
};

// Handle token refresh
export const handleTokenRefresh = async (req: NextRequest): Promise<NextResponse | null> => {
  try {
    const refreshToken = req.cookies.get('refreshToken')?.value;
    if (!refreshToken) return null;
    
    const decoded = await verifyToken(refreshToken, REFRESH_TOKEN_SECRET);
    if (!decoded) return null;
    
    const user = await db.users.findById(decoded.userId);
    if (!user || (user.tokenVersion || 0) !== (decoded.tokenVersion || 0)) {
      return null;
    }
    
    const tokens = await generateTokens(user);
    const response = createResponse({ message: 'Token refreshed' });
    
    setAuthCookies(response, tokens.accessToken, tokens.refreshToken);
    
    return response;
  } catch  {
    return null;
  }
};

// Invalidate all user sessions
export const invalidateUserSessions = async (userId: string): Promise<void> => {
  const user = await db.users.findById(userId);
  if (user) {
    const currentVersion = user.tokenVersion || 0;
    await db.users.update(userId, {
      tokenVersion: currentVersion + 1
    });
  }
};

// Rate limiting utility
export class RateLimiter {
  private store: Map<string, { count: number, timestamp: number }>;
  private windowMs: number;
  private maxAttempts: number;
  
  constructor(windowMs: number, maxAttempts: number) {
    this.store = new Map();
    this.windowMs = windowMs;
    this.maxAttempts = maxAttempts;
    
    if (typeof setInterval !== 'undefined') {
      setInterval(() => this.cleanUp(), 60000);
    }
  }
  
  check(key: string): { allowed: boolean, remaining: number } {
    const now = Date.now();
    const record = this.store.get(key);
    
    if (!record) {
      this.store.set(key, { count: 1, timestamp: now });
      return { allowed: true, remaining: this.maxAttempts - 1 };
    }
    
    if (now - record.timestamp > this.windowMs) {
      this.store.set(key, { count: 1, timestamp: now });
      return { allowed: true, remaining: this.maxAttempts - 1 };
    }
    
    if (record.count >= this.maxAttempts) {
      return { allowed: false, remaining: 0 };
    }
    
    this.store.set(key, { count: record.count + 1, timestamp: record.timestamp });
    return { allowed: true, remaining: this.maxAttempts - record.count - 1 };
  }
  
  private cleanUp() {
    const now = Date.now();
    for (const [key, record] of this.store.entries()) {
      if (now - record.timestamp > this.windowMs) {
        this.store.delete(key);
      }
    }
  }
}

// Initialize rate limiters
export const loginRateLimiter = new RateLimiter(10 * 60 * 1000, 10);
export const verificationRateLimiter = new RateLimiter(10 * 60 * 1000, 10);
export const registrationRateLimiter = new RateLimiter(60 * 60 * 1000, 10);

/**
 * Enhanced admin check with fallback authentication methods
 */
export async function isAdmin(request: NextRequest): Promise<boolean> {
  try {
    const user = await getCurrentUser(request);
    if (user && user.role === 'admin') {
      return true;
    }

    const userIdHeader = request.headers.get('x-user-id');
    if (userIdHeader) {
      const dbUser = await db.users.findById(userIdHeader);
      return dbUser?.role === 'admin';
    }

    return false;
  } catch (error) {
    console.error('[Auth] Admin check failed:', error);
    return false;
  }
}

/**
 * Get user ID from request (with fallbacks)
 */
export async function getUserId(request: NextRequest): Promise<string | null> {
  try {
    const user = await getCurrentUser(request);
    if (user) {
      return user.userId;
    }

    return request.headers.get('x-user-id') || null;
  } catch (error) {
    console.error('[Auth] Error getting user ID:', error);
    return null;
  }
}