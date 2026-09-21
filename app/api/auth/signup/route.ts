import { NextRequest, NextResponse } from 'next/server';
import { getUserByEmailAsync, createUserAsync } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const { name, email, password, plan, charityId, charityPercent } = await req.json();

    if (!name || !email || !password || !plan || !charityId) {
      return NextResponse.json({ success: false, error: 'All fields are required.' }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ success: false, error: 'Password must be at least 6 characters.' }, { status: 400 });
    }

    const existing = await getUserByEmailAsync(email);
    if (existing) {
      return NextResponse.json({ success: false, error: 'An account with this email already exists.' }, { status: 409 });
    }

    const dbUser = await createUserAsync({
      name: name.trim(), email: email.trim().toLowerCase(),
      password, plan, charityId, charityPercent: Number(charityPercent) || 10,
    });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...user } = dbUser;
    return NextResponse.json({ success: true, user }, { status: 201 });
  } catch (err) {
    console.error('[signup]', err);
    return NextResponse.json({ success: false, error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
