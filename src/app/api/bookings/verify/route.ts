/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    
    console.log('Verifying booking token:', token); // Debug log
    
    if (!token) {
      return NextResponse.json({ error: 'Missing token' }, { status: 400 });
    }
    
    // Try to find the booking
    let booking = null;
    
    if (!booking) {
      try {
        console.log('Attempting to find with findIntentByToken instead...');
        booking = await db.bookings.findIntentByToken(token);
        console.log('findIntentByToken result:', booking ? 'found' : 'not found');
      } catch (e) {
        console.error('Error in findIntentByToken:', e);
      }
    }
    
    // Debug: Additional logging
    console.log('Booking found:', booking ? 'yes' : 'no');
    if (!booking) {
      // Last resort - try a direct scan of the Bookings table
      try {
        console.log('Attempting direct scan of bookings table...');
        const allBookings = await db.scanTable('Bookings');
        console.log('All bookings count:', allBookings ? allBookings.length : 0);
        
        // Find our token
        const matchingBooking = allBookings?.find(b => b.bookingToken === token);
        if (matchingBooking) {
          console.log('Found booking via scan!');
          booking = matchingBooking;
        }
      } catch (e) {
        console.error('Error in scan attempt:', e);
      }
    }
    
    if (!booking) {
      return NextResponse.json({ 
        error: 'Booking not found',
        details: 'The booking token was not found in the database.' 
      }, { status: 404 });
    }
    
    // Get event details to include event name
    const event = await db.events.findById(booking.eventId);
    if (!event) {
      return NextResponse.json({ 
        error: 'Event not found',
        details: `Event ID ${booking.eventId} does not exist.`
      }, { status: 404 });
    }
    
    // Find zone details to get price
    const zoneDetails = event.zones?.find(z => z.name === booking.zone);
    if (!zoneDetails) {
      return NextResponse.json({ 
        error: 'Zone not found',
        details: `Zone ${booking.zone} not found in event ${booking.eventId}`
      }, { status: 404 });
    }
    
    // Transform booking data to expected BookingDetails format
    const bookingDetails = {
      eventName: event.eventName,
      zone: booking.zone,
      quantity: booking.quantity,
      price: Number(zoneDetails.price),
      expiresAt: new Date(booking.expiresAt).getTime()
    };
    
    console.log('Successfully retrieved booking details:', bookingDetails);
    return NextResponse.json(bookingDetails);
  } catch (error) {
    console.error('Error verifying booking:', error);
    return NextResponse.json({ 
      error: 'Failed to verify booking',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Add OPTIONS handler to address preflight requests
export async function OPTIONS(_request: NextRequest) {
  const response = new NextResponse(null, { status: 200 });
  return response;
}
