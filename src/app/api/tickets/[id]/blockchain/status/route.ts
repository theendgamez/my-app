import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ticketId = (await params).id;
    
    // 獲取用戶身份
    const user = await getCurrentUser(request);
    const headerUserId = request.headers.get('x-user-id');
    
    // 獲取票券信息
    const ticket = await db.tickets.findById(ticketId);
    if (!ticket) {
      return NextResponse.json(
        { error: '找不到該票券' },
        { status: 404 }
      );
    }

    // 驗證訪問權限
    const isAdmin = user?.role === 'admin';
    const isTicketOwner = user?.userId === ticket.userId;
    
    if (!isAdmin && !isTicketOwner && headerUserId !== ticket.userId) {
      return NextResponse.json(
        { error: '無權查看此票券區塊鏈狀態' },
        { status: 403 }
      );
    }

    // 檢查票券是否已記錄在區塊鏈上
    const isRecorded = await db.ticketAudit.isRecordedOnBlockchain(ticketId);
    
    return NextResponse.json({ isRecorded });
  } catch (error) {
    console.error('Error checking blockchain status:', error);
    return NextResponse.json(
      { error: '檢查區塊鏈狀態時出錯' },
      { status: 500 }
    );
  }
}
