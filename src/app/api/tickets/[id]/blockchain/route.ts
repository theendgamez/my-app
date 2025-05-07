import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { ticketBlockchain } from '@/lib/blockchain';

// Interface for transaction in the raw blockchain data
interface RawTransaction {
  ticketId: string;
  timestamp: number;
  action: 'create' | 'transfer' | 'use' | 'verify' | 'cancel';
  fromUserId?: string;
  toUserId?: string;
  eventId: string;
  signature: string;
}

// Interface for raw block data directly from the blockchain
interface RawBlock {
  index: number;
  timestamp: number;
  data: RawTransaction[] | string;
  previousHash: string;
  hash: string;
  nonce: number;
}

interface BlockData {
  index: number;
  timestamp: number;
  hash: string;
  previousHash: string;
  nonce: number;
  transactions: unknown[];
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ticketId = (await params).id;
    
    // Get authenticated user
    const user = await getCurrentUser(request);
    const userIdHeader = request.headers.get('x-user-id');
    
    if (!user && !userIdHeader) {
      return NextResponse.json({ error: '請先登入' }, { status: 401 });
    }
    
    const userId = user?.userId || userIdHeader;
    
    // Get ticket details
    const ticket = await db.tickets.findById(ticketId);
    if (!ticket) {
      return NextResponse.json({ error: '找不到票券' }, { status: 404 });
    }
    
    // Allow ticket owner and admins to view blockchain data
    const isAdmin = user?.role === 'admin';
    const isOwner = ticket.userId === userId;
    
    if (!isAdmin && !isOwner) {
      return NextResponse.json({ error: '無權查看此票券區塊鏈數據' }, { status: 403 });
    }
    
    // Get ticket history from blockchain
    const history = ticketBlockchain.getTicketHistory(ticketId);
    
    // Access blockchain chain data (assuming we have access to it)
    // @ts-expect-error - accessing private property for visualization
    const chain = ticketBlockchain.chain || [];
    
    // Format data for frontend visualization
    const blocks: BlockData[] = chain
      .filter((block: RawBlock, index: number) => {
        // Skip genesis block (0) unless requested specifically
        if (index === 0) return false;
        
        // Check if this block has any transactions related to this ticket
        if (Array.isArray(block.data)) {
          const transactions = block.data as RawTransaction[];
          return transactions.some(tx => tx.ticketId === ticketId);
        }
        return false;
      })
      .map((block: RawBlock) => {
        // Convert block data to visualization format
        const transactions = Array.isArray(block.data) 
          ? block.data.filter((tx: RawTransaction) => tx.ticketId === ticketId)
          : [];
        
        return {
          index: block.index,
          timestamp: block.timestamp,
          hash: block.hash,
          previousHash: block.previousHash,
          nonce: block.nonce,
          transactions
        };
      });
    
    // Return blockchain data
    return NextResponse.json({
      ticketId,
      blocks,
      historyCount: history.length
    });
    
  } catch (error) {
    console.error('Error fetching blockchain data:', error);
    return NextResponse.json(
      { error: '獲取區塊鏈數據時出錯', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
