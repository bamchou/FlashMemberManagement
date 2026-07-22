'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { withdrawMember } from '../../withdrawal-actions'

export default function WithdrawMemberButton({ memberId, memberName }: { memberId: string; memberName: string }) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  function handleWithdraw() {
    if (!confirm(`${memberName} を退会処理しますか？\n退会後はメンバー一覧から非表示になります。`)) return
    setError(null)
    startTransition(async () => {
      const result = await withdrawMember(memberId)
      if (result?.error) {
        setError(result.error)
      } else {
        router.push('/members')
      }
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={handleWithdraw}
        disabled={isPending}
        className="text-sm font-semibold text-red-600 border border-red-300 px-4 py-2 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
      >
        {isPending ? '処理中...' : '退会処理'}
      </button>
      {error && <p className="text-red-600 text-xs w-full mt-1">{error}</p>}
    </>
  )
}
