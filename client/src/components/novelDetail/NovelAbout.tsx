import { useState } from 'react';
import SourceBadge from '../common/SourceBadge';
import { formatLongDate, formatRelativeDate } from '../../utils/date';
import styles from './NovelAbout.module.css';

interface Props {
  description: string | null;
  tags: string[];
  source_site: string;
  source_url: string;
  ingested_at: string;
  last_scraped_at: string | null;
}

export default function NovelAbout({
  description,
  tags,
  source_site,
  source_url,
  ingested_at,
  last_scraped_at,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const hasLongDescription = Boolean(description && description.length > 400);

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <h2>About</h2>
        <a href={source_url} target="_blank" rel="noreferrer" className={styles.sourceLink}>
          View on <SourceBadge source={source_site} />
          <i className="ti ti-external-link" aria-hidden="true" />
        </a>
      </div>

      <div className={styles.descriptionWrap}>
        <p className={`${styles.description} ${!expanded && hasLongDescription ? styles.collapsed : ''}`}>
          {description || 'No description has been added for this novel yet.'}
        </p>
        {hasLongDescription && (
          <button className={styles.showMore} type="button" onClick={() => setExpanded((value) => !value)}>
            {expanded ? 'Show less' : 'Show more'}
          </button>
        )}
      </div>

      {tags.length > 0 && (
        <div className={styles.tags}>
          {tags.map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>
      )}

      <div className={styles.meta}>
        <span>Added to catalog: {formatLongDate(ingested_at)}</span>
        <span>Last checked: {last_scraped_at ? formatRelativeDate(last_scraped_at) : 'Never'}</span>
      </div>
    </section>
  );
}
