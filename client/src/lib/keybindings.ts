export type ShortcutAction =
  | 'openCommandPalette'
  | 'forceSave'
  | 'toggleDistractionFree'
  | 'openVersionHistory'
  | 'openPendingItems'
  | 'toggleTypewriterSounds'
  | 'previousDocument'
  | 'nextDocument';

export interface Keybinding {
  action: ShortcutAction;
  label: string;
  shortcut: string;
  match: (event: KeyboardEvent) => boolean;
}

function isMod(event: KeyboardEvent) {
  return event.ctrlKey || event.metaKey;
}

export const keybindings: Keybinding[] = [
  {
    action: 'openCommandPalette',
    label: 'Open command palette',
    shortcut: 'Cmd/Ctrl+K',
    match: event => isMod(event) && event.key.toLowerCase() === 'k',
  },
  {
    action: 'forceSave',
    label: 'Force-save current document',
    shortcut: 'Cmd/Ctrl+S',
    match: event => isMod(event) && event.key.toLowerCase() === 's',
  },
  {
    action: 'toggleDistractionFree',
    label: 'Toggle distraction-free mode',
    shortcut: 'F11',
    match: event => event.key === 'F11',
  },
  {
    action: 'openVersionHistory',
    label: 'Open version history',
    shortcut: 'Cmd/Ctrl+Shift+H',
    match: event => isMod(event) && event.shiftKey && event.key.toLowerCase() === 'h',
  },
  {
    action: 'openPendingItems',
    label: 'Open pending items',
    shortcut: 'Cmd/Ctrl+Shift+P',
    match: event => isMod(event) && event.shiftKey && event.key.toLowerCase() === 'p',
  },
  {
    action: 'toggleTypewriterSounds',
    label: 'Toggle typewriter sounds',
    shortcut: 'Cmd/Ctrl+Shift+S',
    match: event => isMod(event) && event.shiftKey && event.key.toLowerCase() === 's',
  },
  {
    action: 'previousDocument',
    label: 'Previous chapter',
    shortcut: 'Cmd/Ctrl+[',
    match: event => isMod(event) && event.key === '[',
  },
  {
    action: 'nextDocument',
    label: 'Next chapter',
    shortcut: 'Cmd/Ctrl+]',
    match: event => isMod(event) && event.key === ']',
  },
];

export function findKeybinding(event: KeyboardEvent) {
  return keybindings.find(binding => binding.match(event));
}
