import styles from './SourceBadge.module.css';

const sourceLabels: Record<string, string> = {
  ranobes: 'Ranobes',
  wtr_lab: 'WTR Lab',
  royal_road: 'Royal Road',
  epub: 'EPUB',
};

export default function SourceBadge({ source }: { source: string }) {
  return (
    <span className={`${styles.badge} ${styles[`source-${source}`] || ''}`}>
      {sourceLabels[source] || source}
    </span>
  );
}
