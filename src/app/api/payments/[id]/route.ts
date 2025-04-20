import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = (await params).id;

    if (!id) {
      return NextResponse.json(
        { error: '付款ID未提供' },
        { status: 400 }
      );
    }

    // Fetch payment from database
    const payment = await db.payments.findById(id);

    if (!payment) {
      return NextResponse.json(
        { error: '付款信息未找到' },
        { status: 404 }
      );
    }

    // Authentication: allow access if user is owner or admin
    const user = await getCurrentUser(request);
    const fallbackUserId = !user ? request.headers.get('x-user-id') : null;
    const userId = user?.userId || fallbackUserId;
    const userRole = user?.role;

    if (payment.userId !== userId && userRole !== 'admin') {
      return NextResponse.json(
        { error: '無權訪問此付款資訊', code: 'FORBIDDEN' },
        { status: 403 }
      );
    }

    return NextResponse.json(payment, { status: 200 });
  } catch (error) {
    console.error('Error fetching payment:', error);
    return NextResponse.json(
      { error: '獲取付款信息失敗' },
      { status: 500 }
    );
  }
}
