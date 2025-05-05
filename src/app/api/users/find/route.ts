import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// 通過電子郵件查找用戶
export async function GET(request: NextRequest) {
  try {
    // 驗證用戶身份
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: '請先登入以查找用戶' }, { status: 401 });
    }

    // 獲取查詢參數
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    
    if (!email) {
      return NextResponse.json({ error: '缺少電子郵件地址' }, { status: 400 });
    }

    // 通過電子郵件查找用戶
    const foundUser = await db.users.findByEmail(email);
    
    if (!foundUser) {
      return NextResponse.json({ error: '找不到該用戶' }, { status: 404 });
    }

    // 不能找自己
    if (foundUser.userId === user.userId) {
      return NextResponse.json({ error: '不能添加自己為好友' }, { status: 400 });
    }

    // 返回基本用戶信息
    return NextResponse.json({
      userId: foundUser.userId,
      userName: foundUser.userName || foundUser.email,
      email: foundUser.email
    });
  } catch (error) {
    console.error('Error finding user by email:', error);
    return NextResponse.json(
      { error: '查找用戶時出錯' },
      { status: 500 }
    );
  }
}
