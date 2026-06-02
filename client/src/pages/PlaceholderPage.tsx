import styles from './PlaceholderPage.module.css';

interface Props {
  icon: string;
  title: string;
  description: string;
}

export default function PlaceholderPage({ icon, title, description }: Props) {
  return (
    <div className={styles.wrap}>
      <i className={`ti ${icon} ${styles.icon}`} aria-hidden="true" />
      <div className={styles.title}>{title}</div>
      <div className={styles.desc}>{description}</div>
    </div>
  );
}
