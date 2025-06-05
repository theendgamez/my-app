/**
 * 動態票券工具 - 實現不斷更新的QR碼和區塊鏈驗證
 */

import crypto from 'crypto';

// 定義動態票券數據類型
export interface DynamicTicketData {
  ticketId: string;
  timestamp: number;
  nonce: string;
  signature?: string;
  previousHash?: string;
}

// 生成安全隨機數
function generateNonce(length = 16) {
  return crypto.randomBytes(length).toString('hex');
}

// 創建數字簽名
function createSignature(data: string, secretKey: string) {
  return crypto.createHmac('sha256', secretKey).update(data).digest('hex');
}

export function generateDynamicTicketData(ticketId: string, secretKey: string, previousHash?: string): DynamicTicketData {
  const timestamp = Date.now();
  const nonce = generateNonce();
  
  // 組合數據
  const dataToSign = `${ticketId}:${timestamp}:${nonce}:${previousHash || ''}`;
  const signature = createSignature(dataToSign, secretKey);
  
  return {
    ticketId,
    timestamp,
    nonce,
    signature,
    previousHash
  };
}

export function verifyTicketData(ticketData: DynamicTicketData, secretKey: string): boolean {
  // Check timestamp expiration first (critical security check)
  const currentTime = Date.now();
  const ticketTime = typeof ticketData.timestamp === 'string' 
    ? parseInt(ticketData.timestamp, 10) 
    : ticketData.timestamp;
  
  // Strict 1-minute expiration check for QR code generation
  const maxValidTime = 1 * 60 * 1000; // Changed from 5 minutes to 1 minute
  const timeDiff = currentTime - ticketTime;

  if (isNaN(ticketTime)) {
    console.warn('Invalid timestamp in ticket data:', ticketData.timestamp);
    return false;
  }

  if (timeDiff > maxValidTime) {
    console.warn('Ticket data expired:', {
      ticketTime: new Date(ticketTime).toISOString(),
      currentTime: new Date(currentTime).toISOString(),
      diffMinutes: Math.floor(timeDiff / 60000),
      maxAllowedMinutes: Math.floor(maxValidTime / 60000)
    });
    return false;
  }
  
  // Check for future timestamps (possible clock sync issues)
  if (ticketTime > currentTime + 60000) { // Allow 1 minute clock drift
    console.warn('Future timestamp detected in ticket data:', {
      ticketTime: new Date(ticketTime).toISOString(),
      currentTime: new Date(currentTime).toISOString()
    });
    return false;
  }
  
  // 重建簽名數據
  const dataToSign = `${ticketData.ticketId}:${ticketData.timestamp}:${ticketData.nonce}:${ticketData.previousHash || ''}`;
  const expectedSignature = createSignature(dataToSign, secretKey);
  
  // 檢查簽名是否匹配
  const signatureValid = ticketData.signature === expectedSignature;
  
  if (!signatureValid) {
    console.warn('Signature verification failed for ticket:', ticketData.ticketId);
  }
  
  return signatureValid;
}

// 生成票券QR碼數據
export function generateTicketQRData(ticketData: DynamicTicketData): string {
  // 將數據轉換為安全的字符串格式
  const qrData = JSON.stringify({
    ticketId: ticketData.ticketId,
    timestamp: ticketData.timestamp,
    signature: ticketData.signature,
    nonce: ticketData.nonce,
    previousHash: ticketData.previousHash // ADDED: Include previousHash
  });
  
  // 將數據構造為URL格式，方便iOS相機掃描
  const baseUrl = '/verify';
  const urlParams = encodeURIComponent(Buffer.from(qrData).toString('base64'));
  
  return `${baseUrl}?data=${urlParams}`;
}

// 生成用戶票券QR碼數據 - 供普通用戶使用
export function generatePublicTicketQRData(ticketData: DynamicTicketData): string {
  // Validate that the ticket data is not already expired
  const currentTime = Date.now();
  const ticketTime = typeof ticketData.timestamp === 'string' 
    ? parseInt(ticketData.timestamp, 10) 
    : ticketData.timestamp;
  const maxValidTime = 1 * 60 * 1000; // Changed from 5 minutes to 1 minute
  
  if (currentTime - ticketTime > maxValidTime) {
    throw new Error('Cannot generate QR data for expired ticket');
  }
  
  // 將數據轉換為安全的字符串格式
  const qrData = JSON.stringify({
    ticketId: ticketData.ticketId,
    timestamp: ticketData.timestamp,
    signature: ticketData.signature,
    nonce: ticketData.nonce,
    expiresAt: ticketTime + maxValidTime, // Add explicit expiration time
    previousHash: ticketData.previousHash // ADDED: Include previousHash
  });
  
  // 使用base64編碼數據參數
  const base64Data = Buffer.from(qrData).toString('base64');
  
  // The route matches the Next.js file structure exactly
  return `/admin/tickets/verify/${ticketData.ticketId}?data=${encodeURIComponent(base64Data)}`;
}

// 模擬區塊鏈記錄
export async function recordToBlockchain(ticketData: DynamicTicketData): Promise<string> {
  // Instead of just returning a hash, actually record it to the blockchain
  try {
    // Import the actual blockchain service
    const { ticketBlockchain } = await import('@/lib/blockchain');
    
    // Add a verification transaction to the blockchain
    const transaction = ticketBlockchain.addTransaction({
      ticketId: ticketData.ticketId,
      timestamp: Number(ticketData.timestamp),
      action: 'verify',
      eventId: 'system-generated' // We don't have eventId in DynamicTicketData, use placeholder
    });
    
    // Process transactions immediately to ensure they're added to a block
    ticketBlockchain.processPendingTransactions();
    
    // Record the blockchain sync in the audit log
    try {
      const db = (await import('@/lib/db')).default;
      await db.ticketAudit.logBlockchainSync(
        ticketData.ticketId,
        (await transaction).signature
      );
    } catch (dbError) {
      console.warn('Failed to log blockchain sync to audit log:', dbError);
    }
    
    // Return the signature as the blockchain reference
    return (await transaction).signature;
  } catch (error) {
    console.error('Error recording to blockchain:', error);
    
    // Fallback to the original method if there's an error
    return crypto
      .createHash('sha256')
      .update(`${ticketData.ticketId}:${ticketData.timestamp}:${Date.now()}`)
      .digest('hex');
  }
}

// 更新導出的工具函數
const dynamicTicketUtils = {
  generateDynamicTicketData,
  verifyTicketData,
  generateTicketQRData,
  generatePublicTicketQRData,
  recordToBlockchain
};

export default dynamicTicketUtils;
