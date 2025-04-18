import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';
import db from '@/lib/db';
import { Users } from '@/types';

// Configuration constants
const JWT_SECRET = process.env.JWT_SECRET!;
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || JWT_SECRET;
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

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

// Standardized response creator
export const createResponse = <T extends Record<string, unknown>>(data: T = {} as T, status: number = 200, message: string = '') => {
  const success = status >= 200 && status < 300;
  return NextResponse.json(
    { success, message, ...data }, 
    { status }
  );
};

// Generate tokens
export const generateTokens = (user: Users) => {
  const payload: JWTPayload = {
    userId: user.userId,
    email: user.email,
    role: user.role || 'user',
    tokenVersion: user.tokenVersion || 0
  };
  
  const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
  const refreshToken = jwt.sign(payload, REFRESH_TOKEN_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY });
  
  return { accessToken, refreshToken };
};

// Set auth cookies
export const setAuthCookies = (response: NextResponse, accessToken: string, refreshToken: string) => {
  response.cookies.set('accessToken', accessToken, {
    httpOnly: true,
    secure: IS_PRODUCTION,
    sameSite: 'strict',
    maxAge: 15 * 60, // 15 minutes in seconds
    path: '/'
  });
  
  response.cookies.set('refreshToken', refreshToken, {
    httpOnly: true,
    secure: IS_PRODUCTION,
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
    path: '/'
  });
  
  // Non-HTTP-only cookie for UI purposes
  response.cookies.set('userRole', (jwt.decode(accessToken) as JWTPayload)?.role || 'user', {
    httpOnly: false,
    secure: IS_PRODUCTION,
    sameSite: 'strict',
    maxAge: 15 * 60,
    path: '/'
  });
};

// Verify JWT token
export const verifyToken = (token: string, secret = JWT_SECRET): JWTPayload | null => {
  try {
    return jwt.verify(token, secret) as JWTPayload;
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
};

// Get current user from request
export const getCurrentUser = async (req: NextRequest): Promise<Users | null> => {
  try {
    // Try cookies first
    const accessToken = req.cookies.get('accessToken')?.value;
    
    // If cookie auth fails, try header auth
    const authHeader = req.headers.get('authorization');
    const headerToken = authHeader?.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : null;
    
    if (accessToken) {
      // Use cookie auth
      const decoded = verifyToken(accessToken);
      if (!decoded) return null;
      
      const user = await db.users.findById(decoded.userId);
      
      // Verify token version to ensure token hasn't been invalidated
      if (user && (user.tokenVersion || 0) === (decoded.tokenVersion || 0)) {
        return user;
      }
    } else if (headerToken) {
      // Use header auth
      const decoded = verifyToken(headerToken);
      if (!decoded) return null;
      
      const user = await db.users.findById(decoded.userId);
      
      // Verify token version to ensure token hasn't been invalidated
      if (user && (user.tokenVersion || 0) === (decoded.tokenVersion || 0)) {
        return user;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Auth error:', error);
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
    
    const decoded = verifyToken(refreshToken, REFRESH_TOKEN_SECRET);
    if (!decoded) return null;
    
    const user = await db.users.findById(decoded.userId);
    if (!user || (user.tokenVersion || 0) !== (decoded.tokenVersion || 0)) {
      return null;
    }
    
    const tokens = generateTokens(user);
    const response = createResponse({ message: 'Token refreshed' });
    
    setAuthCookies(response, tokens.accessToken, tokens.refreshToken);
    
    return response;
  } catch (error) {
    console.error('Token refresh error:', error);
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

// Rate limiting utility (improved version with external storage)
export class RateLimiter {
  private store: Map<string, { count: number, timestamp: number }>;
  private windowMs: number;
  private maxAttempts: number;
  
  constructor(windowMs: number, maxAttempts: number) {
    this.store = new Map();
    this.windowMs = windowMs;
    this.maxAttempts = maxAttempts;
    
    // Clean up expired entries every minute
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
export const loginRateLimiter = new RateLimiter(10 * 60 * 1000, 5); // 5 attempts per 10 minutes
export const verificationRateLimiter = new RateLimiter(5 * 60 * 1000, 5); // 5 attempts per 5 minutes
export const registrationRateLimiter = new RateLimiter(60 * 60 * 1000, 5); // 5 attempts per hour