import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { migrateAllUserTicketTransfers, migrateTicketTransfer } from '@/utils/migrateTicketTransfers';

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const user = await getCurrentUser(request);
    
    // Only allow admins to run this migration
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: '無權執行此操作' }, { status: 403 });
    }
    
    // Get options from request body
    const { userId, ticketId } = await request.json();
    
    // Handle different migration types based on provided parameters
    if (userId) {
      // Migrate all tickets for a user
      const result = await migrateAllUserTicketTransfers(userId);
      
      return NextResponse.json({
        success: true,
        message: `票券轉讓記錄遷移成功：已遷移 ${result.migratedCount} 筆記錄，失敗 ${result.failedCount} 筆`,
        migratedCount: result.migratedCount,
        failedCount: result.failedCount,
        totalProcessed: result.totalTickets,
        details: result.results
      });
    } else if (ticketId) {
      // Migrate a single ticket
      const result = await migrateTicketTransfer(ticketId);
      
      if (result.success) {
        return NextResponse.json({
          success: true,
          message: result.message
        });
      } else {
        throw new Error(result.message);
      }
    } else {
      return NextResponse.json({ error: '缺少必要參數：userId 或 ticketId' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in transfer migration API:', error);
    return NextResponse.json(
      { error: '票券轉讓記錄遷移失敗', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
