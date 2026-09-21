'use client'

import { useTransition } from 'react'
import { toggleAttendancePaid } from '../actions'

export default function PaidButton({
  eventId,
  userId,
  isPaid,
}: {
  eventId: string
  userId: string
  isPaid: boolean
}) {
  const [isPending, startTransition] = useTransition()

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => startTransition(async () => { await toggleAttendancePaid(eventId, userId, isPaid) })}
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
