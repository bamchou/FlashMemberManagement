'use client'

import { useTransition } from 'react'
import { deleteExpense } from '../actions'
import Spinner from '@/app/(main)/_components/Spinner'

export default function DeleteExpenseButton({ id, label }: { id: string; label: string }) {
  const [isPending, startTransition] = useTransition()

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        if (!confirm(`明細「${label}」を削除しますか？\n（この領収書の最後の明細を削除すると、領収書のファイルも削除されます）`)) return
        startTransition(async () => {
          const res = await deleteExpense(id)
          if (res?.error) alert(res.error)
        })
      }}
      className="inline-flex items-center gap-1 text-xs text-red-400 hover:text-red-600 transition-colors disabled:opacity-50 shrink-0"
    >
      {isPending && <Spinner className="w-3 h-3" />}
      {isPending ? '削除中' : '削除'}
    </button>
  )
}
