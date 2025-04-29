import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Check admin authentication
    const user = await getCurrentUser(request);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: '僅管理員可以訪問儀表板數據' }, { status: 403 });
    }

    // Calculate time range for recent sales (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString();

    // Get all events
    const events = await db.events.findMany();
    const activeEvents = events.filter(event => event.status === 'Active');

    // Get all users
    const users = await db.scanTable('Users');

    // Get all bookings with pending status
    const bookings = await db.bookings.scanAllBookings();
    const pendingBookings = bookings.filter(booking => booking.status === 'pending');

    // Get all tickets
    const tickets = await db.tickets.findMany();

    // Get all payments for recent sales calculation
    const payments = await db.scanTable('Payments') as any[];
    const recentPayments = payments.filter(payment => 
      payment.createdAt && payment.createdAt > sevenDaysAgoStr && payment.status === 'completed'
    );
    
    // Calculate total recent sales
    const recentSales = recentPayments.reduce((total, payment) => total + (payment.amount || 0), 0);

    return NextResponse.json({
      totalEvents: events.length,
      totalUsers: users.length,
      totalTickets: tickets.length,
      activeEvents: activeEvents.length,
      pendingPayments: pendingBookings.length,
      recentSales
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return NextResponse.json(
      { error: '獲取儀表板數據時發生錯誤', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
