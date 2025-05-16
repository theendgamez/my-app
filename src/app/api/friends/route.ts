import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { decryptData, isEncrypted } from '@/utils/encryption';

// 獲取用戶的好友列表
export async function GET(request: NextRequest) {
  try {
    // 驗證用戶身份
    const user = await getCurrentUser(request);
    const headerUserId = request.headers.get('x-user-id');
    const userId = user?.userId || headerUserId;

    if (!userId) {
      return NextResponse.json(
        { error: '請先登入以查看您的好友列表' },
        { status: 401 }
      );
    }

    // 獲取好友關係列表
    const friendships = await db.friends.findByUser(userId);

    // 增強好友數據，獲取好友的詳細信息
    const enhancedFriendships = await Promise.all(
      friendships.map(async (friendship) => {
        const friendId = friendship.requesterId === userId 
          ? friendship.recipientId 
          : friendship.requesterId;
        
        const friendInfo = await db.users.findById(friendId);
        
        // 處理加密數據
        let phoneNumber = friendInfo?.phoneNumber || '';
        
        // 如果電話號碼是加密的，則解密
        if (friendInfo?.isDataEncrypted || isEncrypted(phoneNumber)) {
          phoneNumber = decryptData(phoneNumber);
        }
        
        // 計算友誼時間（天數）
        const acceptedAt = friendship.acceptedAt ? new Date(friendship.acceptedAt) : new Date();
        const now = new Date();
        const friendshipDays = Math.floor((now.getTime() - acceptedAt.getTime()) / (1000 * 60 * 60 * 24));
        
        return {
          ...friendship,
          friend: {
            userId: friendId,
            userName: friendInfo?.userName || '未知用戶',
            email: friendInfo?.email || '',
            phoneNumber: phoneNumber,
          },
          friendshipDays,
          canTransferTickets: friendshipDays >= 7
        };
      })
    );

    return NextResponse.json({ friendships: enhancedFriendships });
  } catch (error) {
    console.error('Error fetching friends list:', error);
    return NextResponse.json(
      { error: '獲取好友列表時出錯' },
      { status: 500 }
    );
  }
}
