import { NextResponse } from 'next/server';
import { initSchema, seedFromFile } from '@/lib/db';

// POST /api/db-init
// Call this ONCE after deploying to Vercel to create tables and seed data.
// Protect it with a secret header to prevent accidental public calls.
export async function POST(req: Request) {
  const secret = req.headers.get('x-init-secret');
  if (secret !== process.env.DB_INIT_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await initSchema();
    const result = await seedFromFile();
    return NextResponse.json({ success: true, message: 'Schema created and data seeded.', ...result });
  } catch (err) {
    console.error('[db-init]', err);
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
