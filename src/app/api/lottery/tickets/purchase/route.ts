import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import db from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    // Check user authentication
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: '請先登入以繼續' }, { status: 401 });
    }

    const data = await request.json();
    const { registrationToken, paymentMethod, cardDetails, totalAmount, quantity } = data;
    
    // Basic validation
    if (!registrationToken) {
      return NextResponse.json({ error: '缺少登記令牌' }, { status: 400 });
    }

    // Fetch the registration
    type Registration = {
      eventId: string;
      userId: string;
      status: string;
      ticketsPurchased: boolean;
      zoneName: string;
      // add other properties as needed
    };
    const registration = await db.registration.findByToken(registrationToken) as Registration;
    if (!registration) {
      return NextResponse.json({ error: '找不到該抽籤登記' }, { status: 404 });
    }

    // Check if this is the user's registration
    if (registration.userId !== user.userId) {
      return NextResponse.json({ error: '無權處理此登記的付款' }, { status: 403 });
    }

    // Check if user has won the lottery
    if (registration.status !== 'won') {
      return NextResponse.json({ error: '您尚未在此抽籤中獲勝，無法購買門票' }, { status: 400 });
    }

    // Check if tickets have already been purchased
    if (registration.ticketsPurchased) {
      return NextResponse.json({ error: '您已經購買了此活動的門票' }, { status: 400 });
    }

    // Get event details
    const event = await db.events.findById(registration.eventId);
    if (!event) {
      return NextResponse.json({ error: '找不到相關活動' }, { status: 404 });
    }

    // Update zone quantity
    const zoneFromEvent = event.zones?.find(zone => zone.name === registration.zoneName);
    if (zoneFromEvent && zoneFromEvent.zoneQuantity !== undefined) {
      // BUGFIX: Get the current event to have the most up-to-date zone quantity
      const currentEvent = await db.events.findById(registration.eventId);
      if (!currentEvent) {
        return NextResponse.json({ error: '找不到相關活動' }, { status: 404 });
      }
      
      // Find the current zone details with up-to-date quantity
      const currentZoneDetails = currentEvent.zones?.find(z => z.name === registration.zoneName);
      if (currentZoneDetails && currentZoneDetails.zoneQuantity !== undefined) {
        // Calculate the new remaining quantity
        const currentQuantity = Number(currentZoneDetails.zoneQuantity);
        const newQuantity = Math.max(0, currentQuantity - quantity);
        
        // Update with the new calculated quantity
        await db.events.updateZoneRemaining(
          registration.eventId,
          registration.zoneName,
          newQuantity
        );
        
        console.log(`Zone quantity updated: ${registration.zoneName} in event ${registration.eventId}: ${currentQuantity} -> ${newQuantity}`);
      }
    }

    // In a real application, you would integrate with a payment processor here
    // For demo purposes, we'll just simulate payment processing
    
    // Generate a payment ID and booking token
    const paymentId = uuidv4();
    const bookingToken = uuidv4();
    const now = new Date().toISOString();

    // Create a payment record
    await db.payments.create({
      paymentId,
      userId: user.userId,
      amount: totalAmount,
      totalAmount: totalAmount,
      paymentMethod,
      status: 'completed',
      createdAt: now,
      eventId: registration.eventId,
      eventName: event.eventName,
      zone: registration.zoneName,
      payQuantity: quantity,
      relatedTo: 'ticket_purchase',
      cardDetails
    });

    // Generate tickets
    const tickets = [];
    for (let i = 0; i < quantity; i++) {
      const ticketId = uuidv4();
      const ticket = {
        ticketId,
        eventId: registration.eventId,
        eventName: event.eventName,
        userId: user.userId,
        userRealName: user.realName || "", // Add userRealName, fallback to empty string if not available
        zone: registration.zoneName, // Assuming zone is the same as zoneName
        paymentId,
        bookingToken,
        status: "sold" as const,
        purchaseDate: now,
        eventDate: event.eventDate,
        eventLocation: event.location ?? '', // Provide a default or fetch from event
        seatNumber: '', // Or generate/assign a seat number if needed
        price: totalAmount / quantity, // Use totalAmount divided by quantity as the ticket price
        qrCode: ticketId // Use ticketId as qrCode for now, or generate as needed
      };
      
      tickets.push(ticket);
      await db.tickets.create(ticket);
    }

    // Update registration to mark tickets as purchased
    await db.registration.update(registrationToken, {
      ticketsPurchased: true,
      paymentId
    });

    // In a real application, send confirmation email here
    
    return NextResponse.json({
      success: true,
      message: '成功購買門票',
      paymentId,
      tickets,
      receipt: {
        paymentId,
        amount: totalAmount,
        date: now,
        eventName: event.eventName,
        bookingToken
      }
    });
  } catch (error) {
    console.error('Lottery ticket purchase error:', error);
    return NextResponse.json({ 
      error: '處理購票付款時出錯',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
