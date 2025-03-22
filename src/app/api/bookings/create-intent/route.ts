import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import db from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// Time-limited bookings (10 minutes)
const BOOKING_EXPIRY_MS = 10 * 60 * 1000;

// Session store to track active booking sessions
const activeSessions = new Map<string, {
  eventId: string;
  zone: string;
  quantity: number;
  userId: string;
  timestamp: number;
}>();

// Clean up expired sessions every minute
setInterval(() => {
  const now = Date.now();
  for (const [sessionId, session] of activeSessions.entries()) {
    if (now - session.timestamp > BOOKING_EXPIRY_MS) {
      activeSessions.delete(sessionId);
    }
  }
}, 60000);

export async function POST(request: NextRequest) {
  try {
    // Verify user is authenticated
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    }

    const { eventId, zone, quantity, sessionId } = await request.json();

    // Validate inputs
    if (!eventId || !zone || !quantity || !sessionId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check if event exists
    const event = await db.events.findById(eventId);
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Check if zone exists and has enough tickets
    const zoneDetails = event.zones?.find(z => z.name === zone);
    if (!zoneDetails) {
      return NextResponse.json({ error: 'Invalid zone' }, { status: 400 });
    }

    if (zoneDetails.quantity < quantity) {
      return NextResponse.json({ error: 'Not enough tickets available' }, { status: 400 });
    }

    // Create a temporary booking reservation
    activeSessions.set(sessionId, {
      eventId,
      zone,
      quantity,
      userId: user.userId,
      timestamp: Date.now()
    });

    // Generate a secure booking token
    const bookingData = {
      sessionId,
      eventId,
      zone,
      quantity,
      userId: user.userId,
      eventName: event.eventName,
      price: Number(zoneDetails.price),
      timestamp: Date.now()
    };

    // Create a signed token to prevent tampering
    const bookingToken = crypto
      .createHmac('sha256', process.env.BOOKING_SECRET || 'booking-secret')
      .update(JSON.stringify(bookingData))
      .digest('hex');

    // Store the booking token with its data
    await db.bookings.createIntent({
      bookingToken,
      sessionId,
      eventId,
      zone,
      quantity,
      userId: user.userId,
      expiresAt: new Date(Date.now() + BOOKING_EXPIRY_MS).toISOString(),
      status: 'pending'
    });

    return NextResponse.json({ 
      bookingToken,
      expiresAt: Date.now() + BOOKING_EXPIRY_MS 
    });

  } catch (error) {
    console.error('Error creating booking intent:', error);
    return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 });
  }
}