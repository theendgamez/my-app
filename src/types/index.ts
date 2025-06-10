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
  riskScore?: number;
  riskLevel?: 'low' | 'medium' | 'high' | 'very-high';
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
  totalAmount: number;
  paymentId?: string;
  userId?: string;
  eventId?: string;
  eventName?: string;
  amount?: number;
  paymentMethod?: string;
  status?: string;
  createdAt?: string;
  cardDetails?: {
    lastFourDigits: string;
  };
  payQuantity?: number;
  zone?: string;
  relatedTo?: string;
}

/**
 * Comprehensive Ticket interface
 */
export interface Ticket {
  ticketId: string;
  eventId: string;
  eventName: string;
  eventDate: string;
  eventLocation?: string;
  userId: string;
  userRealName: string;
  zone?: string;
  seatNumber?: string;
  price?: string;
  status: 'active' | 'available' | 'sold' | 'used' | 'cancelled' | 'reserved';
  purchaseDate?: string;
  paymentId: string;
  qrCode?: string;
  lastRefreshed: string;
  nextRefresh: string;
  lastVerified: string | null;
  verificationCount: number;
  transferredAt: string | null;
  transferredFrom: string | null;
  adminNotes?: string;
  bookingToken?: string;
  
  dynamicData?: {
    ticketId: string;
    timestamp: string | number;
    nonce: string;
    signature?: string;
    previousHash?: string;
  };
  verificationInfo?: {
    verificationStatus: string;
    verifiedBy: string;
    verifierName: string;
    verificationCount: number;
    lastVerified: string;
    isTransferred?: boolean;
    originalOwner?: string | null;
    usageTimestamp?: string;
    adminNotes?: string | null;
    eventLocation?: string; // Location where the ticket was verified
  };
}

// For blockchain transaction data
export interface TicketTransaction {
  ticketId: string;
  timestamp: number;
  action: 'verify' | 'use' | 'transfer' | 'issue';
  eventId: string;
  signature?: string;
  fromUserId?: string;
  toUserId?: string;
}

// For ticket verification results
export interface TicketVerificationResult {
  valid: boolean;
  used: boolean;
  usageTime?: number;
  message?: string;
}

// For dynamic ticket data
export interface DynamicTicketData {
  ticketId: string;
  timestamp: number;
  nonce: string;
  signature?: string;
  previousHash?: string;
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
  registrationToken: string;
  userId: string;
  eventId: string;
  eventName?: string;
  zoneName: string;
  quantity: number;
  status: 'registered' | 'won' | 'lost' | 'cancelled' | 'error' | 'processing'|'drawn';
  createdAt: string;
  updatedAt?: string;
  ticketIds?: string[];
  paymentId?: string; // For the main ticket purchase
  platformFeePaid?: boolean;
  platformFeePaymentId?: string; // For the platform fee payment
  ticketsPurchased?: boolean;
  totalAmount?: number; // Total amount for the registration if applicable
  drawDate?: string; // Draw date for the lottery
  phoneNumber?: string; // Add optional phoneNumber
  paymentStatus?: 'pending' | 'completed' | 'refunded'| 'paid';
  platformFee ?: number; // Platform fee for the registration
  cardLastFourDigits?: string; // Last four digits of the card used for payment
  userRealName?: string; // User's real name for the registration
  paymentMethod?: string; // Payment method used for the registration
  paidAt?: string; // Payment completion time
  ticketPrice?: number; // Price per ticket for the registration
  ticketPaid?: boolean; // Indicates if the ticket payment is completed
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

// Add transfer cooldown interface
export interface TransferCooldown {
  canTransfer: boolean;
  nextAvailableTime?: string;
  remainingDays?: number;
  lastTransferTime?: string;
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

export interface UserPurchase {
  purchaseId: string;
  ticketId: string;
  userId: string;
  eventId: string;
  purchaseDate: string;
  quantity: number;
  paymentId: string;
  status: 'pending' | 'completed' | 'refunded';
  totalAmount: number;
  eventName?: string;
  zoneName?: string;
  userRealName?: string;
  paymentMethod?: string;
  cardDetails?: {
    lastFourDigits: string;
  };
}