import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import  db  from '@/lib/db';


export const dynamic = 'force-dynamic'; // Don't cache this route

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const user = await getCurrentUser(request);
    const headerUserId = request.headers.get('x-user-id');
    const userId = user?.userId || headerUserId;

    if (!userId) {
      return NextResponse.json(
        { error: '請先登入以獲取通知', message: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get unread lottery results
    const registrations = await db.registration.findByUserRecentDrawn(userId);

    // Define the expected type for registration
    type Registration = {
      status: string;
      drawnAt: string | Date | null;
      resultViewed: boolean;
      registrationToken: string;
      eventName?: string;
    };

    // Filter to only include recently drawn registrations that haven't been viewed
    const unreadResults = (registrations as Registration[])
      .filter((reg) => {
        // Include registrations that:
        // 1. Have been drawn (won or lost)
        // 2. Draw happened in the last 7 days
        // 3. Haven't been marked as viewed
        const isDrawn = reg.status === 'won' || reg.status === 'lost';
        const isRecent = reg.drawnAt && (new Date().getTime() - new Date(reg.drawnAt as string).getTime()) < 7 * 24 * 60 * 60 * 1000;
        const isUnread = !reg.resultViewed;
        return isDrawn && isRecent && isUnread;
      })
      .map((reg) => {
        return {
          registrationToken: reg.registrationToken,
          eventName: reg.eventName || 'Unknown Event',
          result: reg.status === 'won' ? 'won' : 'lost',
          drawnAt: reg.drawnAt
        };
      });

    return NextResponse.json({ results: unreadResults });
  } catch (error) {
    console.error('Error fetching lottery notifications:', error);
    return NextResponse.json(
      { error: '無法獲取通知', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
