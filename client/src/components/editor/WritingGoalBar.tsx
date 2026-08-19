import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import styles from './WritingGoalBar.module.css';

interface WritingGoalBarProps {
  wordCount: number;
  saveLabel: string;
  dailyGoal: number | null;
  todayWords: number;
  documentTarget: number | null;
  showDocumentTarget: boolean;
  onSaveDailyGoal: (goal: number | null) => void;
  onSaveDocumentTarget: (target: number | null) => void;
  rightSlot?: ReactNode;
}

export default function WritingGoalBar({
  wordCount,
  saveLabel,
  dailyGoal,
  todayWords,
  documentTarget,
  showDocumentTarget,
  onSaveDailyGoal,
  onSaveDocumentTarget,
  rightSlot,
}: WritingGoalBarProps) {
  const [goalOpen, setGoalOpen] = useState(false);
  const [targetOpen, setTargetOpen] = useState(false);
  const [goalDraft, setGoalDraft] = useState('');
  const [targetDraft, setTargetDraft] = useState('');

  useEffect(() => {
    setGoalDraft(dailyGoal ? String(dailyGoal) : '');
  }, [dailyGoal]);

  useEffect(() => {
    setTargetDraft(documentTarget ? String(documentTarget) : '');
  }, [documentTarget]);

  const dailyPercent = useMemo(() => {
    if (!dailyGoal) return 0;
    return Math.min(100, Math.round((todayWords / dailyGoal) * 100));
  }, [dailyGoal, todayWords]);

  const targetLabel = documentTarget
    ? `${wordCount.toLocaleString()} / ${documentTarget.toLocaleString()}`
    : `${wordCount.toLocaleString()} words`;
  const goalReached = Boolean(dailyGoal && todayWords >= dailyGoal);

  return (
    <div className={styles.wrapper}>
      {dailyGoal && (
        <div className={styles.progressTrack} aria-hidden="true">
          <div
            className={goalReached ? styles.progressDone : styles.progressFill}
            style={{ width: `${dailyPercent}%` }}
          />
        </div>
      )}

      <div className={styles.statusbar}>
        <div className={styles.leftStatus}>
          <div className={styles.popoverAnchor}>
            <button
              type="button"
              className={styles.wordButton}
              onClick={() => showDocumentTarget && setTargetOpen(isOpen => !isOpen)}
              disabled={!showDocumentTarget}
              title={showDocumentTarget ? 'Set document target' : undefined}
            >
              {targetLabel}
              {showDocumentTarget && <i className="ti ti-pencil" aria-hidden="true" />}
            </button>
            {targetOpen && (
              <Popover
                value={targetDraft}
                placeholder="2000"
                onValueChange={setTargetDraft}
                onCancel={() => setTargetOpen(false)}
                onSave={() => {
                  const value = Number.parseInt(targetDraft, 10);
                  onSaveDocumentTarget(Number.isFinite(value) && value > 0 ? value : null);
                  setTargetOpen(false);
                }}
              />
            )}
          </div>

          <span className={styles.saveStatus}>{saveLabel}</span>
        </div>

        <div className={styles.goalStatus}>
          {dailyGoal ? (
            <>
              <span>{goalReached ? 'Goal reached' : `${todayWords.toLocaleString()} / ${dailyGoal.toLocaleString()} words today`}</span>
              {goalReached && <i className="ti ti-check" aria-hidden="true" />}
              <div className={styles.popoverAnchor}>
                <button
                  type="button"
                  className={styles.iconButton}
                  onClick={() => setGoalOpen(isOpen => !isOpen)}
                  aria-label="Edit daily goal"
                  title="Edit daily goal"
                >
                  <i className="ti ti-pencil" aria-hidden="true" />
                </button>
                {goalOpen && (
                  <Popover
                    value={goalDraft}
                    placeholder="500"
                    onValueChange={setGoalDraft}
                    onCancel={() => setGoalOpen(false)}
                    onSave={() => {
                      const value = Number.parseInt(goalDraft, 10);
                      onSaveDailyGoal(Number.isFinite(value) && value > 0 ? value : null);
                      setGoalOpen(false);
                    }}
                  />
                )}
              </div>
            </>
          ) : (
            <div className={styles.popoverAnchor}>
              <button
                type="button"
                className={styles.goalLink}
                onClick={() => setGoalOpen(isOpen => !isOpen)}
              >
                Set daily goal
              </button>
              {goalOpen && (
                <Popover
                  value={goalDraft}
                  placeholder="500"
                  onValueChange={setGoalDraft}
                  onCancel={() => setGoalOpen(false)}
                  onSave={() => {
                    const value = Number.parseInt(goalDraft, 10);
                    onSaveDailyGoal(Number.isFinite(value) && value > 0 ? value : null);
                    setGoalOpen(false);
                  }}
                />
              )}
            </div>
          )}
        </div>

        {rightSlot}
      </div>
    </div>
  );
}

interface PopoverProps {
  value: string;
  placeholder: string;
  onValueChange: (value: string) => void;
  onCancel: () => void;
  onSave: () => void;
}

function Popover({ value, placeholder, onValueChange, onCancel, onSave }: PopoverProps) {
  return (
    <div className={styles.popover}>
      <input
        type="number"
        min="1"
        value={value}
        placeholder={placeholder}
        onChange={event => onValueChange(event.target.value)}
      />
      <div className={styles.popoverActions}>
        <button type="button" onClick={onCancel}>Cancel</button>
        <button type="button" onClick={onSave}>Save</button>
      </div>
    </div>
  );
}
