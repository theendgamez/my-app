import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  try {
    // Verify admin access
    const user = await getCurrentUser(request);
    
    // Also check header auth as fallback
    const userIdHeader = request.headers.get('x-user-id');
    let isAdmin = false;

    if (user && user.role === 'admin') {
      isAdmin = true;
    } else if (userIdHeader) {
      try {
        const dbUser = await db.users.findById(userIdHeader);
        if (dbUser?.role === 'admin') {
          isAdmin = true;
        }
      } catch (error) {
        console.error('Error verifying admin via user ID:', error);
      }
    }

    if (!isAdmin) {
      return NextResponse.json(
        { error: '僅管理員可訪問此API' },
        { status: 403 }
      );
    }

    const { paymentId } = await params;
    const { status } = await request.json();
    
    // Validate status
    const validStatuses = ['pending', 'completed', 'failed', 'refunded'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: '無效的狀態值' },
        { status: 400 }
      );
    }
    
    // Check if payment exists
    const payment = await db.payments.findById(paymentId);
    if (!payment) {
      return NextResponse.json(
        { error: '找不到付款記錄' },
        { status: 404 }
      );
    }
    
    // Update payment status
    const updatedPayment = await db.payments.update(paymentId, { 
      status
    });
    
    // If status is refunded, also update related tickets
    if (status === 'refunded') {
      const tickets = await db.tickets.findByPayment(paymentId);
      
      // Update each ticket status
      for (const ticket of tickets) {
        await db.tickets.update(ticket.ticketId, { status: 'available' });
      }
    }

    return NextResponse.json({ payment: updatedPayment });
  } catch (error) {
    console.error('Error updating payment:', error);
    return NextResponse.json(
      { error: '更新付款狀態時出錯' },
      { status: 500 }
    );
  }
}
