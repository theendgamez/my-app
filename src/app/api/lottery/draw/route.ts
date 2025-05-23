import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';
import QRCode from 'qrcode';

// Define the Users interface

export async function POST(request: NextRequest) {
  try {
    // Check admin authentication
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: '請先登入以繼續' }, { status: 401 });
    }
    
    if (user.role !== 'admin') {
      return NextResponse.json({ error: '僅管理員可執行抽籤' }, { status: 403 });
    }

    const data = await request.json();
    const { eventId } = data;
    
    if (!eventId) {
      return NextResponse.json({ error: '請提供活動ID' }, { status: 400 });
    }

    // Fetch the event
    const event = await db.events.findById(eventId);
    if (!event) {
      return NextResponse.json({ error: '找不到該活動' }, { status: 404 });
    }

    // Verify this is a lottery event
    if (!event.isDrawMode) {
      return NextResponse.json({ error: '此活動不支持抽籤模式' }, { status: 400 });
    }

    // Get all paid registrations for this event
    const registrations = await db.registration.findByEvent(eventId) as Registration[];
    if (registrations.length === 0) {
      return NextResponse.json({ error: '沒有有效的付費登記' }, { status: 400 });
    }

    // Calculate ticket availability
    const availableTicketsByZone: Record<string, number> = {};
    event.zones?.forEach(zone => {
      availableTicketsByZone[zone.name] = parseInt(String(zone.zoneQuantity)) || 0;
    });

    // Simple random draw function - completely random without weighting
    const randomDraw = (registrations: Registration[]): Registration[] => {
      // Create a copy of the registrations array
      const shuffled = [...registrations];
      
      // Apply Fisher-Yates shuffle for randomness
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      
      return shuffled;
    };

    // Execute random draw
    const shuffledRegistrations = randomDraw(registrations);
    
    // Process lottery results
    const userAllocations: Record<string, number> = {};
    const winners = [];
    const losers = [];
    const results = [];
    
    for (const reg of shuffledRegistrations) {
      // Update status to 'drawn'
      await db.registration.update(reg.registrationToken, {
        status: 'drawn'
      });
      
      const { zoneName, quantity, userId } = reg;
      
      // Initialize user allocation
      if (!userAllocations[userId]) {
        userAllocations[userId] = 0;
      }
      
      // Check if this allocation would exceed maximum tickets per user (default 2)
      const wouldExceedLimit = userAllocations[userId] + quantity > 2;
      
      // Check if enough tickets are available in the zone and user hasn't exceeded limit
      if (availableTicketsByZone[zoneName] >= quantity && !wouldExceedLimit) {
        // Winner
        availableTicketsByZone[zoneName] -= quantity;
        userAllocations[userId] += quantity;
        winners.push(reg.registrationToken);
        
        // Update registration status
        await db.registration.update(reg.registrationToken, {
          status: 'won',
          drawnAt: new Date().toISOString()
        });
        
        // Automatically create tickets for winners since they've already paid
        const ticketIds = [];
        for (let i = 0; i < quantity; i++) {
          const ticketId = uuidv4();
          ticketIds.push(ticketId);
          
          // Create a ticket for the winner
          await db.tickets.create({
            ticketId: ticketId,
            userId: reg.userId,
            userRealName: reg.userRealName,
            eventId: eventId,
            zone: zoneName,
            paymentId: reg.paymentId,
            status: 'reserved', // Change from 'available' to 'reserved'
            purchaseDate: new Date().toISOString(),
            eventName: event.eventName,
            eventDate: event.eventDate,
            eventLocation: event.location || "TBD",
            seatNumber: generateSeatNumber(zoneName),
            price: String(Number(event.zones.find(z => z.name === zoneName)?.price) || 0),
            qrCode: await generateQrCode(ticketId),
            lastRefreshed: '',
            nextRefresh: '',
            lastVerified: null,
            verificationCount: 0,
            transferredAt: null,
            transferredFrom: null,
            adminNotes: ''
          });
        }
        
        // Save ticket IDs to the registration
        await db.registration.update(reg.registrationToken, {
          ticketIds: ticketIds
        });
        
        // Add lottery history
        await db.lotteryHistory.create({
          userId,
          eventId,
          eventName: event.eventName,
          result: 'won',
          drawDate: new Date().toISOString()
        });
        
        results.push({
          registrationToken: reg.registrationToken,
          userId: reg.userId,
          zoneName: reg.zoneName,
          quantity: reg.quantity,
          result: 'won'
        });
      } else {
        // Loser
        losers.push(reg.registrationToken);
        
        // Update registration status
        await db.registration.update(reg.registrationToken, {
          status: 'lost',
          drawnAt: new Date().toISOString()
        });
        
        // Add lottery history
        await db.lotteryHistory.create({
          userId,
          eventId,
          eventName: event.eventName,
          result: 'lost',
          drawDate: new Date().toISOString()
        });
        
        results.push({
          registrationToken: reg.registrationToken,
          userId: reg.userId,
          zoneName: reg.zoneName,
          quantity: reg.quantity,
          result: 'lost'
        });
      }
    }
    
    // Update event to mark it as drawn
    await db.events.update(eventId, {
      isDrawn: true,
      drawnAt: new Date().toISOString()
    });
    
    // In a real application, send notifications to all participants here
    
    return NextResponse.json({
      success: true,
      message: '抽籤完成',
      stats: {
        total: registrations.length,
        winners: winners.length,
        losers: losers.length
      },
      results,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Lottery draw error:', error);
    return NextResponse.json({ 
      error: '執行抽籤時出錯', 
      details: error instanceof Error ? error.message : String(error)
    });
  }
}

// Simple seat number generator: returns a random seat number in the format "<ZoneName>-<3-digit number>"
function generateSeatNumber(zoneName: string): string {
  const randomNum = Math.floor(100 + Math.random() * 900);
  return `${zoneName}-${randomNum}`;
}

// Generate QR code as a data URL
async function generateQrCode(ticketId: string): Promise<string> {
  try {
    const qrCodeDataUrl = await QRCode.toDataURL(ticketId, {
      width: 200,
      margin: 2,
      errorCorrectionLevel: 'H'
    });
    return qrCodeDataUrl;
  } catch (error) {
    console.error("Error generating QR code:", error);
    return `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(ticketId)}&size=150x150`;
  }
}

// Define the registration type
type Registration = {
  registrationToken: string;
  userId: string;
  userRealName: string;
  zoneName: string;
  quantity: number;
  paymentId: string;
  email?: string;
  phoneNumber?: string;
  priorityScore?: number;
};

