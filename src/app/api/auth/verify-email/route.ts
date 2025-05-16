import { NextRequest } from 'next/server';
import db from '@/lib/db';
import { 
  createResponse, 
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
      isEmailVerified: true
    });
    
    // Explicitly remove verification fields
    await db.users.removeAttributes(user.userId, ['verificationCode', 'verificationTimestamp']);
    
    // Return success response without generating tokens or setting cookies
    return createResponse({
      success: true,
      message: '電子郵件驗證成功！請登入您的帳號。',
      redirectTo: '/login'
    }, 200);
    
  } catch (error) {
    console.error('Email verification error:', error);
    return createResponse({ error: '內部伺服器錯誤' }, 500);
  }
}