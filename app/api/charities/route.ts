import { NextRequest, NextResponse } from 'next/server';
import { CHARITIES, getCharityById } from '@/lib/store';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  const category = searchParams.get('category');
  const search = searchParams.get('search');
  const featured = searchParams.get('featured');

  if (id) {
    const charity = getCharityById(id);
    if (!charity) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ charity });
  }

  let charities = [...CHARITIES];
  if (category && category !== 'all') {
    charities = charities.filter(c => c.category === category);
  }
  if (search) {
    const s = search.toLowerCase();
    charities = charities.filter(c => c.name.toLowerCase().includes(s) || c.tagline.toLowerCase().includes(s));
  }
  if (featured === 'true') {
    charities = charities.filter(c => c.featured);
  }

  return NextResponse.json({ charities });
}
