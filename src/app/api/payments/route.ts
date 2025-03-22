import { NextResponse } from 'next/server';
import db from '@/lib/db';
import type { Payment } from '@/types';

// GET handler to retrieve payment information
export async function GET(request: Request): Promise<NextResponse> {
  try {
    // Parse URL to get query parameters
    const { searchParams } = new URL(request.url);
    const paymentId = searchParams.get('paymentId');

    if (!paymentId) {
      return NextResponse.json(
        { error: '缺少付款ID' },
        { status: 400 }
      );
    }

    // Retrieve payment from database
    const payment = await db.payments.findById(paymentId);

    if (!payment) {
      return NextResponse.json(
        { error: '找不到付款記錄' },
        { status: 404 }
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

// POST handler to create payment
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

    // 3. Reserve tickets in the system
    try {
      // Find available tickets for this event and zone
      const availableTickets = await db.tickets.findAvailableByEvent(payment.eventId, payment.zone, payment.payQuantity);
      
      if (!availableTickets || availableTickets.length < payment.payQuantity) {
        return NextResponse.json(
          { error: 'Not enough tickets available' },
          { status: 400 }
        );
      }

      // Update ticket status to 'reserved'
      const ticketIds = availableTickets.slice(0, payment.payQuantity).map(ticket => ticket.ticketId);
      await Promise.all(ticketIds.map(ticketId => 
        db.tickets.update(ticketId, { 
          status: 'reserved', 
          userId: payment.userId,
          paymentId: payment.paymentId
        })
      ));

      console.log(`${ticketIds.length} tickets reserved successfully for payment: ${payment.paymentId}`);
      
    } catch (err) {
      console.error('Failed to reserve tickets:', err);
      return NextResponse.json(
        { error: 'Payment processed but ticket reservation failed' },
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