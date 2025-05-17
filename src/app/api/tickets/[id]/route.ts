import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ticketId = (await params).id;
    
    console.log(`[Tickets API] Looking up ticket by ID: ${ticketId}`);
    
    if (!ticketId) {
      return NextResponse.json({ error: '未提供票券ID' }, { status: 400 });
    }

    // Authenticate user with improved logging
    const user = await getCurrentUser(request);
    const headerUserId = request.headers.get('x-user-id');
    const isTicketChecker = request.headers.get('x-ticket-checker') === 'true';
    
    console.log('[Tickets API] Authentication info:', { 
      authenticatedUser: user?.userId || 'none',
      headerUserId: headerUserId || 'none',
      userRole: user?.role || 'none',
      isTicketChecker
    });
    
    // Check for admin status
    const isAdmin = user?.role === 'admin';
    
    // If user is not admin, they must provide authentication
    if (!isAdmin && !user?.userId && !headerUserId) {
      return NextResponse.json({ error: '請先登入', code: 'UNAUTHORIZED' }, { status: 401 });
    }
    
    // For non-admin users, we need a valid userId
    const userId = user?.userId || headerUserId;

    // First try to find the ticket directly by its ID
    const ticket = await db.tickets.findById(ticketId);
    if (!ticket) {
      // If ticket not found by direct ID, check if it's a payment ID
      const ticketsByPayment = await db.tickets.findByPayment(ticketId);
      
      if (ticketsByPayment && ticketsByPayment.length > 0) {
        return NextResponse.json(ticketsByPayment[0]);
      }
      
      return NextResponse.json({ error: '找不到該票券' }, { status: 404 });
    }

    // Authorization check - user can access if:
    // 1. They are an admin
    // 2. They are a ticket checker (special role)
    // 3. They own the ticket
    // 4. The ticket was transferred to them
    if (isAdmin || isTicketChecker) {
      console.log('[Tickets API] Access granted via admin role or ticket checker');
      // Admin or ticket checker can access any ticket
      return NextResponse.json(ticket);
    }
    
    // For regular users, check ownership
    const isOwner = ticket.userId === userId;
    
    // Check if this user is the recipient of a transferred ticket
    // A recipient is the current owner (userId) of a transferred ticket
    // where the original owner is different from the current user
    const isRecipient = ticket.verificationInfo?.isTransferred && 
                        ticket.userId === userId && 
                        ticket.verificationInfo?.originalOwner !== userId;
    
    if (!isOwner && !isRecipient) {
      console.log(`[Tickets API] Auth failed: User ${userId} attempting to access ticket for user ${ticket.userId}`);
      
      // Special case: If this appears to be a transferred ticket, provide a better error
      if (ticket.verificationInfo?.isTransferred) {
        return NextResponse.json({ 
          error: '此票券已被轉讓，但您不是接收者',
          code: 'WRONG_RECIPIENT',
          ticketOwnerId: ticket.userId
        }, { status: 403 });
      }
      
      return NextResponse.json({ 
        error: '您無權查看此票券', 
        code: 'UNAUTHORIZED_ACCESS' 
      }, { status: 403 });
    }

    // Check if this ticket is from a lottery and payment is required
    if (ticket.status === 'reserved') {
      // Find associated registration
      const registrations = await db.registration.findByTicket(ticket.ticketId);
      const registration = registrations && Array.isArray(registrations) ? registrations[0] : undefined;
      
      if (registration && registration.paymentStatus !== 'paid') {
        // Enhance ticket with lottery info
        return NextResponse.json({
          ...ticket,
          lotteryInfo: {
            requiresPayment: true,
            registrationToken: registration.registrationToken
          }
        });
      }
    }
    
    // Return ticket data
    return NextResponse.json(ticket);
  } catch (error) {
    console.error('[Tickets API] Error:', error);
    return NextResponse.json({ 
      error: '獲取票券詳情時出錯',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
