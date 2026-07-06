import { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  List, ListOrdered,
} from 'lucide-react';

function ToolbarBtn({ onClick, active, title, children }) {
  return (
    <button
      type="button"
      onMouseDown={e => { e.preventDefault(); onClick(); }}
      title={title}
      className={`p-1.5 rounded transition-colors ${
        active
          ? 'bg-tce-100 text-tce-700'
          : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700'
      }`}
    >
      {children}
    </button>
  );
}

export default function RichTextEditor({
  value,
  onChange,
  onTextChange,
  placeholder = 'Digite aqui...',
  minRows = 4,
  disabled = false,
  className = '',
}) {
  const editor = useEditor({
    extensions: [StarterKit, Underline],
    content: value || '',
    editable: !disabled,
    onUpdate({ editor }) {
      const html = editor.isEmpty ? '' : editor.getHTML();
      onChange(html);
      onTextChange?.(editor.getText());
    },
  });

  useEffect(() => {
    if (editor) editor.setEditable(!disabled);
  }, [disabled, editor]);

  useEffect(() => {
    if (editor && value === '' && !editor.isEmpty) {
      editor.commands.clearContent(true);
    }
  }, [value, editor]);

  if (!editor) return null;

  return (
    <div className={`border border-neutral-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-tce-500 focus-within:border-tce-500 transition ${disabled ? 'opacity-60 bg-neutral-50' : 'bg-white'} ${className}`}>
      {!disabled && (
        <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-neutral-200 bg-neutral-50 rounded-t-lg flex-wrap">
          <ToolbarBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Negrito (Ctrl+B)">
            <Bold size={14} />
          </ToolbarBtn>
          <ToolbarBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Itálico (Ctrl+I)">
            <Italic size={14} />
          </ToolbarBtn>
          <ToolbarBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="Sublinhado (Ctrl+U)">
            <UnderlineIcon size={14} />
          </ToolbarBtn>
          <ToolbarBtn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="Tachado">
            <Strikethrough size={14} />
          </ToolbarBtn>

          <div className="w-px h-4 bg-neutral-300 mx-1" />

          <ToolbarBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Lista de itens">
            <List size={14} />
          </ToolbarBtn>
          <ToolbarBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Lista numerada">
            <ListOrdered size={14} />
          </ToolbarBtn>
        </div>
      )}

      <div className="relative px-3.5 py-2.5">
        {editor.isEmpty && (
          <p className="absolute top-2.5 left-3.5 right-3.5 text-sm text-neutral-400 pointer-events-none select-none">
            {placeholder}
          </p>
        )}
        <div className="rich-text-content text-sm text-neutral-700" style={{ minHeight: `${minRows * 28}px` }}>
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  );
}
