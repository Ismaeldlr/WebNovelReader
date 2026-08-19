import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { Node, mergeAttributes } from '@tiptap/core';
import { EditorContent, useEditor } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import TaskItem from '@tiptap/extension-task-item';
import TaskList from '@tiptap/extension-task-list';
import type { JSONContent } from '@tiptap/react';
import SlashCommandMenu from './SlashCommandMenu';
import type { SlashCommandAction } from './SlashCommandMenu';
import styles from './TiptapEditor.module.css';

interface TiptapEditorProps {
  initialContent: string;
  mode?: 'note' | 'story';
  readOnly?: boolean;
  onChange?: (content: string, plainText: string) => void;
  onStoryComment?: () => void;
}

const emptyContent: JSONContent = {
  type: 'doc',
  content: [{ type: 'paragraph' }],
};

function parseContent(content: string): JSONContent {
  try {
    const parsed = JSON.parse(content) as JSONContent;
    return parsed?.type ? parsed : emptyContent;
  } catch {
    return emptyContent;
  }
}

function currentHeading(editor: NonNullable<ReturnType<typeof useEditor>>) {
  if (editor.isActive('heading', { level: 1 })) return '1';
  if (editor.isActive('heading', { level: 2 })) return '2';
  if (editor.isActive('heading', { level: 3 })) return '3';
  return 'paragraph';
}

const ChapterBreak = Node.create({
  name: 'chapterBreak',
  group: 'block',
  selectable: true,

  parseHTML() {
    return [{ tag: 'hr[data-chapter-break]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['hr', mergeAttributes(HTMLAttributes, { 'data-chapter-break': 'true', class: 'chapterBreak' })];
  },
});

function isAtEmptyParagraphState(state: NonNullable<ReturnType<typeof useEditor>>['state']) {
  const { selection } = state;
  const parent = selection.$from.parent;
  return selection.empty && parent.type.name === 'paragraph' && parent.content.size === 0;
}

function TiptapEditor({
  initialContent,
  mode = 'story',
  readOnly = false,
  onChange,
  onStoryComment,
}: TiptapEditorProps) {
  const [slashOpen, setSlashOpen] = useState(false);
  const parsedContent = useMemo(() => parseContent(initialContent), [initialContent]);
  const editor = useEditor({
    extensions: [
      StarterKit,
      TaskList,
      TaskItem.configure({ nested: true }),
      ChapterBreak,
    ],
    content: parsedContent,
    editable: !readOnly,
    editorProps: {
      attributes: {
        class: styles.prose,
      },
      handleKeyDown(view, event) {
        if (event.key === 'Escape' && slashOpen) {
          setSlashOpen(false);
          return true;
        }

        if (!readOnly && mode === 'note' && event.key === '/' && isAtEmptyParagraphState(view.state)) {
          event.preventDefault();
          setSlashOpen(true);
          return true;
        }

        if (slashOpen && event.key.length === 1) {
          setSlashOpen(false);
        }

        return false;
      },
    },
    onUpdate({ editor: currentEditor }) {
      onChange?.(JSON.stringify(currentEditor.getJSON()), currentEditor.getText());
    },
  }, [mode, readOnly, slashOpen]);

  const runSlashCommand = useCallback((action: SlashCommandAction) => {
    if (!editor) return;

    const chain = editor.chain().focus();
    if (action === 'heading1') chain.toggleHeading({ level: 1 }).run();
    if (action === 'heading2') chain.toggleHeading({ level: 2 }).run();
    if (action === 'bulletList') chain.toggleBulletList().run();
    if (action === 'orderedList') chain.toggleOrderedList().run();
    if (action === 'taskList') chain.toggleTaskList().run();
    if (action === 'codeBlock') chain.toggleCodeBlock().run();
    if (action === 'divider') chain.setHorizontalRule().run();
    setSlashOpen(false);
  }, [editor]);

  useEffect(() => {
    editor?.setEditable(!readOnly);
  }, [editor, readOnly]);

  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    const current = JSON.stringify(editor.getJSON());
    const next = JSON.stringify(parsedContent);
    if (current !== next) {
      editor.commands.setContent(parsedContent, { emitUpdate: false });
    }
  }, [editor, parsedContent]);

  if (!editor) {
    return <div className={styles.loading}>Loading editor...</div>;
  }

  return (
    <div className={`${styles.editorShell} ${mode === 'note' ? styles.noteEditor : styles.storyEditor}`}>
      {!readOnly && (
        <div className={styles.formatBar}>
          <button
            type="button"
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            title="Insert horizontal rule"
            aria-label="Insert horizontal rule"
          >
            <i className="ti ti-separator-horizontal" aria-hidden="true" />
          </button>
          <button
            type="button"
            className={editor.isActive('codeBlock') ? styles.active : ''}
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            title="Code block"
            aria-label="Code block"
          >
            <i className="ti ti-code" aria-hidden="true" />
          </button>
          {mode === 'note' && (
            <button
              type="button"
              className={editor.isActive('taskList') ? styles.active : ''}
              onClick={() => editor.chain().focus().toggleTaskList().run()}
              title="Checkbox list"
              aria-label="Checkbox list"
            >
              <i className="ti ti-checkbox" aria-hidden="true" />
            </button>
          )}
        </div>
      )}

      {!readOnly && (
        <BubbleMenu editor={editor}>
          <div className={styles.bubbleMenu}>
            <button
              type="button"
              className={editor.isActive('bold') ? styles.active : ''}
              onClick={() => editor.chain().focus().toggleBold().run()}
              title="Bold"
              aria-label="Bold"
            >
              <i className="ti ti-bold" aria-hidden="true" />
            </button>
            <button
              type="button"
              className={editor.isActive('italic') ? styles.active : ''}
              onClick={() => editor.chain().focus().toggleItalic().run()}
              title="Italic"
              aria-label="Italic"
            >
              <i className="ti ti-italic" aria-hidden="true" />
            </button>
            <select
              value={currentHeading(editor)}
              onChange={event => {
                const value = event.target.value;
                if (value === 'paragraph') {
                  editor.chain().focus().setParagraph().run();
                  return;
                }
                editor.chain().focus().toggleHeading({ level: Number(value) as 1 | 2 | 3 }).run();
              }}
              aria-label="Heading level"
            >
              <option value="paragraph">Text</option>
              <option value="1">H1</option>
              <option value="2">H2</option>
              <option value="3">H3</option>
            </select>
            <button
              type="button"
              className={editor.isActive('bulletList') ? styles.active : ''}
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              title="Bullet list"
              aria-label="Bullet list"
            >
              <i className="ti ti-list" aria-hidden="true" />
            </button>
            {mode === 'story' && (
              <>
                <button
                  type="button"
                  onClick={() => editor.chain().focus().insertContent({ type: 'chapterBreak' }).run()}
                  title="Insert chapter break"
                  aria-label="Insert chapter break"
                >
                  <i className="ti ti-section" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => onStoryComment?.()}
                  title="Comment"
                  aria-label="Comment"
                >
                  <i className="ti ti-message" aria-hidden="true" />
                </button>
              </>
            )}
          </div>
        </BubbleMenu>
      )}

      {slashOpen && !readOnly && mode === 'note' && (
        <div className={styles.slashMenu}>
          <SlashCommandMenu onSelect={runSlashCommand} />
        </div>
      )}

      <EditorContent editor={editor} className={styles.editorContent} />
    </div>
  );
}

export default memo(TiptapEditor);
