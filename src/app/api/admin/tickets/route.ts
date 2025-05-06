import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Verify admin access
    const user = await getCurrentUser(request);
    
    // Also check header auth as fallback
    const userIdHeader = request.headers.get('x-user-id');
    let isAdmin = false;

    if (user && user.role === 'admin') {
      isAdmin = true;
    } else if (userIdHeader) {
      try {
        const dbUser = await db.users.findById(userIdHeader);
        if (dbUser?.role === 'admin') {
          isAdmin = true;
        }
      } catch (error) {
        console.error('Error verifying admin via user ID:', error);
      }
    }

    if (!isAdmin) {
      return NextResponse.json(
        { error: '僅管理員可訪問此API' },
        { status: 403 }
      );
    }

    // Get all tickets
    const tickets = await db.tickets.findMany();
    
    return NextResponse.json({ tickets });
  } catch (error) {
    console.error('Error fetching tickets:', error);
    return NextResponse.json(
      { error: '獲取票券數據時出錯' },
      { status: 500 }
    );
  }
}
