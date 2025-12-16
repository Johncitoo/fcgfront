import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Link from '@tiptap/extension-link'
import TextAlign from '@tiptap/extension-text-align'
import { 
  Bold, 
  Italic, 
  Underline as UnderlineIcon, 
  List, 
  ListOrdered, 
  AlignLeft, 
  AlignCenter, 
  AlignRight,
  User,
  Mail,
  FileText,
  Calendar,
  ExternalLink
} from 'lucide-react'
import { useState } from 'react'
import './template-editor.css'

interface Variable {
  name: string
  description: string
  required: boolean
}

interface TemplateEditorProps {
  value: string
  onChange: (html: string) => void
  availableVariables: Variable[]
  placeholder?: string
}

export function TemplateEditor({ value, onChange, availableVariables, placeholder }: TemplateEditorProps) {
  const [showVariables, setShowVariables] = useState(false)

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: placeholder || 'Escribe el contenido del email aquí...',
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 underline',
        },
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[300px] p-4',
      },
    },
  })

  if (!editor) {
    return null
  }

  const insertVariable = (variableName: string) => {
    editor.chain().focus().insertContent(`{{${variableName}}}`).run()
    setShowVariables(false)
  }

  const getVariableIcon = (varName: string) => {
    if (varName.includes('name')) return <User className="h-4 w-4" />
    if (varName.includes('email')) return <Mail className="h-4 w-4" />
    if (varName.includes('link')) return <ExternalLink className="h-4 w-4" />
    if (varName.includes('date')) return <Calendar className="h-4 w-4" />
    return <FileText className="h-4 w-4" />
  }

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden bg-white">
      {/* Toolbar */}
      <div className="bg-gray-50 border-b border-gray-300 p-2 flex flex-wrap gap-1 items-center">
        {/* Formato de texto */}
        <div className="flex gap-0.5 border-r border-gray-300 pr-2">
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`p-2 rounded hover:bg-gray-200 transition-colors ${
              editor.isActive('bold') ? 'bg-blue-100 text-blue-600' : ''
            }`}
            title="Negrita"
          >
            <Bold className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`p-2 rounded hover:bg-gray-200 transition-colors ${
              editor.isActive('italic') ? 'bg-blue-100 text-blue-600' : ''
            }`}
            title="Cursiva"
          >
            <Italic className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleStrike().run()}
            className={`p-2 rounded hover:bg-gray-200 transition-colors ${
              editor.isActive('strike') ? 'bg-blue-100 text-blue-600' : ''
            }`}
            title="Tachado"
          >
            <UnderlineIcon className="h-4 w-4" />
          </button>
        </div>

        {/* Listas */}
        <div className="flex gap-0.5 border-r border-gray-300 pr-2">
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`p-2 rounded hover:bg-gray-200 transition-colors ${
              editor.isActive('bulletList') ? 'bg-blue-100 text-blue-600' : ''
            }`}
            title="Lista con viñetas"
          >
            <List className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={`p-2 rounded hover:bg-gray-200 transition-colors ${
              editor.isActive('orderedList') ? 'bg-blue-100 text-blue-600' : ''
            }`}
            title="Lista numerada"
          >
            <ListOrdered className="h-4 w-4" />
          </button>
        </div>

        {/* Alineación */}
        <div className="flex gap-0.5 border-r border-gray-300 pr-2">
          <button
            type="button"
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
            className={`p-2 rounded hover:bg-gray-200 transition-colors ${
              editor.isActive({ textAlign: 'left' }) ? 'bg-blue-100 text-blue-600' : ''
            }`}
            title="Alinear izquierda"
          >
            <AlignLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
            className={`p-2 rounded hover:bg-gray-200 transition-colors ${
              editor.isActive({ textAlign: 'center' }) ? 'bg-blue-100 text-blue-600' : ''
            }`}
            title="Centrar"
          >
            <AlignCenter className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
            className={`p-2 rounded hover:bg-gray-200 transition-colors ${
              editor.isActive({ textAlign: 'right' }) ? 'bg-blue-100 text-blue-600' : ''
            }`}
            title="Alinear derecha"
          >
            <AlignRight className="h-4 w-4" />
          </button>
        </div>

        {/* Botón de variables (grande y destacado) */}
        <div className="relative ml-auto">
          <button
            type="button"
            onClick={() => setShowVariables(!showVariables)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center gap-2 font-medium"
            title="Insertar información del postulante"
          >
            <User className="h-4 w-4" />
            Insertar información
          </button>

          {/* Dropdown de variables */}
          {showVariables && (
            <div className="absolute right-0 top-full mt-1 w-80 bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
              <div className="p-3 border-b border-gray-200 bg-gray-50">
                <p className="font-semibold text-sm text-gray-700">Información disponible:</p>
                <p className="text-xs text-gray-500 mt-1">Haz clic para insertar</p>
              </div>
              
              <div className="p-2">
                {availableVariables.map((variable) => (
                  <button
                    key={variable.name}
                    type="button"
                    onClick={() => insertVariable(variable.name)}
                    className="w-full text-left px-3 py-2 rounded hover:bg-blue-50 transition-colors flex items-start gap-2 group"
                  >
                    <div className="mt-0.5 text-gray-600 group-hover:text-blue-600">
                      {getVariableIcon(variable.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-gray-900 group-hover:text-blue-600">
                          {variable.description}
                        </span>
                        {variable.required && (
                          <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded">
                            Requerido
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-500 font-mono">
                        {`{{${variable.name}}}`}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Editor area */}
      <EditorContent editor={editor} className="template-editor-content" />

      {/* Helper text */}
      <div className="bg-gray-50 border-t border-gray-300 p-2 text-xs text-gray-600">
        <p>
          💡 <strong>Tip:</strong> Las variables como <code className="bg-gray-200 px-1 rounded">{'{{nombre}}'}</code> se reemplazarán automáticamente con la información real al enviar el email.
        </p>
      </div>
    </div>
  )
}
