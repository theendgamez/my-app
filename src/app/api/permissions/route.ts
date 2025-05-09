import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import db from '@/lib/db';

export const dynamic = 'force-dynamic'; // No caching for permissions

export async function GET(request: NextRequest) {
  try {
    // Get the authenticated user
    const user = await getCurrentUser(request);
    
    // Return appropriate permissions based on user role
    if (!user) {
      return NextResponse.json({ 
        permissions: ['public'], 
        role: 'guest', 
        authenticated: false 
      });
    }
    
    // Basic permissions mapping by role
    const rolePermissions: { [key: string]: string[] } = {
      admin: [
        'admin.access',
        'admin.users.manage',
        'admin.events.manage',
        'admin.tickets.manage',
        'admin.lottery.manage',
        'user.tickets.transfer',
        'user.tickets.view',
        'user.profile.edit'
      ],
      staff: [
        'admin.access',
        'admin.events.view',
        'admin.tickets.view',
        'user.tickets.view',
        'user.profile.edit'
      ],
      user: [
        'user.tickets.view',
        'user.tickets.transfer',
        'user.profile.edit'
      ]
    };
    
    // Get default permissions for user role, fallback to basic user permissions
    const permissions = rolePermissions[user.role] || rolePermissions.user;
    
    return NextResponse.json({
      permissions,
      role: user.role,
      authenticated: true,
      userId: user.userId
    });
    
  } catch (error) {
    console.error('Error checking permissions:', error);
    return NextResponse.json(
      { error: 'Error checking permissions', permissions: ['public'] },
      { status: 500 }
    );
  }
}
