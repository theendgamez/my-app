import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const authToken = cookieStore.get('authToken')?.value;
    const roleCookie = cookieStore.get('role')?.value;
    
    // First check for role cookie (faster path)
    if (roleCookie === 'admin') {
      // Verify auth token as well for extra security
      if (authToken) {
        const decodedToken = verifyToken(authToken);
        if (decodedToken && decodedToken.role === 'admin') {
          return NextResponse.json({ isAdmin: true });
        }
      }
    }
    
    // If we don't have matching role cookie and valid auth token
    return NextResponse.json({ isAdmin: false });
  } catch (error) {
    console.error('Admin check error:', error);
    return NextResponse.json({ isAdmin: false });
  }
}

