import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { decryptData, isEncrypted, encryptData } from '@/utils/encryption';
import { ApiResponseBuilder } from '@/lib/apiResponse';

// GET user by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const responseBuilder = new ApiResponseBuilder();
  
  try {
    // Get current user from token
    const currentUser = await getCurrentUser(request);
    const requestedId = (await params).id;
    const headerUserId = request.headers.get('x-user-id');

    // Check if user is requesting their own data, is admin, or x-user-id matches requestedId (with a valid token)
    const hasAccess = currentUser && (
      currentUser.userId === requestedId || 
      currentUser.role === 'admin' ||
      (headerUserId && headerUserId === requestedId)
    );

    if (!hasAccess) {
      return NextResponse.json(
        responseBuilder.error('UNAUTHORIZED', 'Unauthorized access'),
        { status: 403 }
      );
    }

    // Fetch user data
    const user = await db.users.findById(requestedId);

    if (!user) {
      return NextResponse.json(
        responseBuilder.error('USER_NOT_FOUND', 'User not found'),
        { status: 404 }
      );
    }

    // Decrypt sensitive fields if they appear to be encrypted
    if (user.isDataEncrypted || (user.phoneNumber && isEncrypted(user.phoneNumber))) {
      const userData = {
        ...user,
        phoneNumber: user.phoneNumber ? decryptData(user.phoneNumber) : '',
        realName: user.realName ? decryptData(user.realName) : ''
      };
      return NextResponse.json(responseBuilder.success(userData));
    }

    // Return user data
    return NextResponse.json(responseBuilder.success(user));
  } catch {
    return NextResponse.json(
      responseBuilder.error('FETCH_USER_ERROR', 'Failed to retrieve user data'),
      { status: 500 }
    );
  }
}

// PATCH to update user profile
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = (await params).id
    const { userName, email, phoneNumber } = await request.json();

    // Verify the user is authorized to make this edit
    const currentUser = await getCurrentUser(request);
    if (!currentUser || (currentUser.userId !== userId && currentUser.role !== 'admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Encrypt sensitive data during updates
    const updates = { 
      userName, 
      email, 
      phoneNumber: encryptData(phoneNumber),
      isDataEncrypted: true
    };
    
    await db.users.update(userId, updates);
    
    // Return decrypted data in response
    return NextResponse.json(
      { 
        message: 'Profile updated successfully', 
        user: { 
          userId, 
          userName, 
          email, 
          phoneNumber // Return original non-encrypted value in response
        } 
      },
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
  { params }: { params: Promise<{ id: string }> }
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
