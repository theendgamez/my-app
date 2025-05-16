import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';
import { decryptData, isEncrypted } from '@/utils/encryption';

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const user = await getCurrentUser(request);
    if (!user) {
      const headerUserId = request.headers.get('x-user-id');
      if (!headerUserId) {
        return NextResponse.json({ error: '請先登入以處理付款' }, { status: 401 });
      }

      // Verify the user exists using the header ID
      const dbUser = await db.users.findById(headerUserId);
      if (!dbUser) {
        return NextResponse.json({ error: '無效的用戶ID' }, { status: 401 });
      }
    }

    const userId = user?.userId || request.headers.get('x-user-id') || '';
    
    // Parse request body
    const { bookingToken, cardDetails } = await request.json();

    if (!bookingToken) {
      return NextResponse.json({ error: '缺少訂單標識' }, { status: 400 });
    }

    // Find the booking
    const booking = await db.bookings.findIntentByToken(bookingToken);
    if (!booking) {
      return NextResponse.json({ error: '找不到相關訂單' }, { status: 404 });
    }

    // Verify booking ownership
    if (booking.userId !== userId) {
      return NextResponse.json({ error: '無權支付此訂單' }, { status: 403 });
    }

    // Check if booking has expired
    if (new Date(booking.expiresAt) < new Date()) {
      return NextResponse.json({ error: '訂單已過期' }, { status: 400 });
    }

    // Get event details
    const event = await db.events.findById(booking.eventId);
    if (!event) {
      return NextResponse.json({ error: '找不到相關活動' }, { status: 404 });
    }

    // Get user details to ensure we have the real name
    const userDetails = await db.users.findById(userId);
    if (!userDetails) {
      return NextResponse.json({ error: '找不到用戶資料' }, { status: 404 });
    }

    // Decrypt real name if needed
    let userRealName = userDetails.realName || '未提供姓名';
    if (userDetails.isDataEncrypted || isEncrypted(userRealName)) {
      userRealName = decryptData(userRealName);
    }

    // Get zone details
    const zoneDetails = event.zones?.find(z => z.name === booking.zone);
    if (!zoneDetails) {
      return NextResponse.json({ error: '找不到相關座位區域' }, { status: 404 });
    }

    // Calculate payment
    const ticketPrice = Number(zoneDetails.price);
    const platformFee = 18; // Platform fee per ticket
    const subtotal = ticketPrice * booking.quantity;
    const platformFeeTotal = platformFee * booking.quantity;
    const totalAmount = subtotal + platformFeeTotal;

    // Generate payment ID
    const paymentId = uuidv4();
    const now = new Date().toISOString();

    // Create payment record
    const payment = {
      paymentId,
      eventId: booking.eventId,
      eventName: event.eventName,
      userId,
      zone: booking.zone,
      payQuantity: booking.quantity,
      totalAmount,
      amount: totalAmount,
      paymentMethod: 'credit_card',
      relatedTo: "ticket_purchase" as const,
      createdAt: now,
      status: 'completed' as const,
      cardDetails: {
        lastFourDigits: cardDetails?.lastFourDigits || '0000'
      }
    };

    try {
      // Create payment in database
      await db.payments.create(payment);

      // Update booking status with payment ID
      await db.bookings.createIntent({
        ...booking,
        status: 'completed'
        // paymentId removed to match Booking type
      });

      // Update event zone remaining tickets
      if (zoneDetails.zoneQuantity !== undefined) {
        // BUGFIX: Get the current event to have the most up-to-date zone quantity
        const currentEvent = await db.events.findById(booking.eventId);
        if (!currentEvent) {
          return NextResponse.json({ error: '找不到相關活動' }, { status: 404 });
        }
        
        // Find the current zone details with up-to-date quantity
        const currentZoneDetails = currentEvent.zones?.find(z => z.name === booking.zone);
        if (!currentZoneDetails) {
          return NextResponse.json({ error: '找不到相關座位區域' }, { status: 404 });
        }
        
        // Calculate the new remaining quantity
        const currentQuantity = Number(currentZoneDetails.zoneQuantity || 0);
        const newQuantity = Math.max(0, currentQuantity - booking.quantity);
        
        // Update with the new calculated quantity
        await db.events.updateZoneRemaining(
          booking.eventId,
          booking.zone,
          newQuantity
        );
        
        console.log(`Zone quantity updated: ${booking.zone} in event ${booking.eventId}: ${currentQuantity} -> ${newQuantity}`);
      }

      // Generate tickets for the booking
      for (let i = 0; i < booking.quantity; i++) {
        const ticketId = uuidv4();
        await db.tickets.create({
          ticketId,
          eventId: booking.eventId,
          eventName: event.eventName,
          eventDate: event.eventDate,
          eventLocation: event.location || '',
          userId,
          userRealName: userRealName,
          qrCode: ticketId,
          zone: booking.zone,
          seatNumber: `${booking.zone}-${Math.floor(Math.random() * 1000) + 1}`,
          price: String(ticketPrice),
          purchaseDate: now,
          status: 'sold',
          paymentId,
          lastRefreshed: '',
          nextRefresh: '',
          lastVerified: null,
          verificationCount: 0,
          transferredAt: null,
          transferredFrom: null,
          adminNotes: ''
        });
      }

      // Return successful payment response
      return NextResponse.json({
        success: true,
        paymentId,
        eventId: booking.eventId,
        zone: booking.zone,
        quantity: booking.quantity,
        totalAmount,
        status: 'completed',
      });
    } catch (error) {
      console.error('Payment processing failed:', error);
      return NextResponse.json(
        { error: '支付處理失敗', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Payment API error:', error);
    return NextResponse.json(
      { error: '處理付款請求時出錯', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
