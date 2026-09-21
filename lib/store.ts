// =============================================================================
// Digital Heroes - Static Platform Data (Seed Content)
// Contains only CHARITIES and DRAWS — platform content that is seeded and
// managed by admins. User data (users, scores, entries, verifications) has
// been moved to lib/db.ts which persists to data/db.json.
// =============================================================================

import {
  Charity,
  Draw,
} from './types';

// --- SEED: Charities ---
export const CHARITIES: Charity[] = [
  {
    id: 'ch-001',
    name: 'Golf 4 Good Foundation',
    slug: 'golf-4-good',
    tagline: 'Uniting communities through sport',
    description: 'Golf 4 Good Foundation uses the sport of golf to bring communities together, funding mental health programs, youth development initiatives, and inclusive sports access for underrepresented groups across the UK and Ireland.',
    category: 'community',
    logoUrl: 'https://picsum.photos/seed/g4g/80/80',
    coverUrl: 'https://picsum.photos/seed/g4gcover/800/400',
    goal: 50000,
    raisedTotal: 28450,
    subscriberCount: 142,
    featured: true,
    website: 'https://example.com',
    upcomingEvents: [
      {
        id: 'ev-001',
        title: 'Charity Golf Day — Wentworth',
        date: '2026-10-18',
        location: 'Wentworth Club, Surrey',
        description: 'Annual charity scramble with auction. All proceeds to youth mental health programs.',
      },
      {
        id: 'ev-002',
        title: 'Winter Golf Classic',
        date: '2026-12-05',
        location: 'Gleneagles, Scotland',
        description: 'Corporate golf day supporting community initiatives.',
      },
    ],
  },
  {
    id: 'ch-002',
    name: 'Hearts & Holes',
    slug: 'hearts-and-holes',
    tagline: 'Every swing funds a heart',
    description: 'Hearts & Holes is a charity dedicated to funding life-saving cardiac research and providing defibrillators at golf courses and community sports centres nationwide. Their "Golf for Hearts" campaign has already saved dozens of lives.',
    category: 'health',
    logoUrl: 'https://picsum.photos/seed/hah/80/80',
    coverUrl: 'https://picsum.photos/seed/hahcover/800/400',
    goal: 75000,
    raisedTotal: 41200,
    subscriberCount: 98,
    featured: true,
    website: 'https://example.com',
    upcomingEvents: [
      {
        id: 'ev-003',
        title: 'Heartbeat Open',
        date: '2026-11-02',
        location: 'Royal Birkdale, Southport',
        description: 'A 36-hole charity tournament raising funds for AED installations nationwide.',
      },
    ],
  },
  {
    id: 'ch-003',
    name: 'Green Earth Golf',
    slug: 'green-earth-golf',
    tagline: 'Sustainable fairways for future generations',
    description: 'Green Earth Golf champions environmental sustainability in golf, funding rewilding projects on former golf courses, promoting chemical-free course management, and educating the next generation of environmentally-conscious golfers.',
    category: 'environment',
    logoUrl: 'https://picsum.photos/seed/geg/80/80',
    coverUrl: 'https://picsum.photos/seed/gegcover/800/400',
    goal: 30000,
    raisedTotal: 12800,
    subscriberCount: 65,
    featured: false,
    website: 'https://example.com',
    upcomingEvents: [
      {
        id: 'ev-004',
        title: 'Eco-Golf Awareness Day',
        date: '2026-10-28',
        location: 'Sunningdale, Berkshire',
        description: 'Rewilding workshop and nine-hole charity round.',
      },
    ],
  },
  {
    id: 'ch-004',
    name: 'Fore! Young Players',
    slug: 'fore-young-players',
    tagline: 'Growing the next generation of champions',
    description: 'Fore! Young Players provides free and subsidised golf coaching to children aged 6-16 from low-income households, ensuring the sport is not a privilege. They operate junior academies at 24 clubs across England.',
    category: 'education',
    logoUrl: 'https://picsum.photos/seed/fyp/80/80',
    coverUrl: 'https://picsum.photos/seed/fypcover/800/400',
    goal: 40000,
    raisedTotal: 22100,
    subscriberCount: 87,
    featured: true,
    website: 'https://example.com',
    upcomingEvents: [
      {
        id: 'ev-005',
        title: 'Junior Champion Open',
        date: '2026-10-10',
        location: 'Loch Lomond, Scotland',
        description: 'A fundraiser championship for junior golf academies.',
      },
    ],
  },
  {
    id: 'ch-005',
    name: 'Paws on the Fairway',
    slug: 'paws-on-fairway',
    tagline: 'Rescue, rehabilitate, rehome',
    description: "Paws on the Fairway is the UK's only animal rescue charity with direct ties to the golf community. They fund rescue centres for dogs and horses that previously worked at golf resorts, ensuring they receive the best care in retirement.",
    category: 'animal',
    logoUrl: 'https://picsum.photos/seed/pof/80/80',
    coverUrl: 'https://picsum.photos/seed/pofcover/800/400',
    goal: 20000,
    raisedTotal: 9650,
    subscriberCount: 43,
    featured: false,
    website: 'https://example.com',
    upcomingEvents: [],
  },
  {
    id: 'ch-006',
    name: 'Stroke of Luck',
    slug: 'stroke-of-luck',
    tagline: 'Supporting stroke survivors back to sport',
    description: 'Stroke of Luck provides rehabilitation programmes for stroke survivors who wish to return to golf and other sports, demonstrating that recovery is possible. Their adaptive golf programme is pioneering in the UK.',
    category: 'health',
    logoUrl: 'https://picsum.photos/seed/sol/80/80',
    coverUrl: 'https://picsum.photos/seed/solcover/800/400',
    goal: 35000,
    raisedTotal: 18900,
    subscriberCount: 56,
    featured: false,
    website: 'https://example.com',
    upcomingEvents: [
      {
        id: 'ev-006',
        title: 'Adaptive Golf Day',
        date: '2026-11-20',
        location: 'Celtic Manor, Wales',
        description: 'Celebrating recovery through sport. Open to all abilities.',
      },
    ],
  },
];

// --- SEED: Draws ---
export let DRAWS: Draw[] = [
  {
    id: 'drw-001',
    drawDate: '2026-08-31',
    month: 'August 2026',
    cadence: 'monthly',
    status: 'published',
    logicType: 'random',
    winningNumbers: [28, 32, 35, 27, 30],
    jackpotRolloverIn: 0,
    jackpotRolloverOut: 0,
    prizePoolTotal: 1199.40,
    activeSubscribers: 60,
    tierResults: [
      { tier: '5-match', poolShare: 40, winnerCount: 1, totalPrize: 479.76, prizePerWinner: 479.76, isRollover: false },
      { tier: '4-match', poolShare: 35, winnerCount: 2, totalPrize: 419.79, prizePerWinner: 209.90, isRollover: false },
      { tier: '3-match', poolShare: 25, winnerCount: 3, totalPrize: 299.85, prizePerWinner: 99.95, isRollover: false },
    ],
    publishedAt: '2026-08-31T18:00:00Z',
  },
  {
    id: 'drw-002',
    drawDate: '2026-09-30',
    month: 'September 2026',
    cadence: 'monthly',
    status: 'upcoming',
    logicType: 'random',
    winningNumbers: [],
    jackpotRolloverIn: 0,
    jackpotRolloverOut: 0,
    prizePoolTotal: 1399.30,
    activeSubscribers: 70,
    tierResults: [],
    publishedAt: undefined,
  },
  {
    id: 'drw-003',
    drawDate: '2026-10-31',
    month: 'October 2026',
    cadence: 'monthly',
    status: 'upcoming',
    logicType: 'random',
    winningNumbers: [],
    jackpotRolloverIn: 0,
    jackpotRolloverOut: 0,
    prizePoolTotal: 0, // Will be calculated on simulate
    activeSubscribers: 0,
    tierResults: [],
    publishedAt: undefined,
  },
];

/**
 * Create the next month's draw after all existing draws have been published.
 * Called by the admin panel "Create Next Draw" button.
 */
export function createNextDraw(): Draw | null {
  // Find the latest draw by date
  const sorted = [...DRAWS].sort(
    (a, b) => new Date(b.drawDate).getTime() - new Date(a.drawDate).getTime()
  );
  const latest = sorted[0];
  if (!latest) return null;

  // Already have an upcoming draw
  if (DRAWS.some(d => d.status === 'upcoming')) return null;

  // Calculate next month
  const lastDate = new Date(latest.drawDate);
  const nextMonth = new Date(lastDate);
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  // Last day of next month
  const nextLastDay = new Date(nextMonth.getFullYear(), nextMonth.getMonth() + 1, 0);

  const monthLabel = nextLastDay.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  const dateStr = nextLastDay.toISOString().split('T')[0];

  const newDraw: Draw = {
    id: `drw-${Date.now()}`,
    drawDate: dateStr,
    month: monthLabel,
    cadence: 'monthly',
    status: 'upcoming',
    logicType: 'random',
    winningNumbers: [],
    jackpotRolloverIn: latest.jackpotRolloverOut ?? 0,
    jackpotRolloverOut: 0,
    prizePoolTotal: 0,
    activeSubscribers: 0,
    tierResults: [],
    publishedAt: undefined,
  };

  DRAWS.push(newDraw);
  return newDraw;
}

// =============================================================================
// Store Helpers (for static data only)
// =============================================================================

export function getCharityById(id: string): Charity | undefined {
  return CHARITIES.find(c => c.id === id);
}

export function getDrawById(id: string): Draw | undefined {
  return DRAWS.find(d => d.id === id);
}

export function getLatestDraw(): Draw | undefined {
  return [...DRAWS].sort((a, b) => new Date(b.drawDate).getTime() - new Date(a.drawDate).getTime())[0];
}

export function getUpcomingDraw(): Draw | undefined {
  return DRAWS.find(d => d.status === 'upcoming');
}

export function updateDraw(drawId: string, updates: Partial<Draw>): Draw | null {
  const idx = DRAWS.findIndex(d => d.id === drawId);
  if (idx === -1) return null;
  DRAWS[idx] = { ...DRAWS[idx], ...updates };
  return DRAWS[idx];
}
