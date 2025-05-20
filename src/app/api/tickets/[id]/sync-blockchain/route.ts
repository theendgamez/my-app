import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { syncTicketTransferToBlockchain } from '@/lib/blockchain';
import type { TicketAuditLog } from '@/types';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ticketId = (await params).id;
    
    // Get authenticated user
    const user = await getCurrentUser(request);
    const userIdHeader = request.headers.get('x-user-id');
    const isSystemRequest = request.headers.get('Authorization')?.includes('system') || false;
    
    if (!user && !userIdHeader && !isSystemRequest) {
      return NextResponse.json({ error: '請先登入' }, { status: 401 });
    }
    
    const userId = user?.userId || userIdHeader;
    
    // Get ticket details
    const ticket = await db.tickets.findById(ticketId);
    if (!ticket) {
      return NextResponse.json({ error: '找不到票券' }, { status: 404 });
    }
    
    // Check access rights - owner or admin or system can sync
    const isAdmin = user?.role === 'admin';
    const isOwner = ticket.userId === userId;
    
    if (!isAdmin && !isOwner && !isSystemRequest) {
      return NextResponse.json({ error: '無權操作此票券' }, { status: 403 });
    }
    
    // Check if already recorded
    const isRecorded = await db.ticketAudit.isRecordedOnBlockchain(ticketId);
    if (isRecorded) {
      return NextResponse.json({
        success: true,
        message: '票券已記錄在區塊鏈中',
        synced: false
      });
    }
    
    // Direct blockchain sync if we have transfer data in the ticket
    if (ticket.transferredAt) {
      // Get the eventId
      const eventId = ticket.eventId;
      
      // Get from and to user info
      const fromUserId = ticket.transferredFrom || 'unknown';
      const toUserId = ticket.userId;
      
      // Get names for reporting
      let fromUserName = 'Unknown';
      let toUserName = 'Unknown';
      
      try {
        const fromUser = await db.users.findById(fromUserId);
        if (fromUser) {
          fromUserName = fromUser.realName || fromUser.userName || fromUserId;
        }
        
        const toUser = await db.users.findById(toUserId);
        if (toUser) {
          toUserName = toUser.realName || toUser.userName || toUserId;
        }
      } catch (e) {
        console.error("Error fetching user info for sync:", e);
      }
      
      // Transfer time from ticket
      const timestamp = new Date(ticket.transferredAt).getTime();
      
      // Sync to blockchain
      const success = await syncTicketTransferToBlockchain(
        ticketId,
        fromUserId,
        toUserId,
        timestamp,
        eventId
      );
      
      // Add explicit logging to debug
      console.log('Blockchain sync result:', {
        ticketId,
        success,
        timestamp,
        fromUserId,
        toUserId,
        eventId
      });
      
      if (success) {
        // Add a log entry
        await db.ticketAudit.logBlockchainSync(ticketId, 
          `sync_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`
        );
        
        return NextResponse.json({
          success: true,
          message: '票券交易已成功同步至區塊鏈',
          synced: true,
          transferDetails: {
            from: fromUserName,
            to: toUserName,
            timestamp: ticket.transferredAt
          }
        });
      }
    }
    
    // If no direct sync possible, try audit logs
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
    
    // Find the most recent transfer
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
    
    // Parse transfer details
    const detailsPattern = /Transferred from (.+?) to (.+)/;
    let match = null;
    
    if (typeof latestTransfer.details === 'string') {
      match = latestTransfer.details.match(detailsPattern);
    }

    if (!latestTransfer.details || !match || match.length < 3) {
      // Create a synthetic transfer record if we can't parse the details
      const fromUserName = 'Unknown';
      let toUserName = 'Unknown';
      
      try {
        const toUser = await db.users.findById(ticket.userId);
        if (toUser) {
          toUserName = toUser.realName || toUser.userName || toUser.userId;
        }
      } catch (e) {
        console.error("Error fetching recipient info:", e);
      }
      
      // Sync to blockchain
      const timestamp = new Date(latestTransfer.timestamp).getTime();
      const success = await syncTicketTransferToBlockchain(
        ticketId,
        ticket.transferredFrom || 'unknown',
        ticket.userId,
        timestamp,
        eventId
      );
      
      if (success) {
        // Log the sync
        await db.ticketAudit.logBlockchainSync(ticketId, 
          `sync_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`
        );
        
        return NextResponse.json({
          success: true,
          message: '票券交易已成功同步至區塊鏈 (通過票券資料)',
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
          message: '同步到區塊鏈失敗 (使用票券資料嘗試)',
          synced: false
        });
      }
    }

    const fromUserName = match[1];
    const toUserName = match[2];
    
    // Get user IDs
    const fromUserId = latestTransfer.userId || ticket.transferredFrom || 'unknown'; 
    const toUserId = ticket.userId;
    
    // Sync to blockchain
    const timestamp = new Date(latestTransfer.timestamp).getTime();
    const success = await syncTicketTransferToBlockchain(
      ticketId,
      fromUserId,
      toUserId,
      timestamp,
      eventId
    );
    
    if (success) {
      // Log the sync
      await db.ticketAudit.logBlockchainSync(ticketId, 
        `sync_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`
      );
      
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
