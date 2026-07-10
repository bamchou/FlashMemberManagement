'use client'

import { useActionState } from 'react'
import { useRouter } from 'next/navigation'
import { createReinforcement, type ReinforcementFormState } from '../actions'

export default function ReinforcementForm({ memberId }: { memberId: string }) {
  const boundCreate = createReinforcement.bind(null, memberId)
  const [state, action, pending] = useActionState<ReinforcementFormState, FormData>(
    boundCreate,
    undefined
  )
  const router = useRouter()
  const today = new Date().toISOString().split('T')[0]

  return (
    <form action={action} className="space-y-5">
      {/* 選出日 */}
      <div>
        <label htmlFor="selected_date" className="block text-sm font-semibold text-[#1A3666] mb-1.5">
          選出日<span className="text-red-500 ml-1">*</span>
        </label>
        <input
          id="selected_date"
          name="selected_date"
          type="date"
          required
          max={today}
          className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3666] focus:border-transparent bg-white"
        />
      </div>

      {/* 備考 */}
      <div>
        <label htmlFor="notes" className="block text-sm font-semibold text-[#1A3666] mb-1.5">
          備考
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          placeholder="例: 第1回県強化選手選考会にて選出"
          className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3666] focus:border-transparent bg-white resize-none"
        />
      </div>

      {state?.error && (
        <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5">
          {state.error}
        </p>
      )}

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex-1 border border-gray-300 text-gray-600 font-semibold py-2.5 rounded-lg text-sm hover:bg-gray-50 transition-colors"
        >
          キャンセル
        </button>
        <button
          type="submit"
          disabled={pending}
          className="flex-1 bg-[#1A3666] text-white font-bold py-2.5 rounded-lg text-sm hover:bg-[#2A52A0] transition-colors disabled:opacity-60"
        >
          {pending ? '登録中...' : '登録する'}
        </button>
      </div>
    </form>
  )
}
