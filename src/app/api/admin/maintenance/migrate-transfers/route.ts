import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { migrateTicketTransfers } from '@/utils/migrateTicketTransfers';

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const user = await getCurrentUser(request);
    
    // Only allow admins to run this migration
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: '無權執行此操作' }, { status: 403 });
    }
    
    // Run migration
    const result = await migrateTicketTransfers();
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        message: '票券轉讓記錄遷移成功',
        migratedCount: result.migratedCount
      });
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('Error in transfer migration API:', error);
    return NextResponse.json(
      { error: '票券轉讓記錄遷移失敗', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
