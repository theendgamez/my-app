import db from '@/lib/db';
import { ticketBlockchain } from '@/lib/blockchain';

/**
 * This utility adds missing blockchain transactions for tickets that have been transferred
 * but don't have corresponding blockchain transaction records
 */
export async function migrateTicketTransfers() {
  try {
    console.log('Starting ticket transfer migration...');
    
    // Get all tickets that have transferredAt value
    const allTickets = await db.tickets.findMany();
    const transferredTickets = allTickets.filter(ticket => ticket.transferredAt);
    
    console.log(`Found ${transferredTickets.length} tickets with transfer data`);
    
    let syncedCount = 0;
    
    // For each transferred ticket, check if it has a transfer transaction
    // If not, create one
    for (const ticket of transferredTickets) {
      // Get existing history
      const history = ticketBlockchain.getTicketHistory(ticket.ticketId);
      const hasTransferTransaction = history.some(tx => tx.action === 'transfer');
      
      if (!hasTransferTransaction) {
        console.log(`Adding missing transfer transaction for ticket ${ticket.ticketId}`);
        
        // Add transaction to blockchain
        ticketBlockchain.addTransaction({
          ticketId: ticket.ticketId,
          timestamp: new Date(ticket.transferredAt ?? Date.now()).getTime(),
          action: 'transfer',
          fromUserId: ticket.transferredFrom || 'unknown',
          toUserId: ticket.userId,
          eventId: ticket.eventId
        });
        
        syncedCount++;
      }
    }
    
    // Process all pending transactions
    if (syncedCount > 0) {
      ticketBlockchain.processPendingTransactions();
    }
    
    console.log(`Migration completed successfully. Synced ${syncedCount} tickets.`);
    return { success: true, migratedCount: syncedCount };
  } catch (error) {
    console.error('Error during ticket transfer migration:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
