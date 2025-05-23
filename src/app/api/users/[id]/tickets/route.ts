import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { CacheManager } from '@/lib/cache';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = (await params).id;
    
    // Improved logging with clear identification
    console.log('[Tickets API] Request received:', { 
      requestedUserId: userId,
      url: request.url,
      hasAuthHeader: !!request.headers.get('authorization')
    });

    if (!userId || userId === 'undefined') {
      console.error('[Tickets API] Missing or invalid userId:', userId);
      return NextResponse.json({ 
        error: 'Missing or invalid userId',
        details: 'A valid user ID must be provided in the URL path'
      }, { status: 400 });
    }

    // Authentication check with fallbacks
    const user = await getCurrentUser(request);
    const headerUserId = request.headers.get('x-user-id');
    
    console.log('[Tickets API] Authentication check:', { 
      authenticatedUser: user?.userId || 'none', 
      headerUserId: headerUserId || 'none',
      requestedUserId: userId
    });
    
    // Check permissions - allow access if:
    // 1. User is authenticated and either matches the requested ID or is an admin
    // 2. Header user ID matches the requested ID (fallback)
    const hasAccess = (user && (user.userId === userId || user.role === 'admin')) ||
                      (headerUserId && headerUserId === userId);
    
    if (!hasAccess) {
      console.error('[Tickets API] Access denied:', { 
        authenticatedUser: user?.userId || 'none',
        headerUserId: headerUserId || 'none',
        requestedUserId: userId
      });
      
      return NextResponse.json({ 
        error: 'Authorization required', 
        code: 'UNAUTHORIZED_ACCESS',
        message: 'You must be authenticated to access this resource'
      }, { status: 401 });
    }

    // Check cache first
    const cachedTickets = await CacheManager.getUserTickets(userId);
    if (cachedTickets) {
      console.log(`[Tickets API] Returned ${cachedTickets.length} cached tickets for user ${userId}`);
      return NextResponse.json(cachedTickets);
    }

    // Get tickets for the user
    const tickets = await db.tickets.findByUser(userId);
    console.log(`[Tickets API] Found ${tickets.length} tickets for user ${userId}`);
    
    // Cache the tickets
    await CacheManager.cacheUserTickets(userId, tickets);
    
    return NextResponse.json(tickets);
  } catch (error) {
    console.error('[Tickets API] Error:', error);
    return NextResponse.json({ 
      error: 'Failed to retrieve tickets',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
