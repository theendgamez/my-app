import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import db from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

// Define registration interface
interface Registration {
  registrationToken: string;
  userId: string;
  status: string;
  platformFeePaid?: boolean;
  platformFee?: number;
  eventId: string;
  eventName?: string;
  zoneName?: string;
  quantity?: number;
  paymentStatus?: string;
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: '請先登入' }, { status: 401 });
    }

    const data = await request.json();
    const { registrationToken } = data;
    
    if (!registrationToken) {
      return NextResponse.json({ error: '缺少登記令牌' }, { status: 400 });
    }

    // Get registration details
    const registration = await db.registration.findByToken(registrationToken) as Registration;
    if (!registration) {
      return NextResponse.json({ error: '找不到該抽籤登記' }, { status: 404 });
    }

    // Verify user ownership
    if (registration.userId !== user.userId) {
      return NextResponse.json({ error: '無權處理此登記的付款' }, { status: 403 });
    }

    // Check if already paid
    if (registration.platformFeePaid || registration.paymentStatus === 'paid') {
      return NextResponse.json({ error: '平台費用已支付' }, { status: 400 });
    }

    // Create payment record
    const paymentId = uuidv4();
    const now = new Date().toISOString();
    const platformFee = registration.platformFee || 18;
    const totalAmount = platformFee * (registration.quantity || 1);

    await db.payments.create({
      paymentId,
      userId: user.userId,
      amount: totalAmount,
      totalAmount: totalAmount,
      paymentMethod: 'credit_card',
      status: 'completed',
      createdAt: now,
      relatedTo: 'lottery_platform_fee',
      eventId: registration.eventId,
      eventName: registration.eventName || '',
      zone: registration.zoneName || '',
      payQuantity: registration.quantity || 1,
      cardDetails: { lastFourDigits: '1234' }
    });

    // Update registration
    await db.registration.update(registrationToken, {
      platformFeePaid: true,
      paymentStatus: 'paid',
      paymentId,
      paidAt: now
    });

    return NextResponse.json({ 
      success: true,
      message: '平台費用支付成功',
      paymentId
    });
  } catch (error) {
    console.error('Error processing platform fee payment:', error);
    return NextResponse.json(
      { success: false, error: 'Payment processing failed' },
      { status: 500 }
    );
  }
}
