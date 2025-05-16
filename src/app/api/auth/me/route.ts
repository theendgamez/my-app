import { NextRequest } from 'next/server';
import { getCurrentUser, createResponse } from '@/lib/auth';
import { decryptData, isEncrypted } from '@/utils/encryption';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    
    if (!user) {
      return createResponse({ user: null }, 200);
    }
    
    // Check if we need to decrypt phone number
    const phoneNumber = user.phoneNumber && (user.isDataEncrypted || isEncrypted(user.phoneNumber)) 
      ? decryptData(user.phoneNumber) 
      : user.phoneNumber;
    
    // Return complete user data with decrypted phoneNumber
    return createResponse({
      userId: user.userId,
      role: user.role || 'user',
      userName: user.userName,
      email: user.email,
      isEmailVerified: user.isEmailVerified,
      phoneNumber: phoneNumber
    }, 200);
  } catch (error) {
    console.error('Error fetching current user:', error);
    return createResponse({ error: '內部伺服器錯誤' }, 500);
  }
}