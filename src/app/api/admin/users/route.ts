import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Verify the request is from an admin
    const currentUser = await getCurrentUser(request);
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Get all users (be careful with this for large user bases - consider pagination)
    const users = await db.scanTable('Users');
    
    // Map to a safer version with less sensitive data
    const safeUsers = users.map((user: any) => ({
      userId: user.userId,
      email: user.email,
      userName: user.userName || user.email.split('@')[0],
      role: user.role || 'user',
      createdAt: user.createdAt || new Date().toISOString(),
      phoneNumber: user.phoneNumber,
      isActive: user.isActive !== false, // default to true if not specified
    }));

    return NextResponse.json(safeUsers);
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
