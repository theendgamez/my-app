import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { ticketBlockchain } from '@/lib/blockchain';

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
    const isOwner = user?.userId === ticket.userId || headerUserId === ticket.userId;
    
    if (!isAdmin && !isOwner) {
      return NextResponse.json(
        { error: '無權查看此票券交易歷史' },
        { status: 403 }
      );
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
