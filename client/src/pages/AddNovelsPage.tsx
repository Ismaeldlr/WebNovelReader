import { useState } from 'react';
import ImportMethodCard from '../components/addNovels/ImportMethodCard';
import EpubImporter from '../components/addNovels/EpubImporter';
import RecentImports from '../components/addNovels/RecentImports';
import styles from './AddNovelsPage.module.css';

type ImportMethod = 'epub' | 'url' | 'batch';

export default function AddNovelsPage() {
  const [selectedMethod, setSelectedMethod] = useState<ImportMethod>('epub');
  const [refreshSignal, setRefreshSignal] = useState(0);

  return (
    <div className={styles.page}>
      <section className={styles.summary}>
        <div>
          <div className={styles.eyebrow}>Add Novels</div>
          <h1>Import into your library</h1>
          <p>Start with EPUB today. URL scraping and batch tools are staged for the same ingestion history.</p>
        </div>
      </section>

      <section className={styles.methods} aria-label="Import methods">
        <ImportMethodCard
          label="Upload EPUB"
          description="Import a local EPUB file with metadata, chapters, and cover art."
          icon="ti-book-upload"
          active={selectedMethod === 'epub'}
          available
          meta="Ready now"
          onSelect={() => setSelectedMethod('epub')}
        />
        <ImportMethodCard
          label="Add by URL"
          description="Submit a source URL and track the scrape as an ingestion job."
          icon="ti-link-plus"
          active={selectedMethod === 'url'}
          available={false}
          sources={['Ranobes', 'WTR Lab', 'Royal Road']}
          meta="Scraping support coming soon"
          onSelect={() => setSelectedMethod('url')}
        />
        <ImportMethodCard
          label="Batch Import"
          description="Queue multiple files or URLs and review results together."
          icon="ti-stack-push"
          active={selectedMethod === 'batch'}
          available={false}
          meta="Planned"
          onSelect={() => setSelectedMethod('batch')}
        />
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <div>
            <span className={styles.eyebrow}>Current Method</span>
            <h2>EPUB Import</h2>
          </div>
        </div>
        <EpubImporter onImported={() => setRefreshSignal(value => value + 1)} />
      </section>

      <RecentImports refreshSignal={refreshSignal} />
    </div>
  );
}
