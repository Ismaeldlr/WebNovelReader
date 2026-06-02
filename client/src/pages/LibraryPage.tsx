import NovelCard from '../components/library/NovelCard';
import FilterBar from '../components/library/FilterBar';
import styles from './LibraryPage.module.css';

const MOCK_NOVELS = [
  {
    id: 1,
    title: 'The Legendary Mechanic',
    author: 'Chocolion',
    status: 'Reading' as const,
    currentChapter: 748,
    totalChapters: 1463,
    newChapters: 6,
    isFavorite: true,
    coverVariant: 'a' as const,
  },
  {
    id: 2,
    title: "Omniscient Reader's Viewpoint",
    author: 'singNsong',
    status: 'Reading' as const,
    currentChapter: 524,
    totalChapters: 551,
    newChapters: 2,
    isFavorite: false,
    coverVariant: 'b' as const,
  },
  {
    id: 3,
    title: 'Lord of the Mysteries',
    author: 'Cuttlefish That Loves Diving',
    status: 'Completed' as const,
    currentChapter: 1432,
    totalChapters: 1432,
    newChapters: 0,
    isFavorite: false,
    coverVariant: 'c' as const,
  },
  {
    id: 4,
    title: 'The Beginning After The End',
    author: 'TurtleMe',
    status: 'Following' as const,
    currentChapter: 143,
    totalChapters: 289,
    newChapters: 1,
    isFavorite: true,
    coverVariant: 'd' as const,
  },
];

const STATS = [
  { label: 'Total novels',     value: '24',    sub: 'across 3 sources' },
  { label: 'Reading',          value: '8',     sub: 'active series',   accent: true },
  { label: 'Chapters cached',  value: '1,204', sub: 'offline ready' },
  { label: 'Last updated',     value: '2h ago',sub: 'all sources checked' },
];

export default function LibraryPage() {
  return (
    <>
      <div className={styles.updateStrip}>
        <i className="ti ti-sparkles" aria-hidden="true" />
        <span>
          <strong>3 new chapters</strong> available across your library since your last visit.
        </span>
        <div className={styles.stripRight}>
          View all <i className="ti ti-arrow-right" aria-hidden="true" />
        </div>
      </div>

      <div className={styles.statsRow}>
        {STATS.map(s => (
          <div key={s.label} className={styles.statCard}>
            <div className={styles.statLabel}>{s.label}</div>
            <div className={`${styles.statValue} ${s.accent ? styles.statAccent : ''}`}>
              {s.value}
            </div>
            <div className={styles.statSub}>{s.sub}</div>
          </div>
        ))}
      </div>

      <FilterBar />

      <div>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTitle}>Recently read</span>
          <a className={styles.seeAll}>See all 24</a>
        </div>
      </div>

      <div className={styles.grid}>
        {MOCK_NOVELS.map(novel => (
          <NovelCard key={novel.id} {...novel} />
        ))}
      </div>
    </>
  );
}
