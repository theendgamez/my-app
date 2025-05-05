import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import db  from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const user = await getCurrentUser(request);
    const headerUserId = request.headers.get('x-user-id');
    const userId = user?.userId || headerUserId;

    if (!userId) {
      return NextResponse.json(
        { error: '請先登入', message: 'Authentication required' },
        { status: 401 }
      );
    }

    const data = await request.json();
    const { registrationToken } = data;
    
    if (!registrationToken) {
      return NextResponse.json(
        { error: '缺少登記令牌' },
        { status: 400 }
      );
    }

    // Get the registration to verify ownership
    const registration = await db.registration.findByToken(registrationToken) as { userId: string } | null;
    
    if (!registration) {
      return NextResponse.json(
        { error: '找不到該抽籤登記' },
        { status: 404 }
      );
    }

    if (registration.userId !== userId) {
      return NextResponse.json(
        { error: '無權訪問此抽籤登記' },
        { status: 403 }
      );
    }

    // Mark the result as viewed
    await db.registration.update(registrationToken, {
      resultViewed: true
    });

    return NextResponse.json({
      success: true,
      message: '通知已標記為已讀'
    });
  } catch (error) {
    console.error('Error marking lottery notification as read:', error);
    return NextResponse.json(
      { error: '處理通知時出錯', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
