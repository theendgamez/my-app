import { clearAuthCookies, createResponse } from '@/lib/auth';

export async function POST() {
  const response = createResponse({ message: '登出成功' });
  clearAuthCookies(response);
  return response;
}