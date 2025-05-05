import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// 刪除好友
export async function POST(request: NextRequest) {
  try {
    // 驗證用戶身份
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: '請先登入以刪除好友' }, { status: 401 });
    }

    const { friendshipId } = await request.json();
    
    // 基本驗證
    if (!friendshipId) {
      return NextResponse.json({ error: '缺少好友關係ID' }, { status: 400 });
    }

    // 獲取好友關係數據
    interface Friendship {
      id: string;
      requesterId: string;
      recipientId: string;
      // Add other fields if necessary
    }
    const friendship = await db.registration.findByToken(friendshipId) as Friendship | null;
    if (!friendship) {
      return NextResponse.json({ error: '找不到該好友關係' }, { status: 404 });
    }

    // 確認當前用戶是請求者或接收者
    if (friendship.requesterId !== user.userId && friendship.recipientId !== user.userId) {
      return NextResponse.json({ error: '無權刪除此好友關係' }, { status: 403 });
    }

    // 刪除好友關係
    await db.friends.remove(friendshipId);

    return NextResponse.json({
      message: '已刪除好友'
    });
  } catch (error) {
    console.error('Error removing friend:', error);
    return NextResponse.json(
      { error: '刪除好友時出錯' },
      { status: 500 }
    );
  }
}
