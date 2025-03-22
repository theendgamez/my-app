// src/types/User.ts
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

export interface Zone {
  name: string;
  price: string;
  quantity: number;
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

/*export interface TicketMintRequest {
  eventId: string;
  zone: string;
  quantity: number;
  pricePerTicket: number;
  totalAmount: number;
  createdAt: string;
  status: 'completed' | 'pending' | 'failed';
  cardDetails: {
    lastFourDigits: string;
  };
}*/

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
  eventName: string;
  eventDate: string;
  zone: string;
  userId: string;
  paymentId: string;
  status: 'available' | 'reserved' | 'sold';
  createdAt: string;
  updatedAt: string;
  seatNumber: string;
}