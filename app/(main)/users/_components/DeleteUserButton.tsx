'use client'

import { deleteUser } from '../actions'

export default function DeleteUserButton({ userId, username }: { userId: string; username: string | null }) {
  async function handleClick() {
    if (!confirm(`「${username ?? 'このユーザー'}」を削除しますか？\nこの操作は元に戻せません。`)) return
    await deleteUser(userId)
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="text-xs text-red-400 hover:text-red-600 transition-colors"
    >
      削除
    </button>
  )
}
