// =============================================================================
// Digital Heroes - Core Type Definitions
// =============================================================================

// --- User & Auth ---
export type UserRole = 'visitor' | 'subscriber' | 'admin';
export type SubscriptionPlan = 'monthly' | 'yearly';
export type SubscriptionStatus = 'active' | 'cancelled' | 'lapsed' | 'none';

export interface Subscription {
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  renewalDate: string; // ISO date string
  price: number; // Monthly effective price
  startDate: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  subscription: Subscription | null;
  charityId: string | null;
  charityPercent: number; // Minimum 10, user can increase
  totalWon: number;
  joinedAt: string;
  avatarInitials: string;
}

// --- Golf Scores ---
export interface GolfScore {
  id: string;
  userId: string;
  score: number; // 1-45 Stableford
  date: string; // ISO date string YYYY-MM-DD
  createdAt: string;
}

// --- Charity ---
export type CharityCategory = 'health' | 'education' | 'environment' | 'community' | 'sport' | 'animal';

export interface CharityEvent {
  id: string;
  title: string;
  date: string;
  location: string;
  description: string;
}

export interface Charity {
  id: string;
  name: string;
  slug: string;
  tagline: string;
  description: string;
  category: CharityCategory;
  logoUrl: string;
  coverUrl: string;
  goal: number;
  raisedTotal: number;
  subscriberCount: number; // How many subscribers chose this
  upcomingEvents: CharityEvent[];
  featured: boolean;
  website?: string;
}

// --- Draw System ---
export type DrawStatus = 'upcoming' | 'simulated' | 'published';
export type DrawLogicType = 'random' | 'algorithmic';

export interface DrawTierResult {
  tier: '5-match' | '4-match' | '3-match';
  poolShare: number; // Percentage
  winnerCount: number;
  totalPrize: number;
  prizePerWinner: number;
  isRollover: boolean;
}

export interface Draw {
  id: string;
  drawDate: string; // ISO date YYYY-MM-DD
  month: string; // e.g. "September 2026"
  cadence: 'monthly';
  status: DrawStatus;
  logicType: DrawLogicType;
  winningNumbers: number[]; // 5 numbers 1-45
  jackpotRolloverIn: number; // Jackpot carried into this draw from previous
  jackpotRolloverOut: number; // Jackpot carried to next (if 5-match unclaimed)
  prizePoolTotal: number; // Total pool before distribution
  activeSubscribers: number;
  tierResults: DrawTierResult[];
  publishedAt?: string;
}

export interface DrawEntry {
  id: string;
  drawId: string;
  userId: string;
  userName: string;
  numbersEntered: number[]; // User's 5 scores at draw time
  matchCount: number; // 0, 3, 4, or 5
  matchedNumbers: number[];
  tierWon: '5-match' | '4-match' | '3-match' | null;
  prizeAmount: number;
}

// --- Winner Verification ---
export type VerificationStatus = 'pending' | 'approved' | 'rejected';
export type PayoutStatus = 'pending' | 'paid';

export interface WinnerVerification {
  id: string;
  drawId: string;
  drawMonth: string;
  userId: string;
  userName: string;
  userEmail: string;
  prizeAmount: number;
  matchTier: '5-match' | '4-match' | '3-match';
  proofImageUrl: string | null;
  status: VerificationStatus;
  payoutStatus: PayoutStatus;
  adminNotes: string;
  submittedAt: string | null;
  reviewedAt: string | null;
}

// --- Analytics ---
export interface PlatformAnalytics {
  totalUsers: number;
  activeSubscribers: number;
  monthlyRevenue: number;
  yearlyRevenue: number;
  totalPrizePool: number;
  rolloverJackpot: number;
  totalCharityRaised: number;
  drawParticipationRate: number; // percentage
  averageScoresPerUser: number;
}
