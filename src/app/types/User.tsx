// src/types/User.ts
export interface User {
  userId: string;
  userName: string; // Ensure this property is included
  email: string;
  phoneNumber: string;
  isPhoneVerified: boolean;
  createdAt: string;
  role: string;
  // Add other properties if needed
}