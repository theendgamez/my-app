import { NextRequest } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';
import db from '@/lib/db';
import { createResponse, registrationRateLimiter } from '@/lib/auth';
import sendVerificationCode from '@/utils/sendVerificationCode';
import { Users } from '@/types';

// Define registration data interface
interface RegistrationData {
  userName?: string;
  email?: string;
  realName?: string;
  password?: string;
  phoneNumber?: string;
}

// Input validation
function validateRegistrationInput(data: RegistrationData) {
  const errors: Record<string, string> = {};
  
  if (!data.userName || data.userName.trim().length < 3) {
    errors.userName = '用戶名稱至少需要3個字符';
  }
  
  if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.email = '請輸入有效的電子郵件地址';
  }
  if (!data.realName || data.realName.trim().length < 2) {
    errors.realName = '真實姓名至少需要2個字符';
  }
  
  if (!data.password || data.password.length < 6) {
    errors.password = '密碼至少需要6個字符';
  } else {
    if (!/[A-Z]/.test(data.password)) {
      errors.password = '密碼必須包含至少一個大寫字母';
    }
    if (!/[a-z]/.test(data.password)) {
      errors.password = '密碼必須包含至少一個小寫字母';
    }
  }
  
  if (!data.phoneNumber || !/^\+?[1-9]\d{1,14}$/.test(data.phoneNumber)) {
    errors.phoneNumber = '請輸入有效的電話號碼';
  }
  
  return Object.keys(errors).length > 0 ? errors : null;
}

export async function POST(request: NextRequest) {
  // Get client IP for rate limiting
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  
  // Check rate limit
  const rateLimit = registrationRateLimiter.check(`register:${ip}`);
  if (!rateLimit.allowed) {
    return createResponse({ error: '嘗試次數過多，請稍後再試' }, 429);
  }

  try {
    const data = await request.json();
    
    // Validate input
    const validationErrors = validateRegistrationInput(data);
    if (validationErrors) {
      return createResponse({ errors: validationErrors }, 400);
    }

    // Check if email is already registered
    const existingUser = await db.users.findByEmail(data.email);
    if (existingUser) {
      return createResponse({ error: '該電子郵件已被註冊' }, 400);
    }

    // Generate verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const now = new Date().toISOString();

    // Hash password
    const hashedPassword = await bcrypt.hash(data.password, 12);

    // Prepare user data
    const userId = uuidv4();
    const userData: Users = {
      userId,
      userName: data.userName,
      realName: data.realName,
      email: data.email,
      password: hashedPassword,
      phoneNumber: data.phoneNumber,
      isEmailVerified: false,
      isPhoneVerified: false,
      verificationCode,
      verificationTimestamp: now,
      createdAt: now,
      role: 'user',
      tokenVersion: 0
    };

    // Store user in database
    await db.users.create(userData);
    
    // Send verification code
    await sendVerificationCode(data.email, verificationCode);
    
    return createResponse({
      message: '註冊成功，驗證碼已發送至您的電子郵件',
      userId
    }, 201);
  } catch (error) {
    console.error('Registration error:', error);
    return createResponse({ error: '內部伺服器錯誤' }, 500);
  }
}