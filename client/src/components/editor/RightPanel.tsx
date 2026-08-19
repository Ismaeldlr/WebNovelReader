import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import styles from './RightPanel.module.css';

export interface RightPanelTab {
  id: string;
  label: string;
  icon: string;
  content: ReactNode;
}

interface RightPanelProps {
  tabs: RightPanelTab[];
  storageKey: string;
}

export default function RightPanel({ tabs, storageKey }: RightPanelProps) {
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem(storageKey) || tabs[0]?.id || '');
  const active = tabs.find(tab => tab.id === activeTab) || tabs[0];

  useEffect(() => {
    if (activeTab) localStorage.setItem(storageKey, activeTab);
  }, [activeTab, storageKey]);

  return (
    <div className={styles.panel}>
      <div className={styles.tabs}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            type="button"
            className={tab.id === active.id ? styles.activeTab : styles.tab}
            onClick={() => setActiveTab(tab.id)}
          >
            <i className={`ti ${tab.icon}`} aria-hidden="true" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      <div className={styles.content}>{active.content}</div>
    </div>
  );
}
