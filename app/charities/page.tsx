'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Charity, CharityCategory } from '@/lib/types';
import { useAuth } from '@/lib/auth';
import styles from './charities.module.css';

const CATEGORIES: { value: CharityCategory | 'all'; label: string }[] = [
  { value: 'all', label: 'All Causes' },
  { value: 'health', label: 'Health' },
  { value: 'education', label: 'Education' },
  { value: 'community', label: 'Community' },
  { value: 'environment', label: 'Environment' },
  { value: 'animal', label: 'Animal Welfare' },
  { value: 'sport', label: 'Sport' },
];

function CharityModal({ charity, onClose }: { charity: Charity; onClose: () => void }) {
  const progressPct = Math.round((charity.raisedTotal / charity.goal) * 100);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box modal-box-lg" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className={styles.modalImg} style={{ backgroundImage: `url(${charity.coverUrl})` }}>
          <button className={`btn btn-ghost btn-sm ${styles.modalClose}`} onClick={onClose}>✕</button>
          <div className={styles.modalImgOverlay}></div>
        </div>

        <div className={styles.modalContent}>
          <div className="flex items-center gap-3 mb-4">
            <span className="badge badge-upcoming" style={{ textTransform: 'capitalize' }}>{charity.category}</span>
            {charity.featured && <span className="badge badge-terracotta">Featured</span>}
          </div>

          <h2 className="mb-1" style={{ fontSize: 'var(--font-size-3xl)' }}>{charity.name}</h2>
          <p className="text-muted" style={{ fontStyle: 'italic', marginBottom: 'var(--space-5)' }}>{charity.tagline}</p>
          <p className="text-sm" style={{ lineHeight: 1.8, marginBottom: 'var(--space-6)' }}>{charity.description}</p>

          {/* Progress */}
          <div className={styles.modalProgress}>
            <div className="flex justify-between mb-2">
              <span className="font-bold">£{charity.raisedTotal.toLocaleString()} raised</span>
              <span className="text-muted text-sm">{progressPct}% of £{charity.goal.toLocaleString()} goal</span>
            </div>
            <div className="progress-bar">
              <div className="progress-bar-fill" style={{ width: `${progressPct}%` }}></div>
            </div>
            <div className="flex justify-between mt-2 text-xs text-muted">
              <span>{charity.subscriberCount} members supporting this charity</span>
            </div>
          </div>

          {/* Upcoming Events */}
          {charity.upcomingEvents.length > 0 && (
            <div className={styles.modalEvents}>
              <div className="text-xs font-bold uppercase tracking-widest text-muted mb-4">Upcoming Golf Days & Events</div>
              {charity.upcomingEvents.map(ev => (
                <div key={ev.id} className={styles.eventItem}>
                  <div className={styles.eventDate}>
                    <div className={styles.eventDay}>{new Date(ev.date).getDate()}</div>
                    <div className={styles.eventMonth}>{new Date(ev.date).toLocaleDateString('en-GB', { month: 'short' })}</div>
                  </div>
                  <div>
                    <div className="font-semibold text-sm">{ev.title}</div>
                    <div className="text-xs text-muted">{ev.location}</div>
                    <div className="text-xs text-secondary mt-1">{ev.description}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-3 mt-6">
            <Link href="/signup" className="btn btn-primary flex-1">
              Support This Charity →
            </Link>
            {charity.website && (
              <a href={charity.website} target="_blank" rel="noopener noreferrer" className="btn btn-ghost">
                Visit Website ↗
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CharitiesPage() {
  const { user } = useAuth();
  const [charities, setCharities] = useState<Charity[]>([]);
  const [category, setCategory] = useState<CharityCategory | 'all'>('all');
  const [search, setSearch] = useState('');
  const [selectedCharity, setSelectedCharity] = useState<Charity | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams();
    if (category !== 'all') params.set('category', category);
    if (search) params.set('search', search);

    const fetchCharities = async () => {
      setLoading(true);
      const res = await fetch(`/api/charities?${params}`);
      const data = await res.json();
      setCharities(data.charities ?? []);
      setLoading(false);
    };

    const debounce = setTimeout(fetchCharities, 200);
    return () => clearTimeout(debounce);
  }, [category, search]);

  return (
    <div className={styles.page}>
      {/* Nav */}
      <nav className={styles.nav}>
        <div className="container">
          <div className={styles.navInner}>
            <Link href="/" className={styles.logo}>
              digital.<span style={{ color: 'var(--color-terracotta)' }}>HEROES</span>
            </Link>
            <div className={styles.navRight}>
              {user ? (
                <Link href={user.role === 'admin' ? '/admin' : '/dashboard'} className="btn btn-primary btn-sm">
                  Dashboard
                </Link>
              ) : (
                <Link href="/signup" className="btn btn-primary btn-sm">Get Started</Link>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Header */}
      <div className={`${styles.header} hero-bg`}>
        <div className="container">
          <span className="section-eyebrow">Charities</span>
          <h1 className={styles.heading}>Give back. <span className="gradient-text-sage">Choose your cause.</span></h1>
          <p className={styles.subheading}>
            Every Digital Heroes subscription supports a charity you believe in. Browse, discover, and choose where your contribution goes.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className={styles.filters}>
        <div className="container">
          <div className={styles.filtersInner}>
            <input
              id="charity-search"
              type="text"
              className={`form-input ${styles.searchInput}`}
              placeholder="Search charities…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <div className={styles.categoryFilters}>
              {CATEGORIES.map(cat => (
                <button
                  key={cat.value}
                  id={`filter-${cat.value}`}
                  className={`${styles.categoryBtn} ${category === cat.value ? styles.categoryBtnActive : ''}`}
                  onClick={() => setCategory(cat.value)}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Charity Grid */}
      <div className={styles.gridSection}>
        <div className="container">
          {loading ? (
            <div className={styles.loadingGrid}>
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className={styles.skeletonCard}></div>
              ))}
            </div>
          ) : charities.length === 0 ? (
            <div className={styles.emptyState}>
              <div style={{ fontSize: '3rem' }}>🔍</div>
              <h3>No charities found</h3>
              <p>Try adjusting your search or filters.</p>
              <button className="btn btn-secondary mt-4" onClick={() => { setSearch(''); setCategory('all'); }}>
                Clear Filters
              </button>
            </div>
          ) : (
            <div className="grid-auto">
              {charities.map(charity => (
                <button
                  key={charity.id}
                  id={`charity-card-${charity.id}`}
                  className={styles.charityCard}
                  onClick={() => setSelectedCharity(charity)}
                >
                  {charity.featured && <div className={styles.featuredBadge}>Featured</div>}
                  <div className={styles.charityImgWrap}>
                    <div
                      className={styles.charityImg}
                      style={{ backgroundImage: `url(${charity.coverUrl})` }}
                    ></div>
                  </div>
                  <div className={styles.charityBody}>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="badge badge-upcoming" style={{ textTransform: 'capitalize', fontSize: '0.65rem' }}>
                        {charity.category}
                      </span>
                    </div>
                    <h3 className={styles.charityName}>{charity.name}</h3>
                    <p className={styles.charityTagline}>{charity.tagline}</p>
                    <div className={styles.charityMeta}>
                      <span>{charity.subscriberCount} members</span>
                      <span style={{ color: 'var(--color-sage)', fontWeight: 600 }}>
                        £{charity.raisedTotal.toLocaleString()} raised
                      </span>
                    </div>
                    <div className="progress-bar progress-bar-sage mt-3">
                      <div
                        className="progress-bar-fill"
                        style={{ width: `${Math.min(100, (charity.raisedTotal / charity.goal) * 100)}%` }}
                      ></div>
                    </div>
                    {charity.upcomingEvents.length > 0 && (
                      <div className={styles.eventsBadge}>
                        📅 {charity.upcomingEvents.length} upcoming event{charity.upcomingEvents.length > 1 ? 's' : ''}
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedCharity && (
        <CharityModal charity={selectedCharity} onClose={() => setSelectedCharity(null)} />
      )}

      {/* CTA */}
      <div className={styles.cta}>
        <div className="container">
          <div className={styles.ctaBox}>
            <h2>Ready to make an impact?</h2>
            <p>Subscribe to Digital Heroes and choose a charity to support from day one.</p>
            <Link href="/signup" className="btn btn-primary btn-lg mt-6">
              Start Your Subscription →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
