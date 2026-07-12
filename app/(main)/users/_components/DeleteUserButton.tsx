'use client'

import { useTransition } from 'react'
import { deleteUser } from '../actions'

export default function DeleteUserButton({ userId, username }: { userId: string; username: string | null }) {
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    if (!confirm(`「${username ?? 'このユーザー'}」を削除しますか？\nこの操作は元に戻せません。`)) return
    startTransition(async () => {
      const result = await deleteUser(userId)
      if (result.error) alert(result.error)
    })
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className="text-xs text-red-400 hover:text-red-600 transition-colors disabled:opacity-50"
    >
      {isPending ? '削除中...' : '削除'}
    </button>
  )
}
