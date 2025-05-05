import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise <{ token: string }> }
) {
  try {
    const token = (await params).token;
    
    if (!token) {
      return NextResponse.json({ error: '缺少登記令牌' }, { status: 400 });
    }

    // Get user from authentication token
    const user = await getCurrentUser(request);
    const headerUserId = request.headers.get('x-user-id');

    // Get registration
    const registration = await db.registration.findByToken(token) as { ticketIds?: string[]; userId: string };
    if (!registration) {
      return NextResponse.json({ error: '找不到該抽籤登記' }, { status: 404 });
    }

    // Authorization check
    if (!user && (!headerUserId || headerUserId !== registration.userId)) {
      return NextResponse.json({ error: '請先登入以查看票券' }, { status: 401 });
    }

    // Get tickets associated with this registration
    const tickets = registration.ticketIds 
      ? await Promise.all(
          (registration.ticketIds as string[]).map(async (ticketId) => {
            return await db.tickets.findById(ticketId);
          })
        )
      : [];

    // Filter out any null values and ensure tickets are valid
    const validTickets = tickets.filter(Boolean);
    
    return NextResponse.json({ tickets: validTickets });
  } catch (error) {
    console.error('Error fetching lottery tickets:', error);
    return NextResponse.json(
      { error: '獲取票券詳情時出錯' },
      { status: 500 }
    );
  }
}
