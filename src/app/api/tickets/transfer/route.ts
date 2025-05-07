import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { ticketBlockchain } from '@/lib/blockchain';

export async function POST(request: NextRequest) {
  try {
    const { ticketId, friendId } = await request.json();
    
    // Validate required fields
    if (!ticketId) {
      return NextResponse.json({ error: '缺少票券ID' }, { status: 400 });
    }
    
    if (!friendId) {
      return NextResponse.json({ error: '缺少接收者ID' }, { status: 400 });
    }
    
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
      return NextResponse.json({ error: '無法找到票券' }, { status: 404 });
    }
    
    // Check ownership
    if (ticket.userId !== userId) {
      return NextResponse.json({ error: '您不是此票券的擁有者，無法轉讓' }, { status: 403 });
    }
    
    // Get the recipient user details
    const recipient = await db.users.findById(friendId);
    
    if (!recipient) {
      return NextResponse.json({ error: '無法找到接收者' }, { status: 404 });
    }

    // Record original owner before transfer
    const originalOwner = ticket.userId;
    const originalOwnerDetails = await db.users.findById(originalOwner);
    
    // Transfer ticket
    const transferredTicket = await db.tickets.transfer(ticketId, friendId, recipient.realName || recipient.userName);

    // Add blockchain transaction for the transfer (directly call the method without storing the result)
    ticketBlockchain.addTransaction({
      ticketId,
      timestamp: Date.now(),
      action: 'transfer',
      fromUserId: originalOwner,
      toUserId: friendId,
      eventId: ticket.eventId
    });
    
    // Process the pending transactions to finalize them in the blockchain
    ticketBlockchain.processPendingTransactions();

    // Record the ticket transfer in the audit log
    await db.ticketAudit.log({
      ticketId,
      action: 'transfer',
      userId: originalOwner,
      userRole: 'user',
      timestamp: new Date().toISOString(),
      details: `Transferred from ${originalOwnerDetails?.realName || originalOwnerDetails?.userName || originalOwner} to ${recipient.realName || recipient.userName}`
    });
    
    return NextResponse.json({
      success: true,
      message: '票券轉讓成功',
      ticket: transferredTicket
    });
  } catch (error) {
    console.error('Error transferring ticket:', error);
    return NextResponse.json(
      { error: '票券轉讓時出錯', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
