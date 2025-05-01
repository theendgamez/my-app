import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // First try standard authentication
    const user = await getCurrentUser(request);
    
    // Then check for direct user ID as fallback
    const userIdHeader = request.headers.get('x-user-id');
    let isAdmin = false;

    // If we have a user from getCurrentUser
    if (user && user.role === 'admin') {
      isAdmin = true;
    } 
    // If not, but we have a user ID header, try to verify directly
    else if (userIdHeader) {
      try {
        const dbUser = await db.users.findById(userIdHeader);
        if (dbUser?.role === 'admin') {
          isAdmin = true;
        }
      } catch (error) {
        console.error('Error verifying admin via user ID:', error);
      }
    }

    // If we still don't have an admin, reject the request
    if (!isAdmin) {
      console.log('Admin lottery events access denied', { 
        user: user?.userId || 'none', 
        headerUserId: userIdHeader || 'none',
        hasRole: user?.role || 'none' 
      });
      
      return NextResponse.json(
        { error: '僅管理員可存取此API' },
        { status: 403 }
      );
    }

    // Get all events with lottery mode
    const allEvents = await db.events.findMany();
    const lotteryEvents = allEvents
      .filter(event => event.isDrawMode)
      .map(event => {
        // Get registration status
        let status = 'registering';
        const now = new Date();
        const drawDate = event.drawDate ? new Date(event.drawDate) : null;
        
        if (event.isDrawn) {
          status = 'drawn';
        } else if (drawDate && drawDate < now) {
          status = 'closed';
        } else if (event.endregisterDate && new Date(event.endregisterDate) < now) {
          status = 'drawing';
        }

        // Calculate remaining days until draw
        const remainingDays = drawDate 
          ? Math.max(0, Math.ceil((drawDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
          : 0;

        return {
          eventId: event.eventId,
          eventName: event.eventName,
          drawDate: event.drawDate,
          status,
          registerCount: 0, // Will be updated below
          remainingDays
        };
      });

    // Fetch registration counts for each lottery event
    for (const event of lotteryEvents) {
      try {
        const registrations = await db.registration.findByEvent(event.eventId);
        event.registerCount = registrations.length;
      } catch (error) {
        console.error(`Error fetching registrations for event ${event.eventId}:`, error);
      }
    }

    return NextResponse.json(lotteryEvents);
  } catch (error) {
    console.error('Error in lottery events API:', error);
    return NextResponse.json(
      { error: '獲取抽籤活動資料時出錯' },
      { status: 500 }
    );
  }
}
