import type { ReaderDisplayPreferences } from '../../api/reader';
import styles from './ChapterContent.module.css';

interface Props {
  content: string;
  preferences: ReaderDisplayPreferences;
}

export default function ChapterContent({ content, preferences }: Props) {
  const paragraphs = content
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  return (
    <article
      className={styles.content}
      style={{
        fontSize: `${preferences.font_size || 18}px`,
        lineHeight: preferences.line_spacing || 1.8,
        fontFamily: preferences.font_family === 'sans'
          ? 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
          : '"Playfair Display", var(--font-display)',
      }}
    >
      {paragraphs.map((paragraph, index) => (
        <p key={`${index}-${paragraph.slice(0, 12)}`}>{paragraph}</p>
      ))}
    </article>
  );
}
