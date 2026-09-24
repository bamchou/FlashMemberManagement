'use client'

import { useTransition } from 'react'
import { togglePaymentStatus } from '../actions'

export default function PaymentStatusButton({
  eventId,
  status,
}: {
  eventId: string
  status: string
}) {
  const [isPending, startTransition] = useTransition()
  const isPaid = status === 'paid'

  function handleClick() {
    startTransition(async () => {
      const res = await togglePaymentStatus(eventId, status)
      if (res?.error) alert(res.error)
    })
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className={`text-xs font-bold px-3 py-1.5 rounded-full transition-colors disabled:opacity-50 ${
        isPaid
          ? 'bg-green-100 text-green-700 hover:bg-green-200'
          : 'bg-orange-100 text-orange-600 hover:bg-orange-200'
      }`}
    >
      {isPending ? '...' : isPaid ? '支払い済み' : '未払い'}
    </button>
  )
}
