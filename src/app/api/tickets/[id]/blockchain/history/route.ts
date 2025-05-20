import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { ticketBlockchain } from '@/lib/blockchain';

// Define a type for the transaction history items
interface TicketHistoryItem {
  transactionDate: string;
  action: string;
  fromUser?: string | null | undefined;
  toUser?: string | null | undefined;
  blockchainRef?: string;
  [key: string]: unknown; // Allow for additional properties
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise< { id: string }> }
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
        { error: '無權查看此票券區塊鏈歷史' },
        { status: 403 }
      );
    }

    // 首先直接從區塊鏈獲取票券交易歷史
    const blockchainHistory = ticketBlockchain.getTicketHistory(ticketId);
    
    // Also get history from audit logs as a backup
    const auditHistory = await db.ticketAudit.getBlockchainHistory(ticketId);
    
    // Merge histories, prefer blockchain history but use audit history if needed
    let mergedHistory: TicketHistoryItem[] = [];
    
    if (blockchainHistory.length > 0) {
      // Format blockchain history
      mergedHistory = blockchainHistory.map(tx => ({
        transactionDate: new Date(tx.timestamp).toISOString(),
        action: tx.action,
        fromUser: tx.fromUserId,
        toUser: tx.toUserId,
        blockchainRef: tx.signature
      }));
    } else if (auditHistory.length > 0) {
      // Use audit history if blockchain history is empty
      mergedHistory = auditHistory;
    } 
    
    // If still no history but ticket has transferredAt, create a synthetic record based on transfer data
    if (mergedHistory.length === 0 && ticket.transferredAt) {
      const fromUserName = ticket.transferredFrom || 'unknown';
      let toUserName = 'unknown';
      
      try {
        let toUser = null;
        if (ticket.userId) {
          toUser = await db.users.findById(ticket.userId);
        }
        if (toUser) {
          toUserName = toUser.realName || toUser.userName || toUser.userId;
        }
      } catch (e) {
        console.error("Error fetching recipient user info:", e);
      }
      
      // Create synthetic history entry
      mergedHistory = [{
        transactionDate: ticket.transferredAt,
        action: 'transfer',
        fromUser: fromUserName,
        toUser: toUserName,
        blockchainRef: `synthetic_${Date.now()}`,
      }];
      
      // Trigger blockchain sync in the background
      setTimeout(async () => {
        try {
          await fetch(`/api/tickets/${ticketId}/sync-blockchain`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.INTERNAL_API_KEY || 'system'}`
            }
          });
        } catch (e) {
          console.error("Background sync failed:", e);
        }
      }, 100);
    }
    
    return NextResponse.json(mergedHistory);
  } catch (error) {
    console.error('Error getting blockchain history:', error);
    return NextResponse.json(
      { error: '獲取區塊鏈歷史時出錯' },
      { status: 500 }
    );
  }
}
