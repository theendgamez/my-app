import { NextResponse } from 'next/server';
import db from '@/lib/db';
import type { Payment } from '@/types';
import { transferTicket } from '@/utils/blockchainService';

export async function POST(request: Request): Promise<NextResponse<Payment | { error: string }>> {
  try {
    const payment: Payment = await request.json();

    // 1. Validate required fields
    if (!payment.paymentId || !payment.userId || !payment.eventId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // 2. Store payment record in the database
    await db.payments.create(payment);


    // 3. Transfer ticket on the blockchain
    try {
      const txHash = await transferTicket({
        userAddress: payment.userWallerAddress, // Blockchain address
        eventId: payment.eventId,
        zone: payment.zone,
        quantity: payment.quantity,
      });

      console.log('Ticket transferred successfully:', txHash);
    } catch (err) {
      console.error('Failed to transfer ticket:', err);
      return NextResponse.json(
        { error: 'Payment processed but ticket transfer failed' },
        { status: 500 }
      );
    }

    // 4. Fetch the created payment for confirmation
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
