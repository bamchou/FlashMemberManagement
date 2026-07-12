'use client'

import { useState, useTransition } from 'react'
import { updateAccompanimentFee } from '../actions'
import type { AccompanimentFeeSetting } from '@/lib/types'

export default function AccompanimentFeeForm({ fee }: { fee: AccompanimentFeeSetting }) {
  const [amount, setAmount] = useState(String(fee.amount_per_person))
  const [isPending, startTransition] = useTransition()
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleSave() {
    const val = parseInt(amount, 10)
    if (!val || val <= 0) { setError('1円以上で入力してください'); return }
    setError(null)
    setSuccess(false)
    startTransition(async () => {
      const result = await updateAccompanimentFee(fee.area_type, val)
      if (result.error) {
        setError(result.error)
      } else {
        setSuccess(true)
        setTimeout(() => setSuccess(false), 2000)
      }
    })
  }

  return (
    <div className="bg-white rounded-xl border border-[#EAE0A8] p-5">
      <p className="text-sm font-bold text-[#1A3666] mb-1">{fee.label}</p>
      {error && <p className="text-xs text-red-500 mb-2">{error}</p>}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <input
            type="number"
            min="1"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            className="w-full px-3.5 py-2.5 pr-8 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3666] focus:border-transparent"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">円/人</span>
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="px-5 py-2.5 bg-[#1A3666] text-white text-sm font-semibold rounded-lg hover:bg-[#2A52A0] disabled:opacity-50 transition-colors shrink-0"
        >
          {isPending ? '保存中...' : success ? '保存しました' : '保存'}
        </button>
      </div>
    </div>
  )
}
