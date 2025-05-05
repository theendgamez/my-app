import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// 拒絕好友請求
export async function POST(request: NextRequest) {
  try {
    // 驗證用戶身份
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: '請先登入以拒絕好友請求' }, { status: 401 });
    }

    const { friendshipId } = await request.json();
    
    // 基本驗證
    if (!friendshipId) {
      return NextResponse.json({ error: '缺少好友關係ID' }, { status: 400 });
    }
    // 獲取好友請求數據
    const friendship = await db.registration.findByToken(friendshipId) as Friendship
    interface Friendship {
        id: string;
        requesterId: string;
        recipientId: string;
        // Add other fields if necessary
        status: string;
        
      }

    if (!friendship) {
      return NextResponse.json({ error: '找不到該好友請求' }, { status: 404 });
    }

    // 確認當前用戶是接收者
    if (friendship.recipientId !== user.userId) {
      return NextResponse.json({ error: '無權拒絕此好友請求' }, { status: 403 });
    }

    // 確認請求狀態是待處理的
    if (friendship.status !== 'pending') {
      return NextResponse.json({ error: '此好友請求已被處理' }, { status: 400 });
    }

    // 拒絕好友請求（刪除記錄）
    await db.friends.reject(friendshipId);

    return NextResponse.json({
      message: '已拒絕好友請求'
    });
  } catch (error) {
    console.error('Error rejecting friend request:', error);
    return NextResponse.json(
      { error: '拒絕好友請求時出錯' },
      { status: 500 }
    );
  }
}
