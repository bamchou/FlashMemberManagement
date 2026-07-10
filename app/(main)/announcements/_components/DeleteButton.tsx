'use client'

import { deleteAnnouncement } from '../actions'

export default function DeleteButton({ id, title }: { id: string; title: string }) {
  async function handleClick() {
    if (!confirm(`「${title}」を削除しますか？\nこの操作は元に戻せません。`)) return
    await deleteAnnouncement(id)
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="text-xs text-red-400 hover:text-red-600 px-2 py-1 rounded transition-colors shrink-0"
    >
      削除
    </button>
  )
}
