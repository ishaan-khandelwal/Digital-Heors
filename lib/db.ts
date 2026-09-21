// =============================================================================
// Digital Heroes - Database Layer (Server Only)
// Dual-mode: uses Neon PostgreSQL in production (DATABASE_URL env var set),
// falls back to data/db.json on local development.
// =============================================================================

// This module uses Node.js APIs — server only.
import 'server-only';

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { User, GolfScore, DrawEntry, WinnerVerification, UserRole } from './types';

// ---------------------------------------------------------------------------
// DB Shape (used for both file-based and SQL modes)
// ---------------------------------------------------------------------------
interface DBShape {
  users: DBUser[];
  scores: GolfScore[];
  drawEntries: DrawEntry[];
  winnerVerifications: WinnerVerification[];
}

export interface DBUser extends User {
  passwordHash: string;
}

// ---------------------------------------------------------------------------
// Password Hashing (Node crypto — no extra packages)
// ---------------------------------------------------------------------------
export function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

export function verifyPassword(userId: string, plaintext: string, storedHash: string): boolean {
  const computed = hashPassword(plaintext);
  if (computed === storedHash) return true;
  if (storedHash.length !== 64) return false; // placeholder hash, never match
  return false;
}

// ---------------------------------------------------------------------------
// Mode detection
// ---------------------------------------------------------------------------
const USE_NEON = !!(process.env.DATABASE_URL);

// ---------------------------------------------------------------------------
// FILE-BASED MODE (local development)
// ---------------------------------------------------------------------------
const DB_PATH = path.join(process.cwd(), 'data', 'db.json');

export function readDB(): DBShape {
  if (USE_NEON) return { users: [], scores: [], drawEntries: [], winnerVerifications: [] };
  try {
    const raw = fs.readFileSync(DB_PATH, 'utf-8');
    return JSON.parse(raw) as DBShape;
  } catch {
    return { users: [], scores: [], drawEntries: [], winnerVerifications: [] };
  }
}

function writeDB(data: DBShape): void {
  if (USE_NEON) return; // no-op in production mode
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

// ---------------------------------------------------------------------------
// NEON SQL MODE (production)
// ---------------------------------------------------------------------------
// Lazy-load the Neon Pool for standard parameterized queries
async function sql<T = Record<string, unknown>>(query: string, params: unknown[] = []): Promise<T[]> {
  const { Pool, neonConfig } = await import('@neondatabase/serverless');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const ws = require('ws');
  neonConfig.webSocketConstructor = ws;
  const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await (pool.query as any)(query, params);
  await pool.end();
  return result.rows as T[];
}

// ---------------------------------------------------------------------------
// SCHEMA INIT — called by /api/db-init route on first deploy
// ---------------------------------------------------------------------------
export async function initSchema(): Promise<void> {
  if (!USE_NEON) return;
  await sql(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'subscriber',
      subscription JSONB,
      charity_id TEXT,
      charity_percent INT DEFAULT 10,
      total_won NUMERIC DEFAULT 0,
      joined_at TEXT,
      avatar_initials TEXT
    )
  `);
  await sql(`
    CREATE TABLE IF NOT EXISTS scores (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      score INT NOT NULL,
      date TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `);
  await sql(`
    CREATE TABLE IF NOT EXISTS draw_entries (
      id TEXT PRIMARY KEY,
      draw_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      user_name TEXT,
      numbers_entered JSONB,
      match_count INT DEFAULT 0,
      matched_numbers JSONB,
      tier_won TEXT,
      prize_amount NUMERIC DEFAULT 0
    )
  `);
  await sql(`
    CREATE TABLE IF NOT EXISTS winner_verifications (
      id TEXT PRIMARY KEY,
      draw_id TEXT,
      draw_month TEXT,
      user_id TEXT,
      user_name TEXT,
      user_email TEXT,
      prize_amount NUMERIC DEFAULT 0,
      match_tier TEXT,
      proof_image_url TEXT,
      status TEXT DEFAULT 'pending',
      payout_status TEXT DEFAULT 'pending',
      admin_notes TEXT DEFAULT '',
      submitted_at TEXT,
      reviewed_at TEXT
    )
  `);
}

// ---------------------------------------------------------------------------
// SEED — copies db.json data into Neon on first deploy
// ---------------------------------------------------------------------------
export async function seedFromFile(): Promise<{ seeded: number }> {
  if (!USE_NEON) return { seeded: 0 };
  let raw: DBShape;
  try {
    raw = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8')) as DBShape;
  } catch {
    return { seeded: 0 };
  }

  let count = 0;
  for (const u of raw.users) {
    await sql(
      `INSERT INTO users (id, email, name, password_hash, role, subscription, charity_id, charity_percent, total_won, joined_at, avatar_initials)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) ON CONFLICT (id) DO NOTHING`,
      [u.id, u.email, u.name, u.passwordHash, u.role, JSON.stringify(u.subscription), u.charityId, u.charityPercent, u.totalWon, u.joinedAt, u.avatarInitials]
    );
    count++;
  }
  for (const s of raw.scores) {
    await sql(
      `INSERT INTO scores (id, user_id, score, date, created_at) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (id) DO NOTHING`,
      [s.id, s.userId, s.score, s.date, s.createdAt]
    );
    count++;
  }
  for (const e of raw.drawEntries) {
    await sql(
      `INSERT INTO draw_entries (id, draw_id, user_id, user_name, numbers_entered, match_count, matched_numbers, tier_won, prize_amount)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (id) DO NOTHING`,
      [e.id, e.drawId, e.userId, e.userName, JSON.stringify(e.numbersEntered), e.matchCount, JSON.stringify(e.matchedNumbers), e.tierWon, e.prizeAmount]
    );
    count++;
  }
  for (const v of raw.winnerVerifications) {
    await sql(
      `INSERT INTO winner_verifications (id, draw_id, draw_month, user_id, user_name, user_email, prize_amount, match_tier, proof_image_url, status, payout_status, admin_notes, submitted_at, reviewed_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) ON CONFLICT (id) DO NOTHING`,
      [v.id, v.drawId, v.drawMonth, v.userId, v.userName, v.userEmail, v.prizeAmount, v.matchTier, v.proofImageUrl, v.status, v.payoutStatus, v.adminNotes, v.submittedAt, v.reviewedAt]
    );
    count++;
  }
  return { seeded: count };
}

// ---------------------------------------------------------------------------
// User helpers
// ---------------------------------------------------------------------------
export async function getAllUsersAsync(): Promise<DBUser[]> {
  if (!USE_NEON) return readDB().users;
  const rows = await sql<Record<string, unknown>>('SELECT * FROM users');
  return rows.map(mapUser);
}
export function getAllUsers(): DBUser[] {
  return readDB().users;
}

export async function getUserByEmailAsync(email: string): Promise<DBUser | undefined> {
  if (!USE_NEON) return readDB().users.find(u => u.email.toLowerCase() === email.toLowerCase());
  const rows = await sql<Record<string, unknown>>('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [email]);
  return rows[0] ? mapUser(rows[0]) : undefined;
}
export function getUserByEmail(email: string): DBUser | undefined {
  return readDB().users.find(u => u.email.toLowerCase() === email.toLowerCase());
}

export async function getUserByIdAsync(id: string): Promise<DBUser | undefined> {
  if (!USE_NEON) return readDB().users.find(u => u.id === id);
  const rows = await sql<Record<string, unknown>>('SELECT * FROM users WHERE id = $1', [id]);
  return rows[0] ? mapUser(rows[0]) : undefined;
}

export async function createUserAsync(data: {
  name: string; email: string; password: string; role?: UserRole;
  plan: 'monthly' | 'yearly'; charityId: string; charityPercent: number;
}): Promise<DBUser> {
  const id = `usr-${Date.now()}`;
  const initials = data.name.split(' ').map(n => n[0]?.toUpperCase() ?? '').join('').slice(0, 2);
  const price = data.plan === 'monthly' ? 19.99 : 14.99;
  const today = new Date();
  const renewalDate = new Date(today);
  renewalDate.setMonth(renewalDate.getMonth() + (data.plan === 'monthly' ? 1 : 12));
  const subscription = {
    plan: data.plan, status: 'active' as import('./types').SubscriptionStatus,
    renewalDate: renewalDate.toISOString().split('T')[0],
    price, startDate: today.toISOString().split('T')[0],
  };

  if (!USE_NEON) {
    const db = readDB();
    const newUser: DBUser = {
      id, email: data.email, name: data.name,
      passwordHash: hashPassword(data.password),
      role: data.role ?? 'subscriber', subscription,
      charityId: data.charityId, charityPercent: data.charityPercent,
      totalWon: 0, joinedAt: today.toISOString().split('T')[0], avatarInitials: initials,
    };
    db.users.push(newUser);
    writeDB(db);
    return newUser;
  }

  await sql(
    `INSERT INTO users (id, email, name, password_hash, role, subscription, charity_id, charity_percent, total_won, joined_at, avatar_initials)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
    [id, data.email, data.name, hashPassword(data.password), data.role ?? 'subscriber',
     JSON.stringify(subscription), data.charityId, data.charityPercent, 0,
     today.toISOString().split('T')[0], initials]
  );
  return (await getUserByIdAsync(id))!;
}

// Keep sync versions for backward compat (used by non-async API routes)
export function createUser(data: {
  name: string; email: string; password: string; role?: UserRole;
  plan: 'monthly' | 'yearly'; charityId: string; charityPercent: number;
}): DBUser {
  const db = readDB();
  const id = `usr-${Date.now()}`;
  const initials = data.name.split(' ').map(n => n[0]?.toUpperCase() ?? '').join('').slice(0, 2);
  const price = data.plan === 'monthly' ? 19.99 : 14.99;
  const today = new Date();
  const renewalDate = new Date(today);
  renewalDate.setMonth(renewalDate.getMonth() + (data.plan === 'monthly' ? 1 : 12));
  const newUser: DBUser = {
    id, email: data.email, name: data.name,
    passwordHash: hashPassword(data.password),
    role: data.role ?? 'subscriber',
    subscription: { plan: data.plan, status: 'active', renewalDate: renewalDate.toISOString().split('T')[0], price, startDate: today.toISOString().split('T')[0] },
    charityId: data.charityId, charityPercent: data.charityPercent,
    totalWon: 0, joinedAt: today.toISOString().split('T')[0], avatarInitials: initials,
  };
  db.users.push(newUser);
  writeDB(db);
  return newUser;
}

export async function updateUserAsync(userId: string, updates: Partial<User>): Promise<DBUser | null> {
  if (!USE_NEON) {
    const db = readDB();
    const idx = db.users.findIndex(u => u.id === userId);
    if (idx === -1) return null;
    db.users[idx] = { ...db.users[idx], ...updates };
    writeDB(db);
    return db.users[idx];
  }
  if (updates.subscription !== undefined) {
    await sql('UPDATE users SET subscription = $1 WHERE id = $2', [JSON.stringify(updates.subscription), userId]);
  }
  if (updates.charityId !== undefined) await sql('UPDATE users SET charity_id = $1 WHERE id = $2', [updates.charityId, userId]);
  if (updates.charityPercent !== undefined) await sql('UPDATE users SET charity_percent = $1 WHERE id = $2', [updates.charityPercent, userId]);
  if (updates.totalWon !== undefined) await sql('UPDATE users SET total_won = $1 WHERE id = $2', [updates.totalWon, userId]);
  return getUserByIdAsync(userId) as Promise<DBUser>;
}

export function updateUser(userId: string, updates: Partial<User>): DBUser | null {
  const db = readDB();
  const idx = db.users.findIndex(u => u.id === userId);
  if (idx === -1) return null;
  db.users[idx] = { ...db.users[idx], ...updates };
  writeDB(db);
  return db.users[idx];
}

// ---------------------------------------------------------------------------
// Score helpers
// ---------------------------------------------------------------------------
export async function getScoresByUserIdAsync(userId: string): Promise<GolfScore[]> {
  if (!USE_NEON) return getScoresByUserId(userId);
  const rows = await sql<Record<string, unknown>>(
    'SELECT * FROM scores WHERE user_id = $1 ORDER BY date DESC LIMIT 5', [userId]
  );
  return rows.map(mapScore);
}
export function getScoresByUserId(userId: string): GolfScore[] {
  return readDB().scores
    .filter(s => s.userId === userId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);
}

export async function addScoreAsync(userId: string, score: number, date: string): Promise<{ success: boolean; error?: string }> {
  if (score < 1 || score > 45) return { success: false, error: 'Score must be between 1 and 45 (Stableford format).' };
  if (!USE_NEON) return addScore(userId, score, date);
  const existing = await sql('SELECT id FROM scores WHERE user_id = $1 AND date = $2', [userId, date]);
  if (existing.length > 0) return { success: false, error: 'A score for this date already exists.' };
  await sql('INSERT INTO scores (id, user_id, score, date, created_at) VALUES ($1,$2,$3,$4,$5)',
    [`sc-${Date.now()}`, userId, score, date, new Date().toISOString()]);
  // Enforce rolling 5
  await sql(`DELETE FROM scores WHERE user_id = $1 AND id NOT IN (SELECT id FROM scores WHERE user_id = $1 ORDER BY date DESC LIMIT 5)`, [userId]);
  return { success: true };
}
export function addScore(userId: string, score: number, date: string): { success: boolean; error?: string } {
  if (score < 1 || score > 45) return { success: false, error: 'Score must be between 1 and 45 (Stableford format).' };
  const db = readDB();
  if (db.scores.find(s => s.userId === userId && s.date === date)) return { success: false, error: 'A score for this date already exists.' };
  db.scores.push({ id: `sc-${Date.now()}`, userId, score, date, createdAt: new Date().toISOString() });
  const userScores = db.scores.filter(s => s.userId === userId).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  if (userScores.length > 5) {
    const toRemove = new Set(userScores.slice(5).map(s => s.id));
    db.scores = db.scores.filter(s => !toRemove.has(s.id));
  }
  writeDB(db);
  return { success: true };
}

export async function updateScoreAsync(scoreId: string, userId: string, score: number, date: string): Promise<{ success: boolean; error?: string }> {
  if (score < 1 || score > 45) return { success: false, error: 'Score must be between 1 and 45 (Stableford format).' };
  if (!USE_NEON) return updateScore(scoreId, userId, score, date);
  const conflict = await sql('SELECT id FROM scores WHERE user_id = $1 AND date = $2 AND id != $3', [userId, date, scoreId]);
  if (conflict.length > 0) return { success: false, error: 'A score for this date already exists.' };
  await sql('UPDATE scores SET score = $1, date = $2 WHERE id = $3 AND user_id = $4', [score, date, scoreId, userId]);
  return { success: true };
}
export function updateScore(scoreId: string, userId: string, score: number, date: string): { success: boolean; error?: string } {
  if (score < 1 || score > 45) return { success: false, error: 'Score must be between 1 and 45 (Stableford format).' };
  const db = readDB();
  const idx = db.scores.findIndex(s => s.id === scoreId && s.userId === userId);
  if (idx === -1) return { success: false, error: 'Score not found.' };
  if (db.scores.find(s => s.userId === userId && s.date === date && s.id !== scoreId)) return { success: false, error: 'A score for this date already exists.' };
  db.scores[idx] = { ...db.scores[idx], score, date };
  writeDB(db);
  return { success: true };
}

export async function deleteScoreAsync(scoreId: string, userId: string): Promise<{ success: boolean }> {
  if (!USE_NEON) return deleteScore(scoreId, userId);
  await sql('DELETE FROM scores WHERE id = $1 AND user_id = $2', [scoreId, userId]);
  return { success: true };
}
export function deleteScore(scoreId: string, userId: string): { success: boolean } {
  const db = readDB();
  db.scores = db.scores.filter(s => !(s.id === scoreId && s.userId === userId));
  writeDB(db);
  return { success: true };
}

// ---------------------------------------------------------------------------
// Draw Entry helpers
// ---------------------------------------------------------------------------
export async function getDrawEntriesForUserAsync(userId: string): Promise<DrawEntry[]> {
  if (!USE_NEON) return getDrawEntriesForUser(userId);
  const rows = await sql<Record<string, unknown>>('SELECT * FROM draw_entries WHERE user_id = $1', [userId]);
  return rows.map(mapDrawEntry);
}
export function getDrawEntriesForUser(userId: string): DrawEntry[] {
  return readDB().drawEntries.filter(e => e.userId === userId);
}

export async function getDrawEntriesAsync(drawId: string): Promise<DrawEntry[]> {
  if (!USE_NEON) return getDrawEntries(drawId);
  const rows = await sql<Record<string, unknown>>('SELECT * FROM draw_entries WHERE draw_id = $1', [drawId]);
  return rows.map(mapDrawEntry);
}
export function getDrawEntries(drawId: string): DrawEntry[] {
  return readDB().drawEntries.filter(e => e.drawId === drawId);
}

export async function upsertDrawEntriesAsync(entries: DrawEntry[]): Promise<void> {
  if (!USE_NEON) { upsertDrawEntries(entries); return; }
  if (entries.length === 0) return;
  const drawId = entries[0].drawId;
  await sql('DELETE FROM draw_entries WHERE draw_id = $1', [drawId]);
  for (const e of entries) {
    await sql(
      `INSERT INTO draw_entries (id, draw_id, user_id, user_name, numbers_entered, match_count, matched_numbers, tier_won, prize_amount)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [e.id, e.drawId, e.userId, e.userName, JSON.stringify(e.numbersEntered), e.matchCount, JSON.stringify(e.matchedNumbers), e.tierWon, e.prizeAmount]
    );
  }
}
export function upsertDrawEntries(entries: DrawEntry[]): void {
  if (entries.length === 0) return;
  const db = readDB();
  const drawId = entries[0].drawId;
  db.drawEntries = db.drawEntries.filter(e => e.drawId !== drawId);
  db.drawEntries.push(...entries);
  writeDB(db);
}

// ---------------------------------------------------------------------------
// Winner Verification helpers
// ---------------------------------------------------------------------------
export async function getAllVerificationsAsync(): Promise<WinnerVerification[]> {
  if (!USE_NEON) return getAllVerifications();
  const rows = await sql<Record<string, unknown>>('SELECT * FROM winner_verifications');
  return rows.map(mapVerification);
}
export function getAllVerifications(): WinnerVerification[] {
  return readDB().winnerVerifications;
}

export async function getVerificationsForUserAsync(userId: string): Promise<WinnerVerification[]> {
  if (!USE_NEON) return getVerificationsForUser(userId);
  const rows = await sql<Record<string, unknown>>('SELECT * FROM winner_verifications WHERE user_id = $1', [userId]);
  return rows.map(mapVerification);
}
export function getVerificationsForUser(userId: string): WinnerVerification[] {
  return readDB().winnerVerifications.filter(v => v.userId === userId);
}

export async function updateVerificationAsync(id: string, updates: Partial<WinnerVerification>): Promise<WinnerVerification | null> {
  if (!USE_NEON) return updateVerification(id, updates);
  const fields: string[] = [];
  const values: unknown[] = [];
  let i = 1;
  if (updates.status !== undefined) { fields.push(`status = $${i++}`); values.push(updates.status); }
  if (updates.payoutStatus !== undefined) { fields.push(`payout_status = $${i++}`); values.push(updates.payoutStatus); }
  if (updates.adminNotes !== undefined) { fields.push(`admin_notes = $${i++}`); values.push(updates.adminNotes); }
  if (updates.reviewedAt !== undefined) { fields.push(`reviewed_at = $${i++}`); values.push(updates.reviewedAt); }
  if (fields.length > 0) {
    values.push(id);
    await sql(`UPDATE winner_verifications SET ${fields.join(', ')} WHERE id = $${i}`, values);
  }
  const rows = await sql<Record<string, unknown>>('SELECT * FROM winner_verifications WHERE id = $1', [id]);
  return rows[0] ? mapVerification(rows[0]) : null;
}
export function updateVerification(id: string, updates: Partial<WinnerVerification>): WinnerVerification | null {
  const db = readDB();
  const idx = db.winnerVerifications.findIndex(v => v.id === id);
  if (idx === -1) return null;
  db.winnerVerifications[idx] = { ...db.winnerVerifications[idx], ...updates };
  writeDB(db);
  return db.winnerVerifications[idx];
}

export async function addWinnerVerificationAsync(v: WinnerVerification): Promise<void> {
  if (!USE_NEON) { addWinnerVerification(v); return; }
  await sql(
    `INSERT INTO winner_verifications (id, draw_id, draw_month, user_id, user_name, user_email, prize_amount, match_tier, proof_image_url, status, payout_status, admin_notes, submitted_at, reviewed_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) ON CONFLICT (id) DO NOTHING`,
    [v.id, v.drawId, v.drawMonth, v.userId, v.userName, v.userEmail, v.prizeAmount, v.matchTier,
     v.proofImageUrl, v.status, v.payoutStatus, v.adminNotes, v.submittedAt, v.reviewedAt]
  );
}
export function addWinnerVerification(v: WinnerVerification): void {
  const db = readDB();
  db.winnerVerifications.push(v);
  writeDB(db);
}

// ---------------------------------------------------------------------------
// Analytics
// ---------------------------------------------------------------------------
export async function getPlatformAnalyticsAsync(
  charityRaisedTotal: number, upcomingDrawPrizePool: number,
  upcomingDrawId: string, totalDrawEntries: number
) {
  if (!USE_NEON) return getPlatformAnalytics(charityRaisedTotal, upcomingDrawPrizePool, upcomingDrawId, totalDrawEntries);

  const [userRows, scoreCountRows, entryCountRows] = await Promise.all([
    sql<Record<string, unknown>>('SELECT role, subscription FROM users'),
    sql<{ count: string }>('SELECT COUNT(*) as count FROM scores'),
    sql<{ count: string }>('SELECT COUNT(*) as count FROM draw_entries WHERE draw_id = $1', [upcomingDrawId]),
  ]);

  const subscribers = userRows.filter(u => u.role === 'subscriber');
  const activeSubscribers = subscribers.filter(u => {
    const sub = u.subscription as { status: string } | null;
    return sub?.status === 'active';
  }).length;
  const totalUsers = subscribers.length;
  const monthlyRevenue = subscribers.filter(u => {
    const sub = u.subscription as { status: string; plan: string; price: number } | null;
    return sub?.status === 'active' && sub?.plan === 'monthly';
  }).reduce((acc, u) => {
    const sub = u.subscription as { price: number };
    return acc + (sub?.price ?? 0);
  }, 0);

  return {
    totalUsers, activeSubscribers, monthlyRevenue, yearlyRevenue: 0,
    totalPrizePool: upcomingDrawPrizePool,
    rolloverJackpot: 0, totalCharityRaised: charityRaisedTotal,
    drawParticipationRate: activeSubscribers > 0 ? Math.round((Number(entryCountRows[0]?.count ?? 0) / activeSubscribers) * 100) : 0,
    averageScoresPerUser: totalUsers > 0 ? Math.round((Number(scoreCountRows[0]?.count ?? 0) / totalUsers) * 10) / 10 : 0,
  };
}

export function getPlatformAnalytics(
  charityRaisedTotal: number, upcomingDrawPrizePool: number,
  upcomingDrawId: string, _totalDrawEntries: number
) {
  const db = readDB();
  const activeSubscribers = db.users.filter(u => u.subscription?.status === 'active').length;
  const totalUsers = db.users.filter(u => u.role === 'subscriber').length;
  const monthlyRevenue = db.users.filter(u => u.subscription?.status === 'active' && u.subscription.plan === 'monthly').reduce((acc, u) => acc + (u.subscription?.price ?? 0), 0);
  const yearlyRevenue = db.users.filter(u => u.subscription?.status === 'active' && u.subscription.plan === 'yearly').reduce((acc, u) => acc + (u.subscription?.price ?? 0) * 12, 0);
  const userEntryCount = db.drawEntries.filter(e => e.drawId === upcomingDrawId).length;
  return {
    totalUsers, activeSubscribers, monthlyRevenue, yearlyRevenue,
    totalPrizePool: upcomingDrawPrizePool, rolloverJackpot: 0,
    totalCharityRaised: charityRaisedTotal,
    drawParticipationRate: activeSubscribers > 0 ? Math.round((userEntryCount / activeSubscribers) * 100) : 0,
    averageScoresPerUser: totalUsers > 0 ? Math.round((db.scores.length / totalUsers) * 10) / 10 : 0,
  };
}

// ---------------------------------------------------------------------------
// Row mappers (Neon SQL rows → TypeScript types)
// ---------------------------------------------------------------------------
function mapUser(row: Record<string, unknown>): DBUser {
  return {
    id: row.id as string,
    email: row.email as string,
    name: row.name as string,
    passwordHash: row.password_hash as string,
    role: row.role as UserRole,
    subscription: row.subscription as User['subscription'],
    charityId: row.charity_id as string,
    charityPercent: Number(row.charity_percent),
    totalWon: Number(row.total_won),
    joinedAt: row.joined_at as string,
    avatarInitials: row.avatar_initials as string,
  };
}
function mapScore(row: Record<string, unknown>): GolfScore {
  return { id: row.id as string, userId: row.user_id as string, score: Number(row.score), date: row.date as string, createdAt: row.created_at as string };
}
function mapDrawEntry(row: Record<string, unknown>): DrawEntry {
  return {
    id: row.id as string, drawId: row.draw_id as string, userId: row.user_id as string,
    userName: row.user_name as string,
    numbersEntered: (row.numbers_entered as number[]) ?? [],
    matchCount: Number(row.match_count),
    matchedNumbers: (row.matched_numbers as number[]) ?? [],
    tierWon: row.tier_won as DrawEntry['tierWon'],
    prizeAmount: Number(row.prize_amount),
  };
}
function mapVerification(row: Record<string, unknown>): WinnerVerification {
  return {
    id: row.id as string, drawId: row.draw_id as string, drawMonth: row.draw_month as string,
    userId: row.user_id as string, userName: row.user_name as string, userEmail: row.user_email as string,
    prizeAmount: Number(row.prize_amount), matchTier: row.match_tier as WinnerVerification['matchTier'],
    proofImageUrl: row.proof_image_url as string | null,
    status: row.status as WinnerVerification['status'],
    payoutStatus: row.payout_status as WinnerVerification['payoutStatus'],
    adminNotes: row.admin_notes as string,
    submittedAt: row.submitted_at as string | null,
    reviewedAt: row.reviewed_at as string | null,
  };
}
