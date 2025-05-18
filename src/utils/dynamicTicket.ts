/**
 * 動態票券工具 - 實現不斷更新的QR碼和區塊鏈驗證
 */

import crypto from 'crypto';

// 動態票券數據型別定義
export interface DynamicTicketData {
  ticketId: string;
  timestamp: number;
  nonce: string;
  signature: string;
  previousHash?: string;
}

// 生成安全隨機數
function generateNonce(length: number = 16): string {
  return crypto.randomBytes(length).toString('hex');
}

// 創建數字簽名
function createSignature(data: string, secretKey: string): string {
  return crypto
    .createHmac('sha256', secretKey)
    .update(data)
    .digest('hex');
}

// 生成動態票券數據
export function generateDynamicTicketData(
  ticketId: string, 
  secretKey: string,
  previousHash?: string
): DynamicTicketData {
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

// 驗證票券數據
export function verifyTicketData(
  ticketData: DynamicTicketData,
  secretKey: string
): boolean {
  // 重建簽名數據
  const dataToSign = `${ticketData.ticketId}:${ticketData.timestamp}:${ticketData.nonce}:${ticketData.previousHash || ''}`;
  const expectedSignature = createSignature(dataToSign, secretKey);
  
  // 檢查簽名是否匹配
  return ticketData.signature === expectedSignature;
}

// 生成票券QR碼數據
export function generateTicketQRData(ticketData: DynamicTicketData): string {
  // 將數據轉換為安全的字符串格式
  const qrData = JSON.stringify({
    ticketId: ticketData.ticketId,
    timestamp: ticketData.timestamp,
    signature: ticketData.signature,
    nonce: ticketData.nonce
  });
  
  // 使用base64編碼數據參數
  const base64Data = Buffer.from(qrData).toString('base64');
  
  // 創建iOS相機可以直接解析的URL
  // 基本URL不帶域名，iOS將添加當前域名
  return `/scan?data=${encodeURIComponent(base64Data)}`;
}

// 生成用戶票券QR碼數據 - 供普通用戶使用
export function generatePublicTicketQRData(ticketData: DynamicTicketData): string {
  // 將數據轉換為安全的字符串格式
  const qrData = JSON.stringify({
    ticketId: ticketData.ticketId,
    timestamp: ticketData.timestamp,
    signature: ticketData.signature,
    nonce: ticketData.nonce
  });
  
  // 使用base64編碼數據參數
  const base64Data = Buffer.from(qrData).toString('base64');
  
  // The route matches the Next.js file structure exactly
  return `/admin/tickets/verify/${ticketData.ticketId}?data=${encodeURIComponent(base64Data)}`;
}

// 模擬區塊鏈記錄
export async function recordToBlockchain(ticketData: DynamicTicketData): Promise<string> {
  // 實際應用中，這裡會調用區塊鏈服務API
  // 在這個示例中，我們只是模擬一個區塊鏈參考ID
  const blockchainRef = crypto
    .createHash('sha256')
    .update(`${ticketData.ticketId}:${ticketData.timestamp}:${Date.now()}`)
    .digest('hex');
  
  return blockchainRef;
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
