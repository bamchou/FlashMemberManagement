'use client'

import { useState, useTransition } from 'react'
import { changeExtraPractice } from '../actions'

type MemberRow = {
  id: string
  fullName: string
  count: number
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
