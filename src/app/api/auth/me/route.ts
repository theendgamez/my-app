import { NextRequest } from 'next/server';
import { getCurrentUser, createResponse } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    
    if (!user) {
      return createResponse({ user: null }, 200);
    }
    
    // Return only necessary user data
    return createResponse({
      user: {
        userId: user.userId,
        userName: user.userName,
        email: user.email,
        phoneNumber: user.phoneNumber,
        role: user.role
      }
    }, 200);
  } catch (error) {
    console.error('Error fetching current user:', error);
    return createResponse({ error: '內部伺服器錯誤' }, 500);
  }
}