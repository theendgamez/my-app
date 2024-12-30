import { NextResponse } from 'next/server';
import db from '@/lib/db';
import bcrypt from 'bcrypt';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();
    const user = await db.users.findByEmail(email);

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return NextResponse.json({ message: '帳號或密碼不正確' }, { status: 401 });
    }

    // Destructure and rename password to omit it
    const { password: _pass, ...userWithoutPassword } = user;
    const userCookie = JSON.stringify(userWithoutPassword);

    const response = NextResponse.json(
      { message: '登入成功', user: userWithoutPassword }, 
      { status: 200 }
    );
    
    response.cookies.set('user', userCookie, {
      path: '/',
      httpOnly: true,
      secure: true
    });

    // Set role cookie for admin users
    if (user.role === 'admin') {
      response.cookies.set('role', 'admin', {
        path: '/',
        httpOnly: false, // Allow client-side access if needed
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24, // 1 day
      });
    }
    
    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
