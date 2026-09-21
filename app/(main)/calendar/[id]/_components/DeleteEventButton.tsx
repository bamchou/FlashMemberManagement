'use client'

import { useTransition } from 'react'
import { deleteEvent } from '../../actions'
import Spinner from '@/app/(main)/_components/Spinner'

export default function DeleteEventButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    if (!confirm('この予定を削除しますか？')) return
    startTransition(() => deleteEvent(id))
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isPending}
      className="inline-flex items-center gap-1.5 text-sm font-semibold text-red-500 border border-red-200 px-4 py-2 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
    >
      {isPending && <Spinner className="w-3.5 h-3.5" />}
      {isPending ? '削除中...' : '削除'}
    </button>
  )
}
