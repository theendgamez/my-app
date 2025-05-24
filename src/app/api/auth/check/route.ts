import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, createResponse } from '@/lib/auth';
import db from '@/lib/db';
import { decryptData, isEncrypted } from '@/utils/encryption';

export async function GET(request: NextRequest) {
  try {
    // First, try standard authentication using JWT in Authorization header
    const user = await getCurrentUser(request);
    
    if (user) {
      // Decrypt phone number if needed
      let phoneNumber = user.phoneNumber;
      if (phoneNumber && (user.isDataEncrypted || isEncrypted(phoneNumber))) {
        try {
          phoneNumber = decryptData(phoneNumber);
        } catch (error) {
          console.error('Error decrypting phone number:', error);
          phoneNumber = ''; // Fallback to empty string
        }
      }
      
      // Return complete user data
      return createResponse({
        userId: user.userId,
        userName: user.userName,
        email: user.email,
        phoneNumber: phoneNumber,
        realName: user.realName,
        role: user.role || 'user',
        isEmailVerified: user.isEmailVerified,
        isAuthenticated: true
      }, 200);
    }
    
    // If standard auth fails, try to check using the user ID header as fallback
    const userIdHeader = request.headers.get('x-user-id');
    if (userIdHeader) {
      try {
        // Fetch user directly from the database
        const dbUser = await db.users.findById(userIdHeader);
        
        if (dbUser) {
          return NextResponse.json({
            userId: dbUser.userId,
            userName: dbUser.userName,
            email: dbUser.email,
            role: dbUser.role || 'user',
            isEmailVerified: dbUser.isEmailVerified,
            isAuthenticated: true
          });
        }
      } catch (error) {
        console.error('Error retrieving user by ID:', error);
      }
    }
    
    // Authentication failed
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  } catch (error) {
    console.error('Authentication check error:', error);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
