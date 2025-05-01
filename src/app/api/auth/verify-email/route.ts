import { NextRequest } from 'next/server';
import db from '@/lib/db';
import { 
  createResponse, 
  generateTokens, 
  setAuthCookies, 
  verificationRateLimiter 
} from '@/lib/auth';

// Verification token expiry in milliseconds (10 minutes)
const TOKEN_EXPIRY_MS = 10 * 60 * 1000;

export async function POST(request: NextRequest) {
  // Get client IP for rate limiting
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  
  // Check rate limit
  const rateLimit = verificationRateLimiter.check(`verify:${ip}`);
  if (!rateLimit.allowed) {
    return createResponse({ error: '嘗試次數過多，請稍後再試' }, 429);
  }

  try {
    const { token } = await request.json();

    if (!token || typeof token !== 'string' || token.length !== 6) {
      return createResponse({ error: '驗證令牌無效' }, 400);
    }

    // Find user by verification code
    const user = await db.users.findByVerificationCode(token);
    if (!user) {
      return createResponse({ error: '無效的驗證令牌' }, 400);
    }

    // Check if the token has expired
    const verificationTimestamp = user.verificationTimestamp ? new Date(user.verificationTimestamp).getTime() : 0;
    const now = Date.now();
    
    if (now - verificationTimestamp > TOKEN_EXPIRY_MS) {
      return createResponse({ error: '驗證令牌已過期，請重新獲取' }, 400);
    }

    // Update user status and delete verification code
    await db.users.update(user.userId, {
      isEmailVerified: true,
      verificationCode: undefined,  // 成功驗證後，刪除驗證碼
      verificationTimestamp: undefined  // 同時刪除驗證時間戳
    });

    // Generate tokens
    const { accessToken, refreshToken } = await generateTokens(user);
    
    // Create response with user data
    const response = createResponse({
      user: {
        userId: user.userId,
        userName: user.userName,
        email: user.email,
        phoneNumber: user.phoneNumber,
        role: user.role,
      }
    }, 200, '驗證成功！');
    
    // Set auth cookies
    setAuthCookies(response, accessToken, refreshToken);
    
    // Set HTTPS security headers
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    
    return response;
  } catch (error) {
    console.error('Email verification error:', error);
    return createResponse({ error: '內部伺服器錯誤' }, 500);
  }

}