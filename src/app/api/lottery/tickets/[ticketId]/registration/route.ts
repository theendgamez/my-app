import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// Define interface for registration
interface Registration {
  registrationToken: string;
  ticketIds?: string[];
  userId?: string;
  eventId?: string;
  status?: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  try {
    const ticketId = (await params).ticketId;
    console.log(`API: Looking up registration for ticket ${ticketId}`);
    
    if (!ticketId) {
      return NextResponse.json({ error: '缺少票券ID' }, { status: 400 });
    }

    // Get user from authentication
    const user = await getCurrentUser(request);
    const headerUserId = request.headers.get('x-user-id');
    const userId = user?.userId || headerUserId;

    if (!userId) {
      return NextResponse.json({ error: '請先登入' }, { status: 401 });
    }

    console.log(`API: User ${userId} requesting ticket resolution for ${ticketId}`);

    // Get the ticket first
    const ticket = await db.tickets.findById(ticketId);
    if (!ticket) {
      console.log(`API: Ticket ${ticketId} not found`);
      return NextResponse.json({ error: '找不到該票券' }, { status: 404 });
    }

    // Check if user owns this ticket
    if (ticket.userId !== userId && user?.role !== 'admin') {
      console.log(`API: User ${userId} does not own ticket ${ticketId}`);
      return NextResponse.json({ error: '無權訪問此票券' }, { status: 403 });
    }

    console.log(`API: Looking for registrations associated with ticket ${ticketId}`);

    // Find the registration associated with this ticket
    const registrations = await db.registration.findByTicket(ticketId);
    
    if (registrations && Array.isArray(registrations) && registrations.length > 0) {
      console.log(`API: Found registration ${registrations[0].registrationToken} for ticket ${ticketId}`);
      return NextResponse.json({ 
        registrationToken: registrations[0].registrationToken,
        ticket 
      });
    }

    // Fallback: search through all registrations for this ticket ID
    console.log(`API: Trying fallback lookup for ticket ${ticketId}`);
    const allRegistrations = await db.registration.findByUser(userId) as Registration[];
    
    for (const reg of allRegistrations) {
      if (reg.ticketIds && Array.isArray(reg.ticketIds) && reg.ticketIds.includes(ticketId)) {
        console.log(`API: Found registration ${reg.registrationToken} with ticketId in array`);
        return NextResponse.json({ 
          registrationToken: reg.registrationToken,
          ticket 
        });
      }
    }

    console.log(`API: No registration found for ticket ${ticketId}`);
    return NextResponse.json({ 
      error: '找不到與此票券相關的抽籤登記' 
    }, { status: 404 });
  } catch (error) {
    console.error('Error finding registration for ticket:', error);
    return NextResponse.json(
      { error: '查找登記記錄時出錯' },
      { status: 500 }
    );
  }
}
