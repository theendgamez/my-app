import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import crypto from 'crypto';

export async function POST(
  request: NextRequest,
  { params }: { params:  Promise<{ id: string }> }
) {
  try {
    const ticketId = (await params).id;
    
    // 獲取用戶身份
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json(
        { error: '未經認證的請求' },
        { status: 401 }
      );
    }
    
    // 獲取票券信息
    const ticket = await db.tickets.findById(ticketId);
    if (!ticket) {
      return NextResponse.json(
        { error: '找不到該票券' },
        { status: 404 }
      );
    }

    // 驗證訪問權限
    const isAdmin = user.role === 'admin';
    const isTicketOwner = user.userId === ticket.userId;
    
    if (!isAdmin && !isTicketOwner) {
      return NextResponse.json(
        { error: '無權同步此票券至區塊鏈' },
        { status: 403 }
      );
    }

    // 檢查票券是否已記錄在區塊鏈上
    const isRecorded = await db.ticketAudit.isRecordedOnBlockchain(ticketId);
    if (isRecorded) {
      return NextResponse.json({
        synced: false,
        message: '此票券已記錄在區塊鏈中'
      });
    }

    // 如果票券有轉讓記錄但沒有同步到區塊鏈，則創建同步記錄
    if (ticket.transferredAt) {
      // 創建模擬區塊鏈參考ID
      const blockchainRef = crypto
        .createHash('sha256')
        .update(`${ticketId}:${Date.now()}:transfer`)
        .digest('hex');
      
      // 記錄同步日誌
      await db.ticketAudit.logBlockchainSync(ticketId, blockchainRef);
      
      return NextResponse.json({
        synced: true,
        blockchainRef,
        message: '票券成功同步至區塊鏈'
      });
    }

    return NextResponse.json({
      synced: false,
      message: '沒有可同步的交易'
    });
  } catch (error) {
    console.error('Error syncing to blockchain:', error);
    return NextResponse.json(
      { error: '同步至區塊鏈時出錯' },
      { status: 500 }
    );
  }
}
