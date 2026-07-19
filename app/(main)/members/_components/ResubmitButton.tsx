'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { resubmitMember } from '../actions'

export default function ResubmitButton({ id }: { id: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        startTransition(async () => {
          await resubmitMember(id)
          router.refresh()
        })
      }}
      className="text-sm font-semibold bg-[#1A3666] text-white px-4 py-2 rounded-lg hover:bg-[#2A52A0] disabled:opacity-50 transition-colors"
    >
      {isPending ? '申請中...' : '再度承認申請する'}
    </button>
  )
}
