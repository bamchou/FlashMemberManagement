'use client'

import { useState, useTransition } from 'react'
import { changeExtraPractice, updateExtraPracticeFee } from '../actions'

type MemberRow = {
  id: string
  fullName: string
  count: number
}

function FeeEditor({ initialFee }: { initialFee: number }) {
  const [fee, setFee] = useState(initialFee.toString())
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)

  function handleSave() {
    const val = parseInt(fee.trim(), 10)
    if (isNaN(val) || val < 0) return
    startTransition(async () => {
      await updateExtraPracticeFee(val)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    })
  }

  return (
    <div className="bg-white rounded-xl border border-[#EAE0A8] px-5 py-4">
      <p className="text-xs font-semibold text-gray-500 mb-2">追加参加費（1回あたり）</p>
      <div className="flex items-center gap-2">
        <input
          type="number"
          min="0"
          step="100"
          value={fee}
          onChange={e => { setFee(e.target.value); setSaved(false) }}
          className="w-32 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3666] focus:border-transparent bg-white"
        />
        <span className="text-sm text-gray-500">円</span>
        <button
          type="button"
          disabled={isPending}
          onClick={handleSave}
          className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors disabled:opacity-50 ${
            saved ? 'bg-green-600 text-white' : 'bg-[#1A3666] text-white hover:bg-[#2A52A0]'
          }`}
        >
          {isPending ? '保存中...' : saved ? '保存しました ✓' : '保存する'}
        </button>
      </div>
    </div>
  )
}

function CountRow({
  member,
  year,
  month,
  feePerSession,
}: {
  member: MemberRow
  year: number
  month: number
  feePerSession: number
}) {
  const [count, setCount] = useState(member.count)
  const [isPending, startTransition] = useTransition()

  function handleChange(delta: 1 | -1) {
    const optimistic = Math.max(0, count + delta)
    setCount(optimistic)
    startTransition(async () => {
      const result = await changeExtraPractice(member.id, year, month, delta)
      if (result.count !== undefined) setCount(result.count)
    })
  }

  const amount = count * feePerSession

  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-[#EAE0A8] last:border-0 gap-3">
      <span className="text-sm font-semibold text-[#1A3666] min-w-0 truncate">{member.fullName}</span>
      <div className="flex items-center gap-3 shrink-0">
        <button
          type="button"
          disabled={isPending}
          onClick={() => handleChange(1)}
          className="w-8 h-8 rounded-full border-2 border-[#1A3666] text-[#1A3666] font-bold text-lg flex items-center justify-center hover:bg-[#1A3666] hover:text-white disabled:opacity-30 transition-colors"
        >
          ＋
        </button>
        <span className={`w-6 text-center text-lg font-bold ${count > 0 ? 'text-[#1A3666]' : 'text-gray-300'}`}>
          {count}
        </span>
        <button
          type="button"
          disabled={isPending || count === 0}
          onClick={() => handleChange(-1)}
          className="w-8 h-8 rounded-full border-2 border-gray-300 text-gray-500 font-bold text-lg flex items-center justify-center hover:border-red-400 hover:text-red-500 disabled:opacity-30 transition-colors"
        >
          −
        </button>
        <span className={`w-16 text-right text-sm font-bold ${count > 0 ? 'text-[#1A3666]' : 'text-gray-300'}`}>
          {count > 0 ? `¥${amount.toLocaleString()}` : '—'}
        </span>
      </div>
    </div>
  )
}

export default function ExtraPracticeClient({
  year,
  month,
  members,
  feePerSession,
  prevHref,
  nextHref,
}: {
  year: number
  month: number
  members: MemberRow[]
  feePerSession: number
  prevHref: string
  nextHref: string
}) {
  const totalCount = members.reduce((s, m) => s + m.count, 0)
  const totalAmount = totalCount * feePerSession

  return (
    <div className="space-y-4">
      {/* 月ナビゲーション */}
      <div className="flex items-center justify-between bg-white rounded-xl border border-[#EAE0A8] px-4 py-3">
        <a href={prevHref} className="p-2 text-[#1A3666] hover:bg-[#F5F8FF] rounded-lg transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </a>
        <h2 className="text-base font-bold text-[#1A3666]">{year}年{month}月</h2>
        <a href={nextHref} className="p-2 text-[#1A3666] hover:bg-[#F5F8FF] rounded-lg transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </a>
      </div>

      {/* 参加費設定 */}
      <FeeEditor initialFee={feePerSession} />

      {/* サマリー */}
      <div className="bg-[#F5F8FF] border border-[#D0DCF5] rounded-xl px-5 py-4 grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs font-semibold text-gray-500 mb-0.5">今月の追加参加合計</p>
          <p className="text-2xl font-bold text-[#1A3666]">{totalCount}<span className="text-sm font-semibold ml-0.5">回</span></p>
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-500 mb-0.5">合計金額</p>
          <p className="text-2xl font-bold text-[#1A3666]">¥{totalAmount.toLocaleString()}</p>
        </div>
      </div>

      {/* メンバー一覧 */}
      <div className="bg-white rounded-xl border border-[#EAE0A8] overflow-hidden">
        {members.length === 0 ? (
          <p className="py-10 text-center text-sm text-gray-400">メンバーが登録されていません</p>
        ) : (
          members.map(m => (
            <CountRow key={m.id} member={m} year={year} month={month} feePerSession={feePerSession} />
          ))
        )}
      </div>
    </div>
  )
}
