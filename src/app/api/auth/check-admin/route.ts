import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  const cookieStore = await cookies();
  const role = cookieStore.get('role')?.value;

  return NextResponse.json({
    isAdmin: role === 'admin'
  });
}

