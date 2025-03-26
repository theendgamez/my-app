import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { userId, userName, email, phoneNumber } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Verify the user is authorized to make this edit
    const currentUser = await getCurrentUser(request);
    if (!currentUser || (currentUser.userId !== userId && currentUser.role !== 'admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const updates = { userName, email, phoneNumber };
    
    await db.users.update(userId, updates);
    return NextResponse.json(
      { message: 'Profile updated successfully', user: { userId, ...updates } },
      { status: 200 }
    );
  } catch (error) {
    console.error('Update profile error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' }, 
      { status: 500 }
    );
  }
}