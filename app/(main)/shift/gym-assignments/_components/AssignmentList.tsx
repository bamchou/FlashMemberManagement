'use client'

import { useState, useTransition } from 'react'
import { WEEKDAY_LABELS } from '@/lib/gymCandidates'
import { getHolidayName } from '@/lib/utils/holidays'
import { useProgressNavigate } from '@/app/(main)/_components/useProgressNavigate'
import Spinner from '@/app/(main)/_components/Spinner'
import { setGymAssignment } from '../actions'

export type AssignmentDay = {
  date: string          // YYYY-MM-DD
  weekday: number
  candidates: string[]  // 第1〜第4候補の表示文字列
  slots: string[]       // 枠1〜3の担当者ID（'' = 未割当）
}

export type AssigneeOption = { id: string; name: string; accounts: number }

function DayRow({
  day,
  slots,
  people,
  onChange,
}: {
  day: AssignmentDay
  slots: string[]
  people: AssigneeOption[]
  onChange: (slotIdx: number, assigneeId: string) => Promise<string | null>
}) {
  const [error, setError] = useState<string | null>(null)
  const [pendingSlot, setPendingSlot] = useState<number | null>(null)
  const [isPending, startTransition] = useTransition()

  const [, m, d] = day.date.split('-').map(Number)
  const holiday = getHolidayName(day.date)
  const color = day.weekday === 0 || holiday ? 'text-red-500' : day.weekday === 6 ? 'text-blue-500' : 'text-[#1A3666]'

  function change(slotIdx: number, next: string) {
    setError(null)
    setPendingSlot(slotIdx)
    startTransition(async () => {
      const err = await onChange(slotIdx, next)
      if (err) setError(err)
      setPendingSlot(null)
    })
  }

  return (
    <div className="py-2.5 grid grid-cols-[3.5rem_1fr] gap-x-2">
      <div className={`text-sm font-bold ${color} leading-tight pt-1.5`}>
        {m}/{d}
        <span className="text-xs ml-0.5">({WEEKDAY_LABELS[day.weekday]})</span>
      </div>
      <div className="min-w-0">
        <div className="grid grid-cols-3 gap-1.5">
          {slots.map((value, idx) => {
            // この日の他の枠での使用数がアカウント数に達している人は選べない
            const usedElsewhere = (id: string) => slots.filter((v, j) => j !== idx && v === id).length
            const options = people.filter(p => p.id === value || usedElsewhere(p.id) < p.accounts)
            return (
              <div key={idx} className="relative min-w-0">
                <select
                  aria-label={`${m}月${d}日の予約担当 ${idx + 1}人目`}
                  value={value}
                  onChange={e => change(idx, e.target.value)}
                  disabled={isPending}
                  className={`w-full min-w-0 pl-1.5 pr-5 py-1.5 border rounded-md text-xs sm:text-sm truncate focus:outline-none focus:ring-2 focus:ring-[#1A3666] ${
                    value ? 'border-sky-300 bg-sky-50 text-[#1A3666] font-semibold' : 'border-gray-300 bg-white text-gray-400'
                  }`}
                >
                  <option value="">未割当</option>
                  {options.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name}{p.accounts > 1 ? `（${p.accounts}）` : ''}
                    </option>
                  ))}
                </select>
                {pendingSlot === idx && (
                  <span className="absolute right-5 top-1/2 -translate-y-1/2 text-[#1A3666] pointer-events-none">
                    <Spinner className="w-3.5 h-3.5" />
                  </span>
                )}
              </div>
            )
          })}
        </div>
        {holiday && <p className="text-[11px] text-red-400 mt-1">{holiday}</p>}
        {day.candidates.length > 0 ? (
          <ol className="mt-1 text-[11px] text-gray-500 space-y-0.5">
            {day.candidates.map((c, i) => (
              <li key={i} className="truncate">第{i + 1} {c}</li>
            ))}
          </ol>
        ) : (
          <p className="mt-1 text-[11px] text-gray-400">この曜日の候補は登録されていません</p>
        )}
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </div>
    </div>
  )
}

export default function AssignmentList({
  year,
  month,
  days,
  people,
}: {
  year: number
  month: number
  days: AssignmentDay[]
  people: AssigneeOption[]
}) {
  const { navigate, isNavigating } = useProgressNavigate()
  const [slotsByDate, setSlotsByDate] = useState<Record<string, string[]>>(
    () => Object.fromEntries(days.map(d => [d.date, d.slots])),
  )
  const prev = month === 1 ? { y: year - 1, m: 12 } : { y: year, m: month - 1 }
  const next = month === 12 ? { y: year + 1, m: 1 } : { y: year, m: month + 1 }

  async function changeSlot(date: string, slotIdx: number, assigneeId: string): Promise<string | null> {
    const before = slotsByDate[date]
    const updated = before.map((v, j) => (j === slotIdx ? assigneeId : v))
    setSlotsByDate(s => ({ ...s, [date]: updated }))
    const res = await setGymAssignment(date, slotIdx + 1, assigneeId)
    if (res?.error) {
      setSlotsByDate(s => ({ ...s, [date]: before }))
      return res.error
    }
    return null
  }

  const allSlots = Object.values(slotsByDate).flat()
  const filledCount = allSlots.filter(Boolean).length
  const monthlyCount = (id: string) => allSlots.filter(v => v === id).length

  return (
    <div>
      <div className="flex items-center justify-between gap-3 flex-wrap mb-1">
        <h1 className="text-xl font-bold text-[#1A3666]">体育館予約割当</h1>
        <div className="flex items-center gap-1.5">
          <button onClick={() => navigate(`/shift/gym-assignments?year=${prev.y}&month=${prev.m}`)} className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 text-[#1A3666]">‹</button>
          <span className="text-sm font-bold text-[#1A3666] min-w-[6.5rem] text-center inline-flex items-center justify-center gap-1">
            {year}年{month}月
            {isNavigating && <Spinner className="w-3.5 h-3.5" />}
          </span>
          <button onClick={() => navigate(`/shift/gym-assignments?year=${next.y}&month=${next.m}`)} className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 text-[#1A3666]">›</button>
        </div>
      </div>
      <p className="text-xs text-gray-500 mb-4">
        1日に3人まで割り当てられます。担当者を選ぶとすぐに保存され、割り当てられた人はカレンダーで確認できます。
        名前の後ろの（数字）は予約アカウント数で、その数まで同じ日に重ねて割り当てられます。
      </p>

      {/* 予約アカウント保有者と今月の割当回数 */}
      <div className="bg-white rounded-xl border border-[#EAE0A8] px-4 py-2.5 mb-3">
        <p className="text-xs font-bold text-gray-400 mb-1.5">予約アカウント保有者（今月の割当回数）</p>
        {people.length === 0 ? (
          <p className="text-xs text-gray-400">
            まだいません。各保護者がマイプロフィールで予約アカウント数を登録すると、ここに表示され割り当てられるようになります。
          </p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {people.map(p => (
              <span key={p.id} className="text-xs bg-sky-50 border border-sky-200 text-[#1A3666] rounded-full px-2 py-0.5">
                {p.name}
                <span className="text-gray-500 ml-1">{p.accounts}アカウント・{monthlyCount(p.id)}回</span>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className={`bg-white rounded-xl border border-[#EAE0A8] overflow-hidden transition-opacity ${isNavigating ? 'opacity-50' : ''}`}>
        <div className="px-4 py-1.5 bg-[#F5C800]/10 border-b border-[#EAE0A8] flex items-center justify-between">
          <span className="text-sm font-bold text-[#1A3666]">練習日</span>
          <span className="text-xs text-gray-500">割当 {filledCount} / {days.length * 3}枠</span>
        </div>
        {days.length === 0 ? (
          <p className="px-4 py-6 text-sm text-gray-400 text-center">
            この月は候補のある日がありません。先に「体育館予約候補」を登録してください。
          </p>
        ) : (
          <div className="px-3 divide-y divide-gray-200">
            {days.map(day => (
              <DayRow
                key={day.date}
                day={day}
                slots={slotsByDate[day.date]}
                people={people}
                onChange={(idx, id) => changeSlot(day.date, idx, id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
