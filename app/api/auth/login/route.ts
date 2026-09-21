import { NextRequest, NextResponse } from 'next/server';
import { getUserByEmailAsync, verifyPassword } from '@/lib/db';

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

  if (!email || !password) {
    return NextResponse.json({ success: false, error: 'Email and password are required.' }, { status: 400 });
  }

  const dbUser = await getUserByEmailAsync(email);
  if (!dbUser) {
    return NextResponse.json({ success: false, error: 'Invalid email or password.' }, { status: 401 });
  }

  const valid = verifyPassword(dbUser.id, password, dbUser.passwordHash);
  if (!valid) {
    return NextResponse.json({ success: false, error: 'Invalid email or password.' }, { status: 401 });
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash, ...user } = dbUser;
  return NextResponse.json({ success: true, user });
}
