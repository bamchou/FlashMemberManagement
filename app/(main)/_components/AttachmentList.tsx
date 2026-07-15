'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { deleteAttachment } from '../attachments/actions'
import type { Attachment } from '@/lib/types'

function getFileIcon(fileName: string) {
  const ext = fileName.split('.').pop()?.toLowerCase()
  if (ext === 'pdf') {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    )
  }
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  )
}

function formatBytes(bytes: number | null): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function AttachmentList({
  attachments,
  canDelete,
  entityType,
  entityId,
}: {
  attachments: Attachment[]
  canDelete: boolean
  entityType: 'event' | 'announcement'
  entityId: string
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  if (attachments.length === 0) return null

  function handleDelete(att: Attachment) {
    if (!confirm(`「${att.file_name}」を削除しますか？`)) return
    startTransition(async () => {
      await deleteAttachment(att.id, att.storage_path, entityType, entityId)
      router.refresh()
    })
  }

  return (
    <div className="space-y-2">
      {attachments.map(att => (
        <div key={att.id} className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-lg border border-gray-200">
          <span className="shrink-0">{getFileIcon(att.file_name)}</span>
          <a
            href={att.file_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 min-w-0 text-sm text-[#1A3666] hover:underline truncate"
          >
            {att.file_name}
          </a>
          {att.file_size && (
            <span className="text-xs text-gray-400 shrink-0">{formatBytes(att.file_size)}</span>
          )}
          {canDelete && (
            <button
              type="button"
              disabled={isPending}
              onClick={() => handleDelete(att)}
              className="shrink-0 text-gray-400 hover:text-red-500 transition-colors p-0.5 disabled:opacity-50"
              aria-label="削除"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
