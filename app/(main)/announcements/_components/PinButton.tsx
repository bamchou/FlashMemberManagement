'use client'

import { useTransition } from 'react'
import { togglePin } from '../actions'
import Spinner from '@/app/(main)/_components/Spinner'

export default function PinButton({ id, isPinned }: { id: string; isPinned: boolean }) {
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    startTransition(async () => {
      await togglePin(id, !isPinned)
    })
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full transition-colors disabled:opacity-50 shrink-0 ${
        isPinned
          ? 'bg-[#F5C800] text-[#1A3666] hover:bg-[#E5B800]'
          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
      }`}
    >
      {isPending ? <Spinner className="w-3 h-3" /> : <span>📌</span>}
      {isPinned ? 'ピン解除' : 'ピン止め'}
    </button>
  )
}
