import styles from './ImportMethodCard.module.css';

interface ImportMethodCardProps {
  label: string;
  description: string;
  icon: string;
  active: boolean;
  available: boolean;
  meta?: string;
  sources?: string[];
  onSelect: () => void;
}

export default function ImportMethodCard({
  label,
  description,
  icon,
  active,
  available,
  meta,
  sources = [],
  onSelect,
}: ImportMethodCardProps) {
  return (
    <button
      type="button"
      className={[
        styles.card,
        active ? styles.active : '',
        available ? '' : styles.unavailable,
      ].join(' ')}
      onClick={available ? onSelect : undefined}
      aria-pressed={active}
      disabled={!available}
    >
      <span className={styles.iconWrap}>
        <i className={`ti ${icon}`} aria-hidden="true" />
      </span>
      <span className={styles.content}>
        <span className={styles.topLine}>
          <span className={styles.label}>{label}</span>
          {!available && <span className={styles.badge}>Coming soon</span>}
        </span>
        <span className={styles.description}>{description}</span>
        {sources.length > 0 && (
          <span className={styles.sources}>
            {sources.map(source => (
              <span key={source}>{source}</span>
            ))}
          </span>
        )}
        {meta && <span className={styles.meta}>{meta}</span>}
      </span>
      {!available && (
        <span className={styles.lock}>
          <i className="ti ti-lock" aria-hidden="true" />
        </span>
      )}
    </button>
  );
}
