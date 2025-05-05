import { NextRequest } from 'next/server';
import bcrypt from 'bcrypt';
import db from '@/lib/db';
import { 
  createResponse, 
  generateTokens, 
  setAuthCookies, 
  loginRateLimiter 
} from '@/lib/auth';

export async function POST(request: NextRequest) {
  // Get client IP for rate limiting
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  
  // Check rate limit
  const rateLimit = loginRateLimiter.check(`login:${ip}`);
  if (!rateLimit.allowed) {
    return createResponse({ error: '嘗試次數過多，請稍後再試' }, 429);
  }

  try {
    const { email, password } = await request.json();

    // Validate input
    if (!email || !password) {
      return createResponse({ error: '請提供電子郵件和密碼' }, 400);
    }

    // Find user by email
    const user = await db.users.findByEmail(email);
    if (!user) {
      return createResponse({ error: '用戶不存在或密碼錯誤' }, 401);
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return createResponse({ error: '用戶不存在或密碼錯誤' }, 401);
    }

    // Check if email is verified
    if (!user.isEmailVerified) {
      return createResponse(
        { 
          error: '請先驗證您的電子郵件', 
          userId: user.userId,
          requiresVerification: true
        }, 
        403
      );
    }

    // Generate tokens
    const { accessToken, refreshToken } = await generateTokens(user);
    
    // Create response with user data and access token
    const response = createResponse({
      user: {
        userId: user.userId,
        role: user.role, // Include role so client knows if user is admin
      },
      accessToken
    }, 200, '登入成功');
    
    // Set cookies with secure flags
    setAuthCookies(response, accessToken, refreshToken);
    
    // Add security headers
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    
    return response;
  } catch {
    return createResponse({ error: '登入時出錯' }, 500);
  }
}