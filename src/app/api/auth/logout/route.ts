import { NextRequest } from 'next/server';
import { clearAuthCookies, createResponse } from '@/lib/auth';

export async function POST(_request: NextRequest) {
  const response = createResponse({ message: '登出成功' });
  
  if (response) {
    return response;
  }
  return   clearAuthCookies(response);
}