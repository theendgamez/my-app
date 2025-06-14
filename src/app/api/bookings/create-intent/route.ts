import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import db from '@/lib/db';
import { verifyToken } from '@/lib/auth'; // Import verifyToken function

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

// Add a GET handler to respond properly instead of 405
export async function GET() {
  return NextResponse.json({ 
    error: 'Method not allowed', 
    message: 'This endpoint only accepts POST requests'
  }, { status: 405 });
}

export async function POST(request: NextRequest) {
  try {
    // Super detailed logging - log the raw request to diagnose issues
    console.log('===== BOOKING INTENT REQUEST =====');
    console.log('Method:', request.method);
    console.log('Headers:', Object.fromEntries(request.headers.entries()));
    console.log('Content-Type:', request.headers.get('content-type'));
    
    // Check content type - must be application/json
    if (!request.headers.get('content-type')?.includes('application/json')) {
      return NextResponse.json({
        error: 'Invalid Content-Type',
        details: 'Request must use Content-Type: application/json'
      }, { status: 400 });
    }
    
    // Get the raw request body for debugging
    const rawBody = await request.text();
    console.log('Raw request body:', rawBody);
    
    // If the body is empty, return an error
    if (!rawBody || rawBody.trim() === '') {
      return NextResponse.json({
        error: 'Empty request body',
        details: 'Request body cannot be empty'
      }, { status: 400 });
    }
    
    // Try to parse the JSON
    let data;
    try {
      data = JSON.parse(rawBody);
      console.log('Parsed data:', data);
    } catch (err) {
      console.error('Failed to parse request body as JSON:', err);
      return NextResponse.json({ 
        error: 'Invalid JSON', 
        details: 'The request body is not valid JSON',
        rawBody: rawBody // Include rawBody for debugging client-side issues
      }, { status: 400 });
    }
    
    // Extract the auth token if present
    let userIdFromToken: string | undefined;
    const authHeader = request.headers.get('Authorization');
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const decoded = await verifyToken(token);
        if (decoded && decoded.userId) {
          console.log('Extracted userId from token:', decoded.userId);
          userIdFromToken = decoded.userId;
        }
      } catch (err) {
        console.warn('Error decoding token or token invalid:', err);
        // Potentially return 401 if token is present but invalid
        // return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
      }
    }
    
    // Use userId from token if available, otherwise from request body
    const resolvedUserId = userIdFromToken || data.userId;
    
    const { eventId, zone, quantity, sessionId } = data;
    
    // Validate all fields and log the values
    console.log('Field validation:');
    console.log('- resolvedUserId:', resolvedUserId);
    console.log('- eventId:', eventId);
    console.log('- zone:', zone);
    console.log('- quantity:', quantity);
    console.log('- sessionId:', sessionId);
    
    // Type check each field
    if (resolvedUserId && typeof resolvedUserId !== 'string') {
      return NextResponse.json({
        error: 'Invalid data type',
        details: 'userId must be a string'
      }, { status: 400 });
    }
    
    if (eventId && typeof eventId !== 'string') {
      return NextResponse.json({
        error: 'Invalid data type',
        details: 'eventId must be a string'
      }, { status: 400 });
    }
    
    if (zone && typeof zone !== 'string') {
      return NextResponse.json({
        error: 'Invalid data type',
        details: 'zone must be a string'
      }, { status: 400 });
    }
    
    if (quantity && (typeof quantity !== 'number' || isNaN(quantity) || quantity <= 0)) {
      return NextResponse.json({
        error: 'Invalid data type',
        details: 'quantity must be a positive number'
      }, { status: 400 });
    }
    
    if (sessionId && typeof sessionId !== 'string') {
      return NextResponse.json({
        error: 'Invalid data type',
        details: 'sessionId must be a string'
      }, { status: 400 });
    }
    
    // Ensure userId is set from either request body or token
    if (!resolvedUserId) {
      console.error('No userId provided in request body or derivable from token');
      return NextResponse.json({ 
        error: 'Missing userId', 
        details: 'User ID must be provided either in the request body or via a valid Authorization token'
      }, { status: 400 });
    }
    
    // Enhanced validation with specific missing field information
    const missingFields = [];
    if (!eventId) missingFields.push('eventId');
    if (!zone) missingFields.push('zone');
    if (!quantity) missingFields.push('quantity');
    if (!sessionId) missingFields.push('sessionId');
    
    if (missingFields.length > 0) {
      const errorMessage = `Missing required fields: ${missingFields.join(', ')}`;
      console.error(errorMessage, data);
      return NextResponse.json({ 
        error: 'Missing required fields', 
        details: errorMessage,
        receivedData: data // Send back what was received for easier debugging
      }, { status: 400 });
    }
    
    // Verify the user exists
    const user = await db.users.findById(resolvedUserId);
    if (!user) {
      console.error('Invalid userId provided:', resolvedUserId);
      return NextResponse.json({ 
        error: 'Invalid user ID',
        details: 'The provided userId does not exist in our records' 
      }, { status: 401 }); // 401 or 400 depending on if it's auth or bad data
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

    if (zoneDetails.zoneQuantity < quantity) {
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
      userId: user.userId, // Use the validated user.userId
      eventName: event.eventName,
      price: Number(zoneDetails.price),
      timestamp: Date.now()
    };

    const secret = process.env.BOOKING_SECRET;
    if (!secret) {
      console.error('CRITICAL: BOOKING_SECRET environment variable is not set. Using insecure fallback.');
      // Depending on policy, you might want to throw an error here in production
      // throw new Error('BOOKING_SECRET is not configured.'); 
    }

    // Create a signed token to prevent tampering
    const bookingToken = crypto
      .createHmac('sha256', secret || 'booking-secret-fallback') // Use fallback only if secret is truly undefined
      .update(JSON.stringify(bookingData))
      .digest('hex');

    // Store the booking token in the database
    await db.bookings.createIntent({
      bookingToken,
      sessionId,
      eventId,
      zone,
      quantity,
      userId: user.userId, // Use the validated user.userId
      expiresAt: new Date(Date.now() + BOOKING_EXPIRY_MS).toISOString(),
      status: 'pending'
    });
    
    // Return the booking token and expiration time
    return NextResponse.json({ 
      bookingToken,
      expiresAt: Date.now() + BOOKING_EXPIRY_MS 
    });

  } catch (error) {
    console.error('Unexpected error in create-intent API:', error);
    return NextResponse.json({ 
      error: 'Server error', 
      details: error instanceof Error ? error.message : 'An unexpected error occurred'
    }, { status: 500 });
  }
}
