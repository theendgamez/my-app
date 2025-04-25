import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import db from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    // First, try to get the user using standard auth methods
    const user = await getCurrentUser(request);
    
    if (user && user.role === 'admin') {
      return NextResponse.json({ isAdmin: true });
    }
    
    // If standard auth fails, try to check using the user ID header
    const userIdHeader = request.headers.get('x-user-id');
    if (userIdHeader) {
      // Fetch user directly from the database
      const dbUser = await db.users.findById(userIdHeader);
      
      if (dbUser && dbUser.role === 'admin') {
        return NextResponse.json({ isAdmin: true });
      }
    }
    
    // If no admin user was found through any method
    return NextResponse.json({ isAdmin: false });
  } catch (error) {
    console.error('Admin check error:', error);
    return NextResponse.json({ isAdmin: false });
  }
}

