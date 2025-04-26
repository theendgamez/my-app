import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = body;
    
    if (!token) {
      return NextResponse.json({ error: '缺少驗證碼' }, { status: 400 });
    }

    // First, try to handle it as a verification code (6-digit number)
    if (/^\d{6}$/.test(token)) {
      // It looks like a 6-digit verification code
      const user = await db.users.findByVerificationCode(token);
      
      if (!user) {
        return NextResponse.json({ error: '無效的驗證碼' }, { status: 400 });
      }
      
      // Check if the verification code has expired (10 minutes)
      if (!user.verificationTimestamp) {
        return NextResponse.json({ 
          error: '驗證碼時間缺失',
          details: '請重新發送驗證碼'
        }, { status: 400 });
      }
      const verificationTime = new Date(user.verificationTimestamp).getTime();
      const now = Date.now();
      const expirationTime = 10 * 60 * 1000; // 10 minutes in milliseconds
      
      if (now - verificationTime > expirationTime) {
        return NextResponse.json({ 
          error: '驗證碼已過期',
          details: '請重新發送驗證碼'
        }, { status: 400 });
      }
      
      // Check if already verified
      if (user.isEmailVerified) {
        return NextResponse.json({ 
          message: '電子郵件已驗證',
          success: true
        }, { status: 200 });
      }
      
      // Update user to mark email as verified
      await db.users.update(user.userId, {
        isEmailVerified: true,
        verificationCode: "", // Use empty string instead of null
        verificationTimestamp: "" // Use empty string instead of null
      });
      
      return NextResponse.json({ 
        success: true, 
        message: '電子郵件驗證成功'
      });
    }
    
    // Handle it as a JWT token
    try {
      const decoded = verifyToken(token);
      
      // Make sure it's an email verification token
      if (!decoded || decoded.type !== 'email_verification') {
        return NextResponse.json({ 
          error: '無效的令牌類型',
          details: '此令牌不能用於電子郵件驗證'
        }, { status: 400 });
      }
      
      const userId = decoded.userId;
      if (!userId) {
        return NextResponse.json({ error: '無效的令牌：缺少用戶ID' }, { status: 400 });
      }
      
      // Check if user exists
      const user = await db.users.findById(userId);
      if (!user) {
        return NextResponse.json({ error: '找不到用戶' }, { status: 404 });
      }
      
      // Check if already verified
      if (user.isEmailVerified) {
        return NextResponse.json({ 
          message: '電子郵件已驗證',
          success: true
        }, { status: 200 });
      }
      
      // Update user to mark email as verified
      await db.users.update(userId, {
        isEmailVerified: true,
        verificationCode: "", // Use empty string instead of null
        verificationTimestamp: "" // Use empty string instead of null
      });
      
      return NextResponse.json({ 
        success: true, 
        message: '電子郵件驗證成功'
      });
    } catch (error) {
      console.error('Token verification error:', error);
      return NextResponse.json({ 
        error: '無效或過期的驗證令牌',
        details: '驗證鏈接可能已過期。請重新發送驗證郵件。'
      }, { status: 400 });
    }
  } catch (error) {
    console.error('Email verification error:', error);
    return NextResponse.json({ 
      error: '電子郵件驗證失敗',
      details: error instanceof Error ? error.message : '未知錯誤'
    }, { status: 500 });
  }
}