'use client'

import { useTransition } from 'react'
import { deleteAnnouncement } from '../actions'
import Spinner from '@/app/(main)/_components/Spinner'

export default function DeleteButton({ id, title }: { id: string; title: string }) {
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    if (!confirm(`「${title}」を削除しますか？\nこの操作は元に戻せません。`)) return
    startTransition(async () => {
      await deleteAnnouncement(id)
    })
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className="inline-flex items-center gap-1 text-xs text-red-400 hover:text-red-600 px-2 py-1 rounded transition-colors shrink-0 disabled:opacity-50"
    >
      {isPending && <Spinner className="w-3 h-3" />}
      {isPending ? '削除中' : '削除'}
    </button>
  )
}
