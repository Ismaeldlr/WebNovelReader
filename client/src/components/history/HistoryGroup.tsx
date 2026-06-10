import type { HistoryEntry } from '../../api/history';
import HistoryEntryRow from './HistoryEntryRow';
import styles from './HistoryGroup.module.css';

interface HistoryGroupProps {
  dateLabel: string;
  entries: HistoryEntry[];
}

export default function HistoryGroup({ dateLabel, entries }: HistoryGroupProps) {
  return (
    <section className={styles.group}>
      <div className={styles.heading}>
        <span>{dateLabel}</span>
      </div>
      <div className={styles.entries}>
        {entries.map((entry) => (
          <HistoryEntryRow
            key={entry.id}
            entry={entry}
            showTodayTime={dateLabel === 'Today'}
          />
        ))}
      </div>
    </section>
  );
}
