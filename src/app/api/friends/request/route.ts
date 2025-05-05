import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';

// 發送好友請求
export async function POST(request: NextRequest) {
  try {
    // 驗證用戶身份
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: '請先登入以發送好友請求' }, { status: 401 });
    }

    const { recipientId } = await request.json();
    
    // 基本驗證
    if (!recipientId) {
      return NextResponse.json({ error: '缺少接收者ID' }, { status: 400 });
    }

    // 不能添加自己為好友
    if (recipientId === user.userId) {
      return NextResponse.json({ error: '不能添加自己為好友' }, { status: 400 });
    }

    // 檢查接收者是否存在
    const recipient = await db.users.findById(recipientId);
    if (!recipient) {
      return NextResponse.json({ error: '找不到該用戶' }, { status: 404 });
    }

    // 檢查是否已經是好友或有待處理的請求
    const existingFriendship = await db.friends.findByUsers(user.userId, recipientId);
    if (existingFriendship) {
      if (existingFriendship.status === 'accepted') {
        return NextResponse.json({ error: '你們已經是好友了' }, { status: 400 });
      } else if (existingFriendship.status === 'pending') {
        // 如果用戶是接收者，提醒他有待處理請求
        if (existingFriendship.recipientId === user.userId) {
          return NextResponse.json({ 
            error: '此用戶已向你發送好友請求，請前往好友頁面查看',
            friendshipId: existingFriendship.friendshipId 
          }, { status: 400 });
        }
        // 如果用戶是請求者，告知請求已存在
        return NextResponse.json({ 
          error: '你已向此用戶發送過好友請求',
          friendshipId: existingFriendship.friendshipId 
        }, { status: 400 });
      }
    }

    // 創建好友請求
    const friendshipId = uuidv4();
    const now = new Date().toISOString();
    
    const friendshipData = {
      friendshipId,
      requesterId: user.userId,
      requesterName: user.userName || user.email || '',
      recipientId,
      recipientName: recipient.userName || recipient.email || '',
      status: 'pending' as const,
      createdAt: now,
      userRelationship: `user#${user.userId}` // 用於索引查詢
    };

    await db.friends.create(friendshipData);

    // 在實際應用中，這裡可以發送通知給接收者

    return NextResponse.json({
      message: '好友請求已發送',
      friendship: friendshipData
    });
  } catch (error) {
    console.error('Error sending friend request:', error);
    return NextResponse.json(
      { error: '發送好友請求時出錯' },
      { status: 500 }
    );
  }
}
