import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    // Check admin authentication
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: '請先登入以繼續' }, { status: 401 });
    }
    
    if (user.role !== 'admin') {
      return NextResponse.json({ error: '僅管理員可以查看抽籤結果' }, { status: 403 });
    }

    // Await the params object before accessing its properties
    const { eventId } = await params;
    
    if (!eventId) {
      return NextResponse.json({ error: '請提供活動ID' }, { status: 400 });
    }

    // Fetch the event to verify it exists and is a lottery event
    const event = await db.events.findById(eventId);
    if (!event) {
      return NextResponse.json({ error: '找不到該活動' }, { status: 404 });
    }

    // Verify this is a lottery event
    if (!event.isDrawMode) {
      return NextResponse.json({ error: '此活動不支持抽籤模式' }, { status: 400 });
    }

    // Get all registrations for this event
    const registrations = await db.registration.findByEvent(eventId) as Array<{
      registrationToken: string;
      userId: string;
      phoneNumber?: string;
      status: string;
      zoneName: string;
      quantity: number;
      createdAt: string | Date;
      drawnAt?: string | Date | null;
      paymentStatus?: string;
    }>;
    
    // Enhance registration data with user information
    const results = await Promise.all(
      registrations.map(async (registration) => {
        try {
          // Fetch user information
          const userData = await db.users.findById(registration.userId);
          
          return {
            registrationToken: registration.registrationToken,
            userId: registration.userId,
            userName: userData?.userName || 'Unknown User',
            email: userData?.email || '',
            phoneNumber: userData?.phoneNumber || registration.phoneNumber || '',
            result: registration.status === 'won' ? 'won' : (registration.status === 'lost' ? 'lost' : 'pending'),
            zoneName: registration.zoneName,
            quantity: registration.quantity,
            createdAt: registration.createdAt,
            drawnAt: registration.drawnAt || null,
            paymentStatus: registration.paymentStatus || 'pending'
          };
        } catch (error) {
          console.error(`Error enhancing user data for ${registration.registrationToken}:`, error);
          return {
            registrationToken: registration.registrationToken,
            userId: registration.userId,
            result: registration.status === 'won' ? 'won' : (registration.status === 'lost' ? 'lost' : 'pending'),
            zoneName: registration.zoneName,
            quantity: registration.quantity,
            createdAt: registration.createdAt
          };
        }
      })
    );

    return NextResponse.json({
      eventId,
      eventName: event.eventName,
      drawDate: event.drawDate,
      totalRegistrations: registrations.length,
      winners: results.filter(r => r.result === 'won').length,
      losers: results.filter(r => r.result === 'lost').length,
      pending: results.filter(r => r.result === 'pending').length,
      results
    });
  } catch (error) {
    console.error('Error fetching lottery results:', error);
    return NextResponse.json(
      { error: '獲取抽籤結果時出錯', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
