import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

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
    const registrations = await db.registration.findByEvent(eventId);
    if (registrations.length === 0) {
      return NextResponse.json({ error: '沒有有效的付費登記' }, { status: 400 });
    }

    // Calculate ticket availability
    const availableTicketsByZone: Record<string, number> = {};
    
    // Initialize available tickets for each zone
    event.zones?.forEach(zone => {
      availableTicketsByZone[zone.name] = parseInt(String(zone.zoneQuantity)) || 0;
    });

    // Define the registration type if not already defined
    type Registration = {
      registrationToken: string;
      userId: string;
      zoneName: string;
      quantity: number;
      // add other properties if needed
    };

    // Shuffle the registrations randomly
    const shuffledRegistrations = [...registrations].sort(() => Math.random() - 0.5) as Registration[];
    
    // Process each registration
    const results = [];
    const winners = [];
    const losers = [];
    
    for (const reg of shuffledRegistrations) {
      // Update status to 'drawn' first
      await db.registration.update(reg.registrationToken, {
        status: 'drawn'
      });
      
      const { zoneName, quantity } = reg;
      
      // Check if enough tickets are available in the zone
      if (availableTicketsByZone[zoneName] >= quantity) {
        // Winner
        availableTicketsByZone[zoneName] -= quantity;
        winners.push(reg.registrationToken);
        
        // Update registration status
        await db.registration.update(reg.registrationToken, {
          status: 'won',
          drawnAt: new Date().toISOString()
        });
        
        results.push({
          registrationToken: reg.registrationToken,
          userId: reg.userId,
          result: 'won',
          zoneName,
          quantity
        });
      } else {
        // Loser
        losers.push(reg.registrationToken);
        
        // Update registration status
        await db.registration.update(reg.registrationToken, {
          status: 'lost',
          drawnAt: new Date().toISOString()
        });
        
        results.push({
          registrationToken: reg.registrationToken,
          userId: reg.userId,
          result: 'lost',
          zoneName,
          quantity
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
      results
    });
  } catch (error) {
    console.error('Lottery draw error:', error);
    return NextResponse.json({ error: '執行抽籤時出錯' }, { status: 500 });
  }
}
