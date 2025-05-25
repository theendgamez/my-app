import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { Registration } from '@/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const token = (await params).token;
    
    if (!token) {
      return NextResponse.json({ error: '未提供註冊令牌' }, { status: 400 });
    }

    // Authenticate user with fallback
    const user = await getCurrentUser(request);
    const fallbackUserId = !user ? request.headers.get('x-user-id') : null;
    const userId = user?.userId || fallbackUserId;
    
    if (!userId) {
      return NextResponse.json({ error: '請先登入', code: 'UNAUTHORIZED' }, { status: 401 });
    }

    // Find registration using the db utility's built-in fallback mechanisms
    console.log(`Searching for registration with token: ${token}`);
    let registration: Registration | null = null;
    
    // Method 1: Use db.registration.findByToken which has its own fallback mechanism
    try {
      registration = await db.registration.findByToken(token) as Registration | null;
      console.log("Registration lookup result:", !!registration ? "Found" : "Not found");
    } catch (error) {
      console.error("Error finding registration by token:", error);
    }
    
    // Method 2: If not found, try scanning the entire table as a last resort
    if (!registration) {
      console.log("Primary lookup failed, trying full table scan");
      try {
        const allRegistrations = await db.scanTable('Registration');
        registration = allRegistrations.find(item => 
          (item as Registration).registrationToken === token
        ) as Registration | null;
        console.log("Table scan result:", !!registration ? "Found" : "Not found");
      } catch (error) {
        console.error("Error during table scan:", error);
      }
    }
    
    if (!registration) {
      return NextResponse.json({ error: '找不到該抽籤登記' }, { status: 404 });
    }

    // Authorization check
    if (registration.userId !== userId && user?.role !== 'admin') {
      return NextResponse.json({ error: '無權訪問此抽籤登記' }, { status: 403 });
    }

    // Fetch event details to get event name
    let eventName = '未知活動';
    try {
      const event = await db.events.findById(registration.eventId);
      if (event) {
        eventName = event.eventName;
      }
    } catch (error) {
      console.error('Error fetching event details:', error);
    }

    // Return registration data with event name
    return NextResponse.json({
      ...registration,
      eventName, // Add event name to fix "未知活動"
      phoneNumber: registration.phoneNumber || '',
    });
  } catch (error) {
    console.error('Error fetching lottery registration:', error);
    return NextResponse.json({ error: '獲取抽籤登記詳情時出錯' }, { status: 500 });
  }
}
