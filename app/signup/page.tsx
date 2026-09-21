'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import styles from '../login/login.module.css';
import signupStyles from './signup.module.css';

interface CharityOption {
  id: string;
  name: string;
  tagline?: string;
  category?: string;
}

export default function SignupPage() {
  const { signup } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [plan, setPlan] = useState<'monthly' | 'yearly'>('monthly');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [charityId, setCharityId] = useState('');
  const [charityPercent, setCharityPercent] = useState(10);
  const [isLoading, setIsLoading] = useState(false);
  const [charitiesLoading, setCharitiesLoading] = useState(true);
  const [charities, setCharities] = useState<CharityOption[]>([]);
  const [error, setError] = useState('');

  const monthlyPrice = 19.99;
  const yearlyPrice = 14.99;
  const price = plan === 'monthly' ? monthlyPrice : yearlyPrice;
  const charityAmount = ((price * charityPercent) / 100).toFixed(2);

  // Fetch charities from API (dynamic — not hardcoded)
  useEffect(() => {
    setCharitiesLoading(true);
    fetch('/api/charities')
      .then(r => r.json())
      .then(data => {
        const list: CharityOption[] = data.charities ?? [];
        setCharities(list);
        if (list.length > 0 && !charityId) {
          setCharityId(list[0].id);
        }
      })
      .catch(() => {
        // Silently fail — charities list will just be empty
      })
      .finally(() => setCharitiesLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleComplete = async () => {
    setError('');
    if (!name.trim() || !email.trim() || !password) {
      setError('Please fill in all fields.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (!charityId) {
      setError('Please select a charity.');
      return;
    }

    setIsLoading(true);
    const result = await signup({ name, email, password, plan, charityId, charityPercent });
    if (result.success) {
      router.push('/dashboard');
    } else {
      setError(result.error ?? 'Signup failed. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.bgGlow} aria-hidden="true"></div>

      <div className={styles.header}>
        <Link href="/" className={styles.logo}>
          digital.<span className={styles.logoAccent}>HEROES</span>
        </Link>
      </div>

      <div className={styles.container}>
        <div className={`${styles.card} ${signupStyles.signupCard}`}>
          {/* Step Indicator */}
          <div className={signupStyles.steps}>
            {['Plan', 'Details', 'Charity'].map((s, i) => (
              <div key={i} className={signupStyles.stepRow}>
                <div className={`${signupStyles.stepDot} ${i + 1 <= step ? signupStyles.stepDotActive : ''} ${i + 1 < step ? signupStyles.stepDotDone : ''}`}>
                  {i + 1 < step ? '✓' : i + 1}
                </div>
                <span className={`${signupStyles.stepName} ${i + 1 === step ? signupStyles.stepNameActive : ''}`}>{s}</span>
                {i < 2 && <div className={signupStyles.stepLine}></div>}
              </div>
            ))}
          </div>

          {/* Step 1: Choose Plan */}
          {step === 1 && (
            <div className={signupStyles.stepContent}>
              <h2 className={styles.title} style={{ fontSize: 'var(--font-size-2xl)' }}>Choose your plan</h2>
              <p className={styles.subtitle}>Both plans include full platform access.</p>

              <div className={signupStyles.planCards}>
                <button
                  id="plan-monthly"
                  className={`${signupStyles.planCard} ${plan === 'monthly' ? signupStyles.planCardActive : ''}`}
                  onClick={() => setPlan('monthly')}
                >
                  <div className={signupStyles.planName}>Monthly</div>
                  <div className={signupStyles.planPrice}>£19.99<span>/mo</span></div>
                  <div className={signupStyles.planDesc}>Flexible, cancel anytime</div>
                </button>
                <button
                  id="plan-yearly"
                  className={`${signupStyles.planCard} ${plan === 'yearly' ? signupStyles.planCardActive : ''}`}
                  onClick={() => setPlan('yearly')}
                >
                  <div className={signupStyles.planBadge}>Save 25%</div>
                  <div className={signupStyles.planName}>Yearly</div>
                  <div className={signupStyles.planPrice}>£14.99<span>/mo</span></div>
                  <div className={signupStyles.planDesc}>£179.88/year</div>
                </button>
              </div>

              <button className="btn btn-primary btn-lg w-full" onClick={() => setStep(2)}>
                Continue →
              </button>
            </div>
          )}

          {/* Step 2: Account Details */}
          {step === 2 && (
            <div className={signupStyles.stepContent}>
              <h2 className={styles.title} style={{ fontSize: 'var(--font-size-2xl)' }}>Create your account</h2>

              {error && <div className="alert alert-error">{error}</div>}

              <div className="form-group">
                <label htmlFor="signup-name" className="form-label">Full name</label>
                <input
                  id="signup-name"
                  type="text"
                  className="form-input"
                  placeholder="Your full name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  autoComplete="name"
                />
              </div>
              <div className="form-group">
                <label htmlFor="signup-email" className="form-label">Email address</label>
                <input
                  id="signup-email"
                  type="email"
                  className="form-input"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>
              <div className="form-group">
                <label htmlFor="signup-password" className="form-label">Password <span className="text-muted" style={{fontWeight:400}}>(min. 6 characters)</span></label>
                <input
                  id="signup-password"
                  type="password"
                  className="form-input"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </div>

              <div className={signupStyles.btnRow}>
                <button className="btn btn-ghost" onClick={() => { setError(''); setStep(1); }}>← Back</button>
                <button
                  className="btn btn-primary flex-1"
                  onClick={() => { setError(''); setStep(3); }}
                  disabled={!name.trim() || !email.trim() || password.length < 6}
                >
                  Continue →
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Choose Charity */}
          {step === 3 && (
            <div className={signupStyles.stepContent}>
              <h2 className={styles.title} style={{ fontSize: 'var(--font-size-2xl)' }}>Choose your charity</h2>
              <p className={styles.subtitle}>Minimum 10% of your subscription goes here every month.</p>

              {error && <div className="alert alert-error mb-4">{error}</div>}

              {charitiesLoading ? (
                <div className="flex items-center justify-center" style={{ padding: '2rem 0' }}>
                  <span className="spinner"></span>
                  <span className="ml-3 text-sm text-muted">Loading charities…</span>
                </div>
              ) : (
                <div className={signupStyles.charityList}>
                  {charities.map(c => (
                    <button
                      key={c.id}
                      id={`charity-${c.id}`}
                      className={`${signupStyles.charityOption} ${charityId === c.id ? signupStyles.charityOptionActive : ''}`}
                      onClick={() => setCharityId(c.id)}
                    >
                      <span className={signupStyles.charityCheck}>{charityId === c.id ? '●' : '○'}</span>
                      <span>
                        <span style={{ display: 'block', fontWeight: 600 }}>{c.name}</span>
                        {c.tagline && <span style={{ display: 'block', fontSize: '0.75rem', opacity: 0.7 }}>{c.tagline}</span>}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              <div className={signupStyles.percentRow}>
                <span className="text-sm text-secondary">Charity %: <strong>{charityPercent}%</strong> = £{charityAmount}/month</span>
                <input
                  type="range" min={10} max={50} value={charityPercent}
                  onChange={e => setCharityPercent(Number(e.target.value))}
                  aria-label="Charity contribution percentage"
                />
              </div>

              <div className={signupStyles.btnRow}>
                <button className="btn btn-ghost" onClick={() => { setError(''); setStep(2); }}>← Back</button>
                <button
                  id="complete-signup"
                  className="btn btn-primary flex-1"
                  onClick={handleComplete}
                  disabled={isLoading || !charityId || charitiesLoading}
                >
                  {isLoading ? <><span className="spinner"></span> Creating account…</> : 'Complete Signup →'}
                </button>
              </div>
            </div>
          )}

          <p className={styles.signupLink}>
            Already have an account? <Link href="/login">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
