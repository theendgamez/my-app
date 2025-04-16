// User related types
export interface Users {
  userId: string;
  userName: string;
  email: string;
  password: string;
  phoneNumber?: string;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  verificationCode?: string;
  verificationTimestamp?: string;
  createdAt: string;
  role: string;
  tokenVersion?: number;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  user?: Partial<Users>;
  error?: string;
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  tokenVersion?: number;
}

// Event related types
export interface Zone {
  name: string;
  price: string;
  zoneQuantity: number;
  max: string;
}

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
  status: 'completed' | 'pending' | 'failed';
  cardDetails: {
    lastFourDigits: string;
  };
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
  userId: string
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

export interface ProcessedPayment {
  paymentId: string;
}