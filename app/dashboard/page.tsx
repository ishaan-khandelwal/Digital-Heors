'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { GolfScore, DrawEntry, WinnerVerification, Charity } from '@/lib/types';
import { formatCurrency, daysUntilDraw } from '@/lib/drawEngine';
import styles from './dashboard.module.css';

// Score color helper
function getScoreColor(score: number): string {
  if (score >= 32) return 'score-badge-high';
  if (score >= 22) return 'score-badge-mid';
  return 'score-badge-low';
}

// Score entry/edit modal
function ScoreModal({
  initial,
  onSave,
  onClose,
}: {
  initial?: GolfScore;
  onSave: (score: number, date: string) => Promise<void>;
  onClose: () => void;
}) {
  const [score, setScore] = useState(initial?.score ?? 28);
  const [date, setDate] = useState(initial?.date ?? new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    setError('');
    setLoading(true);
    try {
      await onSave(score, date);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error saving score.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className={styles.modalHeader}>
          <h3>{initial ? 'Edit Score' : 'Add Score'}</h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>

        {error && <div className="alert alert-error mt-4">{error}</div>}

        <div className="form-group mt-6">
          <label className="form-label">Date Played</label>
          <input
            type="date"
            className="form-input"
            value={date}
            max={new Date().toISOString().split('T')[0]}
            onChange={e => setDate(e.target.value)}
            id="score-date-input"
          />
        </div>

        <div className="form-group mt-4">
          <label className="form-label">Stableford Score: <span style={{ color: 'var(--color-terracotta)', fontWeight: 700 }}>{score}</span></label>
          <input
            type="range"
            min={1}
            max={45}
            value={score}
            onChange={e => setScore(Number(e.target.value))}
            aria-label="Golf score"
            id="score-range-input"
          />
          <div className="flex justify-between text-xs text-muted mt-2">
            <span>1 (Min)</span>
            <span>22 (Par)</span>
            <span>45 (Max)</span>
          </div>
        </div>

        <div className={styles.scorePreview}>
          <div className={`score-badge ${getScoreColor(score)}`} style={{ width: 72, height: 72, fontSize: '1.75rem' }}>
            {score}
          </div>
          <div>
            <div className="font-semibold">{score >= 32 ? '🏆 Excellent' : score >= 22 ? '👍 Good' : '💪 Keep going'}</div>
            <div className="text-sm text-muted">Stableford Score</div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button className="btn btn-ghost flex-1" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-primary flex-1"
            onClick={handleSave}
            disabled={loading}
            id="save-score-btn"
          >
            {loading ? <><span className="spinner"></span> Saving…</> : `${initial ? 'Update' : 'Add'} Score`}
          </button>
        </div>
      </div>
    </div>
  );
}

// Proof upload modal
function ProofModal({
  verification,
  onSubmit,
  onClose,
}: {
  verification: WinnerVerification;
  onSubmit: (verificationId: string, proofUrl: string) => void;
  onClose: () => void;
}) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className={styles.modalHeader}>
          <h3>Upload Winner Proof</h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>

        <div className={styles.winnerInfo}>
          <div className={styles.winnerTier}>{verification.matchTier}</div>
          <div className={styles.winnerPrize}>{formatCurrency(verification.prizeAmount)}</div>
        </div>

        <p className="text-sm text-secondary mt-4">
          Please submit a screenshot from your golf platform (e.g. HandicapTracker, IG, etc.) showing your Stableford scores. Your proof will be reviewed within 48 hours.
        </p>

        <div className="form-group mt-6">
          <label className="form-label">Screenshot URL (demo)</label>
          <input
            id="proof-url-input"
            type="url"
            className="form-input"
            placeholder="https://example.com/screenshot.png"
            value={url}
            onChange={e => setUrl(e.target.value)}
          />
        </div>

        <div className="flex gap-3 mt-6">
          <button className="btn btn-ghost flex-1" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-primary flex-1"
            id="submit-proof-btn"
            onClick={() => {
              setLoading(true);
              onSubmit(verification.id, url || 'https://picsum.photos/seed/myproof/600/400');
            }}
            disabled={loading}
          >
            {loading ? <><span className="spinner"></span> Submitting…</> : 'Submit Proof'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user, isLoading: authLoading, logout, updateCurrentUser } = useAuth();
  const router = useRouter();

  const [scores, setScores] = useState<GolfScore[]>([]);
  const [drawEntries, setDrawEntries] = useState<DrawEntry[]>([]);
  const [verifications, setVerifications] = useState<WinnerVerification[]>([]);
  const [charity, setCharity] = useState<Charity | null>(null);
  const [allDraws, setAllDraws] = useState<{ id: string; month: string }[]>([]);
  const [upcomingDraw, setUpcomingDraw] = useState<{ drawDate: string; prizePoolTotal: number; month: string } | null>(null);
  const [showScoreModal, setShowScoreModal] = useState(false);
  const [editingScore, setEditingScore] = useState<GolfScore | undefined>(undefined);
  const [showProofModal, setShowProofModal] = useState<WinnerVerification | null>(null);
  const [charityPercent, setCharityPercent] = useState(user?.charityPercent ?? 15);
  const [charityUpdating, setCharityUpdating] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'scores' | 'draws' | 'winnings'>('overview');

  const fetchData = useCallback(async () => {
    if (!user) return;
    const [userRes, drawRes, allDrawsRes, charityRes] = await Promise.all([
      fetch(`/api/user?userId=${user.id}`),
      fetch('/api/draws?status=upcoming'),
      fetch('/api/draws'),
      user.charityId ? fetch(`/api/charities?id=${user.charityId}`) : Promise.resolve(null),
    ]);

    const userData = await userRes.json();
    setScores(userData.scores ?? []);
    setDrawEntries(userData.drawEntries ?? []);
    setVerifications(userData.verifications ?? []);

    const drawData = await drawRes.json();
    if (drawData.draws?.[0]) {
      setUpcomingDraw({
        drawDate: drawData.draws[0].drawDate,
        prizePoolTotal: drawData.draws[0].prizePoolTotal,
        month: drawData.draws[0].month,
      });
    }

    const allDrawsData = await allDrawsRes.json();
    setAllDraws((allDrawsData.draws ?? []).map((d: { id: string; month: string }) => ({ id: d.id, month: d.month })));

    if (charityRes) {
      const charityData = await charityRes.json();
      setCharity(charityData.charity ?? null);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    } else if (user) {
      setCharityPercent(user.charityPercent);
      fetchData();
    }
  }, [user, authLoading, router, fetchData]);

  if (authLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <span className="spinner" style={{ width: 40, height: 40 }}></span>
      </div>
    );
  }

  if (!user) return null;

  const handleAddScore = async (score: number, date: string) => {
    const res = await fetch('/api/scores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, score, date }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error ?? 'Failed to add score');
    setScores(data.scores);
    setShowScoreModal(false);
  };

  const handleEditScore = async (score: number, date: string) => {
    const res = await fetch('/api/scores', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scoreId: editingScore?.id, userId: user.id, score, date }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error ?? 'Failed to update score');
    setScores(data.scores);
    setEditingScore(undefined);
    setShowScoreModal(false);
  };

  const handleDeleteScore = async (scoreId: string) => {
    const res = await fetch('/api/scores', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scoreId, userId: user.id }),
    });
    const data = await res.json();
    setScores(data.scores);
  };

  const handleCharityUpdate = async () => {
    setCharityUpdating(true);
    await fetch('/api/user', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, updates: { charityPercent } }),
    });
    updateCurrentUser({ charityPercent });
    setCharityUpdating(false);
  };

  const handleProofSubmit = async (verificationId: string, proofUrl: string) => {
    // Update verification
    await fetch('/api/admin', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        resource: 'verification',
        id: verificationId,
        updates: { proofImageUrl: proofUrl, submittedAt: new Date().toISOString() },
      }),
    });
    await fetchData();
    setShowProofModal(null);
  };

  const sub = user.subscription;
  const monthlyContrib = sub ? ((sub.price * charityPercent) / 100).toFixed(2) : '0.00';
  const pendingWinnings = verifications.filter(v => v.payoutStatus === 'pending' && v.prizeAmount > 0);
  const daysLeft = upcomingDraw ? daysUntilDraw(upcomingDraw.drawDate) : 0;

  return (
    <div className={styles.dashboardLayout}>
      {/* Sidebar */}
      <aside className={styles.sidebar}>
        <Link href="/" className={styles.sidebarLogo}>
          digital.<span style={{ color: 'var(--color-terracotta)' }}>HEROES</span>
        </Link>

        <nav className={styles.sidebarNav}>
          {([
            { key: 'overview', label: 'Overview', icon: '◎' },
            { key: 'scores', label: 'My Scores', icon: '◈' },
            { key: 'draws', label: 'Draws', icon: '◆' },
            { key: 'winnings', label: 'Winnings', icon: '♥' },
          ] as { key: typeof activeTab; label: string; icon: string }[]).map(item => (
            <button
              key={item.key}
              id={`nav-${item.key}`}
              className={`${styles.sidebarNavBtn} ${activeTab === item.key ? styles.sidebarNavBtnActive : ''}`}
              onClick={() => setActiveTab(item.key)}
            >
              <span className={styles.sidebarNavIcon}>{item.icon}</span>
              {item.label}
              {item.key === 'winnings' && pendingWinnings.length > 0 && (
                <span className={styles.navBadge}>{pendingWinnings.length}</span>
              )}
            </button>
          ))}
        </nav>

        <div className={styles.sidebarBottom}>
          <div className={styles.userInfo}>
            <div className="avatar">
              {user.avatarInitials}
            </div>
            <div>
              <div className="font-semibold text-sm">{user.name}</div>
              <div className="text-xs text-muted">{user.email}</div>
            </div>
          </div>
          {user.role === 'admin' && (
            <Link href="/admin" className="btn btn-ghost btn-sm w-full mt-3">
              Admin Panel →
            </Link>
          )}
          <button className="btn btn-ghost btn-sm w-full mt-2" onClick={() => { logout(); router.push('/'); }} id="logout-btn">
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={styles.main}>
        {/* Subscription Banner */}
        {sub && (
          <div className={`${styles.subBanner} ${sub.status === 'active' ? styles.subBannerActive : styles.subBannerInactive}`}>
            <div className={styles.subBannerLeft}>
              <span className={`badge ${sub.status === 'active' ? 'badge-active' : sub.status === 'lapsed' ? 'badge-lapsed' : 'badge-inactive'}`}>
                {sub.status}
              </span>
              <span className="text-sm font-semibold">{sub.plan === 'monthly' ? 'Monthly' : 'Yearly'} Plan · £{sub.price}/month</span>
              {sub.status === 'active' && (
                <span className="text-sm text-muted">Renews {new Date(sub.renewalDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
              )}
            </div>
            <button className="btn btn-ghost btn-sm">Manage Plan</button>
          </div>
        )}

        {/* Tab: Overview */}
        {activeTab === 'overview' && (
          <div className={styles.tabContent} id="overview-tab">
            <h1 className={styles.pageTitle}>Dashboard</h1>
            <p className={styles.pageSubtitle}>Welcome back, {user.name.split(' ')[0]}!</p>

            {/* Stats Grid */}
            <div className="grid-4 mt-8">
              <div className="stat-card" id="stat-scores">
                <div className="stat-label">My Numbers</div>
                <div className="stat-value">{scores.length}/5</div>
                <div className="stat-change">Stableford scores logged</div>
              </div>
              <div className="stat-card" id="stat-pool">
                <div className="stat-label">Prize Pool</div>
                <div className="stat-value" style={{ color: 'var(--color-terracotta)' }}>
                  {upcomingDraw ? formatCurrency(upcomingDraw.prizePoolTotal) : '—'}
                </div>
                <div className="stat-change">This month's draw</div>
              </div>
              <div className="stat-card" id="stat-charity">
                <div className="stat-label">Monthly Donation</div>
                <div className="stat-value" style={{ color: 'var(--color-sage)' }}>£{monthlyContrib}</div>
                <div className="stat-change">{charityPercent}% to {charity?.name ?? '—'}</div>
              </div>
              <div className="stat-card" id="stat-won">
                <div className="stat-label">Total Won</div>
                <div className="stat-value" style={{ color: 'var(--color-gold)' }}>
                  {formatCurrency(user.totalWon)}
                </div>
                <div className="stat-change">All-time prize winnings</div>
              </div>
            </div>

            {/* Draw Countdown */}
            {upcomingDraw && (
              <div className={styles.drawCountdown} id="draw-countdown">
                <div className={styles.drawCountdownLeft}>
                  <span className="section-eyebrow">Next Draw</span>
                  <div className={styles.countdownNumber}>{daysLeft}</div>
                  <div className="text-muted text-sm">days remaining</div>
                </div>
                <div className={styles.drawCountdownRight}>
                  <div className="text-sm font-semibold mb-2">Your draw numbers:</div>
                  <div className={styles.numberBalls}>
                    {scores.length > 0 ? (
                      scores.slice(0, 5).map((s, i) => (
                        <div key={i} className="number-ball number-ball-matched">{s.score}</div>
                      ))
                    ) : (
                      <p className="text-sm text-muted">Add scores to get your draw numbers</p>
                    )}
                  </div>
                  <div className="text-xs text-muted mt-3">
                    Draw Date: {upcomingDraw && new Date(upcomingDraw.drawDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </div>
                </div>
              </div>
            )}

            {/* Quick Score Strip */}
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>My Scores</h2>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => { setEditingScore(undefined); setShowScoreModal(true); }}
                id="add-score-quick-btn"
              >
                + Add Score
              </button>
            </div>

            <div className={styles.scoreStrip}>
              {scores.length === 0 ? (
                <div className={styles.emptyState}>
                  <p>No scores logged yet. Add your first Stableford score to enter draws.</p>
                  <button className="btn btn-primary mt-4" onClick={() => setShowScoreModal(true)}>
                    Add First Score
                  </button>
                </div>
              ) : (
                scores.map((s, i) => (
                  <div key={s.id} className={styles.scoreCard}>
                    <div className={`score-badge ${getScoreColor(s.score)}`}>{s.score}</div>
                    <div className={styles.scoreDate}>
                      {new Date(s.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    </div>
                    {i === 0 && <span className="badge badge-terracotta">Latest</span>}
                  </div>
                ))
              )}
            </div>

            {/* Winning Alerts */}
            {pendingWinnings.length > 0 && (
              <div className={`alert alert-warning mt-6`} id="winning-alert">
                🏆 You have <strong>{pendingWinnings.length}</strong> pending prize claim{pendingWinnings.length > 1 ? 's' : ''}!{' '}
                <button
                  className="btn btn-sm btn-primary ml-4"
                  style={{ display: 'inline-flex' }}
                  onClick={() => setActiveTab('winnings')}
                >
                  View Winnings →
                </button>
              </div>
            )}
          </div>
        )}

        {/* Tab: Scores */}
        {activeTab === 'scores' && (
          <div className={styles.tabContent} id="scores-tab">
            <div className={styles.sectionHeader}>
              <div>
                <h1 className={styles.pageTitle}>My Scores</h1>
                <p className={styles.pageSubtitle}>Latest 5 Stableford scores — these are your draw numbers.</p>
              </div>
              <button
                className="btn btn-primary"
                onClick={() => { setEditingScore(undefined); setShowScoreModal(true); }}
                id="add-score-btn"
              >
                + Add Score
              </button>
            </div>

            {scores.length === 0 ? (
              <div className={styles.emptyState}>
                <div style={{ fontSize: '3rem' }}>⛳</div>
                <h3>No scores yet</h3>
                <p>Add your Stableford golf scores to participate in draws.</p>
                <button className="btn btn-primary mt-4" onClick={() => setShowScoreModal(true)}>
                  Add First Score
                </button>
              </div>
            ) : (
              <div className={styles.scoresGrid}>
                {scores.map((s, idx) => (
                  <div key={s.id} className={`card ${styles.scoreDetailCard}`} id={`score-card-${idx}`}>
                    <div className={`score-badge ${getScoreColor(s.score)}`} style={{ width: 72, height: 72, fontSize: '1.75rem' }}>{s.score}</div>
                    <div className={styles.scoreDetailInfo}>
                      <div className="font-bold" style={{ fontSize: 'var(--font-size-lg)' }}>{s.score} Points</div>
                      <div className="text-sm text-muted">{new Date(s.date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div>
                      {idx === 0 && <span className="badge badge-terracotta mt-2">Most Recent</span>}
                    </div>
                    <div className={styles.scoreDetailActions}>
                      <button className="btn btn-secondary btn-sm" onClick={() => { setEditingScore(s); setShowScoreModal(true); }} id={`edit-score-${s.id}`}>Edit</button>
                      <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-danger)' }} onClick={() => handleDeleteScore(s.id)} id={`delete-score-${s.id}`}>Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className={`card mt-6`} style={{ borderColor: 'var(--color-border)' }}>
              <h3 className="font-semibold mb-2">How scoring works</h3>
              <p className="text-sm text-muted">
                Only your <strong>latest 5 Stableford scores</strong> are kept. Each score must have a unique date — you cannot enter two scores for the same day. Adding a 6th score automatically removes your oldest. Your 5 current scores become your numbers in the monthly draw.
              </p>
            </div>
          </div>
        )}

        {/* Tab: Draws */}
        {activeTab === 'draws' && (
          <div className={styles.tabContent} id="draws-tab">
            <h1 className={styles.pageTitle}>Draw History</h1>
            <p className={styles.pageSubtitle}>Your participation and results in past draws.</p>

            {/* Upcoming draw */}
            {upcomingDraw && (
              <div className={`card ${styles.upcomingDrawCard}`} id="upcoming-draw-card">
                <div className="flex items-center justify-between mb-4">
                  <span className="badge badge-upcoming">Upcoming</span>
                  <span className="text-sm text-muted">{daysLeft} days away</span>
                </div>
                <h3>{upcomingDraw.month} Draw</h3>
                <p className="text-sm text-secondary mt-2">
                  Prize pool: <strong style={{ color: 'var(--color-terracotta)' }}>{formatCurrency(upcomingDraw.prizePoolTotal)}</strong>
                </p>
                <div className="mt-4">
                  <div className="text-sm font-semibold mb-2">Your numbers:</div>
                  <div className={styles.numberBalls}>
                    {scores.slice(0, 5).map((s, i) => (
                      <div key={i} className="number-ball number-ball-matched">{s.score}</div>
                    ))}
                    {Array.from({ length: Math.max(0, 5 - scores.length) }).map((_, i) => (
                      <div key={`empty-${i}`} className="number-ball" style={{ opacity: 0.3 }}>?</div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Past entries */}
            <h2 className="mt-8 mb-4" style={{ fontSize: 'var(--font-size-xl)' }}>Past Draws</h2>
            {drawEntries.length === 0 ? (
              <div className={styles.emptyState}>
                <p>You haven't participated in any draws yet.</p>
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Draw</th>
                      <th>Your Numbers</th>
                      <th>Matched</th>
                      <th>Result</th>
                      <th>Prize</th>
                    </tr>
                  </thead>
                  <tbody>
                    {drawEntries.map(entry => (
                      <tr key={entry.id}>
                        <td className="font-semibold">{allDraws.find(d => d.id === entry.drawId)?.month ?? entry.drawId}</td>
                        <td>
                          <div className="flex gap-2">
                            {entry.numbersEntered.slice(0, 5).map((n, i) => (
                              <div
                                key={i}
                                className={`number-ball ${entry.matchedNumbers.includes(n) ? 'number-ball-matched' : ''}`}
                                style={{ width: 32, height: 32, fontSize: 'var(--font-size-sm)' }}
                              >
                                {n}
                              </div>
                            ))}
                          </div>
                        </td>
                        <td><strong>{entry.matchCount}</strong> / 5</td>
                        <td>
                          {entry.tierWon ? (
                            <span className="badge badge-approved">{entry.tierWon}</span>
                          ) : (
                            <span className="text-muted">No match</span>
                          )}
                        </td>
                        <td>
                          {entry.prizeAmount > 0 ? (
                            <strong style={{ color: 'var(--color-gold)' }}>{formatCurrency(entry.prizeAmount)}</strong>
                          ) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab: Winnings */}
        {activeTab === 'winnings' && (
          <div className={styles.tabContent} id="winnings-tab">
            <h1 className={styles.pageTitle}>Winnings</h1>
            <p className={styles.pageSubtitle}>Your prize claims and payout status.</p>

            {verifications.length === 0 ? (
              <div className={styles.emptyState}>
                <div style={{ fontSize: '3rem' }}>🏆</div>
                <h3>No winnings yet</h3>
                <p>Keep entering draws — your numbers could be next!</p>
              </div>
            ) : (
              <div className={styles.verificationCards}>
                {verifications.map(v => (
                  <div key={v.id} className={`card ${styles.verificationCard}`} id={`verification-${v.id}`}>
                    <div className="flex items-center justify-between mb-4">
                      <span className="badge badge-terracotta">{v.matchTier}</span>
                      <div className="flex gap-2">
                        <span className={`badge badge-${v.status}`}>{v.status}</span>
                        <span className={`badge badge-${v.payoutStatus}`}>{v.payoutStatus}</span>
                      </div>
                    </div>

                    <div style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 800, color: 'var(--color-gold)' }}>
                      {formatCurrency(v.prizeAmount)}
                    </div>
                    <div className="text-sm text-muted mt-1">{v.drawMonth} Draw</div>

                    {v.adminNotes && (
                      <div className="alert alert-info mt-4">{v.adminNotes}</div>
                    )}

                    {/* Verification Status Timeline */}
                    <div className={styles.verificationTimeline}>
                      <div className={`${styles.timelineStep} ${v.prizeAmount > 0 ? styles.timelineStepDone : ''}`}>
                        <div className={styles.timelineDot}></div>
                        <div>
                          <div className="text-sm font-semibold">Prize Awarded</div>
                          <div className="text-xs text-muted">You won in the draw</div>
                        </div>
                      </div>
                      <div className={`${styles.timelineStep} ${v.status !== 'pending' || v.proofImageUrl ? styles.timelineStepDone : ''}`}>
                        <div className={styles.timelineDot}></div>
                        <div>
                          <div className="text-sm font-semibold">Proof Submitted</div>
                          <div className="text-xs text-muted">{v.submittedAt ? new Date(v.submittedAt).toLocaleDateString('en-GB') : 'Awaiting'}</div>
                        </div>
                      </div>
                      <div className={`${styles.timelineStep} ${v.status === 'approved' ? styles.timelineStepDone : ''}`}>
                        <div className={styles.timelineDot}></div>
                        <div>
                          <div className="text-sm font-semibold">Admin Verified</div>
                          <div className="text-xs text-muted">{v.reviewedAt ? new Date(v.reviewedAt).toLocaleDateString('en-GB') : 'Pending review'}</div>
                        </div>
                      </div>
                      <div className={`${styles.timelineStep} ${v.payoutStatus === 'paid' ? styles.timelineStepDone : ''}`}>
                        <div className={styles.timelineDot}></div>
                        <div>
                          <div className="text-sm font-semibold">Paid</div>
                          <div className="text-xs text-muted">{v.payoutStatus === 'paid' ? 'Completed' : 'Awaiting'}</div>
                        </div>
                      </div>
                    </div>

                    {/* Upload proof if not yet submitted */}
                    {!v.proofImageUrl && v.status === 'pending' && (
                      <button
                        className="btn btn-primary w-full mt-4"
                        id={`upload-proof-${v.id}`}
                        onClick={() => setShowProofModal(v)}
                      >
                        Upload Winner Proof →
                      </button>
                    )}

                    {v.proofImageUrl && (
                      <div className="mt-4">
                        <div className="text-xs text-muted mb-2">Proof submitted</div>
                        <img src={v.proofImageUrl} alt="Proof" style={{ width: '100%', borderRadius: 'var(--radius-md)', maxHeight: 160, objectFit: 'cover' }} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Charity Side Panel (visible on overview) */}
      {activeTab === 'overview' && (
        <aside className={styles.charitySidebar} id="charity-sidebar">
          <div className={styles.charityPanel}>
            <h3 className="font-bold mb-1">Your Charity</h3>
            {charity ? (
              <>
                <div className={styles.charityPanelName}>{charity.name}</div>
                <div className="text-xs text-muted mb-4">{charity.tagline}</div>
                <div className="progress-bar mb-2 progress-bar-sage">
                  <div
                    className="progress-bar-fill"
                    style={{ width: `${(charity.raisedTotal / charity.goal) * 100}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-xs text-muted mb-6">
                  <span>£{charity.raisedTotal.toLocaleString()} raised</span>
                  <span>Goal: £{charity.goal.toLocaleString()}</span>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted mb-4">No charity selected.</p>
            )}

            <div className={styles.charityContrib}>
              <div className="text-sm font-semibold">Your Contribution</div>
              <div className={styles.contribAmount} style={{ color: 'var(--color-sage)' }}>
                £{monthlyContrib}/month
              </div>
              <div className="text-xs text-muted">{charityPercent}% of subscription</div>
            </div>

            <div className="mt-4">
              <div className="form-label mb-2">Adjust percentage</div>
              <input
                type="range"
                min={10}
                max={50}
                value={charityPercent}
                onChange={e => setCharityPercent(Number(e.target.value))}
                aria-label="Charity contribution"
                id="charity-percent-slider"
              />
              <div className="flex justify-between text-xs text-muted mt-1">
                <span>10%</span>
                <span>50%</span>
              </div>
            </div>

            <button
              className="btn btn-sage btn-sm w-full mt-4"
              onClick={handleCharityUpdate}
              disabled={charityUpdating || charityPercent === user.charityPercent}
              id="save-charity-btn"
            >
              {charityUpdating ? <><span className="spinner"></span> Saving…</> : 'Save Changes'}
            </button>

            {charity && charity.upcomingEvents.length > 0 && (
              <div className="mt-6">
                <div className="text-xs font-bold uppercase tracking-widest text-muted mb-3">Upcoming Events</div>
                {charity.upcomingEvents.slice(0, 2).map(ev => (
                  <div key={ev.id} className={styles.eventCard}>
                    <div className="text-sm font-semibold">{ev.title}</div>
                    <div className="text-xs text-muted">{new Date(ev.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} · {ev.location}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>
      )}

      {/* Modals */}
      {showScoreModal && (
        <ScoreModal
          initial={editingScore}
          onSave={editingScore ? handleEditScore : handleAddScore}
          onClose={() => { setShowScoreModal(false); setEditingScore(undefined); }}
        />
      )}

      {showProofModal && (
        <ProofModal
          verification={showProofModal}
          onSubmit={handleProofSubmit}
          onClose={() => setShowProofModal(null)}
        />
      )}
    </div>
  );
}
