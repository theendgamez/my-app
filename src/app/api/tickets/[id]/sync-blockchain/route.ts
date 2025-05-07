import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { syncTicketTransferToBlockchain } from '@/lib/blockchain';
import type { TicketAuditLog } from '@/types'; // Add this import

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ticketId = (await params).id;
    
    // Get authenticated user
    const user = await getCurrentUser(request);
    const userIdHeader = request.headers.get('x-user-id');
    
    if (!user && !userIdHeader) {
      return NextResponse.json({ error: '請先登入' }, { status: 401 });
    }
    
    const userId = user?.userId || userIdHeader;
    
    // Get ticket details
    const ticket = await db.tickets.findById(ticketId);
    if (!ticket) {
      return NextResponse.json({ error: '找不到票券' }, { status: 404 });
    }
    
    // Check access rights - owner or admin can sync
    const isAdmin = user?.role === 'admin';
    const isOwner = ticket.userId === userId;
    
    if (!isAdmin && !isOwner) {
      return NextResponse.json({ error: '無權操作此票券' }, { status: 403 });
    }
    
    // 查詢相關的審計記錄
    const auditLogs = await db.ticketAudit.getLogsByTicketId(ticketId, 'transfer');
    
    if (!auditLogs || auditLogs.length === 0) {
      return NextResponse.json({
        success: false,
        message: '沒有找到可同步的轉讓記錄',
        synced: false
      });
    }
    
    // Get ticket event ID
    const eventId = ticket.eventId;
    
    // 找出最近的轉讓記錄((latest, current) => {
    const latestTransfer = auditLogs.reduce<TicketAuditLog | null>((latest, current) => {
      const currentTime = new Date(current.timestamp).getTime();
      const latestTime = latest ? new Date(latest.timestamp).getTime() : 0;
      return currentTime > latestTime ? current : latest;
    }, null);
    
    if (!latestTransfer) {
      return NextResponse.json({
        success: false,
        message: '無效的轉讓記錄',
        synced: false
      });
    }
    
    // 解析從誰轉讓給誰
    const detailsPattern = /Transferred from (.+?) to (.+)/;
    const match = latestTransfer.details?.match(detailsPattern);

    if (!latestTransfer.details || !match || match.length < 3) {
      return NextResponse.json({
        success: false,
        message: '轉讓記錄格式不正確',
        synced: false
      });
    }

    const fromUserName = match[1];
    const toUserName = match[2];
    
    // 從姓名找到 userId
    let fromUserId = latestTransfer.userId; // 默認使用審計記錄中的 userId（執行轉讓者）
    const toUserId = ticket.userId; // 當前票券持有者

    // 查找轉讓前的擁有者信息
    if (ticket.transferredFrom) {
      fromUserId = ticket.transferredFrom;
    }
    
    // 同步到區塊鏈
    const timestamp = new Date(latestTransfer.timestamp).getTime();
    const success = await syncTicketTransferToBlockchain(
      ticketId,
      fromUserId,
      toUserId,
      timestamp,
      eventId
    );
    
    if (success) {
      return NextResponse.json({
        success: true,
        message: '票券交易已成功同步至區塊鏈',
        synced: true,
        transferDetails: {
          from: fromUserName,
          to: toUserName,
          timestamp: latestTransfer.timestamp
        }
      });
    } else {
      return NextResponse.json({
        success: false,
        message: '同步到區塊鏈失敗',
        synced: false
      });
    }
    
  } catch (error) {
    console.error('Error syncing ticket to blockchain:', error);
    return NextResponse.json(
      { error: '同步票券至區塊鏈時出錯', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
