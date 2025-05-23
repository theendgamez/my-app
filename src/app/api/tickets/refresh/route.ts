import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import db from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { ApiResponseBuilder } from '@/lib/apiResponse';

/**
 * API handler for refreshing a ticket's QR code
 * This generates a new secure code to prevent fraud
 */
export async function POST(request: NextRequest) {
  const responseBuilder = new ApiResponseBuilder();
  
  try {
    // Get current authenticated user with improved logging
    const user = await getCurrentUser(request);
    const headerUserId = request.headers.get('x-user-id');
    
    console.log('[Tickets Refresh API] Authentication check:', { 
      authenticatedUser: user?.userId || 'none',
      headerUserId: headerUserId || 'none',
      hasAuthHeader: !!request.headers.get('authorization')
    });
    
    if (!user && !headerUserId) {
      return NextResponse.json(
        responseBuilder.error('AUTHENTICATION_REQUIRED', 'Authentication required'),
        { status: 401 }
      );
    }
    
    // Get ticket ID from request body
    let body;
    try {
      body = await request.json();
    } catch  {
      return NextResponse.json(
        responseBuilder.error('INVALID_REQUEST_BODY', 'Invalid request body'),
        { status: 400 }
      );
    }
    
    const { ticketId } = body;
    
    if (!ticketId) {
      return NextResponse.json(
        responseBuilder.error('MISSING_TICKET_ID', 'Missing ticketId'),
        { status: 400 }
      );
    }
    
    // Retrieve the ticket to verify ownership
    const ticket = await db.tickets.findById(ticketId);
    
    if (!ticket) {
      return NextResponse.json(
        responseBuilder.error('TICKET_NOT_FOUND', 'Ticket not found'),
        { status: 404 }
      );
    }
    
    // Verify ticket ownership
    const userId = user?.userId || headerUserId;
    if (ticket.userId !== userId) {
      // Check if user is admin
      const isAdmin = user?.role === 'admin';
      if (!isAdmin) {
        return NextResponse.json(
          responseBuilder.error('UNAUTHORIZED_ACCESS', 'Unauthorized access to this ticket'),
          { status: 403 }
        );
      }
    }
    
    // Generate a new QR code
    // Format: ticketId + timestamp + random string to prevent guessing
    const timestamp = Date.now();
    const randomString = uuidv4().substring(0, 8);
    const newQrCode = `TICKET:${ticketId}:${timestamp}:${randomString}`;
    
    // Calculate next refresh time (5 minutes from now)
    const now = new Date();
    const nextRefresh = new Date(now.getTime() + 5 * 60 * 1000).toISOString();
    
    // Update the ticket with new QR code
    const updatedTicket = await db.tickets.update(ticketId, {
      qrCode: newQrCode,
      lastRefreshed: now.toISOString(),
      nextRefresh: nextRefresh
    });
    
    return NextResponse.json(
      responseBuilder.success({
        ticket: updatedTicket
      })
    );
    
  } catch (error) {
    console.error('Error refreshing ticket:', error);
    return NextResponse.json(
      responseBuilder.error('REFRESH_ERROR', 'Failed to refresh ticket', {
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500 }
    );
  }
}
