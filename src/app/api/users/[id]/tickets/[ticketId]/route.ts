import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getCurrentUser} from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; ticketId: string }> }
) {
  try {
    const resolvedParams = await params;
    const userId = resolvedParams.id;
    const ticketId = resolvedParams.ticketId;
    
    console.log(`[User Tickets API] Looking up ticket ${ticketId} for user ${userId}`, {
      timestamp: new Date().toISOString()
    });
    
    if (!userId || !ticketId) {
      return NextResponse.json({ 
        error: '缺少必要參數',
        details: { userId, ticketId }
      }, { status: 400 });
    }

    // Enhanced authentication checks
    const user = await getCurrentUser(request);
    const headerUserId = request.headers.get('x-user-id');
    const isAdminRequest = user?.role === 'admin';
    
    // Authorization with improved logic
    const isAuthorized = isAdminRequest || 
                         (user?.userId === userId) || 
                         (headerUserId === userId);
                         
    if (!isAuthorized) {
      console.error('[User Tickets API] Access denied:', {
        user: user?.userId || 'none',
        headerUserId: headerUserId || 'none',
        requestedUserId: userId,
        isAdmin: isAdminRequest
      });
      
      return NextResponse.json({ 
        error: '無權訪問此用戶的票券',
        code: 'UNAUTHORIZED_ACCESS' 
      }, { status: 403 });
    }

    // Fetch all tickets for the user
    const userTickets = await db.tickets.findByUser(userId);
    
    // Find the specific ticket
    const ticket = userTickets.find(t => t.ticketId === ticketId);
    
    if (!ticket) {
      return NextResponse.json({ 
        error: '找不到指定的票券',
        code: 'TICKET_NOT_FOUND' 
      }, { status: 404 });
    }
    
    // Return the ticket
    return NextResponse.json(ticket);
  } catch (error) {
    console.error('[User Tickets API] Error:', error);
    return NextResponse.json({ 
      error: '獲取票券詳情時出錯',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
