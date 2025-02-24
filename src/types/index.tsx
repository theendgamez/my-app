// src/types/User.ts
export interface Users {
  userId: string;
  userName: string;
  email: string;
  password: string; 
  phoneNumber: string;
  isPhoneVerified: boolean;
  isEmailVerified: boolean; 
  createdAt: string;
  role: string;
  blockchainAddress: string;
  verificationCode: string;
}

export interface Zone {
  name: string;
  price: string;
  remaining: string;
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

export interface TicketMintRequest {
  eventId: string;
  zone: string;
  quantity: number;
  pricePerTicket: number;
}

export interface Payment {
  paymentId: string;
  eventId: string;
  userId: string;
  zone: string;
  quantity: number;
  totalAmount: number;
  createdAt: string;
  status: 'completed' | 'pending' | 'failed';
  cardDetails: {
    lastFourDigits: string;
  };
  user: {
    blockchainAddress: string;
  };
}

export interface Ticket {
  ticketId: string;
  eventId: string;
  zone: string;
  userId: string;
  blockchainAddress: string;
  status: 'minted';
  tokenId: string;
  // Add other required properties if any
}