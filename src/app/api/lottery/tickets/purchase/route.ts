import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import db from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { decryptData, isEncrypted } from '@/utils/encryption';
import { Ticket } from '@/types';
import { CacheManager } from '@/lib/cache'; // Import CacheManager

// Define purchase limit configuration with risk-based rules
const purchaseLimitConfig = {
  maxTicketsPerEvent: 2,
  maxTicketsPerUser: 5,
  riskBasedLimits: {
    veryHigh: 1,   // Very high risk users can only buy 1 ticket
    high: 1,       // High risk users can only buy 1 ticket
    medium: 2,     // Medium risk users limited to 2 tickets
    low: 4         // Low risk users get higher limits
  }
};

/**
 * Determines the ticket limit based on user risk profile
 * @param riskScore - User's risk score (0-1) or risk level string
 * @param defaultLimit - Default limit to use if risk score is not available
 * @returns Maximum number of tickets allowed
 */
function determineTicketLimit(riskScore?: number | string, defaultLimit: number = purchaseLimitConfig.maxTicketsPerEvent): number {
  // Handle risk level as string input
  if (typeof riskScore === 'string') {
    switch (riskScore) {
      case 'very-high': return purchaseLimitConfig.riskBasedLimits.veryHigh;
      case 'high': return purchaseLimitConfig.riskBasedLimits.high;
      case 'medium': return purchaseLimitConfig.riskBasedLimits.medium;
      case 'low': return purchaseLimitConfig.riskBasedLimits.low;
      default: return defaultLimit;
    }
  }
  
  // Handle numeric risk score
  if (typeof riskScore === 'number') {
    if (riskScore > 0.8) return purchaseLimitConfig.riskBasedLimits.veryHigh;
    if (riskScore > 0.6) return purchaseLimitConfig.riskBasedLimits.high;
    if (riskScore > 0.4) return purchaseLimitConfig.riskBasedLimits.medium;
    return purchaseLimitConfig.riskBasedLimits.low;
  }
  
  // Default case: use default limit
  return defaultLimit;
}

/**
 * Checks if a user's purchase would exceed defined limits
 * @param userId - User identifier
 * @param eventId - Event identifier
 * @returns Object indicating if purchase is allowed with reason if denied
 */
async function checkPurchaseLimits(userId: string, eventId: string, quantity: number): Promise<{allowed: boolean, reason?: string}> {
  try {
    // Get user profile with risk information
    const userProfile = await db.users.findById(userId);
    
    // Get all tickets owned by this user for this specific event
    const eventTickets = await db.tickets.findByEvent(eventId, '');
    const userEventTickets = eventTickets.filter(ticket => 
      ticket.userId === userId && 
      ['available', 'reserved', 'sold'].includes(ticket.status)
    );
    
    // Determine the event limit based on user's risk score
    const userRiskScore = userProfile?.riskScore;
    const userRiskLevel = userProfile?.riskLevel;
    const perEventLimit = determineTicketLimit(userRiskScore || userRiskLevel, purchaseLimitConfig.maxTicketsPerEvent);
    
    console.log(`User ${userId} risk assessment: score=${userRiskScore}, level=${userRiskLevel}, limit=${perEventLimit}`);
    
    // Check if user has reached the per-event limit
    if (userEventTickets.length + quantity > perEventLimit) {
      return { 
        allowed: false, 
        reason: `超過每活動購票限制 (${perEventLimit}張)，由於風險評估，您的購票數量已被限制` 
      };
    }
    
    // Get all active tickets owned by this user across all events
    const userTickets = await db.tickets.findByUser(userId);
    const activeUserTickets = userTickets.filter(ticket => 
      ['available', 'reserved', 'sold'].includes(ticket.status)
    );
    
    // Check if user has reached the total tickets limit
    if (activeUserTickets.length + quantity > purchaseLimitConfig.maxTicketsPerUser) {
      return { 
        allowed: false, 
        reason: `超過用戶總票數限制 (${purchaseLimitConfig.maxTicketsPerUser}張)` 
      };
    }
    
    return { allowed: true };
  } catch (error) {
    console.error('Error checking purchase limits:', error);
    // Default to allowing the purchase if there's an error checking limits
    return { allowed: true };
  }
}

export async function POST(request: NextRequest) {
  try {
    // 檢查用戶身份驗證
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: '請先登入以繼續' }, { status: 401 });
    }

    const data = await request.json();
    const { registrationToken, paymentMethod, cardDetails, totalAmount, quantity, paymentType } = data;
    
    // 基本驗證
    if (!registrationToken) {
      return NextResponse.json({ error: '缺少登記令牌' }, { status: 400 });
    }

    // 獲取註冊信息
    type Registration = {
      eventId: string;
      userId: string;
      status: string;
      ticketsPurchased?: boolean; // Changed to optional to match main type
      zoneName: string;
      ticketIds?: string[];
      platformFeePaid?: boolean;
      platformFeePaymentId?: string; 
      quantity: number; // Ensure quantity is part of this local type
    };
    const registration = await db.registration.findByToken(registrationToken) as Registration;
    if (!registration) {
      return NextResponse.json({ error: '找不到該抽籤登記' }, { status: 404 });
    }

    // 驗證用戶權限
    if (registration.userId !== user.userId) {
      return NextResponse.json({ error: '無權處理此登記的付款' }, { status: 403 });
    }

    // For platform fee payments, we can bypass the won status check
    if (paymentType !== 'platform_fee') {
      // 驗證抽籤狀態
      if (registration.status !== 'won') {
        return NextResponse.json({ error: '您尚未在此抽籤中獲勝，無法購買門票' }, { status: 400 });
      }

      // 驗證是否已購票
      if (registration.ticketsPurchased) {
        return NextResponse.json({ error: '您已經購買了此活動的門票' }, { status: 400 });
      }
    } else {
      // For platform fee payments, check if already paid
      if (registration.platformFeePaid) {
        return NextResponse.json({ error: '平台費用已經支付' }, { status: 400 });
      }
    }

    // 檢查購票限制 - updated to pass quantity
    const limitCheck = await checkPurchaseLimits(user.userId, registration.eventId, quantity);
    if (!limitCheck.allowed) {
      return NextResponse.json({ 
        error: limitCheck.reason || '超過購票限制'
      }, { status: 403 });
    }

    // 獲取活動詳情
    const event = await db.events.findById(registration.eventId);
    if (!event) {
      return NextResponse.json({ error: '找不到相關活動' }, { status: 404 });
    }

    // 處理支付
    const paymentId = uuidv4();
    const bookingToken = uuidv4();
    const now = new Date().toISOString();

    let paymentAmount = 0;
    let paymentPlatformFee = 0;

    if (paymentType === 'platform_fee') {
      paymentPlatformFee = totalAmount; // totalAmount from request is purely platform fee
      paymentAmount = 0;
    } else { // 'ticket_price'
      paymentPlatformFee = 0; // This transaction is only for tickets, platform fee paid separately
      paymentAmount = totalAmount; // totalAmount from request is purely ticket price
    }

    await db.payments.create({
      paymentId,
      userId: user.userId,
      amount: paymentAmount,
      platformFee: paymentPlatformFee,
      totalAmount: totalAmount, // totalAmount from request body
      paymentMethod,
      status: 'completed',
      createdAt: now,
      eventId: registration.eventId,
      eventName: event.eventName,
      zone: registration.zoneName,
      payQuantity: quantity,
      relatedTo: paymentType === 'platform_fee' ? 'platform_fee' : 'ticket_purchase',
      cardDetails
    });

    // 處理用戶姓名 - 解密如果需要
    let userRealName = user.realName || "";
    if (user.isDataEncrypted || isEncrypted(userRealName)) {
      userRealName = decryptData(userRealName);
    }

    // Prepare tickets array to collect ticket info for response
    const tickets: Ticket[] = [];

    // If this is a platform fee payment, update the registration
    if (paymentType === 'platform_fee') {
      await db.registration.update(registrationToken, {
        platformFeePaid: true,
        paymentStatus: 'paid', // Status for platform fee
        platformFeePaymentId: paymentId // Store the paymentId for the platform fee
      });

      // Invalidate cache as registration details affecting ticket status might change
      await CacheManager.invalidateUserCache(user.userId); // Corrected method name
      
      return NextResponse.json({
        success: true,
        message: '平台費用支付成功',
        paymentId,
        receipt: {
          paymentId,
          amount: totalAmount,
          date: now,
          eventName: event.eventName,
          bookingToken
        }
      });
    }

    // For ticket purchase (paymentType === 'ticket_price')
    const purchasedTicketIds: string[] = [];

    if (registration.ticketIds && registration.ticketIds.length > 0) {
      console.log(`Updating existing ${registration.ticketIds.length} reserved tickets for registration ${registrationToken}`);
      for (const ticketId of registration.ticketIds) {
        await db.tickets.update(ticketId, {
          status: 'sold',
          paymentId, // This is the paymentId for the ticket purchase
          purchaseDate: now,
          // Ensure other relevant fields like userId, userRealName are already on the ticket or add them
        });
        const updatedTicket = await db.tickets.findById(ticketId);
        if (updatedTicket) {
          tickets.push(updatedTicket);
          purchasedTicketIds.push(ticketId);
        }
      }
    } else {
      console.log(`Creating ${quantity} new tickets for registration ${registrationToken} as no existing ticketIds found.`);
      for (let i = 0; i < quantity; i++) {
        const ticketId = uuidv4();
        const ticket: Ticket = { // Ensure using the global Ticket type
          ticketId,
          eventId: registration.eventId,
          eventName: event.eventName,
          userId: user.userId,
          userRealName: userRealName,
          zone: registration.zoneName,
          paymentId, // This is the paymentId for the ticket purchase
          bookingToken, 
          status: "sold", // Explicitly type as 'sold'
          purchaseDate: now,
          eventDate: event.eventDate,
          eventLocation: event.location ?? '',
          seatNumber: '', 
          price: String(totalAmount / quantity),
          qrCode: ticketId, 
          lastRefreshed: now,
          nextRefresh: new Date(Date.now() + 5 * 60 * 1000).toISOString(), 
          lastVerified: null,
          verificationCount: 0,
          transferredAt: null,
          transferredFrom: null,
          adminNotes: ''
        };
        
        tickets.push(ticket);
        await db.tickets.create(ticket);
        purchasedTicketIds.push(ticketId);
      }
    }

    // Update registration to reflect tickets purchased
    await db.registration.update(registrationToken, {
      ticketsPurchased: true,
      paymentStatus: 'paid', // General payment status for the registration related to tickets
      paymentId: paymentId, // Store the paymentId for the ticket purchase
      ticketIds: purchasedTicketIds // Update/set the ticketIds on the registration
    });

    // Record purchase information with correct pricing
    await db.userPurchases.create({
      userId: user.userId,
      eventId: registration.eventId,
      purchaseDate: new Date().toISOString(),
      quantity,
      paymentId,
      purchaseId: uuidv4(),
      ticketId: tickets.map(ticket => ticket.ticketId).join(','),
      status: 'completed',
      totalAmount, // Use the consistent totalAmount
      eventName: event.eventName,
      zoneName: registration.zoneName,
      userRealName: userRealName,
      paymentMethod,
      cardDetails: {
        lastFourDigits: cardDetails?.lastFourDigits || 'XXXX'
      }
    });

    // Invalidate user's ticket cache after successful purchase
    await CacheManager.invalidateUserCache(user.userId); // Corrected method name

    return NextResponse.json({
      success: true,
      message: '成功購買門票',
      paymentId,
      tickets,
      receipt: {
        paymentId,
        amount: totalAmount,
        date: now,
        eventName: event.eventName,
        bookingToken
      }
    });
  } catch (error) {
    console.error('Lottery ticket purchase error:', error);
    return NextResponse.json({ 
      error: '處理購票付款時出錯',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
