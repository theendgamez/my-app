import { NextResponse } from 'next/server';
import db from '@/lib/db';
import type { Payment } from '@/types';

export async function POST(request: Request): Promise<NextResponse<Payment | { error: string }>> {
  try {
    const payment = await request.json();
    
    // Validate required fields
    if (!payment.paymentId || !payment.userId || !payment.eventId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Store payment record
    await db.payments.create(payment);

    // Update event zone total if needed
    await db.event.updateZoneTotal(payment.eventId, payment.zone, payment.amount);

    const createdPayment = await db.payments.findById(payment.paymentId);
    if (!createdPayment) {
      return NextResponse.json(
        { error: 'Payment not found after creation' },
        { status: 404 }
      );
    }

    return NextResponse.json(createdPayment, { status: 200 });

  } catch (error) {
    console.error('Payment error:', error);
    return NextResponse.json(
      { error: 'Failed to process payment' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request): Promise<NextResponse<Payment | { error: string }>> {
  const { searchParams } = new URL(request.url);
  const paymentId = searchParams.get('paymentId');

  if (!paymentId) {
    return NextResponse.json(
      { error: 'Payment ID required' },
      { status: 400 }
    );
  }

  try {
    const payment = await db.payments.findById(paymentId);
    if (!payment) {
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(payment);
  } catch (error) {
    console.error('Error fetching payment:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payment' },
      { status: 500 }
    );
  }
}
