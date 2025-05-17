import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { decryptData, isEncrypted, encryptData } from '@/utils/encryption';

export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const currentUser = await getCurrentUser(request);
    
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json(
        { error: "Unauthorized access" },
        { status: 403 }
      );
    }

    // Get query parameters for pagination/filtering
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    
    // Fetch users from database
    const allUsers = await db.users.findMany();
    // Apply search filter
    const filteredUsers = search
      ? allUsers.filter(user =>
          user.realName?.toLowerCase().includes(search.toLowerCase()) ||
          user.email?.toLowerCase().includes(search.toLowerCase())
        )
      : allUsers;
    // Apply pagination
    const start = (page - 1) * limit;
    const users = filteredUsers.slice(start, start + limit);
    
    // Decrypt sensitive user data
    const decryptedUsers = users.map((user): typeof user => {
      // Create a new object to avoid modifying the original
      const decryptedUser = { ...user };
      
      // Decrypt phone number if it's encrypted
      if (user.phoneNumber && (user.isDataEncrypted || isEncrypted(user.phoneNumber))) {
        decryptedUser.phoneNumber = decryptData(user.phoneNumber);
      }
      return decryptedUser;
    });

    // Get total count for pagination
    const totalUsers = filteredUsers.length;
    
    return NextResponse.json({
      users: decryptedUsers,
      pagination: {
        total: totalUsers,
        page,
        limit,
        totalPages: Math.ceil(totalUsers / limit)
      }
    });
    
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: "Failed to retrieve user data" },
      { status: 500 }
    );
  }
}

// Handle user updates from admin panel
export async function PATCH(request: NextRequest) {
  try {
    // Verify admin authentication
    const currentUser = await getCurrentUser(request);
    
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json(
        { error: "Unauthorized access" },
        { status: 403 }
      );
    }

    const { userId, updates } = await request.json();
    
    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }
    
    // Encrypt sensitive fields before updating
    const updatesToSave = { ...updates };
    
    if (updates.phoneNumber !== undefined) {
      updatesToSave.phoneNumber = encryptData(updates.phoneNumber);
      updatesToSave.isDataEncrypted = true;
    }
    
    if (updates.realName !== undefined) {
      updatesToSave.realName = encryptData(updates.realName);
      updatesToSave.isDataEncrypted = true;
    }
    
    // Update user in database
    await db.users.update(userId, updatesToSave);
    
    return NextResponse.json({
      success: true,
      message: "User updated successfully"
    });
    
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: "Failed to update user data" },
      { status: 500 }
    );
  }
}
