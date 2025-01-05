// app/api/auth/register/route.ts
import { NextResponse } from 'next/server';
import { ethers } from 'ethers';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import db from '@/lib/db';
import { Users } from '@/types';
import sendVerificationCode from '@/utils/sendVerifcationCode';

export async function checkEmailUnique(email: string): Promise<boolean> {
  const existingUser = await db.users.findByEmail(email);
  return existingUser === null;
}

export async function POST(request: Request) {
  let userId: string | undefined;
  try {
    const { userName, email, password, phoneNumber } = await request.json();

    const isEmailUnique = await checkEmailUnique(email);
    if (!isEmailUnique) {
      return NextResponse.json({ error: '該電子郵件已被註冊。' }, { status: 400 });
    }

    // Create blockchain address
    const wallet = ethers.Wallet.createRandom();
    const blockchainAddress = wallet.address;

    // Hash password and create verification code
    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Prepare user data
    const userData: Users = {
      userId: uuidv4(),
      userName,
      email,
      password: hashedPassword,
      phoneNumber,
      blockchainAddress,
      isEmailVerified: false,
      isPhoneVerified: false,
      verificationCode,
      createdAt: new Date().toISOString(),
      role: 'user'
    };

    // Store user using db utility
    await db.users.create(userData);

    // Send verification code
    await sendVerificationCode(email, verificationCode);

    return NextResponse.json(
      { message: '註冊成功，驗證碼已發送至您的電子郵件。' }, 
      { status: 201 }
    );

  } catch (error) {
    if (userId) {
      // If user creation failed after creating userId, clean up
      try {
        await db.users.delete(userId);
      } catch (deleteError) {
        console.error('Failed to delete user after registration error:', deleteError);
      }
    }
    console.error('Registration error:', error);
    return NextResponse.json({ error: '內部伺服器錯誤' }, { status: 500 });
  }
}