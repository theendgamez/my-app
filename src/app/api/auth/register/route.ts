import { NextRequest } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';
import db from '@/lib/db';
import { createResponse } from '@/lib/auth';
import sendVerificationCode from '@/utils/sendVerifcationCode';
import { Users } from '@/types';
import { encryptData } from '@/utils/encryption';
import { InputValidator, rateLimitConfigs } from '@/lib/security';

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
  const rateLimit = rateLimitConfigs.auth.check(`register:${ip}`);
  if (!rateLimit.allowed) {
    return createResponse({ error: rateLimit.message }, 429);
  }

  try {
    const { email, password, userName, realName } = await request.json();

    // Validate required fields
    if (!email || !password || !userName || !realName) {
      return createResponse({ error: '請填寫所有必填欄位' }, 400);
    }

    // Sanitize inputs
    const sanitizedEmail = InputValidator.sanitizeString(email.trim().toLowerCase());
    const sanitizedUserName = InputValidator.sanitizeString(userName.trim());
    const sanitizedRealName = InputValidator.sanitizeString(realName.trim());

    // Validate email using sanitized input
    if (!InputValidator.validateEmail(sanitizedEmail)) {
      return createResponse({ error: '電子郵件格式無效' }, 400);
    }

    // Validate password
    const passwordValidation = InputValidator.validatePassword(password);
    if (!passwordValidation.isValid) {
      return createResponse({ 
        error: '密碼不符合要求', 
        details: passwordValidation.errors 
      }, 400);
    }

    // Log request headers for debugging
    console.log('Registration attempt from IP:', ip);
    console.log('Content-Type:', request.headers.get('content-type'));
    
    // Parse request body with error handling (use sanitized values)
    let data: RegistrationData;
    try {
      data = {
        email: sanitizedEmail,
        userName: sanitizedUserName,
        realName: sanitizedRealName,
        password: password,
        phoneNumber: undefined // Will be validated if provided
      };
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

    // Check if email is already registered using sanitized email
    const existingUser = await db.users.findByEmail(sanitizedEmail);
    if (existingUser) {
      return createResponse({ error: '該電子郵件已被註冊' }, 400);
    }

    // Generate verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const now = new Date().toISOString();

    // Hash password
    const hashedPassword = await bcrypt.hash(data.password!, 12);

    // Prepare user data with encrypted sensitive fields using sanitized values
    const userId = uuidv4();
    const userData: Users = {
      userId,
      userName: sanitizedUserName,
      realName: encryptData(sanitizedRealName),
      email: sanitizedEmail,
      password: hashedPassword,
      phoneNumber: encryptData(data.phoneNumber!),
      isEmailVerified: false,
      isPhoneVerified: false,
      verificationCode,
      verificationTimestamp: now,
      createdAt: now,
      role: 'user',
      tokenVersion: 0,
      isDataEncrypted: true
    };

    // Store user in database
    await db.users.create(userData);
    
    // Send verification code using sanitized email
    try {
      await sendVerificationCode(sanitizedEmail, verificationCode);
      console.log('Verification code sent successfully to:', sanitizedEmail);
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