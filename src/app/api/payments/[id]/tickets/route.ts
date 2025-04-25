import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> } // Correct type signature
) {
  try {
    const paymentId = (await params).id; // Access id directly
    
    if (!paymentId) {
      return NextResponse.json({ error: '未提供付款ID' }, { status: 400 });
    }

    // Handle authentication with fallback
    const user = await getCurrentUser(request);
    const fallbackUserId = !user ? request.headers.get('x-user-id') : null;
    const userId = user?.userId || fallbackUserId;
    
    if (!userId) {
      return NextResponse.json({ error: '請先登入', code: 'UNAUTHORIZED' }, { status: 401 });
    }

    // Get payment and check ownership
    const payment = await db.payments.findById(paymentId);
    if (!payment) {
      return NextResponse.json({ error: '找不到相關付款資訊' }, { status: 404 });
    }

    if (payment.userId !== userId) {
      return NextResponse.json({ error: '無權訪問此票券資訊', code: 'FORBIDDEN' }, { status: 403 });
    }

    // Return tickets
    const tickets = await db.tickets.findByPayment(paymentId);
    return NextResponse.json(tickets);
  } catch (error) {
    console.error('Error fetching tickets:', error);
    return NextResponse.json({ error: '獲取票券詳情時出錯' }, { status: 500 });
  }
}
