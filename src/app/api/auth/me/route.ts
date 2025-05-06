import { NextRequest } from 'next/server';
import { getCurrentUser, createResponse } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    
    if (!user) {
      return createResponse({ user: null }, 200);
    }
    
    // Return complete user data including role which is needed by the frontend
    return createResponse({
      userId: user.userId,
      role: user.role || 'user',
      userName: user.userName,
      email: user.email,
      isEmailVerified: user.isEmailVerified,
      phoneNumber: user.phoneNumber
    }, 200);
  } catch (error) {
    console.error('Error fetching current user:', error);
    return createResponse({ error: '內部伺服器錯誤' }, 500);
  }
}