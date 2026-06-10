import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  getProfile,
  updatePassword as updatePasswordRequest,
  type ProfileResponse,
  type ProfileTopNovel,
} from '../api/profile';
import ActivityChart from '../components/profile/ActivityChart';
import LibraryBreakdown from '../components/profile/LibraryBreakdown';
import StatCard from '../components/profile/StatCard';
import { toApiAssetUrl } from '../utils/assets';
import styles from './ProfilePage.module.css';

function formatCompactNumber(value: number) {
  return new Intl.NumberFormat(undefined, {
    notation: 'compact',
    maximumFractionDigits: value >= 1000 ? 1 : 0,
  }).format(value);
}

function formatWords(value: number) {
  return `${formatCompactNumber(value)} words`;
}

function formatMemberSince(value: string) {
  return `Member since ${new Intl.DateTimeFormat(undefined, {
    month: 'long',
    year: 'numeric',
  }).format(new Date(value))}`;
}

function TopNovelRow({ novel }: { novel: ProfileTopNovel }) {
  const coverSrc = toApiAssetUrl(novel.cover_url);

  return (
    <Link className={styles.topNovel} to={`/novels/${novel.id}`}>
      <div className={styles.topNovelCover}>
        {coverSrc ? (
          <img src={coverSrc} alt={novel.title} />
        ) : (
          <i className="ti ti-book-2" aria-hidden="true" />
        )}
      </div>
      <div className={styles.topNovelBody}>
        <strong>{novel.title}</strong>
        <span>{novel.author || 'Unknown author'}</span>
      </div>
      <div className={styles.topNovelCount}>read {novel.reads_count} chapters</div>
    </Link>
  );
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);

    getProfile()
      .then((nextProfile) => {
        if (mounted) setProfile(nextProfile);
      })
      .catch((err: Error) => {
        if (mounted) setError(err.message || 'Failed to load profile');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const headlineStats = useMemo(() => {
    if (!profile) return [];
    return [
      { label: 'Novels', value: formatCompactNumber(profile.stats.total_novels) },
      { label: 'Chapters', value: formatCompactNumber(profile.stats.chapters_read) },
      { label: 'Words read', value: formatWords(profile.stats.words_read) },
    ];
  }, [profile]);

  const handlePasswordSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPasswordMessage(null);
    setPasswordError(null);

    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation do not match.');
      return;
    }

    setSavingPassword(true);
    try {
      await updatePasswordRequest(currentPassword, newPassword);
      setPasswordMessage('Password updated');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Failed to update password.');
    } finally {
      setSavingPassword(false);
    }
  };

  if (loading) {
    return <div className={styles.state}>Loading profile...</div>;
  }

  if (error || !profile) {
    return (
      <div className={styles.state}>
        <i className="ti ti-alert-circle" aria-hidden="true" />
        <span>{error || 'Profile could not be loaded.'}</span>
      </div>
    );
  }

  const { user, stats } = profile;
  const initial = user.username.trim().charAt(0).toUpperCase() || '?';
  const longestNovel = stats.longest_novel_read
    ? `${stats.longest_novel_read.title} - Ch. ${stats.longest_novel_read.chapter_number}`
    : 'No chapters yet';

  return (
    <div className={styles.page}>
      <section className={styles.header}>
        <div className={styles.avatar} aria-hidden="true">{initial}</div>
        <div className={styles.identity}>
          <h1>{user.username}</h1>
          <p>{formatMemberSince(user.created_at)}</p>
          <div className={styles.headlineStats}>
            {headlineStats.map((item) => (
              <div key={item.label}>
                <strong>{item.value}</strong>
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.streak}>
        <div className={styles.streakItem}>
          <i className="ti ti-flame" aria-hidden="true" />
          <div>
            {stats.streak.current > 0 ? (
              <strong>{stats.streak.current} day{stats.streak.current === 1 ? '' : 's'}</strong>
            ) : (
              <strong className={styles.mutedValue}>No active streak</strong>
            )}
            <span>Current Streak</span>
          </div>
        </div>
        <div className={styles.streakItem}>
          <i className="ti ti-trophy" aria-hidden="true" />
          <div>
            <strong>{stats.streak.longest} day{stats.streak.longest === 1 ? '' : 's'}</strong>
            <span>Longest Streak</span>
          </div>
        </div>
      </section>

      <section>
        <h2 className={styles.sectionTitle}>Reading Stats</h2>
        <div className={styles.statsGrid}>
          <StatCard value={formatCompactNumber(stats.chapters_read)} label="Chapters read" icon="ti-book" />
          <StatCard value={formatCompactNumber(stats.novels_started)} label="Novels started" icon="ti-books" />
          <StatCard value={formatCompactNumber(stats.novels_completed)} label="Novels completed" icon="ti-circle-check" />
          <StatCard value={formatCompactNumber(stats.authors_explored)} label="Authors explored" icon="ti-pencil" />
          <StatCard value={stats.average_chapters_per_day.toFixed(1)} label="Average chapters/day" icon="ti-chart-bar" />
          <StatCard value={longestNovel} label="Longest novel read" icon="ti-stairs-up" />
        </div>
      </section>

      <ActivityChart activity={stats.activity} />

      <section>
        <h2 className={styles.sectionTitle}>Library Breakdown</h2>
        <LibraryBreakdown
          statusBreakdown={stats.library_status_breakdown}
          sourceBreakdown={stats.library_source_breakdown}
        />
      </section>

      <section>
        <h2 className={styles.sectionTitle}>Most Read</h2>
        <div className={styles.topNovels}>
          {stats.top_novels.length > 0 ? (
            stats.top_novels.map((novel) => <TopNovelRow key={novel.id} novel={novel} />)
          ) : (
            <div className={styles.empty}>Start reading chapters to build your most-read list.</div>
          )}
        </div>
      </section>

      <section className={styles.settings}>
        <h2 className={styles.sectionTitle}>Account Settings</h2>
        <form className={styles.passwordForm} onSubmit={handlePasswordSubmit}>
          <label>
            <span>Current password</span>
            <input
              type="password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              autoComplete="current-password"
              required
            />
          </label>
          <label>
            <span>New password</span>
            <input
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
            />
          </label>
          <label>
            <span>Confirm new password</span>
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
            />
          </label>
          <div className={styles.formFooter}>
            <button type="submit" disabled={savingPassword}>
              {savingPassword ? 'Updating...' : 'Change Password'}
            </button>
            <div className={styles.formMessage} aria-live="polite">
              {passwordMessage && <span className={styles.success}>{passwordMessage}</span>}
              {passwordError && <span className={styles.error}>{passwordError}</span>}
            </div>
          </div>
        </form>
      </section>
    </div>
  );
}
