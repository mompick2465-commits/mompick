'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import { TextStyle } from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import TextAlign from '@tiptap/extension-text-align'
import { Extension } from '@tiptap/core'
import { useCallback, useEffect } from 'react'

interface QuillEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

// 폰트 크기 확장
const FontSize = Extension.create({
  name: 'fontSize',
  addOptions() {
    return {
      types: ['textStyle'],
    }
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: element => element.style.fontSize?.replace('px', ''),
            renderHTML: attributes => {
              if (!attributes.fontSize) {
                return {}
              }
              return {
                style: `font-size: ${attributes.fontSize}px`,
              }
            },
          },
        },
      },
    ]
  },
  addCommands() {
    return {
      setFontSize: (fontSize: string) => ({ chain }) => {
        return chain()
          .setMark('textStyle', { fontSize })
          .run()
      },
      unsetFontSize: () => ({ chain }) => {
        return chain()
          .setMark('textStyle', { fontSize: null })
          .removeEmptyTextStyle()
          .run()
      },
    }
  },
})

export default function QuillEditor({ value, onChange, placeholder }: QuillEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Image.configure({
        inline: true,
        allowBase64: false,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 underline',
        },
      }),
      TextStyle,
      Color,
      FontSize,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
        defaultAlignment: 'left',
      }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: 'focus:outline-none',
        'data-placeholder': placeholder || '내용을 입력하세요...',
      },
    },
  })

  const addImage = useCallback(async () => {
    const input = document.createElement('input')
    input.setAttribute('type', 'file')
    input.setAttribute('accept', 'image/*')
    input.click()

    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return

      try {
        // 파일 크기 제한 (5MB)
        if (file.size > 5 * 1024 * 1024) {
          alert('이미지 크기는 5MB 이하여야 합니다.')
          return
        }

        const formData = new FormData()
        formData.append('file', file)

        const response = await fetch('/api/notices/upload', {
          method: 'POST',
          body: formData,
        })

        const result = await response.json()

        if (response.ok && result.url && editor) {
          editor.chain().focus().setImage({ src: result.url }).run()
        } else {
          alert('이미지 업로드 실패: ' + (result.error || '알 수 없는 오류'))
        }
      } catch (error) {
        console.error('이미지 업로드 오류:', error)
        alert('이미지 업로드 중 오류가 발생했습니다.')
      }
    }
  }, [editor])

  // value가 외부에서 변경되면 에디터 내용 업데이트
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value, { emitUpdate: false })
    }
  }, [value, editor])

  if (!editor) {
    return <div className="h-[400px] border border-gray-300 rounded-md flex items-center justify-center">로딩 중...</div>
  }

  return (
    <div className="border border-gray-300 rounded-md overflow-hidden">
      {/* 툴바 */}
      <div className="border-b border-gray-300 bg-gray-50 p-2 flex flex-wrap gap-1">
        {/* 텍스트 스타일 */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`px-2 py-1 rounded ${editor.isActive('bold') ? 'bg-blue-500 text-white' : 'bg-white hover:bg-gray-100'}`}
          title="굵게"
        >
          <strong>B</strong>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`px-2 py-1 rounded ${editor.isActive('italic') ? 'bg-blue-500 text-white' : 'bg-white hover:bg-gray-100'}`}
          title="기울임"
        >
          <em>I</em>
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={`px-2 py-1 rounded ${editor.isActive('strike') ? 'bg-blue-500 text-white' : 'bg-white hover:bg-gray-100'}`}
          title="취소선"
        >
          <s>S</s>
        </button>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        {/* 제목 */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={`px-2 py-1 rounded text-sm ${editor.isActive('heading', { level: 1 }) ? 'bg-blue-500 text-white' : 'bg-white hover:bg-gray-100'}`}
          title="제목 1"
        >
          H1
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`px-2 py-1 rounded text-sm ${editor.isActive('heading', { level: 2 }) ? 'bg-blue-500 text-white' : 'bg-white hover:bg-gray-100'}`}
          title="제목 2"
        >
          H2
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={`px-2 py-1 rounded text-sm ${editor.isActive('heading', { level: 3 }) ? 'bg-blue-500 text-white' : 'bg-white hover:bg-gray-100'}`}
          title="제목 3"
        >
          H3
        </button>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        {/* 목록 */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`px-2 py-1 rounded ${editor.isActive('bulletList') ? 'bg-blue-500 text-white' : 'bg-white hover:bg-gray-100'}`}
          title="순서 없는 목록"
        >
          •
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`px-2 py-1 rounded ${editor.isActive('orderedList') ? 'bg-blue-500 text-white' : 'bg-white hover:bg-gray-100'}`}
          title="순서 있는 목록"
        >
          1.
        </button>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        {/* 링크 */}
        <button
          type="button"
          onClick={() => {
            const url = window.prompt('링크 URL을 입력하세요:')
            if (url) {
              editor.chain().focus().setLink({ href: url }).run()
            }
          }}
          className={`px-2 py-1 rounded ${editor.isActive('link') ? 'bg-blue-500 text-white' : 'bg-white hover:bg-gray-100'}`}
          title="링크"
        >
          🔗
        </button>

        {/* 이미지 */}
        <button
          type="button"
          onClick={addImage}
          className="px-2 py-1 rounded bg-white hover:bg-gray-100"
          title="이미지 삽입"
        >
          🖼️
        </button>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        {/* 폰트 크기 */}
        <select
          onChange={(e) => {
            const size = e.target.value
            if (size === 'default') {
              editor.chain().focus().unsetFontSize().run()
            } else {
              editor.chain().focus().setFontSize(size.replace('px', '')).run()
            }
          }}
          className="px-2 py-1 rounded border border-gray-300 bg-white text-sm hover:bg-gray-100"
          title="폰트 크기"
          defaultValue="default"
        >
          <option value="default">기본</option>
          <option value="10px">10px</option>
          <option value="12px">12px</option>
          <option value="14px">14px</option>
          <option value="16px">16px</option>
          <option value="18px">18px</option>
          <option value="20px">20px</option>
          <option value="24px">24px</option>
          <option value="28px">28px</option>
          <option value="32px">32px</option>
          <option value="36px">36px</option>
          <option value="48px">48px</option>
        </select>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        {/* 색상 */}
        <input
          type="color"
          onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
          className="w-8 h-8 rounded border border-gray-300 cursor-pointer"
          title="텍스트 색상"
        />

        <div className="w-px h-6 bg-gray-300 mx-1" />

        {/* 정렬 */}
        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          className={`px-2 py-1 rounded ${editor.isActive({ textAlign: 'left' }) ? 'bg-blue-500 text-white' : 'bg-white hover:bg-gray-100'}`}
          title="왼쪽 정렬"
        >
          ⬅
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          className={`px-2 py-1 rounded ${editor.isActive({ textAlign: 'center' }) ? 'bg-blue-500 text-white' : 'bg-white hover:bg-gray-100'}`}
          title="가운데 정렬"
        >
          ⬌
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          className={`px-2 py-1 rounded ${editor.isActive({ textAlign: 'right' }) ? 'bg-blue-500 text-white' : 'bg-white hover:bg-gray-100'}`}
          title="오른쪽 정렬"
        >
          ➡
        </button>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        {/* 되돌리기/다시하기 */}
        <button
          type="button"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          className="px-2 py-1 rounded bg-white hover:bg-gray-100 disabled:opacity-50"
          title="되돌리기"
        >
          ↶
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          className="px-2 py-1 rounded bg-white hover:bg-gray-100 disabled:opacity-50"
          title="다시하기"
        >
          ↷
        </button>
      </div>

      {/* 에디터 영역 */}
      <div className="bg-white">
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}
