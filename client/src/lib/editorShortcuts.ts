export interface EditorShortcutActions {
  forceSave?: () => void;
  toggleDistractionFree?: () => void;
  openVersionHistory?: () => void;
  openPendingItems?: () => void;
  toggleTypewriterSounds?: () => void;
  previousDocument?: () => void;
  nextDocument?: () => void;
}

let currentActions: EditorShortcutActions = {};

export function registerEditorShortcuts(actions: EditorShortcutActions) {
  currentActions = actions;

  return () => {
    if (currentActions === actions) {
      currentActions = {};
    }
  };
}

export function runEditorShortcut(action: keyof EditorShortcutActions) {
  const callback = currentActions[action];
  if (!callback) return false;

  callback();
  return true;
}

export function hasEditorShortcut(action: keyof EditorShortcutActions) {
  return Boolean(currentActions[action]);
}
