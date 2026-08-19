import styles from './SlashCommandMenu.module.css';

export type SlashCommandAction =
  | 'heading1'
  | 'heading2'
  | 'bulletList'
  | 'orderedList'
  | 'taskList'
  | 'codeBlock'
  | 'divider';

interface SlashCommandMenuProps {
  onSelect: (action: SlashCommandAction) => void;
}

const commands: Array<{ action: SlashCommandAction; label: string; icon: string }> = [
  { action: 'heading1', label: 'Heading 1', icon: 'ti-h-1' },
  { action: 'heading2', label: 'Heading 2', icon: 'ti-h-2' },
  { action: 'bulletList', label: 'Bullet List', icon: 'ti-list' },
  { action: 'orderedList', label: 'Numbered List', icon: 'ti-list-numbers' },
  { action: 'taskList', label: 'Checkbox', icon: 'ti-checkbox' },
  { action: 'codeBlock', label: 'Code Block', icon: 'ti-code' },
  { action: 'divider', label: 'Divider', icon: 'ti-separator-horizontal' },
];

export default function SlashCommandMenu({ onSelect }: SlashCommandMenuProps) {
  return (
    <div className={styles.menu} role="menu" aria-label="Slash commands">
      {commands.map(command => (
        <button
          key={command.action}
          type="button"
          role="menuitem"
          onMouseDown={event => event.preventDefault()}
          onClick={() => onSelect(command.action)}
        >
          <i className={`ti ${command.icon}`} aria-hidden="true" />
          <span>{command.label}</span>
        </button>
      ))}
    </div>
  );
}
