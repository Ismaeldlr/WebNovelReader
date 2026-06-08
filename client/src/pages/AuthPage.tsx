import { useState } from 'react';
import type { FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import styles from './AuthPage.module.css';

type Mode = 'login' | 'register';

export default function AuthPage() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isRegistering = mode === 'register';

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      if (isRegistering) {
        await register(username, password);
      } else {
        await login(username, password);
      }
    } catch (err: any) {
      setError(err.message || 'Unable to sign in.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.panel} aria-labelledby="auth-title">
        <div className={styles.brand}>
          <div className={styles.logo}>
            <i className="ti ti-book-2" aria-hidden="true" />
          </div>
          <div>
            <h1 id="auth-title">Webnovel Hub</h1>
            <p>{isRegistering ? 'Create your reading account.' : 'Sign in to your library.'}</p>
          </div>
        </div>

        <div className={styles.segmented} role="tablist" aria-label="Auth mode">
          <button
            type="button"
            className={mode === 'login' ? styles.active : ''}
            onClick={() => setMode('login')}
            aria-selected={mode === 'login'}
          >
            Sign in
          </button>
          <button
            type="button"
            className={mode === 'register' ? styles.active : ''}
            onClick={() => setMode('register')}
            aria-selected={mode === 'register'}
          >
            Register
          </button>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <label>
            <span>Username</span>
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
              minLength={3}
              maxLength={32}
              pattern="[A-Za-z0-9_]+"
              required
            />
          </label>

          <label>
            <span>Password</span>
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete={isRegistering ? 'new-password' : 'current-password'}
              minLength={8}
              maxLength={128}
              type="password"
              required
            />
          </label>

          {error && <div className={styles.error}>{error}</div>}

          <button className={styles.submit} type="submit" disabled={submitting}>
            {submitting ? 'Working...' : isRegistering ? 'Create account' : 'Sign in'}
          </button>
        </form>
      </section>
    </main>
  );
}
