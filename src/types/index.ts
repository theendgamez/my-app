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

export interface Ticket {
  ticketId: string;
  eventId: string;
  eventName: string;
  eventDate: string;
  eventLocation: string;
  zone: string;
  userId: string;
  paymentId: string;
  status: 'available' | 'reserved' | 'sold';
  seatNumber: string;
  price: number;
  purchaseDate: string;
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
  eventId: string;
  userId: string;
  phoneNumber?: string;
  eventName?: string;
  zoneName: string;
  quantity: number;
  platformFee: number;
  totalAmount: number;
  createdAt: string;
  status: 'registered' | 'paid' | 'drawn' | 'won' | 'lost';
  paymentStatus: 'pending' | 'paid' | 'refunded';
  paymentId?: string;
  paidAt?: string;
  drawDate?: string;
  isDrawn?: boolean;
  sessionId?: string;
}