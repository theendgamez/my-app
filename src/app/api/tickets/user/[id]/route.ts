import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const userId = (await context.params).id;
    if (!userId) {
      return NextResponse.json({ error: '未提供用戶ID' }, { status: 400 });
    }

    // Handle authentication with fallback
    const user = await getCurrentUser(request);
    const fallbackUserId = !user ? request.headers.get('x-user-id') : null;
    const authenticatedUserId = user?.userId || fallbackUserId;

    if (!authenticatedUserId) {
      return NextResponse.json({ error: '請先登入', code: 'UNAUTHORIZED' }, { status: 401 });
    }

    // Get tickets for the user
    const tickets = await db.tickets.findByUser(userId);
    return NextResponse.json(tickets);
  } catch (error) {
    console.error('Error fetching tickets:', error);
    return NextResponse.json({ error: '獲取票券詳情時出錯' }, { status: 500 });
  }
}