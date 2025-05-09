import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// Define permissions by role
const ROLE_PERMISSIONS = {
  admin: [
    'events:read',
    'events:create',
    'events:update',
    'events:delete',
    'users:read',
    'users:update',
    'lottery:manage',
    'dashboard:view',
    'payments:view',
  ],
  user: [
    'events:read',
    'profile:read',
    'profile:update',
    'tickets:view',
  ],
};

export async function GET(request: NextRequest) {
  try {
    // First try standard authentication
    const user = await getCurrentUser(request);
    
    // Then check for direct user ID as fallback
    const userIdHeader = request.headers.get('x-user-id');
    let userId = null;
    let userRole = 'guest';

    // If we have a user from getCurrentUser
    if (user) {
      userId = user.userId;
      userRole = user.role;
    } 
    // If not, but we have a user ID header, try to verify directly
    else if (userIdHeader) {
      try {
        const dbUser = await db.users.findById(userIdHeader);
        if (dbUser) {
          userId = dbUser.userId;
          userRole = dbUser.role;
        }
      } catch (error) {
        console.error('Error fetching user via user ID:', error);
      }
    }

    // If no authenticated user, return empty permissions
    if (!userId) {
      return NextResponse.json({
        permissions: [],
        role: 'guest'
      });
    }

    // Get permissions for user's role
    const permissions = ROLE_PERMISSIONS[userRole as keyof typeof ROLE_PERMISSIONS] || [];

    // Return permissions based on user role
    return NextResponse.json({
      permissions,
      role: userRole
    });
  } catch (error) {
    console.error('Error in permissions API:', error);
    return NextResponse.json(
      { 
        error: '獲取權限時出錯',
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
