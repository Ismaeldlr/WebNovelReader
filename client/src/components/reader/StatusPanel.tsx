import type { LibraryStatus } from '../../types/novel';
import styles from './StatusPanel.module.css';

interface Props {
  currentStatus: LibraryStatus | null;
  onStatusChange: (status: LibraryStatus) => void;
}

const STATUS_OPTIONS: Array<{ value: LibraryStatus; label: string }> = [
  { value: 'reading', label: 'Reading' },
  { value: 'following', label: 'Following' },
  { value: 'on_hold', label: 'On hold' },
  { value: 'dropped', label: 'Dropped' },
  { value: 'completed', label: 'Completed' },
];

export default function StatusPanel({ currentStatus, onStatusChange }: Props) {
  return (
    <div className={styles.panel}>
      <span className={styles.caret} aria-hidden="true" />
      {STATUS_OPTIONS.map((option) => {
        const isActive = option.value === currentStatus;

        return (
          <button
            className={styles.option}
            key={option.value}
            type="button"
            onClick={() => onStatusChange(option.value)}
          >
            <span className={`${styles.radio} ${isActive ? styles.radioActive : ''}`} />
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
