// =============================================================================
// Digital Heroes - Draw Engine
// Handles draw logic: random, algorithmic, simulation, prize calculation
// =============================================================================

import { DrawEntry, DrawTierResult, GolfScore, User } from './types';

/**
 * Calculate the prize pool for a given draw
 * A fixed portion of each subscription contributes to the prize pool
 * Using £3 per active subscriber as the prize pool contribution rate
 */
export function calculatePrizePool(activeSubscribers: number, rolloverIn: number = 0): number {
  const poolContributionPerSubscriber = 3.00; // £3 per subscriber per month
  return Math.round((activeSubscribers * poolContributionPerSubscriber + rolloverIn) * 100) / 100;
}

/**
 * Generate winning numbers using Random mode (standard lottery-style)
 * Picks 5 distinct numbers between 1 and 45
 */
export function generateRandomNumbers(): number[] {
  const numbers = new Set<number>();
  while (numbers.size < 5) {
    numbers.add(Math.floor(Math.random() * 45) + 1);
  }
  return Array.from(numbers).sort((a, b) => a - b);
}

/**
 * Generate winning numbers using Algorithmic mode (weighted by score frequency)
 * Numbers that appear more frequently as scores among participants have higher probability
 */
export function generateAlgorithmicNumbers(participantUserIds: string[], allScores: GolfScore[]): number[] {
  // Build frequency map of scores among all participants
  const frequencyMap: Record<number, number> = {};

  for (const userId of participantUserIds) {
    const userScores = allScores
      .filter(s => s.userId === userId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);

    for (const scoreEntry of userScores) {
      frequencyMap[scoreEntry.score] = (frequencyMap[scoreEntry.score] ?? 0) + 1;
    }
  }

  // Build weighted pool
  const weightedPool: number[] = [];
  for (let num = 1; num <= 45; num++) {
    const freq = frequencyMap[num] ?? 0;
    const weight = Math.max(1, freq * 3); // Min weight 1, score frequency triples probability
    for (let w = 0; w < weight; w++) {
      weightedPool.push(num);
    }
  }

  // Pick 5 unique numbers from the weighted pool
  const selected = new Set<number>();
  const shuffled = [...weightedPool].sort(() => Math.random() - 0.5);
  for (const num of shuffled) {
    if (selected.size >= 5) break;
    selected.add(num);
  }

  // Fallback if somehow we don't have 5
  while (selected.size < 5) {
    selected.add(Math.floor(Math.random() * 45) + 1);
  }

  return Array.from(selected).sort((a, b) => a - b);
}

/**
 * Match a user's numbers against the winning numbers
 * Returns the count of matching numbers
 */
export function matchNumbers(userNumbers: number[], winningNumbers: number[]): { count: number; matched: number[] } {
  const matched = userNumbers.filter(n => winningNumbers.includes(n));
  return { count: matched.length, matched };
}

/**
 * Get tier name based on match count
 */
export function getTier(matchCount: number): '5-match' | '4-match' | '3-match' | null {
  if (matchCount >= 5) return '5-match';
  if (matchCount === 4) return '4-match';
  if (matchCount === 3) return '3-match';
  return null;
}

/**
 * Run a full draw simulation
 * Returns all draw entries with match data and prize distributions
 */
export function simulateDraw(
  drawId: string,
  winningNumbers: number[],
  prizePoolTotal: number,
  jackpotRolloverIn: number,
  activeUsers: User[],
  allScores: GolfScore[]
): {
  entries: DrawEntry[];
  tierResults: DrawTierResult[];
  jackpotRolloverOut: number;
} {
  // Build draw entries
  const entries: DrawEntry[] = activeUsers.map((user, idx) => {
    const userScores = allScores
      .filter(s => s.userId === user.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5)
      .map(s => s.score);

    const { count, matched } = matchNumbers(userScores, winningNumbers);
    const tier = getTier(count);

    return {
      id: `de-sim-${drawId}-${idx}`,
      drawId,
      userId: user.id,
      userName: user.name,
      numbersEntered: userScores,
      matchCount: count,
      matchedNumbers: matched,
      tierWon: tier,
      prizeAmount: 0, // Will be set below
    };
  });

  // Calculate prize tiers
  const fiveMatchWinners = entries.filter(e => e.tierWon === '5-match');
  const fourMatchWinners = entries.filter(e => e.tierWon === '4-match');
  const threeMatchWinners = entries.filter(e => e.tierWon === '3-match');

  // Prize pool with jackpot rollover included in 5-match
  const fiveMatchPool = Math.round((prizePoolTotal * 0.40 + jackpotRolloverIn) * 100) / 100;
  const fourMatchPool = Math.round(prizePoolTotal * 0.35 * 100) / 100;
  const threeMatchPool = Math.round(prizePoolTotal * 0.25 * 100) / 100;

  let jackpotRolloverOut = 0;

  // Assign prizes
  if (fiveMatchWinners.length > 0) {
    const perWinner = Math.round((fiveMatchPool / fiveMatchWinners.length) * 100) / 100;
    fiveMatchWinners.forEach(e => { e.prizeAmount = perWinner; });
  } else {
    // No 5-match winner — jackpot rolls over
    jackpotRolloverOut = fiveMatchPool;
  }

  if (fourMatchWinners.length > 0) {
    const perWinner = Math.round((fourMatchPool / fourMatchWinners.length) * 100) / 100;
    fourMatchWinners.forEach(e => { e.prizeAmount = perWinner; });
  }

  if (threeMatchWinners.length > 0) {
    const perWinner = Math.round((threeMatchPool / threeMatchWinners.length) * 100) / 100;
    threeMatchWinners.forEach(e => { e.prizeAmount = perWinner; });
  }

  const tierResults: DrawTierResult[] = [
    {
      tier: '5-match',
      poolShare: 40,
      winnerCount: fiveMatchWinners.length,
      totalPrize: fiveMatchWinners.length > 0 ? fiveMatchPool : 0,
      prizePerWinner: fiveMatchWinners.length > 0
        ? Math.round((fiveMatchPool / fiveMatchWinners.length) * 100) / 100
        : 0,
      isRollover: fiveMatchWinners.length === 0,
    },
    {
      tier: '4-match',
      poolShare: 35,
      winnerCount: fourMatchWinners.length,
      totalPrize: fourMatchWinners.length > 0 ? fourMatchPool : 0,
      prizePerWinner: fourMatchWinners.length > 0
        ? Math.round((fourMatchPool / fourMatchWinners.length) * 100) / 100
        : 0,
      isRollover: false,
    },
    {
      tier: '3-match',
      poolShare: 25,
      winnerCount: threeMatchWinners.length,
      totalPrize: threeMatchWinners.length > 0 ? threeMatchPool : 0,
      prizePerWinner: threeMatchWinners.length > 0
        ? Math.round((threeMatchPool / threeMatchWinners.length) * 100) / 100
        : 0,
      isRollover: false,
    },
  ];

  return { entries, tierResults, jackpotRolloverOut };
}

/**
 * Format currency in GBP
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(amount);
}

/**
 * Calculate days until a draw date
 */
export function daysUntilDraw(drawDate: string): number {
  const now = new Date();
  const draw = new Date(drawDate);
  const diff = draw.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}
