import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import db from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // Verify user is authenticated
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: '請先登入' }, { status: 401 });
    }

    const { bookingToken, cardDetails } = await request.json();

    if (!bookingToken) {
      return NextResponse.json({ error: '缺少預訂資料' }, { status: 400 });
    }

    // Verify the booking token and get booking details
    const booking = await db.bookings.findByToken(bookingToken);
    
    if (!booking) {
      return NextResponse.json({ error: '無效的預訂資料' }, { status: 404 });
    }

    // Check if booking has expired
    if (new Date(booking.expiresAt) < new Date()) {
      return NextResponse.json({ error: '預訂已過期，請重新選擇座位' }, { status: 400 });
    }

    // Check if user owns this booking
    if (booking.userId !== user.userId) {
      return NextResponse.json({ error: '無權處理此預訂' }, { status: 403 });
    }

    // Get event details to calculate price
    const event = await db.events.findById(booking.eventId);
    if (!event) {
      return NextResponse.json({ error: '找不到活動資料' }, { status: 404 });
    }

    const zone = event.zones?.find(z => z.name === booking.zone);
    if (!zone) {
      return NextResponse.json({ error: '無效的座位區域' }, { status: 400 });
    }

    // Check ticket availability again (prevent race conditions)
    if ((zone.quantity || 0) < booking.quantity) {
      return NextResponse.json({ error: '所選區域的票券不足' }, { status: 400 });
    }

    // Generate payment ID
    const paymentId = uuidv4();
    
    // Calculate total amount
    const ticketPrice = Number(zone.price);
    const platformFee = 18; // Platform fee per ticket
    const subtotal = ticketPrice * booking.quantity;
    const platformFeeTotal = platformFee * booking.quantity;
    const totalAmount = subtotal + platformFeeTotal;

    // Create payment record
    const payment = {
      paymentId,
      eventId: booking.eventId,
      eventName: event.eventName,
      userId: user.userId,
      zone: booking.zone,
      quantity: booking.quantity,
      totalAmount,
      createdAt: new Date().toISOString(),
      status: 'completed' as 'completed' | 'pending' | 'failed',
      cardDetails
    };

    // Use database transaction to ensure all operations succeed or fail together
    await db.transaction(async (trx) => {
      // 1. Create payment record
      await trx.payments.create(payment);
      
      // 2. Update booking status
      await trx.bookings.update(booking.bookingToken, {
        status: 'completed',
        paymentId
      });
      
      // 3. Update event zone remaining tickets
      const newRemaining = (zone.quantity || 0) - booking.quantity;
      await trx.events.updateZoneRemaining(
        booking.eventId,
        booking.zone,
        newRemaining
      );
      
      // 4. Create ticket records
      const ticketPromises = [];
      for (let i = 0; i < booking.quantity; i++) {
        const ticketId = uuidv4();
        ticketPromises.push(
          trx.tickets.create({
            ticketId,
            eventId: booking.eventId,
            userId: user.userId,
            zone: booking.zone,
            seatNumber: `${booking.zone}-${Math.floor(Math.random() * 1000) + 1}`, // Random seat for demo
            price: ticketPrice,
            purchaseDate: new Date().toISOString(),
            status: 'active',
            paymentId
          })
        );
      }
      await Promise.all(ticketPromises);
    });

    // Return payment details
    return NextResponse.json({
      paymentId,
      eventId: booking.eventId,
      zone: booking.zone,
      quantity: booking.quantity,
      totalAmount,
      status: 'completed'
    });
    
  } catch (error) {
    console.error('Payment processing error:', error);
    return NextResponse.json(
      { error: '付款處理失敗，請稍後再試' }, 
      { status: 500 }
    );
  }
}