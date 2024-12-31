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
  total: string;
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
  zones: Zone[]; // Changed from zones: []
  photoUrl: string;
  createdAt: string;
  status: string;
  category: string; // Changed from categories: string;
}

export interface Ticket {
  eventId: string;
  zone: string;
  seatNumber: number;
  price: number;
  tokenId?: string;
  owner?: string;
  eventDate: string;
  eventName: string;
  photoUrl: string;
  location: string;
}
export interface TicketMintRequest {

  eventId: string;

  zone: string;

  quantity: number;

  pricePerTicket: number;

}