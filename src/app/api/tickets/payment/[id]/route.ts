import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify user is authenticated
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: '請先登入' }, { status: 401 });
    }

    const paymentId = params.id;
    if (!paymentId) {
      return NextResponse.json({ error: '未提供付款ID' }, { status: 400 });
    }

    // Fetch payment first to verify ownership
    const payment = await db.payments.findById(paymentId);
    if (!payment) {
      return NextResponse.json({ error: '找不到相關付款資訊' }, { status: 404 });
    }

    // Security check - only allow users to see their own tickets
    if (payment.userId !== user.userId) {
      return NextResponse.json({ error: '無權訪問此票券資訊' }, { status: 403 });
    }

    // Fetch tickets associated with the payment
    const tickets = await db.tickets.findByPayment(paymentId);
    return NextResponse.json(tickets);
  } catch (error) {
    console.error('Error fetching tickets:', error);
    return NextResponse.json({ error: '獲取票券詳情時出錯' }, { status: 500 });
  }
}
