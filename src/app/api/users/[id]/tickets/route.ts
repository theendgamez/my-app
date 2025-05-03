import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = (await params).id;
    
    console.log('API - Tickets requested for user:', userId);

    if (!userId) {
      return NextResponse.json({ error: '未提供用戶ID' }, { status: 400 });
    }

    // Authentication checks with improved logging
    const user = await getCurrentUser(request);
    const headerUserId = request.headers.get('x-user-id');
    const authHeader = request.headers.get('authorization');
    
    console.log('Auth check for tickets API:', { 
      currentUser: user?.userId || 'none', 
      headerUserId: headerUserId || 'none',
      requestedId: userId,
      hasAuthHeader: !!authHeader
    });
    
    if (user) {
      if (user.userId !== userId && user.role !== 'admin') {
        return NextResponse.json({ error: '無權訪問此用戶的票券' }, { status: 403 });
      }
    } else if (!headerUserId || headerUserId !== userId) {
      // No authenticated user and header doesn't match
      console.log('Authentication failed:', {
        missingUser: !user,
        missingHeader: !headerUserId,
        headerMismatch: headerUserId !== userId
      });
      
      return NextResponse.json({ 
        error: '請先登入以查看票券', 
        message: 'Authentication required',
        details: 'No valid authentication found'
      }, { status: 401 });
    }

    // Get tickets for the user
    const tickets = await db.tickets.findByUser(userId);
    console.log(`Found ${tickets.length} tickets for user ${userId}`);
    
    return NextResponse.json(tickets);
  } catch (error) {
    console.error('Error fetching tickets:', error);
    return NextResponse.json({ error: '獲取票券詳情時出錯' }, { status: 500 });
  }
}
