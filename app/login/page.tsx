'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from './login.module.css';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    const result = await login(email, password);
    if (result.success) {
      // Redirect based on role
      const saved = sessionStorage.getItem('dh_user');
      if (saved) {
        const u = JSON.parse(saved);
        router.push(u.role === 'admin' ? '/admin' : '/dashboard');
      } else {
        router.push('/dashboard');
      }
    } else {
      setError(result.error ?? 'Login failed.');
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
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h1 className={styles.title}>Welcome back.</h1>
            <p className={styles.subtitle}>Sign in to your Digital Heroes account.</p>
          </div>

          <form onSubmit={handleSubmit} className={styles.form} noValidate>
            {error && (
              <div className="alert alert-error" role="alert">
                ⚠ {error}
              </div>
            )}

            <div className="form-group">
              <label htmlFor="email" className="form-label">Email address</label>
              <input
                id="email"
                type="email"
                className="form-input"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div className="form-group">
              <label htmlFor="password" className="form-label">Password</label>
              <input
                id="password"
                type="password"
                className="form-input"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg w-full"
              disabled={isLoading || !email || !password}
              id="login-submit"
            >
              {isLoading ? (
                <><span className="spinner"></span> Signing In…</>
              ) : (
                'Sign In →'
              )}
            </button>
          </form>

          <p className={styles.signupLink}>
            New here? <Link href="/signup">Create an account</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
