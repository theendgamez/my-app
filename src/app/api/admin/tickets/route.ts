import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { DatabaseOptimizer } from '@/lib/dbOptimization';
import { getCurrentUser } from '@/lib/auth';
import { ApiResponseBuilder } from '@/lib/apiResponse';

// Define a proper filter type for tickets that matches the Ticket type
interface TicketFilter {
  eventId?: string;
  status?: "active" | "available" | "sold" | "used" | "cancelled" | "reserved";
  zone?: string;
}

export async function GET(request: NextRequest) {
  const responseBuilder = new ApiResponseBuilder();
  
  try {
    // Verify admin access
    const user = await getCurrentUser(request);
    
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

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const eventId = searchParams.get('eventId');
    const status = searchParams.get('status');
    const zone = searchParams.get('zone');
    
    // Validate status parameter
    const validStatuses: Array<"active" | "available" | "sold" | "used" | "cancelled" | "reserved"> = 
      ["active", "available", "sold", "used", "cancelled", "reserved"];
    
    // Type guard function to check if status is valid
    const isValidStatus = (status: string): status is "active" | "available" | "sold" | "used" | "cancelled" | "reserved" => {
      return validStatuses.includes(status as "active" | "available" | "sold" | "used" | "cancelled" | "reserved");
    };
    
    // Build filter with proper typing and validation
    const filter: TicketFilter = {};
    if (eventId) filter.eventId = eventId;
    if (status && isValidStatus(status)) {
      filter.status = status;
    }
    if (zone) filter.zone = zone;
    
    // Use optimized pagination
    const result = await DatabaseOptimizer.findWithPagination(
      'tickets',
      filter,
      page,
      limit,
      { purchaseDate: 'desc' }
    );
    
    return NextResponse.json(
      responseBuilder
        .withPagination(page, limit, result.total)
        .success({
          tickets: result.data,
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
    console.error('Error fetching tickets:', error);
    return NextResponse.json(
      responseBuilder.error('FETCH_TICKETS_ERROR', '獲取票券數據時出錯'),
      { status: 500 }
    );
  }
}

// Add batch ticket status update endpoint
export async function PATCH(request: NextRequest) {
  try {
    // Verify admin access
    const user = await getCurrentUser(request);
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

    const { ticketIds, status } = await request.json();
    
    if (!ticketIds || !Array.isArray(ticketIds) || !status) {
      return NextResponse.json(
        { error: '需要提供票券ID列表和新狀態' },
        { status: 400 }
      );
    }
    
    // Use batch update for ticket status
    const result = await DatabaseOptimizer.batchUpdateTicketStatus(
      ticketIds,
      status
    );
    
    return NextResponse.json({
      success: true,
      message: `批量更新完成: ${result.successful} 成功, ${result.failed} 失敗`,
      details: result
    });
  } catch (error) {
    console.error('Error batch updating tickets:', error);
    return NextResponse.json(
      { error: '批量更新票券狀態時出錯' },
      { status: 500 }
    );
  }
}
