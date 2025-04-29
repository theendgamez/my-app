import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Check if the user is authenticated and is an admin
    const user = await getCurrentUser(request);
    
    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { error: '未授權訪問' },
        { status: 403 }
      );
    }
    
    // Get all data and count manually since we don't have direct count methods
    const [
      allUsers,
      allEvents,
      allBookings,
      allTickets,
    ] = await Promise.all([
      db.users.findMany(), // Assuming there's a findMany method, or replace with appropriate method
      db.events.findMany(),
      db.bookings.findMany(),
      db.tickets.findMany(),
    ]);
    
    // Calculate recent stats (e.g., last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    // Return all the stats
    return NextResponse.json({
      users: {
        total: allUsers?.length || 0,
      },
      events: {
        total: allEvents?.length || 0,
      },
      bookings: {
        total: allBookings?.length || 0,
      },
      tickets: {
        total: allTickets?.length || 0,
      },
      // Add more statistics as needed
    });
    
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    return NextResponse.json(
      { error: '獲取管理統計數據時出錯' },
      { status: 500 }
    );
  }
}
