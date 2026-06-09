import { useState } from 'react';
import type { KeyboardEvent } from 'react';
import styles from './TagEditor.module.css';

interface TagEditorProps {
  tags: string[];
  onChange: (tags: string[]) => void;
}

export default function TagEditor({ tags, onChange }: TagEditorProps) {
  const [draft, setDraft] = useState('');

  const addTag = (value: string) => {
    const nextTag = value.trim();
    if (!nextTag) return;

    const exists = tags.some((tag) => tag.toLowerCase() === nextTag.toLowerCase());
    if (!exists) onChange([...tags, nextTag]);
    setDraft('');
  };

  const removeTag = (tagToRemove: string) => {
    onChange(tags.filter((tag) => tag !== tagToRemove));
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      addTag(draft);
    }
  };

  return (
    <div className={styles.editor}>
      {tags.length > 0 && (
        <div className={styles.pills}>
          {tags.map((tag) => (
            <span className={styles.pill} key={tag}>
              {tag}
              <button type="button" onClick={() => removeTag(tag)} aria-label={`Remove ${tag}`}>
                <i className="ti ti-x" aria-hidden="true" />
              </button>
            </span>
          ))}
        </div>
      )}
      <input
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => addTag(draft)}
        onKeyDown={handleKeyDown}
        placeholder="Add a tag"
      />
    </div>
  );
}
