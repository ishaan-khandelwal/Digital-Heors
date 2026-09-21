'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { User, Draw, WinnerVerification, DrawEntry, DrawTierResult } from '@/lib/types';
import { formatCurrency } from '@/lib/drawEngine';
import styles from './admin.module.css';

type AdminTab = 'overview' | 'users' | 'draws' | 'charities' | 'winners' | 'reports';

interface Analytics {
  totalUsers: number;
  activeSubscribers: number;
  monthlyRevenue: number;
  yearlyRevenue: number;
  totalPrizePool: number;
  rolloverJackpot: number;
  totalCharityRaised: number;
  drawParticipationRate: number;
  averageScoresPerUser: number;
}

export default function AdminPage() {
  const { user, isLoading: authLoading, logout } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [draws, setDraws] = useState<Draw[]>([]);
  const [verifications, setVerifications] = useState<WinnerVerification[]>([]);
  const [drawEntries, setDrawEntries] = useState<DrawEntry[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [drawLogicType, setDrawLogicType] = useState<'random' | 'algorithmic'>('random');
  const [simResult, setSimResult] = useState<{
    winningNumbers: number[];
    tierResults: DrawTierResult[];
    entries: DrawEntry[];
  } | null>(null);
  const [simLoading, setSimLoading] = useState(false);
  const [publishLoading, setPublishLoading] = useState(false);
  const [createDrawLoading, setCreateDrawLoading] = useState(false);
  const [verificationNote, setVerificationNote] = useState<Record<string, string>>({});
  const [charities, setCharities] = useState<Array<{ id: string; name: string; raisedTotal: number; subscriberCount: number; category: string }>>([]);

  const fetchAll = useCallback(async () => {
    const [adminRes, drawRes, charityRes] = await Promise.all([
      fetch('/api/admin'),
      fetch('/api/draws'),
      fetch('/api/charities'),
    ]);
    const adminData = await adminRes.json();
    const drawData = await drawRes.json();
    const charityData = await charityRes.json();

    setAnalytics(adminData.analytics);
    setUsers(adminData.users ?? []);
    setVerifications(adminData.verifications ?? []);
    setDraws(drawData.draws ?? []);
    setCharities(charityData.charities ?? []);
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    } else if (user && user.role !== 'admin') {
      router.push('/dashboard');
    } else if (user) {
      fetchAll();
    }
  }, [user, authLoading, router, fetchAll]);

  if (authLoading || !user || user.role !== 'admin') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <span className="spinner" style={{ width: 40, height: 40 }}></span>
      </div>
    );
  }

  const upcomingDraw = draws.find(d => d.status === 'upcoming' || d.status === 'simulated');
  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email.toLowerCase().includes(userSearch.toLowerCase())
  );

  const handleSimulate = async () => {
    if (!upcomingDraw) return;
    setSimLoading(true);
    setSimResult(null);
    try {
      const res = await fetch('/api/draws', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'simulate', drawId: upcomingDraw.id, logicType: drawLogicType }),
      });
      const data = await res.json();
      setSimResult({ winningNumbers: data.winningNumbers, tierResults: data.tierResults, entries: data.entries });
      await fetchAll();
    } finally {
      setSimLoading(false);
    }
  };

  const handlePublish = async () => {
    if (!upcomingDraw) return;
    setPublishLoading(true);
    try {
      const res = await fetch('/api/draws', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'publish', drawId: upcomingDraw.id, logicType: drawLogicType }),
      });
      await res.json();
      await fetchAll();
      setSimResult(null);
    } finally {
      setPublishLoading(false);
    }
  };

  const handleCreateDraw = async () => {
    setCreateDrawLoading(true);
    try {
      const res = await fetch('/api/draws', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create' }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchAll();
      }
    } finally {
      setCreateDrawLoading(false);
    }
  };

  const handleVerification = async (id: string, status: 'approved' | 'rejected', payoutStatus?: 'paid') => {
    const updates: Record<string, unknown> = { status };
    if (payoutStatus) updates.payoutStatus = payoutStatus;
    if (verificationNote[id]) updates.adminNotes = verificationNote[id];

    await fetch('/api/admin', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resource: 'verification', id, updates }),
    });
    await fetchAll();
  };

  const handleToggleSubscription = async (u: User) => {
    const newStatus = u.subscription?.status === 'active' ? 'cancelled' : 'active';
    await fetch('/api/admin', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        resource: 'user',
        id: u.id,
        updates: { subscription: u.subscription ? { ...u.subscription, status: newStatus } : null },
      }),
    });
    await fetchAll();
  };

  const NAV_ITEMS: { key: AdminTab; label: string; icon: string }[] = [
    { key: 'overview', label: 'Overview', icon: '◎' },
    { key: 'users', label: 'Users', icon: '👥' },
    { key: 'draws', label: 'Draw Engine', icon: '◆' },
    { key: 'charities', label: 'Charities', icon: '♥' },
    { key: 'winners', label: 'Verification', icon: '🏆' },
    { key: 'reports', label: 'Reports', icon: '📊' },
  ];

  return (
    <div className={styles.layout}>
      {/* Admin Sidebar */}
      <aside className={styles.sidebar}>
        <Link href="/" className={styles.logo}>
          digital.<span style={{ color: 'var(--color-terracotta)' }}>HEROES</span>
        </Link>
        <div className={styles.adminBadge}>Admin Panel</div>

        <nav className={styles.nav}>
          {NAV_ITEMS.map(item => (
            <button
              key={item.key}
              id={`admin-nav-${item.key}`}
              className={`${styles.navBtn} ${activeTab === item.key ? styles.navBtnActive : ''}`}
              onClick={() => setActiveTab(item.key)}
            >
              <span>{item.icon}</span>
              {item.label}
              {item.key === 'winners' && verifications.filter(v => v.status === 'pending' && v.proofImageUrl).length > 0 && (
                <span className={styles.badge}>{verifications.filter(v => v.status === 'pending' && v.proofImageUrl).length}</span>
              )}
            </button>
          ))}
        </nav>

        <div className={styles.sidebarBottom}>
          <div className={styles.userInfo}>
            <div className="avatar avatar-sm">{user.avatarInitials}</div>
            <div>
              <div className="text-sm font-semibold">{user.name}</div>
              <div className="text-xs text-muted">Administrator</div>
            </div>
          </div>
          <Link href="/dashboard" className="btn btn-ghost btn-sm w-full mt-3">← User View</Link>
          <button className="btn btn-ghost btn-sm w-full mt-2" id="admin-logout-btn" onClick={() => { logout(); router.push('/'); }}>
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={styles.main}>

        {/* === OVERVIEW === */}
        {activeTab === 'overview' && analytics && (
          <div id="admin-overview">
            <h1 className={styles.pageTitle}>Platform Overview</h1>
            <p className={styles.pageSubtitle}>Real-time platform analytics and key metrics.</p>

            <div className="grid-4 mt-8">
              <div className="stat-card" id="stat-total-users">
                <div className="stat-label">Total Subscribers</div>
                <div className="stat-value">{analytics.totalUsers}</div>
                <div className="stat-change">{analytics.activeSubscribers} active</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Monthly Revenue</div>
                <div className="stat-value" style={{ color: 'var(--color-terracotta)' }}>
                  {formatCurrency(analytics.monthlyRevenue)}
                </div>
                <div className="stat-change">From active monthly subs</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Prize Pool</div>
                <div className="stat-value" style={{ color: 'var(--color-gold)' }}>
                  {formatCurrency(analytics.totalPrizePool)}
                </div>
                <div className="stat-change">Current month</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Charity Raised</div>
                <div className="stat-value" style={{ color: 'var(--color-sage)' }}>
                  £{(analytics.totalCharityRaised / 1000).toFixed(0)}k
                </div>
                <div className="stat-change">All time</div>
              </div>
            </div>

            <div className="grid-2 mt-8">
              <div className="stat-card">
                <div className="stat-label">Avg Scores/User</div>
                <div className="stat-value">{analytics.averageScoresPerUser}</div>
                <div className="stat-change">Stableford scores logged</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Rollover Jackpot</div>
                <div className="stat-value">{analytics.rolloverJackpot > 0 ? formatCurrency(analytics.rolloverJackpot) : '£0'}</div>
                <div className="stat-change">Carried to next draw</div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className={`card mt-8`}>
              <h3 className="font-bold mb-4">Quick Actions</h3>
              <div className="flex gap-3 flex-wrap">
                <button className="btn btn-primary" onClick={() => setActiveTab('draws')} id="quick-draw-engine">
                  ◆ Open Draw Engine
                </button>
                <button className="btn btn-secondary" onClick={() => setActiveTab('winners')} id="quick-winners">
                  🏆 Review Winners
                </button>
                <button className="btn btn-secondary" onClick={() => setActiveTab('users')} id="quick-users">
                  👥 Manage Users
                </button>
              </div>
            </div>
          </div>
        )}

        {/* === USER MANAGEMENT === */}
        {activeTab === 'users' && (
          <div id="admin-users">
            <div className={styles.tabHeader}>
              <div>
                <h1 className={styles.pageTitle}>User Management</h1>
                <p className={styles.pageSubtitle}>{users.length} users total · {users.filter(u => u.subscription?.status === 'active').length} active subscribers</p>
              </div>
            </div>

            <div className="mt-6 mb-4">
              <input
                id="user-search"
                type="text"
                className="form-input"
                placeholder="Search by name or email…"
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
                style={{ maxWidth: 400 }}
              />
            </div>

            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Role</th>
                    <th>Plan</th>
                    <th>Status</th>
                    <th>Charity %</th>
                    <th>Total Won</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map(u => (
                    <tr key={u.id} id={`user-row-${u.id}`}>
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="avatar avatar-sm">{u.avatarInitials}</div>
                          <div>
                            <div className="font-semibold text-sm">{u.name}</div>
                            <div className="text-xs text-muted">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${u.role === 'admin' ? 'badge-terracotta' : 'badge-upcoming'}`}>{u.role}</span>
                      </td>
                      <td className="text-sm">{u.subscription ? u.subscription.plan : '—'}</td>
                      <td>
                        {u.subscription ? (
                          <span className={`badge badge-${u.subscription.status}`}>{u.subscription.status}</span>
                        ) : '—'}
                      </td>
                      <td className="text-sm">{u.charityPercent > 0 ? `${u.charityPercent}%` : '—'}</td>
                      <td className="font-semibold" style={{ color: u.totalWon > 0 ? 'var(--color-gold)' : undefined }}>
                        {u.totalWon > 0 ? formatCurrency(u.totalWon) : '—'}
                      </td>
                      <td>
                        {u.subscription && (
                          <button
                            className={`btn btn-sm ${u.subscription.status === 'active' ? 'btn-danger' : 'btn-sage'}`}
                            id={`toggle-sub-${u.id}`}
                            onClick={() => handleToggleSubscription(u)}
                          >
                            {u.subscription.status === 'active' ? 'Suspend' : 'Activate'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* === DRAW ENGINE === */}
        {activeTab === 'draws' && (
          <div id="admin-draws">
            <h1 className={styles.pageTitle}>Draw Engine</h1>
            <p className={styles.pageSubtitle}>Configure, simulate, and publish monthly draws.</p>

            {/* Upcoming draw config */}
            {upcomingDraw ? (
              <div className={`card mt-6 ${styles.drawConfig}`}>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="font-bold" style={{ fontSize: 'var(--font-size-xl)' }}>{upcomingDraw.month} Draw</h2>
                    <div className="text-sm text-muted mt-1">
                      Prize pool: <strong style={{ color: 'var(--color-terracotta)' }}>{formatCurrency(upcomingDraw.prizePoolTotal)}</strong>
                    </div>
                  </div>
                  <span className={`badge badge-${upcomingDraw.status}`}>{upcomingDraw.status}</span>
                </div>

                {/* Logic Type Toggle */}
                <div className="form-group mb-6">
                  <label className="form-label">Draw Logic</label>
                  <div className="tabs">
                    <button
                      id="draw-logic-random"
                      className={`tab-btn ${drawLogicType === 'random' ? 'active' : ''}`}
                      onClick={() => setDrawLogicType('random')}
                    >
                      🎲 Random (Lottery-Style)
                    </button>
                    <button
                      id="draw-logic-algorithmic"
                      className={`tab-btn ${drawLogicType === 'algorithmic' ? 'active' : ''}`}
                      onClick={() => setDrawLogicType('algorithmic')}
                    >
                      🔬 Algorithmic (Score-Weighted)
                    </button>
                  </div>
                  <p className="text-xs text-muted mt-2">
                    {drawLogicType === 'random'
                      ? 'Standard lottery — picks 5 random distinct numbers between 1 and 45.'
                      : 'Numbers weighted by score frequency distribution — frequent scores are more likely to be drawn.'}
                  </p>
                </div>

                <div className="flex gap-4">
                  <button
                    className="btn btn-secondary flex-1"
                    id="simulate-draw-btn"
                    onClick={handleSimulate}
                    disabled={simLoading}
                  >
                    {simLoading ? <><span className="spinner"></span> Simulating…</> : '▶ Run Simulation'}
                  </button>
                  {(upcomingDraw.status === 'simulated' || simResult) && (
                    <button
                      className="btn btn-primary flex-1"
                      id="publish-draw-btn"
                      onClick={handlePublish}
                      disabled={publishLoading}
                    >
                      {publishLoading ? <><span className="spinner"></span> Publishing…</> : '🚀 Publish Draw'}
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="card mt-6" style={{ borderColor: 'var(--color-border)', textAlign: 'center', padding: 'var(--space-10)' }}>
                <div style={{ fontSize: '3rem', marginBottom: 'var(--space-4)' }}>🗓️</div>
                <h3 className="font-bold mb-2" style={{ fontSize: 'var(--font-size-xl)' }}>All draws published!</h3>
                <p className="text-muted text-sm mb-6">Create the next monthly draw to continue. The draw date will be automatically set to the last day of next month.</p>
                <button
                  id="create-next-draw-btn"
                  className="btn btn-primary"
                  onClick={handleCreateDraw}
                  disabled={createDrawLoading}
                >
                  {createDrawLoading
                    ? <><span className="spinner"></span> Creating…</>
                    : '+ Create Next Monthly Draw'}
                </button>
              </div>
            )}

            {/* Simulation Result */}
            {simResult && (
              <div className={`card mt-6 ${styles.simResult}`} id="simulation-result">
                <h3 className="font-bold mb-4">Simulation Results (Preview)</h3>

                <div className="mb-6">
                  <div className="text-sm font-semibold mb-3 text-muted uppercase tracking-widest">Winning Numbers</div>
                  <div className="flex gap-3">
                    {simResult.winningNumbers.map((n, i) => (
                      <div key={i} className="number-ball number-ball-winning" style={{ width: 52, height: 52, fontSize: 'var(--font-size-lg)' }}>
                        {n}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid-3 mb-6">
                  {simResult.tierResults.map((tier, i) => (
                    <div key={i} className={styles.tierCard} style={{ borderColor: i === 0 ? 'var(--color-gold)' : i === 1 ? 'var(--color-terracotta)' : 'var(--color-sage)' }}>
                      <div className={styles.tierMatch} style={{ color: i === 0 ? 'var(--color-gold)' : i === 1 ? 'var(--color-terracotta)' : 'var(--color-sage)' }}>
                        {tier.tier}
                      </div>
                      <div className={styles.tierWinners}>{tier.winnerCount} winner{tier.winnerCount !== 1 ? 's' : ''}</div>
                      <div className={styles.tierPrize}>{tier.totalPrize > 0 ? formatCurrency(tier.totalPrize) : '—'}</div>
                      {tier.isRollover && (
                        <div className="badge badge-simulated mt-2" style={{ display: 'inline-block' }}>↑ Rolls Over</div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="text-sm text-muted">
                  {simResult.entries.filter(e => e.tierWon).length} total winners found out of {simResult.entries.length} participants.
                </div>
              </div>
            )}

            {/* Draw History */}
            <h2 className="mt-10 mb-4" style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700 }}>Draw History</h2>
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>Month</th>
                    <th>Status</th>
                    <th>Logic</th>
                    <th>Pool</th>
                    <th>Winning Numbers</th>
                    <th>Winners</th>
                  </tr>
                </thead>
                <tbody>
                  {draws.map(draw => (
                    <tr key={draw.id}>
                      <td className="font-semibold">{draw.month}</td>
                      <td><span className={`badge badge-${draw.status}`}>{draw.status}</span></td>
                      <td className="text-sm">{draw.logicType}</td>
                      <td className="font-semibold">{formatCurrency(draw.prizePoolTotal)}</td>
                      <td>
                        {draw.winningNumbers.length > 0 ? (
                          <div className="flex gap-1">
                            {draw.winningNumbers.map((n, i) => (
                              <div key={i} className="number-ball number-ball-winning" style={{ width: 28, height: 28, fontSize: '0.7rem', border: '1.5px solid' }}>
                                {n}
                              </div>
                            ))}
                          </div>
                        ) : '—'}
                      </td>
                      <td>{draw.tierResults.reduce((acc, t) => acc + t.winnerCount, 0) || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* === CHARITIES === */}
        {activeTab === 'charities' && (
          <div id="admin-charities">
            <div className={styles.tabHeader}>
              <div>
                <h1 className={styles.pageTitle}>Charity Management</h1>
                <p className={styles.pageSubtitle}>{charities.length} charities listed on the platform.</p>
              </div>
            </div>

            <div className="table-wrapper mt-6">
              <table className="table">
                <thead>
                  <tr>
                    <th>Charity</th>
                    <th>Category</th>
                    <th>Subscribers</th>
                    <th>Raised</th>
                    <th>Progress</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {charities.map((c) => (
                    <tr key={c.id}>
                      <td className="font-semibold">{c.name}</td>
                      <td><span className="badge badge-upcoming" style={{ textTransform: 'capitalize' }}>{c.category}</span></td>
                      <td>{c.subscriberCount}</td>
                      <td style={{ color: 'var(--color-sage)', fontWeight: 700 }}>£{c.raisedTotal.toLocaleString()}</td>
                      <td style={{ minWidth: 120 }}>
                        <div className="progress-bar progress-bar-sage">
                          <div className="progress-bar-fill" style={{ width: `${Math.min(100, (c.raisedTotal / 50000) * 100)}%` }}></div>
                        </div>
                      </td>
                      <td>
                        <button className="btn btn-ghost btn-sm" id={`edit-charity-${c.id}`}>Edit</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* === WINNER VERIFICATION === */}
        {activeTab === 'winners' && (
          <div id="admin-winners">
            <h1 className={styles.pageTitle}>Winner Verification</h1>
            <p className={styles.pageSubtitle}>Review, approve, and manage prize payouts.</p>

            <div className={styles.verificationGrid}>
              {verifications.map(v => (
                <div key={v.id} className={`card ${styles.verCard}`} id={`admin-verify-${v.id}`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex gap-2">
                      <span className={`badge badge-${v.status}`}>{v.status}</span>
                      <span className={`badge badge-${v.payoutStatus}`}>{v.payoutStatus}</span>
                    </div>
                    <span className="text-xs text-muted">{v.drawMonth}</span>
                  </div>

                  <div className="flex items-center gap-3 mb-4">
                    <div className="avatar avatar-sm">{v.userName.split(' ').map(n => n[0]).join('')}</div>
                    <div>
                      <div className="font-semibold text-sm">{v.userName}</div>
                      <div className="text-xs text-muted">{v.userEmail}</div>
                    </div>
                  </div>

                  <div className={styles.verTierRow}>
                    <span className="badge badge-terracotta">{v.matchTier}</span>
                    <span style={{ fontSize: 'var(--font-size-xl)', fontWeight: 800, color: 'var(--color-gold)' }}>
                      {formatCurrency(v.prizeAmount)}
                    </span>
                  </div>

                  {v.proofImageUrl ? (
                    <div className="mt-4">
                      <div className="text-xs font-semibold text-muted mb-2 uppercase tracking-widest">Submitted Proof</div>
                      <img
                        src={v.proofImageUrl}
                        alt="Winner proof"
                        className={styles.proofImg}
                      />
                    </div>
                  ) : (
                    <div className="alert alert-warning mt-4 text-xs">Awaiting proof submission from winner.</div>
                  )}

                  {v.status === 'pending' && v.proofImageUrl && (
                    <>
                      <div className="form-group mt-4">
                        <label className="form-label">Admin Notes</label>
                        <textarea
                          className="form-textarea"
                          placeholder="Optional notes for the winner…"
                          value={verificationNote[v.id] ?? ''}
                          onChange={e => setVerificationNote(prev => ({ ...prev, [v.id]: e.target.value }))}
                          id={`admin-notes-${v.id}`}
                          rows={2}
                        ></textarea>
                      </div>
                      <div className="flex gap-3 mt-4">
                        <button
                          className="btn btn-danger flex-1"
                          id={`reject-${v.id}`}
                          onClick={() => handleVerification(v.id, 'rejected')}
                        >
                          ✕ Reject
                        </button>
                        <button
                          className="btn btn-sage flex-1"
                          id={`approve-${v.id}`}
                          onClick={() => handleVerification(v.id, 'approved')}
                        >
                          ✓ Approve
                        </button>
                      </div>
                    </>
                  )}

                  {v.status === 'approved' && v.payoutStatus === 'pending' && (
                    <button
                      className="btn btn-primary w-full mt-4"
                      id={`mark-paid-${v.id}`}
                      onClick={() => handleVerification(v.id, 'approved', 'paid')}
                    >
                      ✓ Mark as Paid
                    </button>
                  )}

                  {v.adminNotes && (
                    <div className="alert alert-info mt-4 text-sm">{v.adminNotes}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* === REPORTS === */}
        {activeTab === 'reports' && analytics && (
          <div id="admin-reports">
            <h1 className={styles.pageTitle}>Reports & Analytics</h1>
            <p className={styles.pageSubtitle}>Platform-wide financial and participation statistics.</p>

            {/* Financial Breakdown */}
            <h2 className="mt-8 mb-4" style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700 }}>Financial Breakdown</h2>
            <div className="grid-3">
              <div className="stat-card">
                <div className="stat-label">Monthly Sub Revenue</div>
                <div className="stat-value" style={{ color: 'var(--color-terracotta)' }}>{formatCurrency(analytics.monthlyRevenue)}</div>
                <div className="stat-change">From monthly subscribers</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Annual Sub Revenue</div>
                <div className="stat-value" style={{ color: 'var(--color-terracotta)' }}>{formatCurrency(analytics.yearlyRevenue)}</div>
                <div className="stat-change">From yearly subscribers</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Total Charity Raised</div>
                <div className="stat-value" style={{ color: 'var(--color-sage)' }}>£{analytics.totalCharityRaised.toLocaleString()}</div>
                <div className="stat-change">Across all charities</div>
              </div>
            </div>

            {/* Charity Distribution */}
            <h2 className="mt-8 mb-4" style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700 }}>Charity Distribution</h2>
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>Charity</th>
                    <th>Subscribers</th>
                    <th>Raised</th>
                    <th>% of Total</th>
                    <th>Progress to Goal</th>
                  </tr>
                </thead>
                <tbody>
                  {charities.map(c => (
                    <tr key={c.id}>
                      <td className="font-semibold">{c.name}</td>
                      <td>{c.subscriberCount}</td>
                      <td style={{ color: 'var(--color-sage)', fontWeight: 700 }}>£{c.raisedTotal.toLocaleString()}</td>
                      <td>{analytics.totalCharityRaised > 0 ? `${((c.raisedTotal / analytics.totalCharityRaised) * 100).toFixed(1)}%` : '0%'}</td>
                      <td style={{ minWidth: 140 }}>
                        <div className="progress-bar progress-bar-sage">
                          <div className="progress-bar-fill" style={{ width: `${Math.min(100, (c.raisedTotal / 50000) * 100)}%` }}></div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Draw Statistics */}
            <h2 className="mt-8 mb-4" style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700 }}>Draw Statistics</h2>
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>Draw</th>
                    <th>Pool</th>
                    <th>5-Match Prize</th>
                    <th>4-Match Prize</th>
                    <th>3-Match Prize</th>
                    <th>Total Winners</th>
                    <th>Rollover</th>
                  </tr>
                </thead>
                <tbody>
                  {draws.filter(d => d.status === 'published').map(draw => (
                    <tr key={draw.id}>
                      <td className="font-semibold">{draw.month}</td>
                      <td>{formatCurrency(draw.prizePoolTotal)}</td>
                      {draw.tierResults.map((t, i) => (
                        <td key={i} style={{ color: i === 0 ? 'var(--color-gold)' : i === 1 ? 'var(--color-terracotta)' : 'var(--color-sage)' }}>
                          {t.totalPrize > 0 ? formatCurrency(t.totalPrize) : '—'}
                        </td>
                      ))}
                      <td>{draw.tierResults.reduce((acc, t) => acc + t.winnerCount, 0)}</td>
                      <td>
                        {draw.jackpotRolloverOut > 0 ? (
                          <span style={{ color: 'var(--color-gold)', fontWeight: 700 }}>{formatCurrency(draw.jackpotRolloverOut)}</span>
                        ) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
