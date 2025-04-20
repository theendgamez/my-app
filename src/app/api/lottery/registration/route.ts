import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { Registration } from '@/types';

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const user = await getCurrentUser(request);
    
    // Also check for userId in headers for client compatibility
    const headerUserId = request.headers.get('x-user-id');
    
    if (!user && !headerUserId) {
      return NextResponse.json(
        { error: '請先登入以查看您的抽籤記錄', message: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get the user ID from auth or header
    const userId = user?.userId || headerUserId;
    if (!userId) {
      return NextResponse.json(
        { error: '無效的用戶 ID', message: 'Invalid user ID' },
        { status: 401 }
      );
    }

    // Fetch all registrations for the user
    const registrations = await db.registration.findByUser(userId) as Registration[];
    console.log(`Found ${registrations.length} registrations for user ${userId}`);

    // For each registration, fetch additional event data if needed
    const enhancedRegistrations = await Promise.all(
      registrations.map(async (registration: Registration) => {
        try {
          // Get event details to include complete event information
          const event = registration.eventId 
            ? await db.events.findById(registration.eventId) 
            : null;
          
          // Return the enhanced registration data
          return {
            ...registration,
            eventName: event?.eventName || registration.eventName || '未知活動',
            // Ensure all fields have default values
            status: registration.status || 'registered',
            paymentStatus: registration.paymentStatus || 'pending',
            drawDate: event?.drawDate || registration.drawDate || null,
            platformFee: registration.platformFee || 18,
            totalAmount: registration.totalAmount || 0,
            quantity: registration.quantity || 1,
            zoneName: registration.zoneName || '未知區域'
          };
        } catch (error) {
          console.error(`Error enhancing registration data for ${registration.registrationToken}:`, error);
          return registration; // Return original data if enhancement fails
        }
      })
    );

    // Return the registrations
    return NextResponse.json({
      registrations: enhancedRegistrations
    });
  } catch (error) {
    console.error('Error fetching registrations:', error);
    return NextResponse.json(
      { error: '無法獲取抽籤登記', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );  

  }}