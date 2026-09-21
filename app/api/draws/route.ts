import { NextRequest, NextResponse } from 'next/server';
import { DRAWS, updateDraw, createNextDraw } from '@/lib/store';
import {
  getAllUsersAsync, getAllVerificationsAsync, addWinnerVerificationAsync,
  upsertDrawEntriesAsync, getDrawEntriesAsync, readDB
} from '@/lib/db';
import { generateRandomNumbers, generateAlgorithmicNumbers, simulateDraw, calculatePrizePool } from '@/lib/drawEngine';
import { DrawLogicType } from '@/lib/types';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  const status = searchParams.get('status');

  if (id) {
    const draw = DRAWS.find(d => d.id === id);
    if (!draw) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const entries = await getDrawEntriesAsync(id);
    return NextResponse.json({ draw, entries });
  }

  let draws = [...DRAWS].sort((a, b) => new Date(b.drawDate).getTime() - new Date(a.drawDate).getTime());
  if (status) draws = draws.filter(d => d.status === status);

  return NextResponse.json({ draws });
}

export async function POST(req: NextRequest) {
  const body = await req.json() as {
    action: 'simulate' | 'publish' | 'create';
    drawId?: string;
    logicType?: DrawLogicType;
  };
  const { action, logicType } = body;
  const drawId = body.drawId ?? '';

  if (action === 'create') {
    const newDraw = createNextDraw();
    if (!newDraw) {
      return NextResponse.json(
        { success: false, error: 'An upcoming draw already exists or no draws found.' },
        { status: 400 }
      );
    }
    return NextResponse.json({ success: true, draw: newDraw });
  }

  const draw = DRAWS.find(d => d.id === drawId);
  if (!draw) return NextResponse.json({ error: 'Draw not found' }, { status: 404 });

  const allUsers = await getAllUsersAsync();
  const activeUsers = allUsers.filter(u => u.subscription?.status === 'active');
  const activeUserIds = activeUsers.map(u => u.id);
  const { scores: allScores } = readDB(); // file-based fallback; Neon mode fetches separately

  const winningNumbers = logicType === 'algorithmic'
    ? generateAlgorithmicNumbers(activeUserIds, allScores)
    : generateRandomNumbers();

  const prizePool = calculatePrizePool(activeUsers.length, draw.jackpotRolloverIn);

  const { entries, tierResults, jackpotRolloverOut } = simulateDraw(
    drawId, winningNumbers, prizePool, draw.jackpotRolloverIn, activeUsers, allScores
  );

  if (action === 'simulate') {
    updateDraw(drawId, {
      status: 'simulated', logicType: logicType ?? draw.logicType,
      winningNumbers, prizePoolTotal: prizePool, tierResults, jackpotRolloverOut,
    });
    await upsertDrawEntriesAsync(entries);
    return NextResponse.json({ success: true, draw: DRAWS.find(d => d.id === drawId), entries, tierResults, winningNumbers });
  }

  if (action === 'publish') {
    updateDraw(drawId, {
      status: 'published', logicType: logicType ?? draw.logicType,
      winningNumbers, prizePoolTotal: prizePool, tierResults, jackpotRolloverOut,
      publishedAt: new Date().toISOString(),
    });
    await upsertDrawEntriesAsync(entries);

    const winners = entries.filter(e => e.tierWon !== null);
    const existingVerifications = await getAllVerificationsAsync();
    for (const winner of winners) {
      const alreadyExists = existingVerifications.find(v => v.userId === winner.userId && v.drawId === drawId);
      if (!alreadyExists) {
        const user = allUsers.find(u => u.id === winner.userId);
        await addWinnerVerificationAsync({
          id: `wv-${Date.now()}-${winner.userId}`,
          drawId, drawMonth: draw.month,
          userId: winner.userId, userName: winner.userName,
          userEmail: user?.email ?? '',
          prizeAmount: winner.prizeAmount,
          matchTier: winner.tierWon!,
          proofImageUrl: null, status: 'pending', payoutStatus: 'pending',
          adminNotes: '', submittedAt: null, reviewedAt: null,
        });
      }
    }

    return NextResponse.json({ success: true, draw: DRAWS.find(d => d.id === drawId), entries, winners });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
