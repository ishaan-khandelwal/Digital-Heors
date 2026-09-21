import { NextRequest, NextResponse } from 'next/server';
import {
  getScoresByUserIdAsync,
  addScoreAsync,
  updateScoreAsync,
  deleteScoreAsync
} from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });
  const scores = await getScoresByUserIdAsync(userId);
  return NextResponse.json({ scores });
}

export async function POST(req: NextRequest) {
  const { userId, score, date } = await req.json();
  const result = await addScoreAsync(userId, Number(score), date);
  if (!result.success) return NextResponse.json(result, { status: 400 });
  return NextResponse.json({ success: true, scores: await getScoresByUserIdAsync(userId) });
}

export async function PUT(req: NextRequest) {
  const { scoreId, userId, score, date } = await req.json();
  const result = await updateScoreAsync(scoreId, userId, Number(score), date);
  if (!result.success) return NextResponse.json(result, { status: 400 });
  return NextResponse.json({ success: true, scores: await getScoresByUserIdAsync(userId) });
}

export async function DELETE(req: NextRequest) {
  const { scoreId, userId } = await req.json();
  await deleteScoreAsync(scoreId, userId);
  return NextResponse.json({ success: true, scores: await getScoresByUserIdAsync(userId) });
}
