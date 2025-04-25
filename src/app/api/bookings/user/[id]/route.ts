import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise <{id: string }> } // Correct type signature
) {
  try {
    const userId = (await params).id; // Access id directly
    
    // Get status query parameter
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    
    // Fetch user's bookings from database
    const bookings = await db.bookings.findByUser(userId);
    
    // Filter by status if specified
    const filteredBookings = status 
      ? bookings.filter(booking => booking.status === status)
      : bookings;
    
    // Return the filtered bookings as JSON
    return NextResponse.json(filteredBookings);
    
  } catch (error) {
    console.error('Error fetching user bookings:', error);
    return NextResponse.json(
      { error: '獲取訂單時出錯', details: error instanceof Error ? error.message : 'Unknown error' }, 
      { status: 500 }
    );
  }
}
