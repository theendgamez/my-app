import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
// Import with correct filename
import sendVerificationCode from '@/utils/sendVerificationCode';

// Simple in-memory rate limiter class
class EdgeRateLimiter {
  private windowMs: number;
  private max: number;
  private attempts: Map<string, number[]>;

  constructor(windowMs: number, max: number) {
    this.windowMs = windowMs;
    this.max = max;
    this.attempts = new Map();
  }

  check(key: string) {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    const timestamps = this.attempts.get(key) || [];
    const recent = timestamps.filter(ts => ts > windowStart);
    recent.push(now);
    this.attempts.set(key, recent);
    return { allowed: recent.length <= this.max };
  }
}

// Rate limiter: 5 attempts per 5 minutes
const resendVerificationRateLimiter = new EdgeRateLimiter(5 * 60 * 1000, 5);

export async function POST(request: NextRequest) {
  // Get client IP for rate limiting
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  
  // Check rate limit
  const rateLimit = resendVerificationRateLimiter.check(`resend:${ip}`);
  if (!rateLimit.allowed) {
    return NextResponse.json({ 
      error: '嘗試次數過多，請稍後再試'
    }, { status: 429 });
  }

  try {
    const { email } = await request.json();
    
    if (!email) {
      return NextResponse.json({ error: '請提供電子郵件地址' }, { status: 400 });
    }

    // Find the user by email
    const user = await db.users.findByEmail(email);
    if (!user) {
      // For security reasons, don't reveal if the email exists
      return NextResponse.json({ 
        success: true, 
        message: '如果此電子郵件存在，驗證碼已發送'
      });
    }

    // Check if email is already verified
    if (user.isEmailVerified) {
      return NextResponse.json({ 
        error: '此電子郵件已驗證',
        message: '您的電子郵件已經通過驗證，可以直接登入。' 
      }, { status: 400 });
    }

    // Generate a new verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const now = new Date().toISOString();

    // Update the user with the new verification code
    await db.users.update(user.userId, {
      verificationCode,
      verificationTimestamp: now
    });

    // Send the verification code
    await sendVerificationCode(email, verificationCode);

    // Return success response
    return NextResponse.json({
      success: true,
      message: '驗證碼已發送，請檢查您的收件箱'
    });
  } catch (error) {
    console.error('Error resending verification code:', error);
    return NextResponse.json({
      error: '發送驗證碼時出現錯誤',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
