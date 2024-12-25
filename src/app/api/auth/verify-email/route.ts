import { NextResponse } from 'next/server';
import db from '@/lib/db'; // Import the db module
import jwt from 'jsonwebtoken';

const jwtSecret = process.env.JWT_SECRET!;
const jwtExpiry = '1h'; // Configurable expiry time

export async function POST(request: Request) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json({ error: '驗證令牌缺失。' }, { status: 400 });
    }

    // Use db.users.findByVerificationCode
    const user = await db.users.findByVerificationCode(token);

    if (user) {
      // Update user using db.users.update
      await db.users.update(user.userId, {
        isEmailVerified: true,
        verificationCode: undefined,
      });

      const authToken = jwt.sign(
        { userId: user.userId, email: user.email, role: user.role },
        jwtSecret,
        { expiresIn: jwtExpiry }
      );

      return NextResponse.json({
        message: '驗證成功！',
        token: authToken,
        user: {
          userId: user.userId,
          userName: user.userName,
          email: user.email,
          role: user.role,
          phoneNumber: user.phoneNumber,
        },
      }, { status: 200 });
    } else {
      return NextResponse.json({ error: '無效的驗證令牌。' }, { status: 400 });
    }
  } catch (error) {
    console.error('Email verification error:', error);
    return NextResponse.json({ error: '內部伺服器錯誤' }, { status: 500 });
  }
}
