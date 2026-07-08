'use client'

import { useRef, useState } from 'react'

interface FileDropInputProps {
  accept?: string
  value?: File | null
  onChange: (file: File | null) => void
  placeholder?: string
  style?: React.CSSProperties
}

export default function FileDropInput({ accept, value, onChange, placeholder = 'Choose a file or drag it here', style }: FileDropInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={e => { e.preventDefault(); setDragOver(true) }}
      onDragLeave={() => setDragOver(false)}
      onDrop={e => {
        e.preventDefault()
        setDragOver(false)
        onChange(e.dataTransfer.files?.[0] ?? null)
      }}
      style={{
        border: `1.5px dashed ${dragOver ? 'var(--accent)' : 'var(--border2)'}`,
        borderRadius: 10,
        padding: '9px 12px',
        fontSize: 12.5,
        cursor: 'pointer',
        background: dragOver ? 'rgba(249,115,22,0.08)' : 'var(--surface2)',
        color: value ? 'var(--text)' : 'var(--muted)',
        textAlign: 'center',
        transition: 'border-color 0.15s, background 0.15s',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        ...style,
      }}
      title={value ? value.name : placeholder}
    >
      {value ? `📎 ${value.name}` : `⬆ ${placeholder}`}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={e => onChange(e.target.files?.[0] ?? null)}
        style={{ display: 'none' }}
      />
    </div>
  )
}
