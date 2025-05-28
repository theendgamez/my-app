import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // First try standard authentication
    const currentUser = await getCurrentUser(request);
    
    if (!currentUser || currentUser.role !== 'admin') {
      console.log(`Admin lottery events access denied. User ID: ${currentUser?.userId || 'N/A'}, Role: ${currentUser?.role || 'N/A'}`);
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
        const endRegisterDate = event.endregisterDate ? new Date(event.endregisterDate) : null;
        
        if (event.isDrawn) {
          status = 'drawn';
        } else if (endRegisterDate && endRegisterDate < now) {
          // Registration period ended but not yet drawn - ready for drawing
          status = 'drawing';
        } else if (drawDate && drawDate < now) {
          status = 'closed';
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
