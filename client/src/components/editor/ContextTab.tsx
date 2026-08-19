import { useEffect, useState } from 'react';
import { getProjectContext, updateProjectContext } from '../../api/write';
import type { ProjectContext } from '../../types/write';
import styles from './ContextTab.module.css';

interface ContextTabProps {
  projectId: string;
}

const emptyContext: ProjectContext = {
  setting: '',
  tone: '',
  themes: '',
  timeline: '',
  globalNotes: '',
};

const fields: Array<{
  key: keyof ProjectContext;
  label: string;
  rows: number;
  placeholder: string;
}> = [
  { key: 'setting', label: 'Setting', rows: 3, placeholder: 'Where and when the story takes place.' },
  { key: 'tone', label: 'Tone', rows: 2, placeholder: 'Mood, voice, and narrative texture.' },
  { key: 'themes', label: 'Themes', rows: 3, placeholder: 'Core themes, motifs, questions.' },
  { key: 'timeline', label: 'Timeline overview', rows: 2, placeholder: 'The story span, eras, or major time jumps.' },
  { key: 'globalNotes', label: 'Global notes', rows: 6, placeholder: 'Loose reference notes for the draft.' },
];

export default function ContextTab({ projectId }: ContextTabProps) {
  const [context, setContext] = useState<ProjectContext>(emptyContext);
  const [savedField, setSavedField] = useState<keyof ProjectContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    getProjectContext(projectId)
      .then(nextContext => {
        if (mounted) setContext(nextContext);
      })
      .catch((err: Error) => {
        if (mounted) setError(err.message);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [projectId]);

  useEffect(() => {
    if (!savedField) return;
    const timer = window.setTimeout(() => setSavedField(null), 2000);
    return () => window.clearTimeout(timer);
  }, [savedField]);

  const saveField = async (key: keyof ProjectContext) => {
    try {
      await updateProjectContext(projectId, { [key]: context[key] });
      setSavedField(key);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save context');
    }
  };

  if (loading) {
    return <div className={styles.state}>Loading context...</div>;
  }

  return (
    <div className={styles.context}>
      {error && <div className={styles.error}>{error}</div>}
      {fields.map(field => (
        <label key={field.key} className={styles.field}>
          <span>
            {field.label}
            {savedField === field.key && <small>Saved</small>}
          </span>
          <textarea
            rows={field.rows}
            value={context[field.key]}
            placeholder={field.placeholder}
            onChange={event => setContext(current => ({ ...current, [field.key]: event.target.value }))}
            onBlur={() => {
              void saveField(field.key);
            }}
          />
        </label>
      ))}
    </div>
  );
}
