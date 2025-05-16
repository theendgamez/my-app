import { NextRequest } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';
import db from '@/lib/db';
import { createResponse, registrationRateLimiter } from '@/lib/auth';
import sendVerificationCode from '@/utils/sendVerifcationCode';
import { Users } from '@/types';
import { encryptData } from '@/utils/encryption';

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
  
  // Check for undefined data first
  if (!data) {
    return { general: '請提供註冊資料' };
  }

  // Validate userName
  if (!data.userName) {
    errors.userName = '用戶名稱為必填項';
  } else if (data.userName.trim().length < 3) {
    errors.userName = '用戶名稱至少需要3個字符';
  }
  
  // Validate email
  if (!data.email) {
    errors.email = '電子郵件為必填項';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.email = '請輸入有效的電子郵件地址';
  }
  
  // Validate realName
  if (!data.realName) {
    errors.realName = '真實姓名為必填項';
  } else if (data.realName.trim().length < 2) {
    errors.realName = '真實姓名至少需要2個字符';
  }
  
  // Validate password with clear requirements
  if (!data.password) {
    errors.password = '密碼為必填項';
  } else if (data.password.length < 6) {
    errors.password = '密碼至少需要6個字符';
  } else {
    if (!/[A-Z]/.test(data.password)) {
      errors.password = '密碼必須包含至少一個大寫字母';
    } else if (!/[a-z]/.test(data.password)) {
      errors.password = '密碼必須包含至少一個小寫字母';
    }
  }
  
  // Validate phoneNumber
  if (!data.phoneNumber) {
    errors.phoneNumber = '電話號碼為必填項';
  } else if (!/^\+?[1-9]\d{1,14}$/.test(data.phoneNumber)) {
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
    // Log request headers for debugging
    console.log('Registration attempt from IP:', ip);
    console.log('Content-Type:', request.headers.get('content-type'));
    
    // Parse request body with error handling
    let data: RegistrationData;
    try {
      data = await request.json();
      console.log('Parsed registration data:', {
        userName: data.userName,
        email: data.email,
        realName: data.realName,
        phoneNumber: data.phoneNumber,
        hasPassword: !!data.password
      });
    } catch (parseError) {
      console.error('Failed to parse registration data:', parseError);
      return createResponse({ 
        error: '無效的請求格式',
        details: 'Please ensure the request is sent as proper JSON' 
      }, 400);
    }
    
    // Validate input
    const validationErrors = validateRegistrationInput(data);
    if (validationErrors) {
      console.log('Validation errors:', validationErrors);
      return createResponse({ errors: validationErrors }, 400);
    }

    // Check if email is already registered
    const existingUser = await db.users.findByEmail(data.email!);
    if (existingUser) {
      return createResponse({ error: '該電子郵件已被註冊' }, 400);
    }

    // Generate verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const now = new Date().toISOString();

    // Hash password
    const hashedPassword = await bcrypt.hash(data.password!, 12);

    // Prepare user data with encrypted sensitive fields
    const userId = uuidv4();
    const userData: Users = {
      userId,
      userName: data.userName!,
      realName: encryptData(data.realName!), // Encrypt realName
      email: data.email!,
      password: hashedPassword,
      phoneNumber: encryptData(data.phoneNumber!), // Encrypt phoneNumber
      isEmailVerified: false,
      isPhoneVerified: false,
      verificationCode,
      verificationTimestamp: now,
      createdAt: now,
      role: 'user',
      tokenVersion: 0,
      isDataEncrypted: true // Flag to indicate data is encrypted
    };

    // Store user in database
    await db.users.create(userData);
    
    // Send verification code
    try {
      await sendVerificationCode(data.email!, verificationCode);
      console.log('Verification code sent successfully to:', data.email);
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      // Continue the registration process even if email fails
      // User can request a new code later
    }
    
    return createResponse({
      message: '註冊成功，驗證碼已發送至您的電子郵件',
      userId
    }, 201);
  } catch (error) {
    console.error('Registration error:', error);
    return createResponse({ 
      error: '內部伺服器錯誤',
      details: error instanceof Error ? error.message : '處理註冊請求時出錯'
    }, 500);
  }
}