import { NextRequest } from 'next/server';
import { handleTokenRefresh, createResponse } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const response = await handleTokenRefresh(request);
  
  if (response) {
    return response;
  }
  
  return createResponse({ error: '無效的重新整理令牌' }, 401);
}