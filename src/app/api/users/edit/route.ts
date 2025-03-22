import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { userId, userName, email, phoneNumber } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const updates = {
      userName,
      email,
      phoneNumber,
    };

    try {
      await db.users.update(userId, updates);
      return NextResponse.json(
        { message: 'Profile updated successfully', user: { userId, ...updates } },
        { status: 200 }
      );
    } catch (error) {
      console.error('Update failed:', error);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

  } catch (error) {
    console.error('Update profile error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}