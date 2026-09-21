import { NextRequest, NextResponse } from 'next/server';
import {
  getAllUsersAsync, getAllVerificationsAsync, updateUserAsync,
  updateVerificationAsync, getPlatformAnalyticsAsync
} from '@/lib/db';
import { CHARITIES, DRAWS, getUpcomingDraw } from '@/lib/store';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const resource = searchParams.get('resource');

  const upcomingDraw = getUpcomingDraw();
  const charityRaisedTotal = CHARITIES.reduce((acc, c) => acc + c.raisedTotal, 0);
  const analytics = await getPlatformAnalyticsAsync(
    charityRaisedTotal,
    upcomingDraw?.prizePoolTotal ?? 0,
    upcomingDraw?.id ?? '',
    DRAWS.length
  );

  if (resource === 'users') {
    const users = (await getAllUsersAsync()).map(({ passwordHash: _ph, ...u }) => u);
    return NextResponse.json({ users });
  }
  if (resource === 'verifications') {
    return NextResponse.json({ verifications: await getAllVerificationsAsync() });
  }
  if (resource === 'analytics') {
    return NextResponse.json({ analytics });
  }

  const users = (await getAllUsersAsync()).map(({ passwordHash: _ph, ...u }) => u);
  return NextResponse.json({
    users,
    verifications: await getAllVerificationsAsync(),
    analytics,
  });
}

export async function PUT(req: NextRequest) {
  const { resource, id, updates } = await req.json();

  if (resource === 'user') {
    const updated = await updateUserAsync(id, updates);
    if (!updated) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash: _ph, ...user } = updated;
    return NextResponse.json({ success: true, user });
  }

  if (resource === 'verification') {
    const updated = await updateVerificationAsync(id, { ...updates, reviewedAt: new Date().toISOString() });
    if (!updated) return NextResponse.json({ error: 'Verification not found' }, { status: 404 });
    return NextResponse.json({ success: true, verification: updated });
  }

  return NextResponse.json({ error: 'Invalid resource' }, { status: 400 });
}
