'use client'

import { useState, useTransition } from 'react'
import { requestBib } from '../bib-actions'

export default function BibRequestButton({ memberId }: { memberId: string }) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [requested, setRequested] = useState(false)

  function handleClick() {
    if (!confirm('このメンバーのゼッケン作成を依頼します。\n一度依頼すると取り消せません。よろしいですか？')) return
    startTransition(async () => {
      const result = await requestBib(memberId)
      if (result.error) {
        setError(result.error)
      } else {
        setRequested(true)
      }
    })
  }

  if (requested) {
    return (
      <span className="text-sm font-semibold text-green-700 bg-green-50 border border-green-300 px-4 py-2 rounded-lg">
        依頼しました
      </span>
    )
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="text-sm font-semibold text-white bg-[#1A3666] px-4 py-2 rounded-lg hover:bg-[#2A52A0] disabled:opacity-50 transition-colors"
      >
        {isPending ? '依頼中...' : 'ゼッケン作成依頼'}
      </button>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
}
