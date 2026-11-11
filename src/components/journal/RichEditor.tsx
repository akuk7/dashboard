import React, { useRef, useState } from 'react';
import { useEditor, EditorContent, useEditorState } from '@tiptap/react';
import type { Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import { Placeholder } from '@tiptap/extension-placeholder';
import { TableKit } from '@tiptap/extension-table';
import {
  Bold, Italic, Heading1, Heading2, List, ListOrdered, Table as TableIcon, ImagePlus,
  Undo2, Redo2, Rows3, Columns3, Trash2, Quote,
} from 'lucide-react';
import supabase from '../../lib/supabase';

const BUCKET = 'journal-images';

async function uploadImage(file: File): Promise<string | null> {
  if (!file.type.startsWith('image/')) return null;
  const ext = (file.name.split('.').pop() || file.type.split('/')[1] || 'png').toLowerCase();
  const path = `${new Date().getFullYear()}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type });
  if (error) {
    console.error('Image upload failed:', error);
    return null;
  }
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

interface Props {
  initialHtml: string;
  onChange: (html: string) => void;
}

const Btn: React.FC<{
  onClick: () => void; active?: boolean; disabled?: boolean; title: string; children: React.ReactNode;
}> = ({ onClick, active, disabled, title, children }) => (
  <button
    type="button"
    title={title}
    aria-label={title}
    disabled={disabled}
    // keep editor focus/selection when clicking toolbar
    onMouseDown={(e) => e.preventDefault()}
    onClick={onClick}
    className={`p-1.5 rounded-md transition disabled:opacity-30 ${
      active ? 'bg-white text-black' : 'text-gray-300 hover:bg-[#262626]'
    }`}
  >
    {children}
  </button>
);

const Toolbar: React.FC<{ editor: Editor; onPickImage: () => void; uploading: boolean }> = ({ editor, onPickImage, uploading }) => {
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive('bold'),
      italic: e.isActive('italic'),
      h1: e.isActive('heading', { level: 1 }),
      h2: e.isActive('heading', { level: 2 }),
      bullet: e.isActive('bulletList'),
      ordered: e.isActive('orderedList'),
      quote: e.isActive('blockquote'),
      inTable: e.isActive('table'),
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
    }),
  });
  const c = () => editor.chain().focus();
  const sep = <span className="w-px h-5 bg-[#303030] mx-1" />;

  return (
    <div className="flex flex-wrap items-center gap-0.5 p-2 border-b border-[#303030] bg-[#121212] rounded-t-lg">
      <Btn title="Bold" active={s.bold} onClick={() => c().toggleBold().run()}><Bold className="w-4 h-4" /></Btn>
      <Btn title="Italic" active={s.italic} onClick={() => c().toggleItalic().run()}><Italic className="w-4 h-4" /></Btn>
      {sep}
      <Btn title="Heading 1" active={s.h1} onClick={() => c().toggleHeading({ level: 1 }).run()}><Heading1 className="w-4 h-4" /></Btn>
      <Btn title="Heading 2" active={s.h2} onClick={() => c().toggleHeading({ level: 2 }).run()}><Heading2 className="w-4 h-4" /></Btn>
      {sep}
      <Btn title="Bullet list" active={s.bullet} onClick={() => c().toggleBulletList().run()}><List className="w-4 h-4" /></Btn>
      <Btn title="Numbered list" active={s.ordered} onClick={() => c().toggleOrderedList().run()}><ListOrdered className="w-4 h-4" /></Btn>
      <Btn title="Quote" active={s.quote} onClick={() => c().toggleBlockquote().run()}><Quote className="w-4 h-4" /></Btn>
      {sep}
      <Btn title="Insert table" onClick={() => c().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}><TableIcon className="w-4 h-4" /></Btn>
      {s.inTable && (
        <>
          <Btn title="Add row below" onClick={() => c().addRowAfter().run()}><Rows3 className="w-4 h-4" /></Btn>
          <Btn title="Add column right" onClick={() => c().addColumnAfter().run()}><Columns3 className="w-4 h-4" /></Btn>
          <Btn title="Delete row" onClick={() => c().deleteRow().run()}>
            <span className="relative"><Rows3 className="w-4 h-4 text-red-400" /></span>
          </Btn>
          <Btn title="Delete column" onClick={() => c().deleteColumn().run()}>
            <span className="relative"><Columns3 className="w-4 h-4 text-red-400" /></span>
          </Btn>
          <Btn title="Delete table" onClick={() => c().deleteTable().run()}><Trash2 className="w-4 h-4 text-red-400" /></Btn>
        </>
      )}
      {sep}
      <Btn title={uploading ? 'Uploading…' : 'Insert image'} disabled={uploading} onClick={onPickImage}><ImagePlus className="w-4 h-4" /></Btn>
      <span className="grow" />
      <Btn title="Undo" disabled={!s.canUndo} onClick={() => c().undo().run()}><Undo2 className="w-4 h-4" /></Btn>
      <Btn title="Redo" disabled={!s.canRedo} onClick={() => c().redo().run()}><Redo2 className="w-4 h-4" /></Btn>
    </div>
  );
};

const RichEditor: React.FC<Props> = ({ initialHtml, onChange }) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const editorRef = useRef<Editor | null>(null);

  const insertFiles = async (files: File[], pos?: number) => {
    const images = files.filter((f) => f.type.startsWith('image/'));
    if (!images.length) return false;
    setUploading(true);
    try {
      for (const file of images) {
        const url = await uploadImage(file);
        if (!url) {
          alert('Image upload failed.');
          continue;
        }
        const ed = editorRef.current;
        if (!ed) continue;
        const chain = ed.chain().focus();
        if (pos !== undefined) chain.setTextSelection(pos);
        chain.setImage({ src: url }).run();
      }
    } finally {
      setUploading(false);
    }
    return true;
  };

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image,
      TableKit.configure({ table: { resizable: false } }),
      Placeholder.configure({ placeholder: 'Write about your day…' }),
    ],
    content: initialHtml,
    onUpdate: ({ editor: e }) => onChange(e.isEmpty ? '' : e.getHTML()),
    editorProps: {
      attributes: { class: 'journal-content focus:outline-none min-h-[400px] p-5' },
      handlePaste: (_view, event) => {
        const files = Array.from(event.clipboardData?.files ?? []);
        if (!files.some((f) => f.type.startsWith('image/'))) return false;
        void insertFiles(files);
        return true;
      },
      handleDrop: (view, event) => {
        const files = Array.from((event as DragEvent).dataTransfer?.files ?? []);
        if (!files.some((f) => f.type.startsWith('image/'))) return false;
        const pos = view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos;
        void insertFiles(files, pos);
        return true;
      },
    },
  });
  editorRef.current = editor;

  if (!editor) return null;

  return (
    <div className="flex flex-col flex-grow min-h-0 mb-4 bg-[#0A0A0A] border border-[#303030] focus-within:border-white rounded-lg transition">
      <Toolbar editor={editor} uploading={uploading} onPickImage={() => fileRef.current?.click()} />
      <div className="overflow-y-auto flex-grow">
        <EditorContent editor={editor} />
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          void insertFiles(Array.from(e.target.files ?? []));
          e.target.value = '';
        }}
      />
    </div>
  );
};

export default RichEditor;
