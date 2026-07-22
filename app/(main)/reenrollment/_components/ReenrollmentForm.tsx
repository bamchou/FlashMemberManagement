'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { reenrollMembers } from '../actions'
import { calculateGrade } from '@/lib/utils/grade'

type MemberInfo = { id: string; name: string; birthDate: string }

export default function ReenrollmentForm({ members }: { members: MemberInfo[] }) {
  const [selected, setSelected] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function toggle(id: string) {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  function handleSubmit() {
    if (selected.length === 0) { setError('お子様を1名以上選択してください'); return }
    setError(null)
    startTransition(async () => {
      const result = await reenrollMembers(selected)
      if (result?.error) {
        setError(result.error)
      } else {
        router.push('/members')
      }
    })
  }

  if (members.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-[#EAE0A8] p-8 text-center">
        <p className="text-gray-400 text-sm">再入会可能なお子様がいません</p>
        <button
          type="button"
          onClick={() => router.push('/members')}
          className="mt-4 text-sm font-semibold text-[#1A3666] border border-[#1A3666] px-4 py-2 rounded-lg hover:bg-[#1A3666] hover:text-white transition-colors"
        >
          メンバー一覧へ
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {members.map(m => (
          <label
            key={m.id}
            className={`flex items-center gap-4 bg-white rounded-xl border p-4 cursor-pointer transition-colors ${
              selected.includes(m.id) ? 'border-[#1A3666] bg-[#1A3666]/5' : 'border-[#EAE0A8] hover:border-gray-300'
            }`}
          >
            <input
              type="checkbox"
              checked={selected.includes(m.id)}
              onChange={() => toggle(m.id)}
              className="w-5 h-5 rounded border-gray-300 text-[#1A3666] focus:ring-[#1A3666] shrink-0"
            />
            <div>
              <p className="font-bold text-[#1A3666]">{m.name}</p>
              <p className="text-sm text-gray-500 mt-0.5">{calculateGrade(m.birthDate)}</p>
            </div>
          </label>
        ))}
      </div>

      {error && (
        <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5">{error}</p>
      )}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={isPending || selected.length === 0}
        className="w-full py-3 text-sm font-bold bg-[#1A3666] text-white rounded-xl hover:bg-[#2A52A0] disabled:opacity-50 transition-colors"
      >
        {isPending ? '処理中...' : selected.length > 0 ? `選択した ${selected.length} 名を再入会させる` : 'お子様を選択してください'}
      </button>
    </div>
  )
}
