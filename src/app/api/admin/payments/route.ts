import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Verify admin access
    const user = await getCurrentUser(request);
    
    // Try header auth as fallback
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

    // Get all payments
    const payments = await db.payments.findMany();
    
    // Enhance payment data with additional information
    const enhancedPayments = await Promise.all(
      payments.map(async (payment) => {
        try {
          // Add user name
          let userName = undefined;
          if (payment.userId) {
            const userInfo = await db.users.findById(payment.userId);
            if (userInfo) {
              userName = userInfo.userName || userInfo.email;
            }
          }
          
          // Add event name
          let eventName = undefined;
          if (payment.eventId) {
            const eventInfo = await db.events.findById(payment.eventId);
            if (eventInfo) {
              eventName = eventInfo.eventName;
            }
          }
          
          return {
            ...payment,
            userName,
            eventName
          };
        } catch (error) {
          console.error(`Error enhancing payment ${payment.paymentId}:`, error);
          return payment;
        }
      })
    );

    return NextResponse.json({ payments: enhancedPayments });
  } catch (error) {
    console.error('Error fetching payments:', error);
    return NextResponse.json(
      { error: '獲取付款記錄時出錯' },
      { status: 500 }
    );
  }
}
