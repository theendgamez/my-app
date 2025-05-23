import crypto from 'crypto';
import { DynamicTicketData, Ticket } from '@/types';

// 簡單區塊結構
export interface Block {
  index: number;
  timestamp: number;
  data: string | TicketTransaction[];
  previousHash: string;
  hash: string;
  nonce: number;
}

// 票券交易
export interface TicketTransaction {
  ticketId: string;
  timestamp: number;
  action: 'create' | 'transfer' | 'use' | 'verify' | 'cancel';
  fromUserId?: string;
  toUserId?: string;
  eventId: string;
  signature: string;
}

// Blockchain stats interface for admin dashboard
export interface BlockchainStats {
  totalBlocks: number;
  totalTransactions: number;
  lastBlockTimestamp: number | null;
  isValid: boolean;
}

// Helper for browser storage
const isServer = typeof window === 'undefined';

// Storage interface for blockchain data
interface BlockchainStorage {
  saveData: (data: { chain: Block[], pendingTransactions: TicketTransaction[] }) => Promise<void>;
  loadData: () => Promise<{ chain: Block[], pendingTransactions: TicketTransaction[] } | null>;
}

// Browser storage implementation using localStorage
const browserStorage: BlockchainStorage = {
  saveData: async (data) => {
    try {
      localStorage.setItem('blockchain', JSON.stringify(data));
    } catch (error) {
      console.error('Error saving blockchain to localStorage:', error);
    }
  },

  loadData: async () => {
    try {
      const data = localStorage.getItem('blockchain');
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error loading blockchain from localStorage:', error);
      return null;
    }
  }
};

// Simple memory storage fallback for SSR
const memoryStorage: { data: { chain: Block[], pendingTransactions: TicketTransaction[] } | null } = { 
  data: null 
};

// Select appropriate storage implementation
const storage: BlockchainStorage = isServer ? {
  // Server-side storage (memory only in this implementation)
  saveData: async (data) => {
    memoryStorage.data = data;
  },
  loadData: async () => {
    return memoryStorage.data;
  }
} : browserStorage;

export class TicketBlockchain {
  private chain: Block[];
  private difficulty: number;
  private pendingTransactions: TicketTransaction[];
  private readonly SECRET_KEY: string;

  constructor() {
    this.difficulty = 4; // 調整難度以控制挖礦速度
    this.pendingTransactions = [];
    // In actual use, this key should be stored in environment variables
    this.SECRET_KEY = process.env.NEXT_PUBLIC_BLOCKCHAIN_SECRET || 'your-secret-blockchain-key';
    
    // Initialize with empty chain, will be loaded later
    this.chain = [];
    
    // Immediately attempt to load saved data
    this.initializeChain();
  }

  private async initializeChain(): Promise<void> {
    try {
      const savedData = await storage.loadData();
      if (savedData && savedData.chain && savedData.chain.length > 0) {
        this.chain = savedData.chain;
        this.pendingTransactions = savedData.pendingTransactions || [];
        console.log(`Loaded blockchain with ${this.chain.length} blocks`);
      } else {
        console.log('No existing blockchain found, creating genesis block');
        this.chain = [this.createGenesisBlock()];
        this.saveChain();
      }
    } catch (error) {
      console.error('Error initializing blockchain:', error);
      this.chain = [this.createGenesisBlock()];
    }
  }

  private createGenesisBlock(): Block {
    return {
      index: 0,
      timestamp: Date.now(),
      data: 'Genesis Block',
      previousHash: '0',
      hash: '0',
      nonce: 0
    };
  }

  private getLatestBlock(): Block {
    return this.chain[this.chain.length - 1];
  }

  private calculateHash(index: number, timestamp: number, data: string | TicketTransaction[], previousHash: string, nonce: number): string {
    return crypto
      .createHash('sha256')
      .update(index + timestamp + JSON.stringify(data) + previousHash + nonce)
      .digest('hex');
  }

  // 工作量證明 (PoW)
  private mineBlock(block: Omit<Block, 'hash'>): Block {
    let nonce = 0;
    let hash = this.calculateHash(block.index, block.timestamp, block.data, block.previousHash, nonce);

    while (hash.substring(0, this.difficulty) !== Array(this.difficulty + 1).join('0')) {
      nonce++;
      hash = this.calculateHash(block.index, block.timestamp, block.data, block.previousHash, nonce);
    }

    return { ...block, hash, nonce };
  }

  // Storage methods for persistence
  private async saveChain(): Promise<void> {
    try {
      await storage.saveData({
        chain: this.chain,
        pendingTransactions: this.pendingTransactions
      });
      console.log(`Blockchain saved with ${this.chain.length} blocks`);
    } catch (error) {
      console.error('Error saving blockchain:', error);
    }
  }

  // 添加新交易到待處理列表
  public addTransaction(transaction: Omit<TicketTransaction, 'signature'>): TicketTransaction {
    // 為交易生成簽名
    const dataToSign = JSON.stringify(transaction);
    const signature = crypto
      .createHmac('sha256', this.SECRET_KEY)
      .update(dataToSign)
      .digest('hex');

    const signedTransaction = { ...transaction, signature };
    this.pendingTransactions.push(signedTransaction);
    
    // Save the updated pending transactions
    this.saveChain();
    
    return signedTransaction;
  }

  // 處理待處理的交易並創建新區塊
  public processPendingTransactions(): void {
    if (this.pendingTransactions.length === 0) {
      console.log('No pending transactions to process');
      return;
    }

    console.log(`Processing ${this.pendingTransactions.length} pending transactions`);
    
    const block = {
      index: this.chain.length,
      timestamp: Date.now(),
      data: this.pendingTransactions,
      previousHash: this.getLatestBlock().hash,
      nonce: 0,
      hash: ''
    };

    const newBlock = this.mineBlock(block);
    this.chain.push(newBlock);
    
    // Log for debugging
    console.log(`New block added to chain: Block #${newBlock.index} with ${this.pendingTransactions.length} transactions`);
    
    this.pendingTransactions = [];
    
    // Save the updated chain
    this.saveChain();
  }

  // 驗證整個鏈的完整性
  public isChainValid(): boolean {
    for (let i = 1; i < this.chain.length; i++) {
      const currentBlock = this.chain[i];
      const previousBlock = this.chain[i - 1];

      // 驗證當前區塊的哈希
      if (currentBlock.hash !== this.calculateHash(
        currentBlock.index, currentBlock.timestamp, currentBlock.data, 
        currentBlock.previousHash, currentBlock.nonce
      )) {
        return false;
      }

      // 驗證前後區塊的連接
      if (currentBlock.previousHash !== previousBlock.hash) {
        return false;
      }
    }
    return true;
  }

  // 為票券生成動態驗證數據
  public generateDynamicTicketData(ticket: Ticket): DynamicTicketData {
    const timestamp = Date.now();
    const nonce = crypto.randomBytes(16).toString('hex');
    
    // 組合數據並創建簽名
    const dataToSign = `${ticket.ticketId}:${timestamp}:${nonce}:${this.getLatestBlock().hash}`;
    const signature = crypto
      .createHmac('sha256', this.SECRET_KEY)
      .update(dataToSign)
      .digest('hex');

    return {
      ticketId: ticket.ticketId,
      timestamp: timestamp,
      signature,
      nonce,
      previousHash: this.getLatestBlock().hash
    };
  }

  // 驗證票券的動態數據
  public verifyTicketData(data: DynamicTicketData): boolean {
    const { ticketId, timestamp, nonce, previousHash, signature } = data;
    
    // Skip validation if required fields are missing
    if (!ticketId || !timestamp || !signature || !nonce) {
      console.warn('Ticket data missing required fields:', { ticketId, timestamp, signature, nonce });
      // Return true to prevent false negatives for backward compatibility
      return true;
    }
    
    // Use empty string as fallback if previousHash is missing
    const hashToUse = previousHash || '';
    
    // 重新計算簽名
    const dataToSign = `${ticketId}:${timestamp}:${nonce}:${hashToUse}`;
    const calculatedSignature = crypto
      .createHmac('sha256', this.SECRET_KEY)
      .update(dataToSign)
      .digest('hex');
    
    // 驗證簽名是否匹配
    return calculatedSignature === signature;
  }

  // 獲取票券的交易歷史
  public getTicketHistory(ticketId: string): TicketTransaction[] {
    const history: TicketTransaction[] = [];
    
    // 從區塊鏈中獲取交易歷史
    for (const block of this.chain) {
      if (Array.isArray(block.data)) {
        const transactions = block.data as TicketTransaction[];
        const ticketTransactions = transactions.filter(tx => tx.ticketId === ticketId);
        history.push(...ticketTransactions);
      }
    }
    
    // 如果沒有找到交易記錄，但在pendingTransactions中有，也要包括它們
    const pendingTransactionsForTicket = this.pendingTransactions.filter(tx => tx.ticketId === ticketId);
    if (pendingTransactionsForTicket.length > 0) {
      history.push(...pendingTransactionsForTicket);
    }
    
    // 按時間排序
    return history.sort((a, b) => a.timestamp - b.timestamp);
  }

  // 同步審計記錄到區塊鏈
  public syncTransferFromAudit(ticketId: string, fromUserId: string, toUserId: string, timestamp: number, eventId: string): TicketTransaction {
    // 檢查是否已存在此轉讓交易
    const history = this.getTicketHistory(ticketId);
    const hasTransfer = history.some(tx => 
      tx.action === 'transfer' && 
      tx.fromUserId === fromUserId && 
      tx.toUserId === toUserId &&
      Math.abs(tx.timestamp - timestamp) < 10000 // 10秒內的相同交易視為重複
    );
    
    if (hasTransfer) {
      console.log('此轉讓交易已存在於區塊鏈中');
      const existingTx = history.find(tx => 
        tx.action === 'transfer' && 
        tx.fromUserId === fromUserId && 
        tx.toUserId === toUserId
      );
      return existingTx as TicketTransaction;
    }
    
    // 添加轉讓交易
    const transaction = this.addTransaction({
      ticketId,
      timestamp,
      action: 'transfer',
      fromUserId,
      toUserId,
      eventId
    });
    
    // 立即處理並記錄到區塊鏈
    this.processPendingTransactions();
    
    return transaction;
  }

  // Get blockchain statistics for admin dashboard
  public getStats(): BlockchainStats {
    const totalBlocks = this.chain.length;
    
    let totalTransactions = 0;
    for (const block of this.chain) {
      if (Array.isArray(block.data)) {
        totalTransactions += block.data.length;
      }
    }
    
    const lastBlock = this.chain.length > 0 ? this.chain[this.chain.length - 1] : null;
    const lastBlockTimestamp = lastBlock ? lastBlock.timestamp : null;
    
    return {
      totalBlocks,
      totalTransactions,
      lastBlockTimestamp,
      isValid: this.isChainValid()
    };
  }
}

// 創建全局實例
export const ticketBlockchain = new TicketBlockchain();

// Export blockchain stats for admin page and other functions
export function getBlockchainStats(): BlockchainStats {
  return ticketBlockchain.getStats();
}

// 為前端導出一些有用的功能
export async function refreshTicketQrCode(ticket: Ticket): Promise<DynamicTicketData> {
  const dynamicData = ticketBlockchain.generateDynamicTicketData(ticket);
  
  // 添加票券驗證交易到區塊鏈
  ticketBlockchain.addTransaction({
    ticketId: ticket.ticketId,
    timestamp: Number(dynamicData.timestamp),
    action: 'verify',
    eventId: ticket.eventId
  });
  
  // 處理待處理的交易
  ticketBlockchain.processPendingTransactions();
  
  return dynamicData;
}

// 同步轉讓記錄到區塊鏈
export async function syncTicketTransferToBlockchain(
  ticketId: string, 
  fromUserId: string, 
  toUserId: string, 
  timestamp: number,
  eventId: string
): Promise<boolean> {
  try {
    // 確保時間戳是數字
    const ts = typeof timestamp === 'string' ? new Date(timestamp).getTime() : timestamp;
    
    // Log for debugging
    console.log(`Syncing ticket transfer to blockchain: ${ticketId} from ${fromUserId} to ${toUserId} at ${new Date(ts).toISOString()}`);
    
    const transaction = ticketBlockchain.syncTransferFromAudit(ticketId, fromUserId, toUserId, ts, eventId);
    
    // Check if transaction was added
    console.log(`Transfer transaction created with signature: ${transaction.signature}`);
    
    return true;
  } catch (error) {
    console.error('同步轉讓記錄失敗:', error);
    return false;
  }
}

// Improved version of verifyTicket with more detailed return type
export interface TicketVerificationResult {
  valid: boolean;
  used: boolean;
  usageTime?: number;
  message?: string;
}

// 驗證票券
export function verifyTicket(qrData: unknown): TicketVerificationResult {
  try {
    // Support multiple formats for backward compatibility
    
    // Case 1: Simple string format (old format)
    if (typeof qrData === 'string') {
      // Basic validation for old format
      return { valid: true, used: false };
    }
    
    // Case 2: Object with ticketId, timestamp, signature, nonce (new dynamic format)
    function isDynamicTicketData(obj: unknown): obj is DynamicTicketData {
      return (
        typeof obj === 'object' &&
        obj !== null &&
        typeof (obj as { ticketId?: unknown }).ticketId === 'string' &&
        // Allow timestamp to be number or string (will be converted later)
        (typeof (obj as { timestamp?: unknown }).timestamp === 'number' || 
         typeof (obj as { timestamp?: unknown }).timestamp === 'string' ||
         (obj as { timestamp?: unknown }).timestamp === undefined) &&
        (typeof (obj as { signature?: unknown }).signature === 'string' ||
         (obj as { signature?: unknown }).signature === undefined)
      );
    }

    if (isDynamicTicketData(qrData)) {
      // For dynamic tickets, perform a more thorough validation
      const { ticketId, timestamp, signature, nonce } = qrData;
      
      // Check if ticket has been used already by looking for a 'use' transaction
      const history = ticketBlockchain.getTicketHistory(ticketId);
      
      // Add robust logging for debugging
      console.log(`Blockchain history check for ticket [${ticketId}]:`, {
        totalTransactions: history.length,
        hasUseAction: history.some(tx => tx.action === 'use'),
        transactions: history.map(tx => ({
          action: tx.action,
          timestamp: new Date(tx.timestamp).toISOString()
        }))
      });
      
      const usageRecord = history.find(tx => tx.action === 'use');
      
      if (usageRecord) {
        // Ticket has been used already
        return { 
          valid: true, 
          used: true, 
          usageTime: usageRecord.timestamp,
          message: 'Ticket has already been used'
        };
      }
      
      // CRITICAL FIX: Enforce strict timestamp validation for QR code expiration
      if (timestamp !== undefined) {
        const ticketTime = typeof timestamp === 'string' ? parseInt(timestamp, 10) : timestamp;
        const currentTime = Date.now();
        const maxValidTime = 5 * 60 * 1000; // 5 minutes strict limit
        
        // Check if timestamp is valid
        if (isNaN(ticketTime)) {
          console.warn('Invalid timestamp in QR code:', timestamp);
          return { 
            valid: false, 
            used: false,
            message: 'QR碼時間戳無效'
          };
        }
        
        // Check if QR code has expired
        const timeDiff = currentTime - ticketTime;
        if (timeDiff > maxValidTime) {
          console.warn('QR code expired:', { 
            ticketTime: new Date(ticketTime).toISOString(), 
            currentTime: new Date(currentTime).toISOString(), 
            diff: Math.floor(timeDiff / 1000) + ' seconds',
            maxAllowed: Math.floor(maxValidTime / 1000) + ' seconds'
          });
          return { 
            valid: false, 
            used: false,
            message: `QR碼已過期 (${Math.floor(timeDiff / 60000)} 分鐘前生成，超過5分鐘有效期限)`
          };
        }
        
        // Check for future timestamps (clock synchronization issues)
        if (ticketTime > currentTime + 60000) { // Allow 1 minute clock drift
          console.warn('Future timestamp detected:', { ticketTime, currentTime });
          return { 
            valid: false, 
            used: false,
            message: 'QR碼時間戳異常 (未來時間)'
          };
        }
      }
      
      // Verify the signature if present
      if (signature && nonce) {
        const isValidSignature = ticketBlockchain.verifyTicketData(qrData);
        if (!isValidSignature) {
          return {
            valid: false,
            used: false,
            message: 'QR碼簽名驗證失敗，可能是偽造的'
          };
        }
      }
      
      // All checks passed
      return { valid: true, used: false };
    }
    
    // Case 3: Other formats (handle as needed)
    console.warn('Unknown QR data format:', qrData);
    
    // For debugging, temporarily accept all formats
    // In production, you would implement proper verification here
    return { valid: true, used: false, message: 'Unknown format but accepted' };
  } catch (error) {
    console.error('Error verifying ticket:', error);
    // Instead of reporting as invalid, handle the error gracefully
    return { 
      valid: false, // Changed from true to false for security
      used: false,
      message: `驗證過程中發生錯誤: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

// 取得票券使用資訊 - updated to be more reliable
export function getTicketUsageInfo(ticketId: string): { used: boolean, usageTime: number | null } {
  try {
    const history = ticketBlockchain.getTicketHistory(ticketId);
    const usageRecord = history.find(tx => tx.action === 'use');
    
    if (usageRecord) {
      return {
        used: true,
        usageTime: usageRecord.timestamp
      };
    } else {
      return {
        used: false,
        usageTime: null
      };
    }
  } catch (error) {
    console.error('Error getting ticket usage info:', error);
    return {
      used: false,
      usageTime: null
    };
  }
}

// 記錄票券使用 - updated to return usage time
export function recordTicketUsage(ticketId: string, eventId: string): { success: boolean, usageTime: number | null } {
  try {
    // First check if the ticket is already used
    const history = ticketBlockchain.getTicketHistory(ticketId);
    const existingUsage = history.find(tx => tx.action === 'use');
    
    if (existingUsage) {
      console.log(`Ticket [${ticketId}] already has usage record, returning existing timestamp:`, existingUsage.timestamp);
      return {
        success: true,
        usageTime: existingUsage.timestamp
      };
    }
    
    // If not used, create new usage record
    const usageTime = Date.now();
    
    // Call the method without storing the unused return value
    ticketBlockchain.addTransaction({
      ticketId,
      timestamp: usageTime,
      action: 'use',
      eventId
    });
    
    ticketBlockchain.processPendingTransactions();
    
    return {
      success: true,
      usageTime
    };
  } catch (error) {
    console.error('Error recording ticket usage:', error);
    return {
      success: false,
      usageTime: null
    };
  }
}
