import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params:  Promise<{ id: string }> } // Correct type signature
) {
  try {
    const userId = (await params).id; // Access id directly

    if (!userId) {
      return NextResponse.json({ error: '未提供用戶ID' }, { status: 400 });
    }

    // Authentication checks
    const user = await getCurrentUser(request);
    const headerUserId = request.headers.get('x-user-id');
    
    // Authorization check - user can only access their own tickets
    if (!user && userId !== headerUserId) {
      return NextResponse.json({ error: '無權訪問此用戶的票券' }, { status: 403 });
    }

    // Get tickets for the user
    const tickets = await db.tickets.findByUser(userId);
    return NextResponse.json(tickets);
  } catch (error) {
    console.error('Error fetching tickets:', error);
    return NextResponse.json({ error: '獲取票券詳情時出錯' }, { status: 500 });
  }
}
