/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import db from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    // Clone request to be able to read the body twice if needed
    const clonedRequest = request.clone();
    let requestBody;
    
    try {
      requestBody = await clonedRequest.json();
    } catch (e) {
      return NextResponse.json(
        { error: '無效的請求數據', code: 'INVALID_REQUEST_DATA' },
        { status: 400 }
      );
    }
    
    
    // Directly check for userId in the request body - simplified authentication
    let user = null;
    
    if (requestBody.userId) {
      console.log('Authenticating with userId from request body:', requestBody.userId);
      user = await db.users.findById(requestBody.userId);
      
      if (user) {
        console.log('Authentication successful for user:', user.userId);
      } else {
        console.error('Invalid userId provided:', requestBody.userId);
      }
    }
    
    // If authentication fails
    if (!user) {
      console.error('Authentication failed - no valid userId provided');
      
      return NextResponse.json(
        { 
          error: '請先登入', 
          code: 'UNAUTHORIZED',
          detail: '認證失敗，請確保您正確提供了 userId' 
        },
        { status: 401 }
      );
    }
    
    const { bookingToken, cardDetails } = requestBody;

    if (!bookingToken) {
      return NextResponse.json(
        { error: '缺少預訂資料', code: 'MISSING_BOOKING_DATA' },
        { status: 400 }
      );
    }

    // Verify the booking token and get booking details
    const booking = await db.bookings.findIntentByToken(bookingToken);
    
    if (!booking) {
      return NextResponse.json(
        { error: '無效的預訂資料', code: 'INVALID_BOOKING' },
        { status: 404 }
      );
    }

    // Check if booking has expired
    if (new Date(booking.expiresAt) < new Date()) {
      return NextResponse.json(
        { error: '預訂已過期，請重新選擇座位', code: 'BOOKING_EXPIRED' },
        { status: 400 }
      );
    }

    // Check if user owns this booking
    if (booking.userId !== user.userId) {
      return NextResponse.json(
        { error: '無權處理此預訂', code: 'FORBIDDEN' },
        { status: 403 }
      );
    }

    // Get event details to calculate price
    const event = await db.events.findById(booking.eventId);
    if (!event) {
      return NextResponse.json(
        { error: '找不到活動資料', code: 'EVENT_NOT_FOUND' },
        { status: 404 }
      );
    }

    const zone = event.zones?.find(z => z.name === booking.zone);
    if (!zone) {
      return NextResponse.json(
        { error: '無效的座位區域', code: 'INVALID_ZONE' },
        { status: 400 }
      );
    }

    // Check ticket availability again (prevent race conditions)
    if ((zone.zoneQuantity || 0) < booking.quantity) {
      return NextResponse.json(
        { error: '所選區域的票券不足', code: 'INSUFFICIENT_TICKETS' },
        { status: 400 }
      );
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
      payQuantity: booking.quantity,
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any); // Type assertion to bypass type checking
      
      // 3. Update event zone remaining tickets
      const newRemaining = (zone.zoneQuantity || 0) - booking.quantity;
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
            eventName: event.eventName,
            eventDate: event.eventDate,
            eventLocation: event.location,
            userId: user.userId,
            zone: booking.zone,
            seatNumber: `${booking.zone}-${Math.floor(Math.random() * 1000) + 1}`, // Random seat for demo
            price: ticketPrice,
            purchaseDate: new Date().toISOString(),
            status: 'sold',
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
      { error: '付款處理失敗，請稍後再試', code: 'PAYMENT_PROCESSING_ERROR' }, 
      { status: 500 }
    );
  }
}