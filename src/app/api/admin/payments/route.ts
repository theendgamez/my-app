import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { DatabaseOptimizer } from '@/lib/dbOptimization';
import { getCurrentUser } from '@/lib/auth';
import { ApiResponseBuilder } from '@/lib/apiResponse';

// Define a proper filter type for payments
interface PaymentFilter {
  status?: string;
  eventId?: string;
  paymentMethod?: string;
}

export async function GET(request: NextRequest) {
  const responseBuilder = new ApiResponseBuilder();
  
  try {
    // Verify admin access
    const currentUser = await getCurrentUser(request);
    
    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json(
        responseBuilder.error('UNAUTHORIZED', '僅管理員可訪問此API'),
        { status: 403 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const status = searchParams.get('status');
    const eventId = searchParams.get('eventId');
    const paymentMethod = searchParams.get('paymentMethod');
    
    // Build filter with proper typing
    const filter: PaymentFilter = {};
    if (status) filter.status = status;
    if (eventId) filter.eventId = eventId;
    if (paymentMethod) filter.paymentMethod = paymentMethod;
    
    // Use optimized pagination
    const result = await DatabaseOptimizer.findWithPagination(
      'payments',
      filter,
      page,
      limit,
      { createdAt: 'desc' }
    );
    
    // Enhance payment data with additional information
    const enhancedPayments = await Promise.all(
      result.data.map(async (payment) => {
        try {
          let userName = undefined;
          if (payment.userId) {
            const userInfo = await db.users.findById(payment.userId);
            if (userInfo) {
              userName = userInfo.userName || userInfo.email;
            }
          }
          
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

    return NextResponse.json(
      responseBuilder
        .withPagination(page, limit, result.total)
        .success({
          payments: enhancedPayments,
          pagination: {
            page,
            limit,
            total: result.total,
            hasMore: result.hasMore,
            totalPages: Math.ceil(result.total / limit)
          }
        })
    );
  } catch (error) {
    console.error('Error fetching payments:', error);
    return NextResponse.json(
      responseBuilder.error('FETCH_PAYMENTS_ERROR', '獲取付款記錄時出錯'),
      { status: 500 }
    );
  }
}
