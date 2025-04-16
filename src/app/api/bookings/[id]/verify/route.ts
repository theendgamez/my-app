import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    // Fix: await the params object before destructuring
    const { id } = await context.params;
    
    if (!id) {
      return NextResponse.json({ error: 'Missing token' }, { status: 400 });
    }
    
    // Try to find the booking
    let booking = null;
    
    try {
      booking = await db.bookings.findIntentByToken(id);
    } catch (e) {
      console.error('Error in findIntentByToken:', e);
    }
    if (!booking) {
      // Last resort - try a direct scan of the Bookings table
      try {
        const allBookings = await db.scanTable('Bookings');
        
        // Find our token
        const matchingBooking = allBookings?.find(b => b.bookingToken === id);
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
      eventLocation: event.location,
      eventDate: event.eventDate,
      quantity: booking.quantity,
      price: Number(zoneDetails.price),
      expiresAt: new Date(booking.expiresAt).getTime()
    };
    return NextResponse.json(bookingDetails);
  } catch (error) {
    console.error('Error verifying booking:', error);
    return NextResponse.json({ 
      error: 'Failed to verify booking',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

