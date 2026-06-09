import { useEffect, useRef, useState } from 'react';
import { THEMES, type ThemeId } from '../hooks/useTheme';
import styles from './ThemePicker.module.css';

interface ThemePickerProps {
  currentTheme: ThemeId;
  onThemeChange: (themeId: ThemeId) => void;
}

export default function ThemePicker({ currentTheme, onThemeChange }: ThemePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleMouseDown(event: MouseEvent) {
      if (!isOpen) return;
      if (!pickerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [isOpen]);

  const handleThemeSelect = (themeId: ThemeId) => {
    onThemeChange(themeId);
    setIsOpen(false);
  };

  return (
    <div className={styles.picker} ref={pickerRef}>
      <button
        className={styles.trigger}
        onClick={() => setIsOpen(open => !open)}
        aria-label="Choose theme"
        aria-expanded={isOpen}
        type="button"
      >
        <i className="ti ti-palette" aria-hidden="true" />
      </button>

      {isOpen && (
        <div className={styles.flyout} aria-label="Theme picker">
          {THEMES.map((theme, index) => {
            const isActive = currentTheme === theme.id;

            return (
              <button
                key={theme.id}
                className={`${styles.bubble} ${theme.id === 'light' ? styles.lightBubble : ''} ${isActive ? styles.active : ''}`}
                style={{ backgroundColor: theme.accent, animationDelay: `${index * 40}ms` }}
                onClick={() => handleThemeSelect(theme.id)}
                title={theme.label}
                aria-label={`${theme.label} theme`}
                aria-pressed={isActive}
                type="button"
              >
                {isActive && <i className="ti ti-check" aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
