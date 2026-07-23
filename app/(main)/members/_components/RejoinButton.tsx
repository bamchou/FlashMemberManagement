'use client'

import { useState, useTransition } from 'react'
import { requestRejoin } from '../withdrawal-actions'

export default function RejoinButton({
  memberId,
  memberName,
  isAdmin,
}: {
  memberId: string
  memberName: string
  isAdmin: boolean
}) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  function handle() {
    const msg = isAdmin
      ? `${memberName} を復帰させますか？`
      : `${memberName} の復帰申請を行いますか？\n管理者が承認すると復帰が完了します。`
    if (!confirm(msg)) return
    setError(null)
    startTransition(async () => {
      const result = await requestRejoin(memberId)
      if (result?.error) setError(result.error)
      else setDone(true)
    })
  }

  if (done) {
    return (
      <span className="text-xs font-bold text-green-600 shrink-0">
        {isAdmin ? '復帰しました' : '申請しました'}
      </span>
    )
  }

  return (
    <div className="shrink-0">
      <button
        type="button"
        onClick={handle}
        disabled={isPending}
        className="text-xs font-bold text-[#1A3666] border border-[#1A3666] px-3 py-1.5 rounded-lg hover:bg-[#1A3666] hover:text-white disabled:opacity-50 transition-colors"
      >
        {isPending ? '...' : isAdmin ? '復帰' : '復帰申請'}
      </button>
      {error && <p className="text-red-600 text-xs mt-0.5">{error}</p>}
    </div>
  )
}
