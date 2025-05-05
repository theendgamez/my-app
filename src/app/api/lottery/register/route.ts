import { NextRequest } from 'next/server';
import { createProtectedRouteHandler, createResponse } from '@/lib/auth';
import db from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export const POST = createProtectedRouteHandler(async (req: NextRequest, user) => {
  try {
    const { eventId, zoneName, quantity, status = 'registered' } = await req.json();
    
    // Validate input
    if (!eventId || !zoneName || !quantity) {
      return createResponse({ error: '缺少必要參數', details: { eventId, zoneName, quantity } }, 400);
    }

    // Get event to validate it's still open for registration
    const event = await db.events.findById(eventId);
    
    if (!event) {
      return createResponse({ error: '找不到活動', eventId }, 404);
    }
    
    if (!event.isDrawMode) {
      return createResponse({ error: '此活動不支持抽籤' }, 400);
    }

    // Check if registration period has ended
    if (event.endregisterDate && new Date(event.endregisterDate) < new Date()) {
      return createResponse({ error: '抽籤登記已結束' }, 400);
    }

    if (event.drawDate && new Date(event.drawDate) < new Date()) {
      return createResponse({ error: '抽籤已經結束' }, 400);
    }

    // Check if registration period has not started yet
    if (event.registerDate && new Date(event.registerDate) > new Date()) {
      return createResponse({ error: '抽籤登記尚未開始' }, 400);
    }
    
    // Check if user has been registered for at least 7 days
    const userDetails = await db.users.findById(user.userId);
    if (!userDetails || !userDetails.createdAt) {
      return createResponse({ error: '無法驗證用戶資料' }, 500);
    }
    
    const userCreatedAt = new Date(userDetails.createdAt);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    if (userCreatedAt > sevenDaysAgo) {
      return createResponse({ 
        error: '只有註冊超過7天的用戶才能參加抽籤', 
        registeredAt: userCreatedAt,
        eligible: false,
        eligibleDate: new Date(userCreatedAt.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()
      }, 403);
    }
    
    // Check if user has already registered for this event
    try {
      const existingRegistrations = await db.lottery.findByUserAndEvent(user.userId, eventId);
      
      if (existingRegistrations && existingRegistrations.length > 0) {
        return createResponse({ error: '您已經登記了此活動的抽籤', registrationToken: (existingRegistrations as { registrationToken: string }[])[0].registrationToken }, 400);
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error('Error checking existing registrations:', error.message);
      } else {
        console.error('Error checking existing registrations:', error);
      }
      // Continue with registration even if check fails
    }
    
    // Create registration with a secure token
    const registrationToken = uuidv4();
    const platformFee = 18; // Assuming constant platform fee per ticket
    const totalAmount = platformFee * quantity;
    const now = new Date().toISOString();

    const registrationData = {
      registrationToken,
      userId: user.userId,
      eventId,
      zoneName, 
      quantity,
      status,
      platformFee,
      totalAmount,
      paymentStatus: 'pending',
      createdAt: now,
      drawDate: event.drawDate
    };
    
    await db.registration.create(registrationData);
    
    return createResponse({ 
      message: '抽籤登記成功',
      registrationToken
    }, 201);
  } catch (error) {
    console.error('Registration error:', error);
    return createResponse({ 
      error: '註冊時發生錯誤', 
      details: error instanceof Error ? error.message : String(error) 
    }, 500);
  }
});
