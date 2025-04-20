import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import db from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

const PLATFORM_FEE = 18; // Platform fee per ticket in HKD

interface LotteryRegistrationRequest {
  eventId: string;
  userId: string;
  zone: string;
  quantity: number;
  sessionId: string;
}

export async function POST(request: NextRequest) {
  try {
    // Check user authentication
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: '請先登入以繼續' }, { status: 401 });
    }

    const data: LotteryRegistrationRequest = await request.json();
    const { eventId, zone, quantity, sessionId } = data;
    
    // Basic validation
    if (!eventId || !zone || !quantity || !sessionId) {
      return NextResponse.json({ error: '缺少必要參數' }, { status: 400 });
    }

    if (quantity <= 0 || quantity > 4) {
      return NextResponse.json({ error: '數量必須在1和4之間' }, { status: 400 });
    }

    // Fetch event to verify it exists and is a lottery event
    const event = await db.events.findById(eventId);
    if (!event) {
      return NextResponse.json({ error: '找不到活動' }, { status: 404 });
    }

    if (!event.isDrawMode) {
      return NextResponse.json({ error: '此活動不支持抽籤模式' }, { status: 400 });
    }

    // Verify registration is still open
    const now = new Date();
    if (!event.registerDate || !event.endregisterDate) {
      return NextResponse.json({ error: '活動登記日期資料不完整' }, { status: 400 });
    }
    const registerStart = new Date(event.registerDate);
    const registerEnd = new Date(event.endregisterDate);
    
    if (now < registerStart) {
      return NextResponse.json({ error: '抽籤登記尚未開始' }, { status: 400 });
    }
    
    if (now > registerEnd) {
      return NextResponse.json({ error: '抽籤登記已結束' }, { status: 400 });
    }

    // Verify zone exists in event
    const zoneDetails = event.zones?.find(z => z.name === zone);
    if (!zoneDetails) {
      return NextResponse.json({ error: '找不到所選區域' }, { status: 400 });
    }

    // Check if user already registered for this event
    const existingRegistrations = await db.registration.findByEventAndUser(eventId, user.userId);
    if (existingRegistrations.length > 0) {
      return NextResponse.json({ error: '您已登記該活動的抽籤' }, { status: 400 });
    }

    // Create registration token
    const registrationToken = uuidv4();
    const totalAmount = PLATFORM_FEE * quantity;

    // Create registration record
    await db.registration.create({
      registrationToken,
      eventId,
      userId: user.userId,
      zoneName: zone,
      quantity,
      status: 'registered', // Initial status (registered, paid, drawn, won, lost)
      platformFee: PLATFORM_FEE,
      totalAmount,
      paymentStatus: 'pending',
      createdAt: new Date().toISOString(),
      sessionId
    });

    return NextResponse.json({
      success: true,
      message: '成功登記抽籤',
      registrationToken: registrationToken
    });
  } catch (error) {
    console.error('Lottery registration error:', error);
    return NextResponse.json({ error: '處理抽籤登記時出錯' }, { status: 500 });
  }
}
