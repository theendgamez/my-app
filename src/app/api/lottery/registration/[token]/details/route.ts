import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { Registration } from '@/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const token = (await params).token;
    if (!token) {
      return NextResponse.json({ error: 'Missing registration token' }, { status: 400 });
    }

    const registration = await db.registration.findByToken(token) as Registration;
    if (!registration) {
      return NextResponse.json({ error: 'Registration not found', registrationToken: token }, { status: 404 });
    }

    // Determine purchase status directly from the registration record's flag
    // This flag is set to true only when actual tickets are purchased in the purchase API.
    const ticketsPurchased = Boolean(registration.ticketsPurchased); 

    let associatedTickets: unknown[] = [];
    if (Array.isArray(registration.ticketIds) && registration.ticketIds.length > 0) {
      try {
        associatedTickets = await Promise.all(
          registration.ticketIds.map(ticketId => db.tickets.findById(ticketId))
        );
        associatedTickets = associatedTickets.filter(ticket => ticket !== null);
      } catch (ticketError) {
        console.error(`Error fetching associated tickets for registration ${token}:`, ticketError);
      }
    }
    
    // Provide more detailed purchase status in the response
    const enhancedRegistration = {
      ...registration,
      ticketsPurchased, // Use the authoritative value
      platformFeePaid: Boolean(registration.platformFeePaid), // Ensure platformFeePaid is always boolean
      hasAssociatedTickets: associatedTickets.length > 0,
      ticketCount: associatedTickets.length
    };

    // Fetch event details with better error handling
    const event = await db.events.findById(registration.eventId);
    if (!event) {
      console.error(`Event not found for registration: ${token}, eventId: ${registration.eventId}`);
      // Return a placeholder event object if the real event data is missing
      return NextResponse.json({
        registration: enhancedRegistration,
        event: {
          eventId: registration.eventId,
          eventName: '活動資料暫時無法獲取',
          eventDate: null,
          location: '-',
          drawDate: registration.drawDate || null,
          isDrawMode: true
        },
        zoneDetails: { 
          name: registration.zoneName,
          price: 0 // Changed from hardcoded 20 to 0 as placeholder
        }
      });
    }

    // Find zone details from event
    const zoneFromEvent = event.zones?.find(z => z.name === registration.zoneName);
    
    // Determine the price more intelligently
    let zonePrice = 0;
    
    if (zoneFromEvent && zoneFromEvent.price) {
      // Case 1: We found the exact zone and it has a price
      zonePrice = Number(zoneFromEvent.price);
    } else if (event.zones && event.zones.length > 0) {
      // Case 2: We couldn't find the exact zone, but there are other zones we can average from
      const availablePrices = event.zones
        .filter(z => z.price && !isNaN(Number(z.price)))
        .map(z => Number(z.price));
      
      if (availablePrices.length > 0) {
        // Calculate average price from other zones
        zonePrice = Math.round(availablePrices.reduce((sum, price) => sum + price, 0) / availablePrices.length);
      }
    }
    
    // Create zoneDetails with best available price information
    const zoneDetails = {
      name: registration.zoneName,
      price: zonePrice,
      zoneQuantity: zoneFromEvent?.zoneQuantity || 100 // Default quantity
    };

    // Log the data being returned for debugging
    console.log("Returning event data:", {
      eventId: event.eventId,
      eventName: event.eventName
    });
    
    console.log("Zone details being returned:", zoneDetails);

    return NextResponse.json({
      registration: {
        ...enhancedRegistration,
        phoneNumber: enhancedRegistration.phoneNumber || '',
      },
      event: {
        eventId: event.eventId,
        eventName: event.eventName,
        eventDate: event.eventDate,
        location: event.location,
        drawDate: event.drawDate,
        isDrawMode: event.isDrawMode,
        zones: event.zones || [] // Ensure zones is at least an empty array
      },
      zoneDetails
    });
  } catch (error) {
    console.error('Error fetching registration details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch registration details', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
