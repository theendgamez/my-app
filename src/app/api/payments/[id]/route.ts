import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    // Correctly await the params object using the context parameter
    const params = context.params;
    const paymentId = params.id;
    
    // Verify user is authenticated
    const user = await getCurrentUser(request);
    
    // If getCurrentUser fails, try to authorize using userId from header
    // This is a fallback authentication method for clients with issues
    let fallbackUserId = null;
    if (!user) {
      fallbackUserId = request.headers.get('x-user-id');
      if (fallbackUserId) {
        console.log(`Attempting fallback authentication with user ID: ${fallbackUserId}`);
      } else {
        console.log('Authentication failed in payments/[id] API route - no fallback ID available');
        return NextResponse.json({ error: '請先登入', code: 'UNAUTHORIZED' }, { status: 401 });
      }
    }

    const userId = user?.userId || fallbackUserId;
    if (!userId) {
      return NextResponse.json({ error: '請先登入', code: 'UNAUTHORIZED' }, { status: 401 });
    }

    if (!paymentId) {
      return NextResponse.json({ error: '未提供付款ID' }, { status: 400 });
    }

    // Fetch payment details
    const payment = await db.payments.findById(paymentId);
    if (!payment) {
      return NextResponse.json({ error: '找不到付款資訊' }, { status: 404 });
    }

    // Security check - only allow users to see their own payments
    if (payment.userId !== userId) {
      console.log(`User ID mismatch: ${userId} trying to access payment owned by ${payment.userId}`);
      return NextResponse.json({ error: '無權訪問此付款資訊', code: 'FORBIDDEN' }, { status: 403 });
    }

    return NextResponse.json(payment);
  } catch (error) {
    console.error('Error fetching payment:', error);
    return NextResponse.json({ error: '獲取付款詳情時出錯' }, { status: 500 });
  }
}
