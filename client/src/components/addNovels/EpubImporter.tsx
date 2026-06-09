import { useRef, useState } from 'react';
import type { ChangeEvent, DragEvent, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { importEpub, type EpubImportResult } from '../../api/import';
import styles from './EpubImporter.module.css';

interface EpubImporterProps {
  onImported: () => void;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function EpubImporter({ onImported }: EpubImporterProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<EpubImportResult | null>(null);

  const chooseFile = (nextFile: File | null) => {
    if (!nextFile) return;

    if (!nextFile.name.toLowerCase().endsWith('.epub')) {
      setError('Please choose an EPUB file.');
      return;
    }

    setFile(nextFile);
    setError(null);
    setResult(null);
  };

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    chooseFile(event.target.files?.[0] || null);
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (event.currentTarget.contains(event.relatedTarget as Node)) return;
    setDragActive(false);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(false);
    chooseFile(event.dataTransfer.files?.[0] || null);
  };

  const handleRemove = () => {
    setFile(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleReset = () => {
    setFile(null);
    setError(null);
    setResult(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!file || importing) return;

    setImporting(true);
    setError(null);
    try {
      const imported = await importEpub(file);
      setResult(imported);
      setFile(null);
      onImported();
      if (inputRef.current) inputRef.current.value = '';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed.');
    } finally {
      setImporting(false);
    }
  };

  if (result) {
    return (
      <div className={styles.success}>
        <div className={styles.successIcon}>
          <i className="ti ti-circle-check" aria-hidden="true" />
        </div>
        <div className={styles.successBody}>
          <span className={styles.kicker}>Import complete</span>
          <h2>{result.title}</h2>
          <div className={styles.summary}>
            <span>{result.author || 'Unknown author'}</span>
            <span>{result.chapterCount} chapter{result.chapterCount === 1 ? '' : 's'}</span>
          </div>
          <div className={styles.actions}>
            <Link className={styles.primaryLink} to={`/novels/${result.id}`}>
              View Novel
            </Link>
            <button type="button" className={styles.secondaryButton} onClick={handleReset}>
              Import Another
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <input
        ref={inputRef}
        className={styles.fileInput}
        type="file"
        accept=".epub,application/epub+zip"
        onChange={handleInputChange}
      />

      <div
        className={[styles.dropZone, dragActive ? styles.dragActive : ''].join(' ')}
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') inputRef.current?.click();
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className={styles.dropIcon}>
          <i className="ti ti-book-upload" aria-hidden="true" />
        </div>
        <div>
          <h2>Upload EPUB</h2>
          <p>Drop an EPUB file here or click to choose one from your device.</p>
        </div>
      </div>

      {file && (
        <div className={styles.previewRow}>
          <div className={styles.fileMeta}>
            <i className="ti ti-file-type-epub" aria-hidden="true" />
            <div>
              <strong>{file.name}</strong>
              <span>{formatFileSize(file.size)}</span>
            </div>
          </div>
          <button type="button" onClick={handleRemove}>
            Remove
          </button>
        </div>
      )}

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.submitRow}>
        <button type="submit" className={styles.importButton} disabled={!file || importing}>
          {importing ? (
            <>
              <i className="ti ti-loader-2" aria-hidden="true" />
              Importing...
            </>
          ) : (
            <>
              <i className="ti ti-upload" aria-hidden="true" />
              Import
            </>
          )}
        </button>
      </div>
    </form>
  );
}
