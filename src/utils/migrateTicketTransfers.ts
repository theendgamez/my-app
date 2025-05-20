import { syncTicketTransferToBlockchain } from '@/lib/blockchain';
import db from '@/lib/db';

/**
 * Migrates ticket transfers that aren't yet recorded in the blockchain
 * @param ticketId Ticket ID to migrate transfers for
 * @returns Object indicating success/failure and details
 */
export async function migrateTicketTransfer(ticketId: string): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    // 1. Check if ticket exists and has transfer info
    const ticket = await db.tickets.findById(ticketId);
    if (!ticket) {
      return { success: false, message: '票券不存在' };
    }

    // 2. If ticket doesn't have transfer info, return early
    if (!ticket.transferredAt || !ticket.transferredFrom) {
      return { success: false, message: '此票券無轉讓記錄' };
    }

    // 3. Get event ID for the ticket
    const eventId = ticket.eventId;
    if (!eventId) {
      return { success: false, message: '無法獲取活動ID' };
    }

    // 4. Get current owner ID
    const currentOwnerId = ticket.userId;
    if (!currentOwnerId) {
      return { success: false, message: '無法獲取當前持有人ID' };
    }

    // 5. Get transfer metadata
    const transferFromId = ticket.transferredFrom;
    const transferTimestamp = ticket.transferredAt;

    // 6. Sync the transfer to the blockchain
    const timestampNumber = typeof transferTimestamp === 'string' ? new Date(transferTimestamp).getTime() : transferTimestamp;
    const success = await syncTicketTransferToBlockchain(
      ticketId,
      transferFromId,
      currentOwnerId,
      timestampNumber,
      eventId
    );

    if (success) {
      // 7. Update the audit log to indicate the migration
      try {
        await db.ticketAudit.log({
          ticketId,
          action: 'blockchain_sync',
          userId: transferFromId,
          userRole: 'user',
          timestamp: new Date().toISOString(),
          details: `Migrated transfer from ${transferFromId} to ${currentOwnerId} via blockchain sync`
        });
      } catch (auditError) {
        console.warn('Failed to log transfer migration to audit log:', auditError);
      }
      
      return { success: true, message: '票券轉讓記錄已成功同步到區塊鏈' };
    } else {
      return { success: false, message: '同步票券轉讓到區塊鏈失敗' };
    }
  } catch (error) {
    console.error('Ticket transfer migration error:', error);
    return { 
      success: false, 
      message: `遷移出錯: ${error instanceof Error ? error.message : '未知錯誤'}`
    };
  }
}

/**
 * Migrates all ticket transfers for a user that aren't yet on the blockchain
 * @param userId User ID to migrate tickets for
 * @returns Results of each migration attempt
 */
export async function migrateAllUserTicketTransfers(userId: string): Promise<{
  totalTickets: number;
  migratedCount: number;
  failedCount: number;
  results: Array<{ ticketId: string; success: boolean; message: string }>;
}> {
  const results: Array<{ ticketId: string; success: boolean; message: string }> = [];
  let migratedCount = 0;
  let failedCount = 0;
  
  try {
    // 1. Get all tickets for the user
    const tickets = await db.tickets.findByUser(userId);
    
    // 2. Filter to only tickets with transfer data
    const transferredTickets = tickets.filter(
      ticket => ticket.transferredAt && ticket.transferredFrom
    );
    
    // 3. Process each ticket
    for (const ticket of transferredTickets) {
      const result = await migrateTicketTransfer(ticket.ticketId);
      
      results.push({
        ticketId: ticket.ticketId,
        success: result.success,
        message: result.message
      });
      
      if (result.success) {
        migratedCount++;
      } else {
        failedCount++;
      }
    }
    
    return {
      totalTickets: transferredTickets.length,
      migratedCount,
      failedCount,
      results
    };
  } catch (error) {
    console.error('Error migrating all user ticket transfers:', error);
    return {
      totalTickets: 0,
      migratedCount,
      failedCount: 1,
      results: [{
        ticketId: 'all',
        success: false,
        message: `批量遷移出錯: ${error instanceof Error ? error.message : '未知錯誤'}`
      }]
    };
  }
}
