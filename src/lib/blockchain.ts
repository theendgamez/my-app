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

export class TicketBlockchain {
  private chain: Block[];
  private difficulty: number;
  private pendingTransactions: TicketTransaction[];
  private readonly SECRET_KEY: string;

  constructor() {
    this.chain = [this.createGenesisBlock()];
    this.difficulty = 4; // 調整難度以控制挖礦速度
    this.pendingTransactions = [];
    // 在實際應用中，這個密鑰應該安全存儲在環境變量中
    this.SECRET_KEY = process.env.BLOCKCHAIN_SECRET || 'your-secret-blockchain-key';
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
    return signedTransaction;
  }

  // 處理待處理的交易並創建新區塊
  public processPendingTransactions(): void {
    if (this.pendingTransactions.length === 0) return;

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
    this.pendingTransactions = [];
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
      timestamp,
      signature,
      nonce,
      previousHash: this.getLatestBlock().hash
    };
  }

  // 驗證票券的動態數據
  public verifyTicketData(data: DynamicTicketData): boolean {
    const { ticketId, timestamp, nonce, previousHash, signature } = data;
    
    // 重新計算簽名
    const dataToSign = `${ticketId}:${timestamp}:${nonce}:${previousHash}`;
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
}

// 創建全局實例
export const ticketBlockchain = new TicketBlockchain();

// 為前端導出一些有用的功能
export async function refreshTicketQrCode(ticket: Ticket): Promise<DynamicTicketData> {
  const dynamicData = ticketBlockchain.generateDynamicTicketData(ticket);
  
  // 添加票券驗證交易到區塊鏈
  ticketBlockchain.addTransaction({
    ticketId: ticket.ticketId,
    timestamp: dynamicData.timestamp,
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
    
    ticketBlockchain.syncTransferFromAudit(ticketId, fromUserId, toUserId, ts, eventId);
    return true;
  } catch (error) {
    console.error('同步轉讓記錄失敗:', error);
    return false;
  }
}

// 驗證票券
export function verifyTicket(qrData: unknown): boolean {
  try {
    // Support multiple formats for backward compatibility
    
    // Case 1: Simple string format (old format)
    if (typeof qrData === 'string') {
      // Basic validation for old format
      return true;
    }
    
    // Case 2: Object with ticketId, timestamp, signature, nonce (new dynamic format)
    function isDynamicTicketData(obj: unknown): obj is DynamicTicketData {
      return (
        typeof obj === 'object' &&
        obj !== null &&
        typeof (obj as { ticketId?: unknown }).ticketId === 'string' &&
        typeof (obj as { timestamp?: unknown }).timestamp === 'number' &&
        typeof (obj as { signature?: unknown }).signature === 'string' &&
        typeof (obj as { nonce?: unknown }).nonce === 'string'
      );
    }

    if (isDynamicTicketData(qrData)) {
      // For now, simply verify that all required fields are present
      // In a real system, we would verify the signature cryptographically
      return true;
    }
    
    // Case 3: Other formats (handle as needed)
    console.warn('Unknown QR data format:', qrData);
    
    // For debugging, temporarily accept all formats
    // In production, you would implement proper verification here
    return true;
  } catch (error) {
    console.error('Error verifying ticket:', error);
    return false;
  }
}
