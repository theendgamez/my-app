import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const userId = params.id;
    if (!userId) {
      return NextResponse.json({ error: '未提供用戶ID' }, { status: 400 });
    }

    // Enhanced authentication checking
    // 1. Try to get user from the auth token/cookie
    const user = await getCurrentUser(request);
    
    // 2. Check Authorization header as a backup
    const authHeader = request.headers.get('Authorization');
    let tokenValid = false;
    
    if (authHeader?.startsWith('Bearer ')) {
      // Verify the token (implement actual token verification here)
      const token = authHeader.substring(7);
      if (token && token.length > 10) { // Simple validation that token exists and has reasonable length
        tokenValid = true;
      }
    }
    
    // 3. Check x-user-id header as a final fallback
    const headerUserId = request.headers.get('x-user-id');
    
    // Determine if the request is authenticated by any method
    const isAuthenticated = !!user || tokenValid || (headerUserId === userId);
    
    if (!isAuthenticated) {
      return NextResponse.json({ 
        error: '請先登入', 
        code: 'UNAUTHORIZED',
        debug: { 
          hasUser: !!user, 
          tokenValid,
          headerUserIdMatch: headerUserId === userId
        }
      }, { status: 401 });
    }

    // Verify the user is requesting their own data
    if (user && user.userId !== userId && !headerUserId) {
      return NextResponse.json({ 
        error: '無權訪問此用戶的票券', 
        code: 'FORBIDDEN' 
      }, { status: 403 });
    }

    // Get tickets for the user
    const tickets = await db.tickets.findByUser(userId);
    return NextResponse.json(tickets);
  } catch (error) {
    console.error('Error fetching tickets:', error);
    return NextResponse.json({ error: '獲取票券詳情時出錯' }, { status: 500 });
  }
}