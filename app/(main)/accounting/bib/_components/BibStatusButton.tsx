'use client'

import { useTransition } from 'react'
import { updateBibStatus } from '@/app/(main)/members/bib-actions'

export default function BibStatusButton({
  requestId,
  newStatus,
  label,
  className,
}: {
  requestId: string
  newStatus: 'ordered' | 'delivered'
  label: string
  className: string
}) {
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    const msg = newStatus === 'ordered' ? '発注済みに変更します。よろしいですか？' : '渡し済みに変更します。よろしいですか？'
    if (!confirm(msg)) return
    startTransition(async () => {
      await updateBibStatus(requestId, newStatus)
    })
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 ${className}`}
    >
      {isPending ? '更新中...' : label}
    </button>
  )
}
