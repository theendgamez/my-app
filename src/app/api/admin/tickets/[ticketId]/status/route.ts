import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ ticketId: string }> }
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
        { error: '僅管理員可更改票券狀態' },
        { status: 403 }
      );
    }

    const { ticketId } = await params;
    
    if (!ticketId) {
      return NextResponse.json(
        { error: '必須提供票券ID' },
        { status: 400 }
      );
    }

    // Get update data
    const { status } = await request.json();
    
    if (!['available', 'reserved', 'sold', 'used', 'cancelled'].includes(status)) {
      return NextResponse.json(
        { error: '無效的票券狀態' },
        { status: 400 }
      );
    }

    // Update ticket status
    const updatedTicket = await db.tickets.updateStatus(ticketId, status);

    return NextResponse.json(updatedTicket);
  } catch (error) {
    console.error('Error updating ticket status:', error);
    return NextResponse.json(
      { error: '更新票券狀態時出錯' },
      { status: 500 }
    );
  }
}
