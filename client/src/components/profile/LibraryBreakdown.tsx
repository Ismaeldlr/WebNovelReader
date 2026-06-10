import type { ProfileBreakdownItem } from '../../api/profile';
import styles from './LibraryBreakdown.module.css';

interface LibraryBreakdownProps {
  statusBreakdown: ProfileBreakdownItem[];
  sourceBreakdown: ProfileBreakdownItem[];
}

const statusLabels: Record<string, string> = {
  reading: 'Reading',
  following: 'Following',
  on_hold: 'On hold',
  dropped: 'Dropped',
  completed: 'Completed',
};

const sourceLabels: Record<string, string> = {
  ranobes: 'Ranobes',
  wtr_lab: 'WTR Lab',
  royal_road: 'Royal Road',
  epub: 'EPUB',
};

function BreakdownGroup({
  title,
  items,
  labels,
  variant,
}: {
  title: string;
  items: ProfileBreakdownItem[];
  labels: Record<string, string>;
  variant: 'status' | 'source';
}) {
  const maxCount = Math.max(1, ...items.map((item) => item.count));

  return (
    <article className={styles.group}>
      <h3>{title}</h3>
      <div className={styles.rows}>
        {items.map((item) => {
          const width = Math.round((item.count / maxCount) * 100);
          return (
            <div className={styles.row} key={`${variant}-${item.key}`}>
              <div className={styles.meta}>
                <span className={`${styles.dot} ${styles[`${variant}-${item.key}`]}`} />
                <span>{labels[item.key] || item.key}</span>
                <strong>{item.count}</strong>
              </div>
              <div className={styles.track} aria-hidden="true">
                <div className={styles.fill} style={{ width: `${width}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </article>
  );
}

export default function LibraryBreakdown({
  statusBreakdown,
  sourceBreakdown,
}: LibraryBreakdownProps) {
  return (
    <section className={styles.section}>
      <BreakdownGroup
        title="By Status"
        items={statusBreakdown}
        labels={statusLabels}
        variant="status"
      />
      <BreakdownGroup
        title="By Source"
        items={sourceBreakdown}
        labels={sourceLabels}
        variant="source"
      />
    </section>
  );
}
