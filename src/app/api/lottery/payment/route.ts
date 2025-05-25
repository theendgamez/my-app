import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';
import { Registration } from '@/types'; // Import the Registration type from types

export async function POST(request: NextRequest) {
  try {
    // Check user authentication
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: '請先登入以繼續' }, { status: 401 });
    }

    const data = await request.json();
    const { registrationToken, paymentMethod } = data;
    
    // Basic validation
    if (!registrationToken) {
      return NextResponse.json({ error: '缺少登記令牌' }, { status: 400 });
    }

    // Fetch the registration using the imported Registration type
    const registration = await db.registration.findByToken(registrationToken) as Registration;
    if (!registration) {
      return NextResponse.json({ error: '找不到該抽籤登記' }, { status: 404 });
    }

    // Check if this is the user's registration
    if (registration.userId !== user.userId) {
      return NextResponse.json({ error: '無權處理此登記的付款' }, { status: 403 });
    }

    // Check if already paid
    if (registration.paymentStatus === 'completed') {
      return NextResponse.json({ error: '此登記已支付' }, { status: 400 });
    }

    // In a real application, you would integrate with a payment processor here
    // For demo purposes, we'll just simulate payment processing
    
    // Generate a payment ID
    const paymentId = uuidv4();
    const now = new Date().toISOString();

    // Get event details for payment and email notification
    const event = await db.events.findById(registration.eventId);

    // Create a payment record
    await db.payments.create({
      paymentId,
      userId: user.userId,
      amount: registration.totalAmount ?? 0, // Provide default if undefined
      totalAmount: registration.totalAmount ?? 0, // Provide default if undefined
      paymentMethod,
      status: 'completed',
      createdAt: now,
      relatedTo: 'lottery_registration',
      eventId: registration.eventId,
      eventName: event?.eventName || 'Unknown Event',
      zone: registration.zoneName, 
      payQuantity: registration.quantity ?? 0, // Provide default if undefined
      cardDetails: {
        lastFourDigits: registration.cardLastFourDigits || '0000', // Provide default if undefined
      }
    });

    // Update registration payment status
    await db.registration.update(registrationToken, {
      paymentStatus: 'completed',
      paidAt: now,
      paymentId
    });

    // In a real application, send confirmation email here
    
    return NextResponse.json({
      success: true,
      message: '付款成功',
      paymentId,
      receipt: {
        paymentId,
        amount: registration.totalAmount,
        date: now,
        eventName: event?.eventName || 'Unknown Event',
        registrationToken
      }
    });
  } catch (error) {
    console.error('Lottery payment error:', error);
    return NextResponse.json({ error: '處理付款時出錯' }, { status: 500 });
  }
}
