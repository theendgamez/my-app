import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// GET user by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> } // Correct type signature
) {
  try {
    const userId = (await params).id; // Access id directly
    
    // Add authentication/authorization checks...
    const currentUser = await getCurrentUser(request);
    if (!currentUser || (currentUser.userId !== userId && currentUser.role !== 'admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    
    const user = await db.users.findById(userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Return limited user info for security
    return NextResponse.json({
      userId: user.userId,
      userName: user.userName,
      email: user.email,
      phoneNumber: user.phoneNumber,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
      isPhoneVerified: user.isPhoneVerified,
      createdAt: user.createdAt
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH to update user profile (replaces /api/users/edit POST)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> } // Correct type signature
) {
  try {
    const userId = (await params).id;
    const { userName, email, phoneNumber } = await request.json();

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

// DELETE user (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> } // Standardized parameter pattern
) {
  try {
    const userId = (await params).id;
    
    // Verify the request is from an admin
    const currentUser = await getCurrentUser(request);
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    
    // Delete the user
    await db.users.delete(userId);
    
    return NextResponse.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
