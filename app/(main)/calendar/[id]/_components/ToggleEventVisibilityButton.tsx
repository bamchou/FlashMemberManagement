'use client'

import { useTransition } from 'react'
import { toggleEventVisibility } from '../../actions'

export default function ToggleEventVisibilityButton({
  id,
  isVisible,
}: {
  id: string
  isVisible: boolean
}) {
  const [isPending, startTransition] = useTransition()

  function handleToggle() {
    startTransition(() => toggleEventVisibility(id, !isVisible))
  }

  return (
    <button
      onClick={handleToggle}
      disabled={isPending}
      className={`text-sm font-semibold px-4 py-2 rounded-lg border disabled:opacity-50 transition-colors ${
        isVisible
          ? 'text-gray-500 border-gray-300 hover:bg-gray-50'
          : 'text-green-600 border-green-300 hover:bg-green-50'
      }`}
    >
      {isPending ? '処理中...' : isVisible ? '非表示にする' : '表示に戻す'}
    </button>
  )
}
