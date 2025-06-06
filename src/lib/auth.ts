import { NextRequest, NextResponse } from 'next/server';
import { SignJWT, jwtVerify, JWTPayload as JoseJWTPayload } from 'jose';
import db from '@/lib/db';
import { Users } from '@/types';

// JWT Configuration - validation moved to runtime
const JWT_SECRET = process.env.JWT_SECRET;
const REFRESH_SECRET = process.env.REFRESH_SECRET;

// Helper function to validate and get JWT secrets
function getJWTSecrets() {
  if (!JWT_SECRET || !REFRESH_SECRET) {
    throw new Error('JWT_SECRET and REFRESH_SECRET must be defined in environment variables');
  }
  return {
    jwtSecretKey: new TextEncoder().encode(JWT_SECRET),
    refreshSecretKey: new TextEncoder().encode(REFRESH_SECRET)
  };
}

// JWT Payload interface that extends jose's JWTPayload
export interface JWTPayload extends JoseJWTPayload {
  userId: string;
  email: string;
  role: string;
}

// Token generation
export async function generateTokens(user: Users) {
  const { jwtSecretKey, refreshSecretKey } = getJWTSecrets();
  
  const payload = {
    userId: user.userId,
    email: user.email,
    role: user.role || 'user'
  };

  // Create access token (30 minutes)
  const accessToken = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30m')
    .sign(jwtSecretKey);

  // Create refresh token (7 days)
  const refreshToken = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(refreshSecretKey);

  return { accessToken, refreshToken };
}

// JWT verification for access tokens
export async function verifyAccessToken(token: string): Promise<JWTPayload | null> {
  try {
    const { jwtSecretKey } = getJWTSecrets();
    const { payload } = await jwtVerify(token, jwtSecretKey);
    return payload as unknown as JWTPayload;
  } catch (error) {
    console.error('Access token verification failed:', error);
    return null;
  }
}

// JWT verification for refresh tokens
export async function verifyRefreshToken(token: string): Promise<JWTPayload | null> {
  try {
    const { refreshSecretKey } = getJWTSecrets();
    const { payload } = await jwtVerify(token, refreshSecretKey);
    return payload as unknown as JWTPayload;
  } catch (error) {
    console.error('Refresh token verification failed:', error);
    return null;
  }
}

// Get current user from request
export async function getCurrentUser(request: NextRequest): Promise<Users | null> {
  try {
    // Try to get token from Authorization header first
    const authHeader = request.headers.get('authorization');
    let token = authHeader?.replace('Bearer ', '');
    
    // If no auth header, try cookies
    if (!token) {
      token = request.cookies.get('accessToken')?.value;
    }
    
    if (!token) {
      return null;
    }

    // Verify the token
    const payload = await verifyAccessToken(token);
    if (!payload) {
      return null;
    }

    // Get user from database
    const user = await db.users.findById(payload.userId);
    return user;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

// Set authentication cookies
export function setAuthCookies(
  response: NextResponse, 
  accessToken: string, 
  refreshToken: string, 
  role: string, 
  userId: string
) {
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/'
  };

  response.cookies.set('accessToken', accessToken, {
    ...cookieOptions,
    maxAge: 30 * 60 // 30 minutes
  });

  response.cookies.set('refreshToken', refreshToken, {
    ...cookieOptions,
    maxAge: 7 * 24 * 60 * 60 // 7 days
  });

  response.cookies.set('userRole', role, {
    ...cookieOptions,
    maxAge: 7 * 24 * 60 * 60 // 7 days
  });

  response.cookies.set('userId', userId, {
    ...cookieOptions,
    maxAge: 7 * 24 * 60 * 60 // 7 days
  });
}

// Clear authentication cookies
export function clearAuthCookies(response: NextResponse) {
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 0
  };

  response.cookies.set('accessToken', '', cookieOptions);
  response.cookies.set('refreshToken', '', cookieOptions);
  response.cookies.set('userRole', '', cookieOptions);
  response.cookies.set('userId', '', cookieOptions);
}

// Create standardized API response
export function createResponse(data: Record<string, unknown> | unknown[] | null, status = 200, message?: string) {
  if (message && data && typeof data === 'object' && !Array.isArray(data)) {
    const responseData = { ...data, message };
    return NextResponse.json(responseData, { status });
  }
  
  const responseData = message ? { data, message } : data;
  return NextResponse.json(responseData, { status });
}

// Admin check helper function
export function isAdmin(user: Users | null): boolean {
  return user?.role === 'admin';
}

// Rate limiter for verification attempts
export const verificationRateLimiter = {
  attempts: new Map<string, { count: number; resetTime: number }>(),
  
  check(key: string, maxAttempts = 5, windowMs = 15 * 60 * 1000) {
    const now = Date.now();
    const record = this.attempts.get(key);
    
    if (!record || now > record.resetTime) {
      this.attempts.set(key, { count: 1, resetTime: now + windowMs });
      return { allowed: true, remaining: maxAttempts - 1 };
    }
    
    if (record.count >= maxAttempts) {
      return { allowed: false, remaining: 0 };
    }
    
    record.count++;
    return { allowed: true, remaining: maxAttempts - record.count };
  }
};

// Token refresh handler
export async function handleTokenRefresh(request: NextRequest): Promise<NextResponse | null> {
  try {
    const refreshToken = request.cookies.get('refreshToken')?.value;
    
    if (!refreshToken) {
      return null;
    }
    
    const payload = await verifyRefreshToken(refreshToken);
    if (!payload) {
      return null;
    }
    
    // Get user from database to ensure they still exist and get latest data
    const user = await db.users.findById(payload.userId);
    if (!user) {
      return null;
    }
    
    // Generate new tokens
    const { accessToken, refreshToken: newRefreshToken } = await generateTokens(user);
    
    // Create response with new tokens
    const response = NextResponse.json({ 
      message: 'Token refreshed successfully',
      user: {
        userId: user.userId,
        email: user.email,
        role: user.role
      }
    });
    
    // Set new auth cookies
    setAuthCookies(response, accessToken, newRefreshToken, user.role || 'user', user.userId);
    
    return response;
  } catch (error) {
    console.error('Token refresh error:', error);
    return null;
  }
}

// Verify token helper (alias for verifyAccessToken for backward compatibility)
export const verifyToken = verifyAccessToken;

// Protected route handler creator
export function createProtectedRouteHandler<T>(
  handler: (request: NextRequest, user: Users, ...args: T[]) => Promise<NextResponse>
) {
  return async (request: NextRequest, ...args: T[]): Promise<NextResponse> => {
    try {
      const user = await getCurrentUser(request);
      
      if (!user) {
        return createResponse({ error: 'Unauthorized' }, 401);
      }
      
      return await handler(request, user, ...args);
    } catch (error) {
      console.error('Protected route error:', error);
      return createResponse({ error: 'Internal server error' }, 500);
    }
  };
}