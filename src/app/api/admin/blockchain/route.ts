import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { ticketBlockchain } from '@/lib/blockchain';

// Define the transaction structure
interface Transaction {
  id?: string;
  type: string;
  ticketId?: string;
  userId?: string;
  eventId?: string;
  price?: number;
  timestamp?: number;
  [key: string]: unknown; // For other properties that might be present
}

// Expose raw Block interface from the blockchain
interface RawBlock {
  index: number;
  timestamp: number;
  data: Transaction[] | string;
  previousHash: string;
  hash: string;
  nonce: number;
}

export async function GET(request: NextRequest) {
  try {
    // Verify admin access
    const user = await getCurrentUser(request);
    
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: '此功能僅限管理員使用' }, { status: 403 });
    }
    
    // Access the blockchain data
    // @ts-expect-error - Accessing private property for admin view
    const chain: RawBlock[] = ticketBlockchain.chain || [];
    
    // Log chain data for debugging
    console.log(`Blockchain chain length: ${chain.length}`);
    
    // Calculate some statistics
    const totalBlocks = chain.length;
    const genesisBlock = chain[0];
    const latestBlock = chain[chain.length - 1];
    
    // Calculate total transactions
    let totalTransactions = 0;
    for (const block of chain) {
      if (Array.isArray(block.data)) {
        totalTransactions += block.data.length;
      }
    }
    
    console.log(`Found ${totalTransactions} total transactions in the blockchain`);
    
    // Prepare response data
    const blockchainData = {
      chain: chain.map(block => ({
        index: block.index,
        timestamp: block.timestamp,
        hash: block.hash,
        previousHash: block.previousHash,
        nonce: block.nonce,
        transactions: Array.isArray(block.data) 
          ? block.data.map(tx => ({
              ...tx,
              timestamp: tx.timestamp ? new Date(tx.timestamp).toISOString() : null
            }))
          : [],
        dataType: Array.isArray(block.data) ? 'transactions' : 'genesis'
      })),
      stats: {
        totalBlocks,
        totalTransactions,
        genesisTimestamp: genesisBlock?.timestamp ? new Date(genesisBlock.timestamp).toISOString() : null,
        latestTimestamp: latestBlock?.timestamp ? new Date(latestBlock.timestamp).toISOString() : null
      }
    };
    
    return NextResponse.json(blockchainData);
  } catch (error) {
    console.error('Error fetching blockchain data:', error);
    return NextResponse.json(
      { error: '獲取區塊鏈數據時出錯', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
