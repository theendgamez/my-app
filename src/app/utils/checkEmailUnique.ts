import db from '@/lib/db';

export async function checkEmailUnique(email: string): Promise<boolean> {
  const existingUser = await db.users.findByEmail(email);
  return existingUser === null;
}