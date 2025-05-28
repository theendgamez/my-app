import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    // Check admin authentication
    const currentUser = await getCurrentUser(request);
    
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json(
        { error: '僅管理員可存取此API' },
        { status: 403 }
      );
    }

  
    const eventId = (await params).eventId;
    if (!eventId) {
      return NextResponse.json(
        { error: '缺少活動ID' },
        { status: 400 }
      );
    }

    // Check if event exists
    const event = await db.events.findById(eventId);
    if (!event) {
      return NextResponse.json(
        { error: '找不到該活動' },
        { status: 404 }
      );
    }

    // Verify this is a lottery event
    if (!event.isDrawMode) {
      return NextResponse.json(
        { error: '此活動不是抽籤模式' },
        { status: 400 }
      );
    }

    // Get all registrations for this event
    const registrations = await db.registration.findByEvent(eventId);

    // Enhance registration data with user information
    const enhancedRegistrations = await Promise.all(
      registrations.map(async (registration) => {
        try {
          // Assert registration type
          const reg = registration as {
            userId?: string;
            phoneNumber?: string;
            registrationToken?: string;
            [key: string]: unknown;
          };

          // Get user details if available
          let userName = undefined;
          let phoneNumber = reg.phoneNumber || undefined;
          
          if (reg.userId) {
            const userInfo = await db.users.findById(reg.userId);
            if (userInfo) {
              userName = userInfo.userName || userInfo.email;
              if (!phoneNumber) {
                phoneNumber = userInfo.phoneNumber;
              }
            }
          }

          return {
            ...reg,
            userName,
            phoneNumber
          };
        } catch (error) {
          console.error(`Error enhancing registration ${(registration as { registrationToken?: string }).registrationToken}:`, error);
          return registration;
        }
      })
    );

    return NextResponse.json({
      registrations: enhancedRegistrations
    });
  } catch (error) {
    console.error('Error fetching registrations:', error);
    return NextResponse.json(
      { error: '獲取抽籤登記時出錯' },
      { status: 500 }
    );
  }
}
