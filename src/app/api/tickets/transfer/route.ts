import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const user = await getCurrentUser(request);
    const headerUserId = request.headers.get('x-user-id');
    const userId = user?.userId || headerUserId;

    if (!userId) {
      return NextResponse.json(
        { error: '請先登入以轉贈票券' },
        { status: 401 }
      );
    }

    // Get request data
    const { ticketId, recipientId } = await request.json();
    
    if (!ticketId || !recipientId) {
      return NextResponse.json(
        { error: '缺少必要參數' },
        { status: 400 }
      );
    }

    // Find the ticket
    const ticket = await db.tickets.findById(ticketId);
    if (!ticket) {
      return NextResponse.json(
        { error: '找不到該票券' },
        { status: 404 }
      );
    }

    // Verify ticket ownership
    if (ticket.userId !== userId) {
      return NextResponse.json(
        { error: '您無權轉贈此票券' },
        { status: 403 }
      );
    }

    // Verify ticket is eligible for transfer
    if (ticket.status !== 'available' && ticket.status !== 'sold') {
      return NextResponse.json(
        { error: '此票券無法轉贈' },
        { status: 400 }
      );
    }

    // Find recipient user
    const recipient = await db.users.findById(recipientId);
    if (!recipient) {
      return NextResponse.json(
        { error: '找不到接收者' },
        { status: 404 }
      );
    }

    // Verify these users are friends
    const friendship = await db.friends.findByUsers(userId, recipientId);
    if (!friendship || friendship.status !== 'accepted') {
      return NextResponse.json(
        { error: '只能轉贈票券給您的好友' },
        { status: 403 }
      );
    }

    // Transfer the ticket
    const updatedTicket = await db.tickets.transfer(
      ticketId, 
      recipientId, 
      recipient.realName || recipient.userName || recipient.email
    );

    return NextResponse.json({
      success: true,
      message: '票券轉贈成功',
      ticket: updatedTicket
    });
  } catch (error) {
    console.error('Error transferring ticket:', error);
    return NextResponse.json(
      { error: '處理票券轉贈時出錯', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
