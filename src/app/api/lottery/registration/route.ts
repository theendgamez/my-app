import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { Registration } from '@/types';

export async function GET(request: NextRequest) {
  try {
    // 支援 cookie 或 header 認證
    const user = await getCurrentUser(request);
    const headerUserId = request.headers.get('x-user-id');
    const userId = user?.userId || headerUserId;

    if (!userId) {
      return NextResponse.json(
        { error: '請先登入以查看您的抽籤記錄', message: 'Authentication required' },
        { status: 401 }
      );
    }

    // 查詢用戶所有抽籤登記
    const registrations = await db.registration.findByUser(userId) as Registration[];
    console.log(`Found ${registrations.length} registrations for user ${userId}`);

    const enhancedRegistrations = await Promise.all(
      registrations.map(async (registration: Registration) => {
        try {
          const event = registration.eventId
            ? await db.events.findById(registration.eventId)
            : null;
          return {
            ...registration,
            eventName: event?.eventName || registration.eventName || '未知活動',
            status: registration.status || 'registered',
            paymentStatus: registration.paymentStatus || 'pending',
            drawDate: event?.drawDate || registration.drawDate || null,
            platformFee: registration.platformFee || 18,
            totalAmount: registration.totalAmount || 0,
            quantity: registration.quantity || 1,
            zoneName: registration.zoneName || '未知區域',
            phoneNumber: registration.phoneNumber || '', // 新增
          };
        } catch (error) {
          console.error(`Error enhancing registration data for ${registration.registrationToken}:`, error);
          return registration;
        }
      })
    );

    return NextResponse.json({ registrations: enhancedRegistrations });
  } catch (error) {
    console.error('Error fetching registrations:', error);
    return NextResponse.json(
      { error: '無法獲取抽籤登記', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}