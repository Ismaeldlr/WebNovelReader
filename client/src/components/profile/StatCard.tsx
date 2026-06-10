import styles from './StatCard.module.css';

interface StatCardProps {
  value: string | number;
  label: string;
  icon: string;
}

export default function StatCard({ value, label, icon }: StatCardProps) {
  return (
    <article className={styles.card}>
      <div className={styles.icon} aria-hidden="true">
        <i className={`ti ${icon}`} />
      </div>
      <strong>{value}</strong>
      <span>{label}</span>
    </article>
  );
}
