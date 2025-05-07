import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { ticketBlockchain } from '@/lib/blockchain';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ticketId = (await params).id;
    
    // 獲取用戶身份
    const user = await getCurrentUser(request);
    const headerUserId = request.headers.get('x-user-id');
    const isTicketChecker = request.headers.get('x-ticket-checker') === 'true';
    
    console.log('[Ticket History API] Authentication info:', { 
      authenticatedUser: user?.userId || 'none',
      headerUserId: headerUserId || 'none',
      userRole: user?.role || 'none',
      isTicketChecker
    });
    
    // 獲取票券信息
    const ticket = await db.tickets.findById(ticketId);
    if (!ticket) {
      return NextResponse.json(
        { error: '找不到該票券' },
        { status: 404 }
      );
    }

    // 驗證訪問權限
    // Check for admin status - admins can access any ticket history
    const isAdmin = user?.role === 'admin';
    
    // For non-admin users, check ownership
    if (!isAdmin && !isTicketChecker) {
      // Regular users need a user ID
      const userId = user?.userId || headerUserId;
      
      if (!userId) {
        return NextResponse.json(
          { error: '請先登入', code: 'UNAUTHORIZED' },
          { status: 401 }
        );
      }
      
      // A user can access history if they:
      // 1. Currently own the ticket
      // 2. Are the original owner of a transferred ticket
      const isCurrentOwner = userId === ticket.userId;
      const isOriginalOwner = userId === ticket.verificationInfo?.originalOwner;
      
      if (!isCurrentOwner && !isOriginalOwner) {
        console.log(`[Ticket History API] Access denied: User ${userId} attempting to access history for ticket owned by ${ticket.userId}`);
        return NextResponse.json(
          { error: '無權查看此票券交易歷史' },
          { status: 403 }
        );
      }
    } else {
      console.log('[Ticket History API] Access granted via admin role or ticket checker');
    }

    // 從區塊鏈獲取票券交易歷史
    const history = ticketBlockchain.getTicketHistory(ticketId);
    
    // 增強歷史數據，添加可讀性更強的信息
    const enhancedHistory = await Promise.all(history.map(async (transaction) => {
      let fromUser = null;
      let toUser = null;
      
      if (transaction.fromUserId) {
        const user = await db.users.findById(transaction.fromUserId);
        fromUser = user ? {
          userId: user.userId,
          name: user.realName || user.userName
        } : null;
      }
      
      if (transaction.toUserId) {
        const user = await db.users.findById(transaction.toUserId);
        toUser = user ? {
          userId: user.userId,
          name: user.realName || user.userName
        } : null;
      }
      
      return {
        ...transaction,
        fromUser,
        toUser,
        date: new Date(transaction.timestamp).toISOString()
      };
    }));
    
    return NextResponse.json({
      ticketId,
      history: enhancedHistory
    });
  } catch (error) {
    console.error('Error fetching ticket history:', error);
    return NextResponse.json(
      { error: '獲取票券交易歷史時出錯' },
      { status: 500 }
    );
  }
}
