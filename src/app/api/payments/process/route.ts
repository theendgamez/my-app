/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import db from '@/lib/db';

// Helper for error responses
function errorResponse(
  error: string,
  code: string,
  status: number,
  detail?: string
) {
  return NextResponse.json({ error, code, ...(detail && { detail }) }, { status });
}

export async function POST(request: NextRequest) {
  try {
    let requestBody;
    try {
      requestBody = await request.json();
    } catch {
      return errorResponse('無效的請求數據', 'INVALID_REQUEST_DATA', 400);
    }

    // Early validation
    const { userId, bookingToken, cardDetails } = requestBody || {};
    if (!userId) {
      return errorResponse('請先登入', 'UNAUTHORIZED', 401, '認證失敗，請確保您正確提供了 userId');
    }
    if (!bookingToken) {
      return errorResponse('缺少預訂資料', 'MISSING_BOOKING_DATA', 400);
    }

    // Authenticate user
    const user = await db.users.findById(userId);
    if (!user) {
      return errorResponse('請先登入', 'UNAUTHORIZED', 401, '無效的 userId');
    }

    // Verify booking
    const booking = await db.bookings.findIntentByToken(bookingToken);
    if (!booking) {
      return errorResponse('無效的預訂資料', 'INVALID_BOOKING', 404);
    }
    if (new Date(booking.expiresAt) < new Date()) {
      // Optionally: await db.bookings.delete(bookingToken);
      return errorResponse('預訂已過期，請重新選擇座位', 'BOOKING_EXPIRED', 400);
    }
    if (booking.userId !== user.userId) {
      return errorResponse('無權處理此預訂', 'FORBIDDEN', 403);
    }

    // Get event and zone
    const event = await db.events.findById(booking.eventId);
    if (!event) {
      return errorResponse('找不到活動資料', 'EVENT_NOT_FOUND', 404);
    }
    const zone = event.zones?.find((z) => z.name === booking.zone);
    if (!zone) {
      return errorResponse('無效的座位區域', 'INVALID_ZONE', 400);
    }
    if ((zone.zoneQuantity || 0) < booking.quantity) {
      return errorResponse('所選區域的票券不足', 'INSUFFICIENT_TICKETS', 400);
    }

    // Calculate payment
    const paymentId = uuidv4();
    const ticketPrice = Number(zone.price);
    const platformFee = 18;
    const subtotal = ticketPrice * booking.quantity;
    const platformFeeTotal = platformFee * booking.quantity;
    const totalAmount = subtotal + platformFeeTotal;

    const payment = {
      paymentId,
      eventId: booking.eventId,
      eventName: event.eventName,
      userId: user.userId,
      zone: booking.zone,
      payQuantity: booking.quantity,
      totalAmount,
      amount: totalAmount, // Add amount field
      paymentMethod: cardDetails?.method || 'card', // Add paymentMethod field, adjust as needed
      relatedTo: "ticket_purchase" as const, // Set to a valid enum value
      createdAt: new Date().toISOString(),
      status: 'completed' as const,
      cardDetails,
    };

    // Transaction: payment, booking, event, tickets
    await db.transaction(async (trx) => {
      await trx.payments.create(payment);
      // Define the update payload type explicitly
      const bookingUpdate: { status: 'completed'; paymentId: string } = {
        status: 'completed',
        paymentId,
      };
      await trx.bookings.update(booking.bookingToken, bookingUpdate);
      await trx.events.updateZoneRemaining(
        booking.eventId,
        booking.zone,
        (zone.zoneQuantity || 0) - booking.quantity
      );
      const ticketPromises = [];
      for (let i = 0; i < booking.quantity; i++) {
        ticketPromises.push(
          trx.tickets.create({
            ticketId: uuidv4(),
            eventId: booking.eventId,
            eventName: event.eventName,
            eventDate: event.eventDate,
            eventLocation: event.location,
            userId: user.userId,
            zone: booking.zone,
            seatNumber: `${booking.zone}-${Math.floor(Math.random() * 1000) + 1}`,
            price: ticketPrice,
            purchaseDate: new Date().toISOString(),
            status: 'sold',
            paymentId,
          })
        );
      }
      await Promise.all(ticketPromises);
    });

    return NextResponse.json({
      paymentId,
      eventId: booking.eventId,
      zone: booking.zone,
      quantity: booking.quantity,
      totalAmount,
      status: 'completed',
    });
  } catch (error) {
    console.error('Payment processing error:', error);
    return errorResponse('付款處理失敗，請稍後再試', 'PAYMENT_PROCESSING_ERROR', 500);
  }
}