'use client'

import type React from 'react'
import type { ChangeEvent, DragEvent, InputHTMLAttributes } from 'react'
import { useCallback, useRef, useState } from 'react'

export interface FileMetadata {
  name: string
  size: number
  type: string
  url: string
  id: string
}

export interface FileWithPreview {
  file: File | FileMetadata
  id: string
  preview?: string
}

export interface FileUploadOptions {
  maxFiles?: number
  maxSize?: number
  accept?: string
  multiple?: boolean
  initialFiles?: FileMetadata[]
  onFilesChange?: (files: FileWithPreview[]) => void
  onFilesAdded?: (addedFiles: FileWithPreview[]) => void
  onError?: (errors: string[]) => void
}

export function useFileUpload(options: FileUploadOptions = {}) {
  const {
    maxFiles = Number.POSITIVE_INFINITY,
    maxSize = Number.POSITIVE_INFINITY,
    accept = '*',
    multiple = false,
    initialFiles = [],
    onFilesChange,
    onFilesAdded,
    onError,
  } = options

  const [files, setFiles] = useState<FileWithPreview[]>(
    initialFiles.map((f) => ({ file: f, id: f.id, preview: f.url })),
  )
  const inputRef = useRef<HTMLInputElement>(null)

  const generateId = (f: File | FileMetadata) =>
    f instanceof File
      ? `${f.name}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
      : f.id

  const createPreview = (f: File | FileMetadata): string | undefined =>
    f instanceof File ? URL.createObjectURL(f) : f.url

  const clearFiles = useCallback(() => {
    setFiles((prev) => {
      prev.forEach((fw) => {
        if (fw.preview && fw.file instanceof File) URL.revokeObjectURL(fw.preview)
      })
      if (inputRef.current) inputRef.current.value = ''
      onFilesChange?.([])
      return []
    })
  }, [onFilesChange])

  const addFiles = useCallback(
    (newFiles: FileList | File[]) => {
      const arr = Array.from(newFiles)
      const errors: string[] = []
      const valid: FileWithPreview[] = []

      if (!multiple) clearFiles()

      for (const f of arr) {
        if (f.size > maxSize) {
          errors.push(`"${f.name}" dépasse la taille maximale.`)
          continue
        }
        valid.push({ file: f, id: generateId(f), preview: createPreview(f) })
      }

      if (valid.length > 0) {
        onFilesAdded?.(valid)
        setFiles((prev) => {
          const next = multiple ? [...prev, ...valid] : valid
          onFilesChange?.(next)
          return next
        })
      }

      if (errors.length > 0) onError?.(errors)
      if (inputRef.current) inputRef.current.value = ''
    },
    [multiple, maxSize, clearFiles, onFilesAdded, onFilesChange, onError],
  )

  const removeFile = useCallback(
    (id: string) => {
      setFiles((prev) => {
        const fw = prev.find((f) => f.id === id)
        if (fw?.preview && fw.file instanceof File) URL.revokeObjectURL(fw.preview)
        const next = prev.filter((f) => f.id !== id)
        onFilesChange?.(next)
        return next
      })
    },
    [onFilesChange],
  )

  const openFileDialog = useCallback(() => inputRef.current?.click(), [])

  const handleFileChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      if (e.target.files?.length) addFiles(e.target.files)
    },
    [addFiles],
  )

  const getInputProps = useCallback(
    (props: InputHTMLAttributes<HTMLInputElement> = {}) => ({
      ...props,
      type: 'file' as const,
      onChange: handleFileChange,
      accept: props.accept ?? accept,
      multiple: props.multiple ?? multiple,
      ref: inputRef,
    }),
    [accept, multiple, handleFileChange],
  )

  const handleDragOver = (e: DragEvent<HTMLElement>) => { e.preventDefault(); e.stopPropagation() }
  const handleDrop = (e: DragEvent<HTMLElement>) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.dataTransfer.files?.length) addFiles(multiple ? e.dataTransfer.files : [e.dataTransfer.files[0]!])
  }

  return [
    { files },
    { removeFile, openFileDialog, getInputProps, handleDragOver, handleDrop, clearFiles },
  ] as const
}
