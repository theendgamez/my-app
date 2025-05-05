import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const id = (await params).id;
    
    if (!id) {
      return NextResponse.json({ error: '缺少訂單ID' }, { status: 400 });
    }

    // Find the booking by ID
    const booking = await db.bookings.findIntentByToken(id);
    if (!booking) {
      return NextResponse.json({ error: '找不到該訂單' }, { status: 404 });
    }

    // Authentication check
    const user = await getCurrentUser(request);
    const headerUserId = request.headers.get('x-user-id');
    const userId = user?.userId || headerUserId;
    
    // Only the owner of the booking or an admin can view it
    if (!userId || (booking.userId !== userId && user?.role !== 'admin')) {
      return NextResponse.json({ error: '無權訪問此訂單資訊' }, { status: 403 });
    }

    // Get event details to include with the booking
    const event = await db.events.findById(booking.eventId);
    if (!event) {
      return NextResponse.json({ 
        error: '找不到相關活動資訊',
        booking 
      }, { status: 404 });
    }

    // Find zone details
    const zoneDetails = event.zones?.find(z => z.name === booking.zone);
    const price = zoneDetails ? Number(zoneDetails.price) : 0;
    
    // Calculate expiry time
    const expiresAt = typeof booking.expiresAt === 'string' 
      ? new Date(booking.expiresAt).getTime() 
      : Number(booking.expiresAt);

    // Format response data
    const bookingDetails = {
      ...booking,
      eventName: event.eventName,
      eventDate: event.eventDate,
      eventLocation: event.location,
      price,
      expiresAt
    };

    return NextResponse.json(bookingDetails);
  } catch (error) {
    console.error('Error fetching booking:', error);
    return NextResponse.json(
      { error: '獲取訂單資訊時出錯', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
