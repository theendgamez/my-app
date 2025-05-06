import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// DELETE specific user by ID (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    // Verify admin access
    const user = await getCurrentUser(request);
    
    // Also check header auth as fallback
    const userIdHeader = request.headers.get('x-user-id');
    let isAdmin = false;

    if (user && user.role === 'admin') {
      isAdmin = true;
    } else if (userIdHeader) {
      try {
        const dbUser = await db.users.findById(userIdHeader);
        if (dbUser?.role === 'admin') {
          isAdmin = true;
        }
      } catch (error) {
        console.error('Error verifying admin via user ID:', error);
      }
    }

    if (!isAdmin) {
      return NextResponse.json(
        { error: '僅管理員可刪除用戶' },
        { status: 403 }
      );
    }

    const { userId } = await params;
    
    if (!userId) {
      return NextResponse.json(
        { error: '必須提供用戶ID' },
        { status: 400 }
      );
    }

    // Prevent deleting yourself
    if (user && userId === user.userId) {
      return NextResponse.json(
        { error: '無法刪除當前登入的管理員帳戶' },
        { status: 400 }
      );
    }

    // Delete the user
    await db.users.delete(userId);

    return NextResponse.json(
      { message: '用戶已成功刪除' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: '刪除用戶時出錯' },
      { status: 500 }
    );
  }
}

// GET specific user by ID (admin only)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    // Verify admin access
    const currentUser = await getCurrentUser(request);
    
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json(
        { error: '僅管理員可查看用戶詳情' },
        { status: 403 }
      );
    }

    const { userId } = await params;
    
    // Get user details
    const user = await db.users.findById(userId);
    
    if (!user) {
      return NextResponse.json(
        { error: '找不到該用戶' },
        { status: 404 }
      );
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error('Error fetching user details:', error);
    return NextResponse.json(
      { error: '獲取用戶詳情時出錯' },
      { status: 500 }
    );
  }
}
