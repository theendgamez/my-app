import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { DatabaseOptimizer } from '@/lib/dbOptimization';
import { getCurrentUser } from '@/lib/auth';
import { decryptData, isEncrypted, encryptData } from '@/utils/encryption';

// Define a proper filter type for users
interface UserFilter {
  role?: string;
  isActive?: boolean;
}

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
    const role = searchParams.get('role');
    const isActive = searchParams.get('isActive');
    
    // Build filter with proper typing
    const filter: UserFilter = {};
    if (role) filter.role = role;
    if (isActive !== null) filter.isActive = isActive === 'true';
    
    // Use optimized pagination
    const result = await DatabaseOptimizer.findWithPagination(
      'users',
      filter,
      page,
      limit,
      { createdAt: 'desc' }
    );
    
    // Apply search filter on paginated results
    let filteredUsers = result.data;
    if (search) {
      filteredUsers = result.data.filter(user =>
        user.realName?.toLowerCase().includes(search.toLowerCase()) ||
        user.email?.toLowerCase().includes(search.toLowerCase()) ||
        user.userName?.toLowerCase().includes(search.toLowerCase())
      );
    }
    
    // Decrypt sensitive user data
    const decryptedUsers = filteredUsers.map((user): typeof user => {
      const decryptedUser = { ...user };
      
      if (user.phoneNumber && (user.isDataEncrypted || isEncrypted(user.phoneNumber))) {
        decryptedUser.phoneNumber = decryptData(user.phoneNumber);
      }
      return decryptedUser;
    });

    return NextResponse.json({
      users: decryptedUsers,
      pagination: {
        total: result.total,
        page,
        limit,
        totalPages: Math.ceil(result.total / limit),
        hasMore: result.hasMore
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

// Handle batch user updates from admin panel
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

    const { updates, isBatch } = await request.json();
    
    if (isBatch && Array.isArray(updates)) {
      // Handle batch updates
      const batchUpdates = updates.map(update => ({
        id: update.userId,
        data: {
          ...update.data,
          phoneNumber: update.data.phoneNumber ? encryptData(update.data.phoneNumber) : undefined,
          realName: update.data.realName ? encryptData(update.data.realName) : undefined,
          isDataEncrypted: true
        }
      }));
      
      const result = await DatabaseOptimizer.batchUpdate('users', batchUpdates);
      
      return NextResponse.json({
        success: true,
        message: `Batch update completed: ${result.successful} successful, ${result.failed} failed`,
        details: result
      });
    } else {
      // Handle single update
      const { userId, updates: singleUpdate } = await request.json();
      
      if (!userId) {
        return NextResponse.json(
          { error: "User ID is required" },
          { status: 400 }
        );
      }
      
      const updatesToSave = { ...singleUpdate };
      
      if (singleUpdate.phoneNumber !== undefined) {
        updatesToSave.phoneNumber = encryptData(singleUpdate.phoneNumber);
        updatesToSave.isDataEncrypted = true;
      }
      
      if (singleUpdate.realName !== undefined) {
        updatesToSave.realName = encryptData(singleUpdate.realName);
        updatesToSave.isDataEncrypted = true;
      }
      
      await db.users.update(userId, updatesToSave);
      
      return NextResponse.json({
        success: true,
        message: "User updated successfully"
      });
    }
    
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: "Failed to update user data" },
      { status: 500 }
    );
  }
}
