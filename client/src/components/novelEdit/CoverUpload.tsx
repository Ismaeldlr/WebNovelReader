import { useEffect, useMemo, useState } from 'react';
import type { ChangeEvent } from 'react';
import { updateNovelCover } from '../../api/novels';
import { toApiAssetUrl } from '../../utils/assets';
import styles from './CoverUpload.module.css';

interface CoverUploadProps {
  novelId: string;
  title: string;
  coverUrl: string | null;
}

function withCacheToken(url: string | null, token: number): string | null {
  if (!url) return null;
  const resolvedUrl = toApiAssetUrl(url);
  if (!resolvedUrl) return null;
  return `${resolvedUrl}${resolvedUrl.includes('?') ? '&' : '?'}v=${token}`;
}

export default function CoverUpload({ novelId, title, coverUrl }: CoverUploadProps) {
  const [currentCover, setCurrentCover] = useState(coverUrl);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [cacheToken, setCacheToken] = useState(Date.now());
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentSrc = useMemo(() => withCacheToken(currentCover, cacheToken), [cacheToken, currentCover]);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] || null;
    setError(null);

    if (!selected) {
      setFile(null);
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(selected.type)) {
      setFile(null);
      setError('Cover must be a JPG, PNG, or WEBP image.');
      return;
    }

    setFile(selected);
  };

  const handleUpload = async () => {
    if (!file || uploading) return;

    setUploading(true);
    setError(null);
    try {
      const nextCover = await updateNovelCover(novelId, file);
      setCurrentCover(nextCover);
      setCacheToken(Date.now());
      setFile(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to upload cover.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={styles.coverEditor}>
      <div className={styles.previews}>
        <div className={styles.previewBlock}>
          <span>Current</span>
          {currentSrc ? (
            <img src={currentSrc} alt={title} />
          ) : (
            <div className={styles.placeholder}>{title.charAt(0)}</div>
          )}
        </div>

        {previewUrl && (
          <div className={styles.previewBlock}>
            <span>New</span>
            <img src={previewUrl} alt="New cover preview" />
          </div>
        )}
      </div>

      <div className={styles.actions}>
        <label className={styles.fileButton}>
          Replace Cover
          <input type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" onChange={handleFileChange} />
        </label>

        {file && (
          <button className={styles.uploadButton} type="button" onClick={handleUpload} disabled={uploading}>
            {uploading ? 'Uploading...' : 'Upload Cover'}
          </button>
        )}
      </div>

      {error && <div className={styles.error}>{error}</div>}
    </div>
  );
}
