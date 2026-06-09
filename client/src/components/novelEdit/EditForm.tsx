import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { updateNovel, type NovelUpdatePayload } from '../../api/novels';
import type { NovelDetail } from '../../types/novel';
import TagEditor from './TagEditor';
import styles from './EditForm.module.css';

interface EditFormProps {
  novel: NovelDetail;
}

function normalizeNullable(value: string | null): string {
  return value || '';
}

function tagsEqual(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((tag, index) => tag === right[index]);
}

export default function EditForm({ novel }: EditFormProps) {
  const navigate = useNavigate();
  const [title, setTitle] = useState(novel.title);
  const [author, setAuthor] = useState(normalizeNullable(novel.author));
  const [description, setDescription] = useState(normalizeNullable(novel.description));
  const [tags, setTags] = useState(novel.tags);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const changes = useMemo<NovelUpdatePayload>(() => {
    const next: NovelUpdatePayload = {};

    if (title !== novel.title) next.title = title;
    if (author !== normalizeNullable(novel.author)) next.author = author;
    if (description !== normalizeNullable(novel.description)) next.description = description;
    if (!tagsEqual(tags, novel.tags)) next.tags = tags;

    return next;
  }, [author, description, novel, tags, title]);

  const dirty = Object.keys(changes).length > 0;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!dirty || saving) return;

    if (title.trim() === '') {
      setError('Title is required.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await updateNovel(novel.id, changes);
      navigate(`/novels/${novel.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save changes.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.grid}>
        <label>
          <span>Title</span>
          <input value={title} onChange={(event) => setTitle(event.target.value)} required />
        </label>

        <label>
          <span>Author</span>
          <input value={author} onChange={(event) => setAuthor(event.target.value)} />
        </label>
      </div>

      <label>
        <span>Description</span>
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={7}
        />
      </label>

      <label>
        <span>Tags</span>
        <TagEditor tags={tags} onChange={setTags} />
      </label>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.footer}>
        <Link className={styles.cancelButton} to={`/novels/${novel.id}`}>
          Cancel
        </Link>
        <button className={styles.saveButton} type="submit" disabled={!dirty || saving}>
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </form>
  );
}
