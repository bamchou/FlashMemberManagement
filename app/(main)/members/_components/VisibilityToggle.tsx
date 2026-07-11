'use client'

import { useTransition } from 'react'
import { toggleMemberVisibility } from '../actions'

export default function VisibilityToggle({ id, isVisible }: { id: string; isVisible: boolean }) {
  const [isPending, startTransition] = useTransition()

  function handleClick(e: React.MouseEvent) {
    e.preventDefault()
    startTransition(() => toggleMemberVisibility(id, !isVisible))
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className={`text-xs font-semibold px-2.5 py-1 rounded-full transition-colors disabled:opacity-50 ${
        isVisible
          ? 'bg-green-100 text-green-700 hover:bg-red-100 hover:text-red-600'
          : 'bg-gray-100 text-gray-500 hover:bg-green-100 hover:text-green-700'
      }`}
    >
      {isPending ? '...' : isVisible ? '表示中' : '非表示'}
    </button>
  )
}
