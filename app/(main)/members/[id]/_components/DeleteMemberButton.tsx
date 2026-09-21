'use client'

import { useTransition } from 'react'
import { deleteMember } from '../../actions'
import Spinner from '@/app/(main)/_components/Spinner'

export default function DeleteMemberButton({ id, name }: { id: string; name: string }) {
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    if (!confirm(`「${name}」を削除しますか？\nこの操作は元に戻せません。`)) return
    startTransition(async () => {
      await deleteMember(id)
    })
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className="inline-flex items-center gap-1.5 text-sm font-semibold text-red-500 border border-red-300 px-4 py-2 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
    >
      {isPending && <Spinner className="w-3.5 h-3.5" />}
      {isPending ? '削除中...' : 'メンバーを削除'}
    </button>
  )
}
