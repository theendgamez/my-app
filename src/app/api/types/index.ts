// src/types/User.ts
export interface Users {
  userId: string;
  userName: string; // Ensure this property is included
  email: string;
  phoneNumber: string;
  isPhoneVerified: boolean;
  createdAt: string;
  role: string;
}

export interface events {
  eventId: string;
  eventName: string;
  eventDescription: string;
  eventDate: string;
  eventLocation: string;
  eventPrice: number;
  eventImage: string;
  createdAt: string;
  updatedAt: string;
}