import { NextRequest, NextResponse } from 'next/server';
import {
  updateUserAsync,
  getDrawEntriesForUserAsync,
  getVerificationsForUserAsync,
  getScoresByUserIdAsync
} from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

  const [scores, drawEntries, verifications] = await Promise.all([
    getScoresByUserIdAsync(userId),
    getDrawEntriesForUserAsync(userId),
    getVerificationsForUserAsync(userId),
  ]);

  return NextResponse.json({ scores, drawEntries, verifications });
}

export async function PUT(req: NextRequest) {
  const { userId, updates } = await req.json();
  const updated = await updateUserAsync(userId, updates);
  if (!updated) return NextResponse.json({ error: 'User not found' }, { status: 404 });
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash, ...user } = updated;
  return NextResponse.json({ success: true, user });
}
