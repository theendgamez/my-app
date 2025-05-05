import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const user = await getCurrentUser(request);
    const headerUserId = request.headers.get('x-user-id');
    const userId = user?.userId || headerUserId;

    if (!userId) {
      return NextResponse.json(
        { error: '請先登入以接受好友請求' },
        { status: 401 }
      );
    }

    // Get friendshipId from request body
    const { friendshipId } = await request.json();
    
    if (!friendshipId) {
      return NextResponse.json(
        { error: '缺少好友關係ID' },
        { status: 400 }
      );
    }

    // Find the friendship
    const friendship = await db.friends.findById(friendshipId);
    if (!friendship) {
      return NextResponse.json(
        { error: '找不到該好友請求' },
        { status: 404 }
      );
    }

    // Verify this user is the recipient
    if (friendship.recipientId !== userId) {
      return NextResponse.json(
        { error: '您無權接受此好友請求' },
        { status: 403 }
      );
    }

    // Check if friendship is already accepted
    if (friendship.status === 'accepted') {
      return NextResponse.json(
        { error: '此好友請求已被接受' },
        { status: 400 }
      );
    }

    // Accept the friendship
    const updatedFriendship = await db.friends.accept(friendshipId);

    return NextResponse.json({
      message: '已成功接受好友請求',
      friendship: updatedFriendship
    });
  } catch (error) {
    console.error('Error accepting friend request:', error);
    return NextResponse.json(
      { error: '處理好友請求時出錯', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
