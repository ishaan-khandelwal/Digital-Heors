'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { useState, useEffect } from 'react';
import styles from './page.module.css';

// How-it-works and prize tier data stay static (marketing copy)

const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'Subscribe',
    description: 'Choose a monthly or yearly plan. From day one, part of your subscription goes directly to your chosen charity.',
    icon: '◎',
    accent: 'var(--color-terracotta)',
  },
  {
    step: '02',
    title: 'Enter Scores',
    description: 'Log your last 5 Stableford golf scores. These become your personal draw numbers for the monthly prize pool.',
    icon: '◈',
    accent: 'var(--color-sage)',
  },
  {
    step: '03',
    title: 'Win Monthly',
    description: 'Match 3, 4, or all 5 of your scores to the winning draw numbers. Prize pools grow every month — jackpots rollover.',
    icon: '◆',
    accent: 'var(--color-gold)',
  },
  {
    step: '04',
    title: 'Give Back',
    description: 'Your charity receives funds whether you win or not. Increase your contribution percentage any time.',
    icon: '♥',
    accent: 'var(--color-sage)',
  },
];

const PRIZE_TIERS = [
  { match: '5 Numbers', share: '40%', rollover: true, label: 'Jackpot', accent: 'var(--color-gold)' },
  { match: '4 Numbers', share: '35%', rollover: false, label: 'Major', accent: 'var(--color-terracotta)' },
  { match: '3 Numbers', share: '25%', rollover: false, label: 'Prize', accent: 'var(--color-sage)' },
];

export default function LandingPage() {
  const { user } = useAuth();
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [charityPercent, setCharityPercent] = useState(10);
  const [activeCharityIdx, setActiveCharityIdx] = useState(0);
  const [counterValues, setCounterValues] = useState({ subscribers: 0, raised: 0, pool: 0 });
  const [featuredCharities, setFeaturedCharities] = useState<Array<{
    id: string; name: string; tagline: string; category: string;
    raisedTotal: number; goal: number;
  }>>([]);

  // Fetch featured charities and live stats from API
  useEffect(() => {
    Promise.all([
      fetch('/api/charities?featured=true').then(r => r.json()),
      fetch('/api/admin?resource=analytics').then(r => r.json()),
    ]).then(([charityData, analyticsData]) => {
      if (charityData.charities) {
        setFeaturedCharities(charityData.charities.slice(0, 3));
      }
      if (analyticsData.analytics) {
        const a = analyticsData.analytics;
        const targets = {
          subscribers: a.activeSubscribers ?? 0,
          raised: Math.round(a.totalCharityRaised ?? 0),
          pool: Math.round(a.totalPrizePool ?? 0),
        };
        // Animate counters
        const duration = 1800;
        const start = Date.now();
        const timer = setInterval(() => {
          const elapsed = Date.now() - start;
          const progress = Math.min(elapsed / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          setCounterValues({
            subscribers: Math.floor(targets.subscribers * eased),
            raised: Math.floor(targets.raised * eased),
            pool: Math.floor(targets.pool * eased),
          });
          if (progress >= 1) clearInterval(timer);
        }, 16);
        return () => clearInterval(timer);
      }
    }).catch(() => {
      // Silently fail — counters stay at 0
    });
  }, []);

  // Rotate charity spotlight
  useEffect(() => {
    if (featuredCharities.length === 0) return;
    const timer = setInterval(() => {
      setActiveCharityIdx(idx => (idx + 1) % featuredCharities.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [featuredCharities.length]);

  const monthlyPrice = 19.99;
  const yearlyPrice = 14.99;
  const price = billingPeriod === 'monthly' ? monthlyPrice : yearlyPrice;
  const charityAmount = ((price * charityPercent) / 100).toFixed(2);
  const savings = Math.round((1 - yearlyPrice / monthlyPrice) * 100);


  return (
    <div className={styles.page}>
      {/* Navigation */}
      <nav className={styles.nav}>
        <div className="container">
          <div className={styles.navInner}>
            <Link href="/" className={styles.logo}>
              digital.<span className={styles.logoAccent}>HEROES</span>
            </Link>
            <div className={styles.navLinks}>
              <Link href="/charities" className={styles.navLink}>Charities</Link>
              <Link href="/#how-it-works" className={styles.navLink}>How It Works</Link>
              <Link href="/#draw" className={styles.navLink}>The Draw</Link>
            </div>
            <div className={styles.navActions}>
              {user ? (
                <Link href={user.role === 'admin' ? '/admin' : '/dashboard'} className="btn btn-primary">
                  {user.role === 'admin' ? 'Admin Panel' : 'Dashboard'}
                </Link>
              ) : (
                <>
                  <Link href="/login" className="btn btn-ghost btn-sm">Sign In</Link>
                  <Link href="/signup" className="btn btn-primary btn-sm">Get Started</Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className={`${styles.hero} hero-bg`}>
        <div className="container">
          <div className={styles.heroContent}>
            <div className={styles.heroEyebrow}>
              <span className={styles.heroDot}></span>
              Monthly draws now live — £{counterValues.pool.toLocaleString()} pool
            </div>

            <h1 className={styles.heroHeadline}>
              Golf. Give.<br />
              <span className="gradient-text">Win.</span>
            </h1>

            <p className={styles.heroSubtext}>
              A subscription platform that turns your Stableford scores into draw numbers,
              your membership into charity donations, and your passion into prizes.
              <br /><strong className={styles.heroTagline}>Feel, not fairway.</strong>
            </p>

            <div className={styles.heroCtas}>
              <Link href="/signup" className="btn btn-primary btn-xl animate-glow">
                Start Playing →
              </Link>
              <Link href="/#how-it-works" className="btn btn-ghost btn-lg">
                See How It Works
              </Link>
            </div>

            <div className={styles.heroStats}>
              <div className={styles.heroStat}>
                <span className={styles.heroStatValue}>{counterValues.subscribers.toLocaleString()}</span>
                <span className={styles.heroStatLabel}>Active Members</span>
              </div>
              <div className={styles.heroStatDivider}></div>
              <div className={styles.heroStat}>
                <span className={styles.heroStatValue}>£{(counterValues.raised / 1000).toFixed(0)}k+</span>
                <span className={styles.heroStatLabel}>Raised for Charity</span>
              </div>
              <div className={styles.heroStatDivider}></div>
              <div className={styles.heroStat}>
                <span className={styles.heroStatValue}>£{counterValues.pool.toLocaleString()}</span>
                <span className={styles.heroStatLabel}>This Month's Pool</span>
              </div>
            </div>
          </div>

          {/* Hero Visual — Score Numbers */}
          <div className={styles.heroVisual} aria-hidden="true">
            <div className={styles.drawPreview}>
              <div className={styles.drawLabel}>This Month&apos;s Draw</div>
              <div className={styles.drawBalls}>
                {[32, 28, 35, 27, 30].map((n, i) => (
                  <div
                    key={n}
                    className={`${styles.drawBall} ${i % 2 === 0 ? styles.drawBallActive : ''}`}
                    style={{ animationDelay: `${i * 0.15}s` }}
                  >
                    {n}
                  </div>
                ))}
              </div>
              <div className={styles.drawSublabel}>5 Stableford Scores → 5 Draw Numbers</div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className={`section ${styles.howItWorks}`}>
        <div className="container">
          <div className="section-header">
            <span className="section-eyebrow">The Formula</span>
            <h2>Simple. Rewarding. Purposeful.</h2>
            <p>Four steps that connect your golf game to real-world impact.</p>
          </div>
          <div className={styles.steps}>
            {HOW_IT_WORKS.map((step, i) => (
              <div key={i} className={styles.stepCard}>
                <div className={styles.stepNumber} style={{ color: step.accent }}>{step.step}</div>
                <div className={styles.stepIcon} style={{ background: `${step.accent}18`, border: `1px solid ${step.accent}30` }}>
                  <span style={{ color: step.accent, fontSize: '1.5rem' }}>{step.icon}</span>
                </div>
                <h3 className={styles.stepTitle}>{step.title}</h3>
                <p className={styles.stepDesc}>{step.description}</p>
                {i < HOW_IT_WORKS.length - 1 && (
                  <div className={styles.stepConnector} aria-hidden="true">→</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Draw Mechanics */}
      <section id="draw" className={`section ${styles.drawSection}`}>
        <div className="container">
          <div className={styles.drawLayout}>
            <div className={styles.drawInfo}>
              <span className="section-eyebrow">Monthly Prize Draw</span>
              <h2>Your scores are your numbers.</h2>
              <p>
                Every month, we run a draw against the 5 Stableford scores you've logged.
                The more scores you enter, the better your baseline draw numbers become.
                Match 3, 4, or 5 numbers to win your share of the prize pool.
              </p>

              <div className={styles.drawModes}>
                <div className={styles.drawMode}>
                  <div className={styles.drawModeBadge} style={{ background: 'var(--color-terracotta-dim)', color: 'var(--color-terracotta)' }}>Random</div>
                  <p>Standard lottery-style draw — every member has an equal opportunity to match.</p>
                </div>
                <div className={styles.drawMode}>
                  <div className={styles.drawModeBadge} style={{ background: 'var(--color-sage-dim)', color: 'var(--color-sage)' }}>Algorithmic</div>
                  <p>Draw numbers are weighted by score frequency across all participants — playing well matters.</p>
                </div>
              </div>
            </div>

            <div className={styles.prizeTiers}>
              <div className={styles.prizeTiersHeader}>Prize Pool Breakdown</div>
              {PRIZE_TIERS.map((tier, i) => (
                <div key={i} className={styles.prizeTierRow}>
                  <div className={styles.prizeTierLeft}>
                    <span className={styles.prizeTierLabel} style={{ color: tier.accent }}>{tier.label}</span>
                    <span className={styles.prizeTierMatch}>{tier.match}</span>
                  </div>
                  <div className={styles.prizeTierBar}>
                    <div
                      className={styles.prizeTierFill}
                      style={{ width: tier.share, background: tier.accent, opacity: 0.8 }}
                    ></div>
                  </div>
                  <div className={styles.prizeTierShare} style={{ color: tier.accent }}>{tier.share}</div>
                  {tier.rollover && (
                    <span className={styles.rolloverBadge}>↑ Rolls Over</span>
                  )}
                </div>
              ))}
              <div className={styles.prizePoolNote}>
                Prize pool grows with every new subscriber. The 5-match jackpot carries forward if unclaimed.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Charity Spotlight */}
      <section className={`section ${styles.charitySection}`}>
        <div className="container">
          <div className="section-header">
            <span className="section-eyebrow">Give Back</span>
            <h2>Choose your cause.</h2>
            <p>Every subscription funds a charity you believe in. Minimum 10% — increase it whenever you want.</p>
          </div>

          <div className={styles.charitySpotlight}>
            {featuredCharities.length === 0 ? (
              <div style={{ color: 'var(--color-text-muted)', padding: '2rem', textAlign: 'center' }}>Loading charities…</div>
            ) : featuredCharities.map((charity, i) => {
              const colors = ['#D65D41', '#A3C293', '#C9A84C'];
              const color = colors[i % colors.length];
              return (
                <div
                  key={charity.id}
                  className={`${styles.charityCard} ${i === activeCharityIdx ? styles.charityCardActive : ''}`}
                  onClick={() => setActiveCharityIdx(i)}
                >
                  <div className={styles.charityCardAccent} style={{ background: color }}></div>
                  <div className={styles.charityCategory}>{charity.category}</div>
                  <h3 className={styles.charityName}>{charity.name}</h3>
                  <p className={styles.charityTagline}>{charity.tagline}</p>
                  <div className={styles.charityProgress}>
                    <div className={styles.charityProgressBar}>
                      <div
                        className={styles.charityProgressFill}
                        style={{
                          width: `${Math.min(100, (charity.raisedTotal / charity.goal) * 100)}%`,
                          background: color,
                        }}
                      ></div>
                    </div>
                    <div className={styles.charityProgressMeta}>
                      <span>£{(charity.raisedTotal / 1000).toFixed(0)}k raised</span>
                      <span>of £{(charity.goal / 1000).toFixed(0)}k goal</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>


          <div className={styles.charityActions}>
            <Link href="/charities" className="btn btn-secondary">
              Explore All Charities →
            </Link>
          </div>
        </div>
      </section>

      {/* Subscription Plans */}
      <section id="pricing" className={`section ${styles.pricingSection}`}>
        <div className="container">
          <div className="section-header">
            <span className="section-eyebrow">Subscription</span>
            <h2>Join the community.</h2>
            <p>One subscription, three benefits: draws, charity, golf tracking.</p>
          </div>

          <div className={styles.billingToggle}>
            <button
              className={`${styles.billingBtn} ${billingPeriod === 'monthly' ? styles.billingBtnActive : ''}`}
              onClick={() => setBillingPeriod('monthly')}
            >
              Monthly
            </button>
            <button
              className={`${styles.billingBtn} ${billingPeriod === 'yearly' ? styles.billingBtnActive : ''}`}
              onClick={() => setBillingPeriod('yearly')}
            >
              Yearly <span className={styles.savingsBadge}>Save {savings}%</span>
            </button>
          </div>

          <div className={styles.pricingCards}>
            {/* Monthly / Yearly Card */}
            <div className={`${styles.pricingCard} ${styles.pricingCardFeatured}`}>
              <div className={styles.pricingBadge}>Most Popular</div>
              <div className={styles.pricingPlan}>{billingPeriod === 'monthly' ? 'Monthly' : 'Yearly'} Plan</div>
              <div className={styles.pricingPrice}>
                <span className={styles.pricingCurrency}>£</span>
                <span className={styles.pricingAmount}>{price.toFixed(2)}</span>
                <span className={styles.pricingPer}>/month</span>
              </div>
              {billingPeriod === 'yearly' && (
                <div className={styles.pricingAnnual}>Billed £{(yearlyPrice * 12).toFixed(2)}/year</div>
              )}
              <ul className={styles.pricingFeatures}>
                <li>✓ Monthly prize draw entry</li>
                <li>✓ Stableford score tracking</li>
                <li>✓ Charity contribution (min 10%)</li>
                <li>✓ Draw history & analytics</li>
                <li>✓ Winner verification portal</li>
              </ul>

              {/* Charity Impact Estimator */}
              <div className={styles.charityEstimator}>
                <div className={styles.charityEstimatorLabel}>
                  Charity contribution: {charityPercent}% = <strong>£{charityAmount}/month</strong>
                </div>
                <input
                  type="range"
                  min={10}
                  max={50}
                  value={charityPercent}
                  onChange={e => setCharityPercent(Number(e.target.value))}
                  className={styles.charitySlider}
                  aria-label="Charity contribution percentage"
                />
                <div className={styles.charitySliderMeta}>
                  <span>10%</span>
                  <span>50%</span>
                </div>
              </div>

              <Link href="/signup" className="btn btn-primary w-full btn-lg">
                Get Started — £{price.toFixed(2)}/month
              </Link>
            </div>

            {/* What You Support */}
            <div className={styles.pricingCard}>
              <div className={styles.pricingPlan}>Where Your Money Goes</div>
              <div className={styles.moneyBreakdown}>
                <div className={styles.moneyItem}>
                  <div className={styles.moneyDot} style={{ background: 'var(--color-terracotta)' }}></div>
                  <div>
                    <div className={styles.moneyLabel}>Prize Pool</div>
                    <div className={styles.moneyValue}>~£3.00/month</div>
                  </div>
                </div>
                <div className={styles.moneyItem}>
                  <div className={styles.moneyDot} style={{ background: 'var(--color-sage)' }}></div>
                  <div>
                    <div className={styles.moneyLabel}>Charity ({charityPercent}%)</div>
                    <div className={styles.moneyValue}>£{charityAmount}/month</div>
                  </div>
                </div>
                <div className={styles.moneyItem}>
                  <div className={styles.moneyDot} style={{ background: 'var(--color-blue)' }}></div>
                  <div>
                    <div className={styles.moneyLabel}>Platform & Operations</div>
                    <div className={styles.moneyValue}>Remainder</div>
                  </div>
                </div>
              </div>
              <div className={styles.pricingNote}>
                A fixed portion of every subscription builds the monthly prize pool. The jackpot carries forward if unclaimed — it grows!
              </div>
              <Link href="/charities" className="btn btn-secondary w-full">
                Browse Charities
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className={`section ${styles.ctaSection}`}>
        <div className="container">
          <div className={styles.ctaBox}>
            <div className={styles.ctaGlow} aria-hidden="true"></div>
            <span className="section-eyebrow">Ready?</span>
            <h2 className={styles.ctaHeadline}>Play with purpose.<br />Win with heart.</h2>
            <p className={styles.ctaSubtext}>
              Join over 1,200 golfers who've turned their passion into prizes and charitable impact.
            </p>
            <div className={styles.ctaBtns}>
              <Link href="/signup" className="btn btn-primary btn-xl">
                Create Account →
              </Link>
              <Link href="/login" className="btn btn-ghost btn-lg">
                Already a member? Sign In
              </Link>
            </div>
            <div className={styles.ctaCredentials}>
              <div className={styles.credBox}>
                <span className={styles.credRole}>Try as Subscriber</span>
                <code>player@digitalheroes.com / hero2026</code>
              </div>
              <div className={styles.credBox}>
                <span className={styles.credRole}>Try as Admin</span>
                <code>admin@digitalheroes.com / admin2026</code>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className="container">
          <div className={styles.footerInner}>
            <div>
              <div className={styles.logo}>
                digital.<span className={styles.logoAccent}>HEROES</span>
              </div>
              <p className={styles.footerTagline}>Feel, not fairway.</p>
            </div>
            <div className={styles.footerLinks}>
              <Link href="/charities">Charities</Link>
              <Link href="/#how-it-works">How It Works</Link>
              <Link href="/#draw">The Draw</Link>
              <Link href="/login">Sign In</Link>
            </div>
          </div>
          <div className={styles.footerBottom}>
            <p>© 2026 Digital Heroes · digitalheroes.co.in · PRD Sample Assignment</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
