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
    const registrations = await db.registration.findByEvent(eventId) as Registration[];
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

    // Track allocations per user to enforce maximum 2 tickets per person
    const userAllocations: Record<string, number> = {};

    /**
     * Fisher-Yates (Knuth) Shuffle Algorithm
     * This is a statistically fair algorithm for shuffling an array
     * Reference: https://en.wikipedia.org/wiki/Fisher%E2%80%93Yates_shuffle
     */
    const fairShuffle = (array: Registration[]): Registration[] => {
      const shuffled = [...array];
      for (let i = shuffled.length - 1; i > 0; i--) {
        // Generate a random index between 0 and i (inclusive)
        const j = Math.floor(Math.random() * (i + 1));
        // Swap elements at i and j
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    };
    
    // Apply fair shuffle algorithm to registrations
    const shuffledRegistrations = fairShuffle(registrations) as Registration[];
    
    // Process each registration
    const results = [];
    const winners = [];
    const losers = [];
    
    for (const reg of shuffledRegistrations) {
      // Update status to 'drawn' first
      await db.registration.update(reg.registrationToken, {
        status: 'drawn'
      });
      
      const { zoneName, quantity, userId } = reg;
      
      // Initialize user allocation if not exist
      if (!userAllocations[userId]) {
        userAllocations[userId] = 0;
      }
      
      // Check if this allocation would exceed maximum tickets per user (2)
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
        
        results.push({
          registrationToken: reg.registrationToken,
          userId: reg.userId,
          result: 'won',
          zoneName,
          quantity
        });
      } else {
        // Loser (either no tickets left or would exceed 2 ticket limit)
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
      results,
      // Add timestamp to prevent caching issues that might contribute to loops
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Lottery draw error:', error);
    return NextResponse.json({ 
      error: '執行抽籤時出錯', 
      // Add error details if available to help with debugging
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
