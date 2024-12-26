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

}

export interface Events {
  eventId: string;
  eventName: string;  
  eventDate: string; 
  photoUrl: string;
  description: string;
  location: string;
  status: string;
  createdAt: string;
  registerDate: string;
  endregisterDate: string;
  drawDate: string;
  zones: Zone[];
}
