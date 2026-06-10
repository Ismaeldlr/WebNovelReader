import { useEffect, useMemo, useRef } from 'react';
import type { CSSProperties } from 'react';
import type { ProfileActivityDay } from '../../api/profile';
import styles from './ActivityChart.module.css';

interface ActivityChartProps {
  activity: ProfileActivityDay[];
}

function formatChartDate(dateValue: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
  }).format(new Date(`${dateValue}T00:00:00`));
}

export default function ActivityChart({ activity }: ActivityChartProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const maxCount = useMemo(
    () => Math.max(1, ...activity.map((day) => day.count)),
    [activity]
  );
  const todayKey = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    const node = scrollRef.current;
    if (node) node.scrollLeft = node.scrollWidth;
  }, [activity]);

  return (
    <section className={styles.section}>
      <div className={styles.heading}>
        <span>Last 90 days</span>
        <strong>Reading Activity</strong>
      </div>

      <div className={styles.scroller} ref={scrollRef}>
        <div className={styles.chart} aria-label="Chapters read per day over the last 90 days">
          {activity.map((day) => {
            const height = day.count > 0 ? Math.max(8, Math.round((day.count / maxCount) * 100)) : 2;
            const style = { '--bar-height': `${height}%` } as CSSProperties;
            const title = `${formatChartDate(day.date)}: ${day.count} chapter${day.count === 1 ? '' : 's'}`;

            return (
              <div className={styles.day} key={day.date}>
                <div
                  className={`${styles.bar} ${day.date === todayKey ? styles.today : ''}`}
                  style={style}
                  title={title}
                  aria-label={title}
                />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
