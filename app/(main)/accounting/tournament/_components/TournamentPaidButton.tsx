'use client'

import { useTransition } from 'react'
import { toggleTournamentPaid } from '../actions'

export default function TournamentPaidButton({
  eventId,
  memberId,
  isPaid,
}: {
  eventId: string
  memberId: string
  isPaid: boolean
}) {
  const [isPending, startTransition] = useTransition()

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => startTransition(async () => {
        const res = await toggleTournamentPaid(eventId, memberId, isPaid)
        if (res?.error) alert(res.error)
      })}
      className={`text-xs font-bold px-3 py-1.5 rounded-full transition-colors disabled:opacity-50 shrink-0 ${
        isPaid
          ? 'bg-green-100 text-green-700 hover:bg-green-200'
          : 'bg-orange-100 text-orange-600 hover:bg-orange-200'
      }`}
    >
      {isPending ? '...' : isPaid ? '支払い済み' : '未払い'}
    </button>
  )
}
