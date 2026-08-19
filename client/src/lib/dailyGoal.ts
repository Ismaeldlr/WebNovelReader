export interface DailyWordsRecord {
  startWordCount: number;
  wordsAtLastSave: number;
}

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

function storageKey(projectId: string, date = todayString()) {
  return `wnh_daily_words_${projectId}_${date}`;
}

function parseRecord(value: string | null): DailyWordsRecord | null {
  if (!value) return null;

  try {
    const parsed = JSON.parse(value) as DailyWordsRecord;
    if (
      Number.isFinite(parsed.startWordCount) &&
      Number.isFinite(parsed.wordsAtLastSave)
    ) {
      return parsed;
    }
  } catch {
    return null;
  }

  return null;
}

export function getDailyWordsRecord(projectId: string): DailyWordsRecord | null {
  return parseRecord(localStorage.getItem(storageKey(projectId)));
}

export function ensureDailyWordsRecord(projectId: string, totalWordCount: number): DailyWordsRecord {
  const existing = getDailyWordsRecord(projectId);
  if (existing) return existing;

  const nextRecord = {
    startWordCount: totalWordCount,
    wordsAtLastSave: totalWordCount,
  };
  localStorage.setItem(storageKey(projectId), JSON.stringify(nextRecord));
  return nextRecord;
}

export function updateDailyWordsRecord(projectId: string, totalWordCount: number): DailyWordsRecord {
  const existing = ensureDailyWordsRecord(projectId, totalWordCount);
  const nextRecord = {
    ...existing,
    wordsAtLastSave: totalWordCount,
  };
  localStorage.setItem(storageKey(projectId), JSON.stringify(nextRecord));
  return nextRecord;
}

export function getTodayWords(record: DailyWordsRecord | null) {
  if (!record) return 0;
  return Math.max(0, record.wordsAtLastSave - record.startWordCount);
}
