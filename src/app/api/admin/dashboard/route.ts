import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { CacheManager } from '@/lib/cache';

export async function GET(request: NextRequest) {
  try {
    // First try standard authentication
    const currentUser = await getCurrentUser(request);
    
    if (!currentUser || currentUser.role !== 'admin') {
      console.log(`Admin dashboard access denied. User ID: ${currentUser?.userId || 'N/A'}, Role: ${currentUser?.role || 'N/A'}`);
      return NextResponse.json(
        { error: '僅管理員可存取此API', details: 'Not authorized as admin' },
        { status: 403 }
      );
    }

    // Check cache first
    const cachedStats = await CacheManager.getDashboardStats();
    if (cachedStats) {
      return NextResponse.json(cachedStats);
    }

    // Get total events count
    const allEvents = await db.events.findMany();
    const totalEvents = allEvents.length;
    
    // Get active events (events with date >= today)
    const now = new Date();
    const activeEvents = allEvents.filter(
      event => new Date(event.eventDate) >= now
    ).length;

    // Get users count
    let totalUsers = 0;
    try {
      const users = await db.users.findMany();
      totalUsers = users.length;
    } catch (error) {
      console.error('Error fetching users:', error);
    }

    // Get lottery registrations
    let totalRegistrations = 0;
    try {
      // This might need to be implemented in your DB layer
      const registrations = await db.registration.findMany();
      totalRegistrations = registrations.length;
    } catch (error) {
      console.error('Error fetching registrations:', error);
    }

    // Get payments info and calculate revenue in one query
    let pendingPayments = 0;
    let completedPayments = 0;
    let totalRevenue = 0;
    try {
      const payments = await db.payments.findMany();
      pendingPayments = payments.filter(p => p.status === 'pending').length;
      completedPayments = payments.filter(p => p.status === 'completed').length;
      totalRevenue = payments
        .filter(p => p.status === 'completed')
        .reduce((sum, p) => sum + (p.amount || 0), 0);
    } catch (error) {
      console.error('Error fetching payments:', error);
    }

    // Get active tickets
    let activeTickets = 0;
    try {
      if (db.tickets && typeof db.tickets.findMany === 'function') {
        const tickets = await db.tickets.findMany();
        activeTickets = tickets.filter(t => t.status === 'active').length;
      }
    } catch (error) {
      console.error('Error fetching tickets:', error);
    }

    const dashboardStats = {
      totalEvents,
      activeEvents,
      totalUsers,
      totalRegistrations,
      pendingPayments,
      completedPayments,
      totalRevenue,
      activeTickets
    };

    // Cache the stats
    await CacheManager.cacheDashboardStats(dashboardStats);

    // Return dashboard data
    return NextResponse.json(dashboardStats);
  } catch (error) {
    console.error('Error in dashboard API:', error);
    return NextResponse.json(
      { error: '獲取儀表板數據時出錯', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
