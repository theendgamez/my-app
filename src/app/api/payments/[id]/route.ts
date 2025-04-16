import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Await params before accessing the id property
    const params = await context.params;
    const id = params.id;

    if (!id) {
      return NextResponse.json(
        { error: '付款ID未提供' },
        { status: 400 }
      );
    }

    // Handle authentication with fallback
    const user = await getCurrentUser(request);
    const fallbackUserId = !user ? request.headers.get('x-user-id') : null;
    const userId = user?.userId || fallbackUserId;
    
    // Fetch payment from database
    const payment = await db.payments.findById(id);

    if (!payment) {
      return NextResponse.json(
        { error: '付款信息未找到' },
        { status: 404 }
      );
    }

    // Check if the user has permission to access this payment
    if (payment.userId !== userId) {
      return NextResponse.json(
        { error: '無權訪問此付款資訊', code: 'FORBIDDEN' }, 
        { status: 403 }
      );
    }

    // Return the payment data
    return NextResponse.json(payment, { status: 200 });
  } catch (error) {
    console.error('Error fetching payment:', error);
    return NextResponse.json(
      { error: '獲取付款信息失敗' },
      { status: 500 }
    );
  }
}
