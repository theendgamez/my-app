import { NextRequest } from 'next/server';
import { createProtectedRouteHandler, createResponse } from '@/lib/auth';
import db from '@/lib/db';

export const POST = createProtectedRouteHandler(async (req: NextRequest, user) => {
  try {
    const { eventId, zoneName, quantity, status = 'registered' } = await req.json();
    
    // Validate input
    if (!eventId || !zoneName || !quantity) {
      return createResponse({ error: '缺少必要參數' }, 400);
    }

    // Get event to validate it's still open for registration
    const event = await db.events.findById(eventId);
    
    if (!event) {
      return createResponse({ error: '找不到活動' }, 404);
    }
    
    if (!event.isDrawMode) {
      return createResponse({ error: '此活動不支持抽籤' }, 400);
    }
    
    // Check if registration period has ended
    if (event.drawDate && new Date(event.drawDate) < new Date()) {
      return createResponse({ error: '抽籤登記已結束' }, 400);
    }
    
    // Check if user has already registered for this event
    const existingRegistration = await db.lottery?.findByUserAndEvent(user.userId, eventId);
    
    if (existingRegistration) {
      return createResponse({ error: '您已經登記了此活動的抽籤' }, 400);
    }
    
    // Create registration
    const registrationToken = await db.lottery.create({
      userId: user.userId,
      eventId,
      zoneName, 
      quantity,
      status,
      createdAt: Date.now(),
    });
    
    return createResponse({ 
      message: '抽籤登記成功',
      registrationToken
    });
  } catch (error) {
    console.error('Registration error:', error);
    return createResponse({ error: '註冊時發生錯誤' }, 500);
  }
});
