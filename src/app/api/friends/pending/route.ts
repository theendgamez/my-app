import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// 獲取待處理的好友請求
export async function GET(request: NextRequest) {
  try {
    // 驗證用戶身份
    const user = await getCurrentUser(request);
    const headerUserId = request.headers.get('x-user-id');
    const userId = user?.userId || headerUserId;

    if (!userId) {
      return NextResponse.json(
        { error: '請先登入以查看好友請求' },
        { status: 401 }
      );
    }

    // 獲取待處理的好友請求
    const pendingRequests = await db.friends.findPendingByUser(userId);

    // 增強請求數據，獲取請求者的詳細信息
    const enhancedRequests = await Promise.all(
      pendingRequests.map(async (request) => {
        const requesterInfo = await db.users.findById(request.requesterId);
        
        return {
          ...request,
          requester: {
            userId: request.requesterId,
            userName: requesterInfo?.userName || '未知用戶',
            email: requesterInfo?.email || '',
          }
        };
      })
    );

    return NextResponse.json({ pendingRequests: enhancedRequests });
  } catch (error) {
    console.error('Error fetching pending friend requests:', error);
    return NextResponse.json(
      { error: '獲取好友請求時出錯' },
      { status: 500 }
    );
  }
}
