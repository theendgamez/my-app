// User related types
export interface Users {
  userId: string;
  userName: string;
  realName: string;
  email: string;
  password: string;
  phoneNumber: string;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  verificationCode?: string;
  verificationTimestamp?: string;
  createdAt: string;
  role: string;
  tokenVersion?: number;
  isDataEncrypted?: boolean;
}

/**
 * Authentication response structure
 */
export interface AuthResponse {
  success: boolean;
  message?: string;
  user?: Partial<Users>;
  error?: string;
}

/**
 * JWT token payload structure
 */
export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  tokenVersion?: number;
}

// Event related types
/**
 * Event zone configuration
 */
export interface Zone {
  name: string;
  price: string;
  zoneQuantity: number;
  max: string;
}

/**
 * Event information structure
 */
export interface Events {
  eventId: string;
  eventName: string;
  eventDate: string;
  description: string;
  location: string;
  isDrawMode: boolean;
  onSaleDate: string | null;
  registerDate: string | null;
  endregisterDate: string | null;
  drawDate: string | null;
  zones: Zone[];
  photoUrl: string;
  createdAt: string;
  status: string;
  category: string;
  isDrawn?: boolean;
  drawnAt?: string | null;
}

// Payment and ticket related types
export interface Payment {
  paymentId: string;
  eventId: string;
  eventName: string;
  userId: string;
  zone: string;
  payQuantity: number;
  totalAmount: number;
  createdAt: string;
  status: 'completed' | 'pending' | 'failed' | 'refunded';
  cardDetails: {
    lastFourDigits: string;
  };
  amount: number;
  paymentMethod: string;
  relatedTo: 'lottery_registration' | 'ticket_purchase';
}

export interface DynamicTicketData {
  ticketId: string;
  timestamp: string | number;
  signature: string;
  nonce: string;
  previousHash?: string;  // Make previousHash optional
}

export interface Ticket {
  ticketId: string;
  eventId: string;
  eventName: string;
  zone: string;
  status: 'available' | 'reserved' | 'sold' | 'used' | 'cancelled';
  userId: string;
  userRealName?: string;
  paymentId?: string;
  purchaseDate?: string;
  eventDate?: string;
  eventLocation?: string;
  seatNumber?: string;
  qrCode?: string;
  lastRefreshed: string;
  nextRefresh: string;
  formattedPurchaseDate?: string;
  formattedEventDate?: string;
  verificationInfo?: {
    verificationStatus: string;
    lastVerified: string;
    usageTimestamp: string;
    verificationCount: number;
    verifiedBy: string;
    verifierName: string;
    isTransferred?: boolean;
    originalOwner?: string | null;
    adminNotes?: string | null;
  };
  lastVerified: string | null;
  verificationCount: number;
  transferredFrom: string | null;
  adminNotes: string | null;
  transferredAt: string | null;
  dynamicData?: DynamicTicketData;
  price: string;
  transferredTo ?: string | null;
}

// Booking related types
export interface Booking {
  bookingToken: string;
  sessionId: string;
  eventId: string;
  zone: string;
  quantity: number;
  userId: string;
  expiresAt: string;
  status: 'pending' | 'completed';
}
export interface BookingDetails {
  eventName: string;
  eventDate: string;
  eventLocation: string;
  zone: string;
  quantity: number;
  price: number;
  expiresAt: number;
}

export interface Registration {
  ticketIds: boolean;
  ticketsPurchased(ticketsPurchased: unknown): unknown;
  registrationToken: string;
  eventId: string;
  userId: string;
  userRealName?: string;
  email?: string;
  phoneNumber?: string;
  eventName?: string;
  zoneName: string;
  quantity: number;
  platformFee: number;
  totalAmount: number;
  createdAt: string;
  status: 'registered' | 'paid' | 'drawn' | 'won' | 'lost' | 'cancelled';
  paymentStatus: 'pending' | 'paid' | 'refunded';
  paymentId?: string;
  paidAt?: string;
  drawDate?: string;
  isDrawn?: boolean;
  sessionId?: string;
  priorityScore?: number;  
  riskScore?: number;      
  lastPurchaseDate?: string;
  
}

// Friendship related types
export interface Friendship {
  friendshipId: string;
  requesterId: string;
  requesterName?: string;
  recipientId: string;
  recipientName?: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
  acceptedAt?: string;
  userRelationship?: string; // 用於索引查詢
}

export interface LotteryHistory {
  eventId: string;
  eventName?: string;
  result: 'won' | 'lost' | 'cancelled';
  drawDate: string;
}

export interface UserLotteryStats {
  lostCount: number;       // 過去未中籤次數
  winCount: number;        // 過去中籤次數
  lastLotteryDate?: string; // 最後參與抽籤日期
  activityScore: number;   // 用戶活躍度分數
  consecutiveLosses: number; // 連續未中籤次數
}

export interface CooldownConfig {
  enabled: boolean;
  basePeriod: number;      // 基礎冷卻期（小時）
  multiplier: number;      // 風險乘數
  maxPeriod: number;       // 最大冷卻期（小時）
}

export interface PurchaseLimitConfig {
  maxTicketsPerUser: number;     // 每用戶最大票數
  maxTicketsPerEvent: number;    // 每活動最大票數
  maxTicketsPerDay: number;      // 每天最大票數
  cooldown: CooldownConfig;      // 冷卻期配置
}

export interface TicketAuditLog {
    auditId?: string;  // Primary key, will be generated if not provided
    ticketId: string;
    action: string;    // 'view', 'verify', 'transfer', etc.
    userId: string;
    userRole: string;
    timestamp: string;
    ipAddress?: string;
    details?: string;
  }

export interface UserPurchase {
 userId: string;
 eventId: string;
 purchaseDate: string;
 quantity: number;
 paymentId: string;
 purchaseId?: string; // Optional as it might be generated
}

/**
* Type definition for lottery history record
*/
export interface LotteryHistory {
 historyId?: string; // Primary key if not provided will be generated
 userId: string;
 eventId: string;
 eventName?: string;
 result: 'won' | 'lost' | 'cancelled';
 drawDate: string;
}

