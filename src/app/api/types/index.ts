// src/types/User.ts
export interface Users {
  userId: string;
  userName: string; // Ensure this property is included
  email: string;
  password: string; // Added password field
  phoneNumber: string;
  isPhoneVerified: boolean;
  isEmailVerified: boolean; // Added email verification field
  createdAt: string;
  role: string;
  blockchainAddress: string;
  verificationCode: string;
}

export interface Zone {
  name: string;
  price: string;
}

export interface Events {
  eventId: string;
  eventName: string;  // maps to 'name' in DynamoDB
  eventDate: string;  // maps to 'date' in DynamoDB
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
