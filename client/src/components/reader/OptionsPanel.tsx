import type { ContentWidth, ReaderDisplayPreferences } from '../../api/reader';
import styles from './OptionsPanel.module.css';

interface Props {
  preferences: ReaderDisplayPreferences;
  onChange: (changes: Partial<ReaderDisplayPreferences>) => void;
}

const WIDTH_OPTIONS: Array<{ value: ContentWidth; label: string }> = [
  { value: 'narrow', label: 'Narrow' },
  { value: 'medium', label: 'Medium' },
  { value: 'wide', label: 'Wide' },
];

export default function OptionsPanel({ preferences, onChange }: Props) {
  function clamp(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, value));
  }

  function updateFontSize(delta: number) {
    onChange({ font_size: clamp(preferences.font_size + delta, 14, 28) });
  }

  function updateLineSpacing(delta: number) {
    const next = clamp(Number((preferences.line_spacing + delta).toFixed(1)), 1.4, 2.2);
    onChange({ line_spacing: next });
  }

  return (
    <div className={styles.panel}>
      <div className={styles.stepperRow}>
        <span>Font Size</span>
        <div className={styles.stepper}>
          <button type="button" onClick={() => updateFontSize(-1)} aria-label="Decrease font size">
            -
          </button>
          <strong>{preferences.font_size}px</strong>
          <button type="button" onClick={() => updateFontSize(1)} aria-label="Increase font size">
            +
          </button>
        </div>
      </div>

      <div className={styles.stepperRow}>
        <span>Line Spacing</span>
        <div className={styles.stepper}>
          <button type="button" onClick={() => updateLineSpacing(-0.1)} aria-label="Decrease line spacing">
            -
          </button>
          <strong>{preferences.line_spacing.toFixed(1)}</strong>
          <button type="button" onClick={() => updateLineSpacing(0.1)} aria-label="Increase line spacing">
            +
          </button>
        </div>
      </div>

      <div className={styles.optionGroup}>
        <span>Content Width</span>
        <div className={styles.segmented}>
          {WIDTH_OPTIONS.map((option) => (
            <button
              className={preferences.content_width === option.value ? styles.active : ''}
              key={option.value}
              type="button"
              onClick={() => onChange({ content_width: option.value })}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.optionGroup}>
        <span>Font Family</span>
        <div className={styles.segmented}>
          <button
            className={preferences.font_family === 'serif' ? styles.active : ''}
            type="button"
            onClick={() => onChange({ font_family: 'serif' })}
          >
            Serif
          </button>
          <button
            className={preferences.font_family === 'sans' ? styles.active : ''}
            type="button"
            onClick={() => onChange({ font_family: 'sans' })}
          >
            Sans
          </button>
        </div>
      </div>
    </div>
  );
}
