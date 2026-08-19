import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { createProject, fetchProjects } from '../../api/write';
import type { WritingProject } from '../../types/write';
import { formatRelativeDate } from '../../utils/date';
import styles from './WriteHomePage.module.css';

export default function WriteHomePage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<WritingProject[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [genre, setGenre] = useState('');
  const [description, setDescription] = useState('');

  const loadProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const nextProjects = await fetchProjects(showArchived);
      setProjects(nextProjects);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  }, [showArchived]);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  const resetForm = () => {
    setTitle('');
    setGenre('');
    setDescription('');
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!title.trim()) return;

    setSaving(true);
    setError(null);
    try {
      const project = await createProject({
        title: title.trim(),
        genre: genre.trim() || undefined,
        description: description.trim() || undefined,
      });
      resetForm();
      setModalOpen(false);
      navigate(`/write/${project.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.page}>
      <section className={styles.summary}>
        <div>
          <div className={styles.eyebrow}>Write</div>
          <h1>Writing projects</h1>
          <p>{projects.length} project{projects.length === 1 ? '' : 's'} in this view.</p>
        </div>

        <div className={styles.actions}>
          <label className={styles.toggle}>
            <input
              type="checkbox"
              checked={showArchived}
              onChange={event => setShowArchived(event.target.checked)}
            />
            <span>Show archived</span>
          </label>
          <button type="button" className={styles.primaryButton} onClick={() => setModalOpen(true)}>
            <i className="ti ti-plus" aria-hidden="true" />
            <span>New Project</span>
          </button>
        </div>
      </section>

      {error && <div className={styles.error}>{error}</div>}

      {loading ? (
        <div className={styles.empty}>Loading projects...</div>
      ) : projects.length === 0 ? (
        <div className={styles.empty}>No writing projects yet.</div>
      ) : (
        <div className={styles.grid}>
          {projects.map(project => (
            <button
              key={project.id}
              type="button"
              className={styles.projectCard}
              onClick={() => navigate(`/write/${project.id}`)}
            >
              <div className={styles.cardHeader}>
                <span className={styles.genre}>{project.genre || 'Unsorted'}</span>
                <span className={project.status === 'archived' ? styles.archivedBadge : styles.activeBadge}>
                  {project.status}
                </span>
              </div>
              <h2>{project.title}</h2>
              {project.description && <p>{project.description}</p>}
              <div className={styles.cardStats}>
                <span>{project.word_count.toLocaleString()} words</span>
                <span>{project.document_count.toLocaleString()} docs</span>
                <span>{formatRelativeDate(project.updated_at)}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {modalOpen && (
        <div className={styles.modalOverlay}>
          <form className={styles.modal} onSubmit={handleSubmit}>
            <div className={styles.modalHeader}>
              <h2>New Project</h2>
              <button
                type="button"
                onClick={() => {
                  setModalOpen(false);
                  resetForm();
                }}
                aria-label="Close"
                title="Close"
              >
                <i className="ti ti-x" aria-hidden="true" />
              </button>
            </div>

            <label>
              <span>Title</span>
              <input value={title} onChange={event => setTitle(event.target.value)} required autoFocus />
            </label>
            <label>
              <span>Genre</span>
              <input value={genre} onChange={event => setGenre(event.target.value)} />
            </label>
            <label>
              <span>Description</span>
              <textarea value={description} onChange={event => setDescription(event.target.value)} rows={4} />
            </label>

            <div className={styles.modalActions}>
              <button
                type="button"
                onClick={() => {
                  setModalOpen(false);
                  resetForm();
                }}
              >
                Cancel
              </button>
              <button type="submit" disabled={saving || !title.trim()}>
                {saving ? 'Creating...' : 'Create Project'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
