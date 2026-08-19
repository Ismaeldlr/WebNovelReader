import { useEffect, useState } from 'react';
import styles from './ServiceWorkerUpdateBanner.module.css';

interface ServiceWorkerUpdateBannerProps {
  updateSW: (reloadPage?: boolean) => Promise<void>;
}

export default function ServiceWorkerUpdateBanner({ updateSW }: ServiceWorkerUpdateBannerProps) {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const handleUpdateAvailable = () => setShowBanner(true);
    window.addEventListener('webnovelhub:update-available', handleUpdateAvailable);

    return () => {
      window.removeEventListener('webnovelhub:update-available', handleUpdateAvailable);
    };
  }, []);

  if (!showBanner) return null;

  return (
    <div className={styles.banner} role="status">
      <button
        type="button"
        onClick={() => {
          void updateSW(true);
        }}
      >
        Update available - click to refresh
      </button>
    </div>
  );
}
