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

    // Basic validation
    if (!email || !password) {
      return createResponse({ error: '電子郵件和密碼為必填項' }, 400);
    }

    // Find user by email
    const user = await db.users.findByEmail(email);
    if (!user) {
      return createResponse({ error: '電子郵件或密碼錯誤' }, 401);
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return createResponse({ error: '電子郵件或密碼錯誤' }, 401);
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
    
    // Create response with minimal user data - only the user ID
    // This ensures the client only has access to the ID, not sensitive user data
    const response = createResponse({
      user: {
        userId: user.userId,
      },
      accessToken // Include access token for API requests
    }, 200, '登入成功');
    
    // Set cookies
    setAuthCookies(response, accessToken, refreshToken);
    
    return response;
  } catch (error) {
    console.error('Login error:', error);
    return createResponse({ error: '內部伺服器錯誤' }, 500);
  }
}