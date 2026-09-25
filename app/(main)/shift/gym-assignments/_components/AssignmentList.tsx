'use client'

import { useState, useTransition } from 'react'
import type { Role } from '@/lib/types'
import { WEEKDAY_LABELS } from '@/lib/gymCandidates'
import { getHolidayName } from '@/lib/utils/holidays'
import { useProgressNavigate } from '@/app/(main)/_components/useProgressNavigate'
import Spinner from '@/app/(main)/_components/Spinner'
import { setGymAssignment } from '../actions'

export type AssignmentDay = {
  date: string          // YYYY-MM-DD
  weekday: number
  candidates: string[]  // 第1〜第4候補の表示文字列
  assigneeId: string    // '' = 未割当
}

export type AssigneeOption = { id: string; role: Role; name: string }

const ROLE_GROUPS: { role: Role; label: string }[] = [
  { role: 'admin', label: '管理者' },
  { role: 'coach', label: 'コーチ' },
  { role: 'member', label: '保護者' },
]

function DayRow({ day, people }: { day: AssignmentDay; people: AssigneeOption[] }) {
  const [assigneeId, setAssigneeId] = useState(day.assigneeId)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const [, m, d] = day.date.split('-').map(Number)
  const holiday = getHolidayName(day.date)
  const color = day.weekday === 0 || holiday ? 'text-red-500' : day.weekday === 6 ? 'text-blue-500' : 'text-[#1A3666]'

  function change(next: string) {
    const prev = assigneeId
    setAssigneeId(next)
    setError(null)
    startTransition(async () => {
      const res = await setGymAssignment(day.date, next)
      if (res?.error) { setAssigneeId(prev); setError(res.error) }
    })
  }

  return (
    <div className="py-2.5 grid grid-cols-[3.5rem_1fr] gap-x-2 gap-y-1.5">
      <div className={`text-sm font-bold ${color} leading-tight pt-1.5`}>
        {m}/{d}
        <span className="text-xs ml-0.5">({WEEKDAY_LABELS[day.weekday]})</span>
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <select
            aria-label={`${m}月${d}日の予約担当者`}
            value={assigneeId}
            onChange={e => change(e.target.value)}
            disabled={isPending}
            className={`flex-1 min-w-0 px-2 py-1.5 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#1A3666] ${
              assigneeId ? 'border-sky-300 bg-sky-50 text-[#1A3666] font-semibold' : 'border-gray-300 bg-white text-gray-500'
            }`}
          >
            <option value="">未割当</option>
            {ROLE_GROUPS.map(g => {
              const list = people.filter(p => p.role === g.role)
              if (list.length === 0) return null
              return (
                <optgroup key={g.role} label={g.label}>
                  {list.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </optgroup>
              )
            })}
          </select>
          <span className="w-4 shrink-0 text-[#1A3666]">{isPending && <Spinner className="w-4 h-4" />}</span>
        </div>
        {holiday && <p className="text-[11px] text-red-400 mt-1">{holiday}</p>}
        {day.candidates.length > 0 ? (
          <ol className="mt-1 text-xs text-gray-500 space-y-0.5">
            {day.candidates.map((c, i) => (
              <li key={i} className="truncate">第{i + 1} {c}</li>
            ))}
          </ol>
        ) : (
          <p className="mt-1 text-xs text-gray-400">この曜日の候補は登録されていません</p>
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
  const prev = month === 1 ? { y: year - 1, m: 12 } : { y: year, m: month - 1 }
  const next = month === 12 ? { y: year + 1, m: 1 } : { y: year, m: month + 1 }
  const assignedCount = days.filter(d => d.assigneeId).length

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
        担当者を選ぶとすぐに保存されます。割り当てられた人はカレンダーで確認できます。
      </p>

      <div className={`bg-white rounded-xl border border-[#EAE0A8] overflow-hidden transition-opacity ${isNavigating ? 'opacity-50' : ''}`}>
        <div className="px-4 py-1.5 bg-[#F5C800]/10 border-b border-[#EAE0A8] flex items-center justify-between">
          <span className="text-sm font-bold text-[#1A3666]">練習日</span>
          <span className="text-xs text-gray-500">割当 {assignedCount} / {days.length}日</span>
        </div>
        {days.length === 0 ? (
          <p className="px-4 py-6 text-sm text-gray-400 text-center">
            この月は候補のある日がありません。先に「体育館予約候補」を登録してください。
          </p>
        ) : (
          <div className="px-3 divide-y divide-gray-200">
            {days.map(day => (
              <DayRow key={`${day.date}-${day.assigneeId}`} day={day} people={people} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
