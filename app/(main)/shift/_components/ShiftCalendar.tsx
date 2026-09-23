'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { Role } from '@/lib/types'
import { getHolidayName } from '@/lib/utils/holidays'
import { toggleCoachWanted, setCoachAvailability } from '../actions'

export type ShiftCoach = { id: string; name: string }
export type ShiftPractice = {
  id: string
  title: string
  start_at: string
  end_at: string
  is_all_day: boolean
  status: string
  needs_coach: boolean
  availableIds: string[]
  unavailableIds: string[]
  myStatus: 'available' | 'unavailable' | null
}

const DOW = ['日', '月', '火', '水', '木', '金', '土']

function toDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function jstDateStr(iso: string): string {
  return new Date(new Date(iso).getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('ja-JP', {
    timeZone: 'Asia/Tokyo', hour: '2-digit', minute: '2-digit', hour12: false,
  })
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('ja-JP', {
    timeZone: 'Asia/Tokyo', month: 'long', day: 'numeric', weekday: 'short',
    hour: '2-digit', minute: '2-digit', hour12: false,
  })
}

export default function ShiftCalendar({
  year, month, role, currentUserId, coaches, practices,
}: {
  year: number
  month: number
  role: Role
  currentUserId: string
  coaches: ShiftCoach[]
  practices: ShiftPractice[]
}) {
  const router = useRouter()
  const isAdmin = role === 'admin'
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const todayStr = toDateStr(new Date())

  const coachName = (id: string) => coaches.find(c => c.id === id)?.name ?? '不明'

  // 日付→練習
  const byDate: Record<string, ShiftPractice[]> = {}
  for (const p of practices) {
    (byDate[jstDateStr(p.start_at)] ??= []).push(p)
  }

  // グリッド生成
  const firstDay = new Date(year, month - 1, 1)
  const lastDay = new Date(year, month, 0)
  const cells: (Date | null)[] = []
  for (let i = 0; i < firstDay.getDay(); i++) cells.push(null)
  for (let d = 1; d <= lastDay.getDate(); d++) cells.push(new Date(year, month - 1, d))
  while (cells.length % 7 !== 0) cells.push(null)
  const weeks: (Date | null)[][] = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))

  function nav(y: number, m: number) { router.push(`/shift?year=${y}&month=${m}`) }
  function goPrev() { const p = month === 1 ? { y: year - 1, m: 12 } : { y: year, m: month - 1 }; nav(p.y, p.m) }
  function goNext() { const n = month === 12 ? { y: year + 1, m: 1 } : { y: year, m: month + 1 }; nav(n.y, n.m) }

  const selected = practices.find(p => p.id === selectedId) ?? null

  function doToggleWanted(id: string) {
    startTransition(async () => { await toggleCoachWanted(id); router.refresh() })
  }
  function doSetAvailability(id: string, status: 'available' | 'unavailable' | 'none') {
    startTransition(async () => { await setCoachAvailability(id, status); router.refresh() })
  }

  return (
    <div>
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <button onClick={goPrev} className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100 text-[#1A3666] text-xl font-bold transition-colors">‹</button>
          <h1 className="text-xl font-bold text-[#1A3666] min-w-[120px] text-center">{year}年{month}月</h1>
          <button onClick={goNext} className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100 text-[#1A3666] text-xl font-bold transition-colors">›</button>
          <button onClick={() => router.push('/shift')} className="text-xs font-semibold text-[#1A3666] border border-[#1A3666] px-3 py-1 rounded-lg hover:bg-[#1A3666] hover:text-white transition-colors">今月</button>
        </div>
        <p className="text-sm font-bold text-[#1A3666]">コーチシフト表</p>
      </div>

      <p className="text-xs text-gray-500 mb-3">
        練習をタップして{isAdmin ? 'コーチ募集の設定と参加可否の回答' : '参加可否を回答'}ができます。
        <span className="ml-1">🙋=募集中 / ⭕=参加可 / ❌=不可</span>
      </p>

      {/* カレンダー本体 */}
      <div className="bg-white rounded-xl border border-[#EAE0A8] overflow-hidden">
        <div className="grid grid-cols-7 border-b border-[#EAE0A8]">
          {DOW.map((d, i) => (
            <div key={d} className={`py-2 text-center text-sm font-bold ${i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-[#1A3666]'}`}>{d}</div>
          ))}
        </div>

        {weeks.map((week, wi) => (
          <div key={wi} className={wi < weeks.length - 1 ? 'border-b border-[#EAE0A8]' : ''}>
            <div className="grid grid-cols-7">
              {week.map((day, ci) => {
                if (!day) return <div key={`e-${wi}-${ci}`} className="border-r border-[#EAE0A8] min-h-[90px] bg-gray-50/40" />
                const dateStr = toDateStr(day)
                const dow = day.getDay()
                const holiday = getHolidayName(dateStr)
                const isRed = dow === 0 || holiday !== null
                const isSat = dow === 6
                const isToday = dateStr === todayStr
                const dayPractices = byDate[dateStr] ?? []
                return (
                  <div key={dateStr} className={`border-r border-[#EAE0A8] min-h-[90px] px-0.5 py-1 ${isToday ? 'bg-white' : ''}`}>
                    <div className="mb-0.5">
                      <span className={`text-sm font-bold w-7 h-7 inline-flex items-center justify-center rounded-full ${
                        isToday ? 'bg-[#1A3666] text-white' : isRed ? 'text-red-500' : isSat ? 'text-blue-500' : 'text-[#1A3666]'
                      }`}>{day.getDate()}</span>
                    </div>
                    <div className="space-y-0.5">
                      {dayPractices.map(p => {
                        const isProvisional = p.status === 'provisional'
                        const myIcon = p.myStatus === 'available' ? '⭕' : p.myStatus === 'unavailable' ? '❌' : ''
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => setSelectedId(p.id)}
                            className="block w-full text-left text-[10px] sm:text-[11px] font-semibold px-0.5 sm:px-1 py-0.5 rounded truncate leading-tight bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
                            title={p.title}
                          >
                            {p.needs_coach && '🙋'}{isProvisional && '仮'}{myIcon}
                            <span className="ml-0.5">{p.title}</span>
                            {p.availableIds.length > 0 && <span className="ml-0.5 text-green-700">可{p.availableIds.length}</span>}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* 練習の操作パネル（モーダル） */}
      {selected && (
        <div
          className="fixed inset-0 z-[9990] bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setSelectedId(null)}
        >
          <div
            className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[85vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-5">
              <div className="flex items-start justify-between gap-2 mb-1">
                <h2 className="text-base font-bold text-[#1A3666]">{selected.title}</h2>
                <button type="button" onClick={() => setSelectedId(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none shrink-0">✕</button>
              </div>
              <p className="text-xs text-gray-500 mb-4">
                {selected.is_all_day ? `${formatDateTime(selected.start_at).split(' ')[0]} 終日` : formatDateTime(selected.start_at)}
                {selected.status === 'provisional' && <span className="ml-2 text-orange-500 font-bold">仮登録</span>}
              </p>

              {/* 管理者: コーチ募集トグル */}
              {isAdmin && (
                <div className="mb-4 flex items-center justify-between bg-[#F5F8FF] border border-[#D0DCF5] rounded-lg px-4 py-3">
                  <span className="text-sm font-semibold text-[#1A3666]">🙋 コーチ募集</span>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => doToggleWanted(selected.id)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 ${selected.needs_coach ? 'bg-[#1A3666]' : 'bg-gray-300'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${selected.needs_coach ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
              )}

              {/* 自分の参加可否 */}
              <div className="mb-4">
                <p className="text-xs font-semibold text-gray-500 mb-2">あなたの参加可否</p>
                <div className="flex gap-2">
                  {([
                    { key: 'available', label: '⭕ 参加可', on: 'bg-green-600 border-green-600 text-white', off: 'border-gray-300 text-gray-500' },
                    { key: 'unavailable', label: '❌ 不可', on: 'bg-red-500 border-red-500 text-white', off: 'border-gray-300 text-gray-500' },
                    { key: 'none', label: '未回答', on: 'bg-gray-400 border-gray-400 text-white', off: 'border-gray-300 text-gray-500' },
                  ] as const).map(opt => {
                    const active = (selected.myStatus ?? 'none') === opt.key
                    return (
                      <button
                        key={opt.key}
                        type="button"
                        disabled={isPending}
                        onClick={() => doSetAvailability(selected.id, opt.key)}
                        className={`flex-1 py-2 rounded-lg text-sm font-bold border-2 transition-colors disabled:opacity-50 ${active ? opt.on : `bg-white ${opt.off}`}`}
                      >
                        {opt.label}
                      </button>
                    )
                  })}
                </div>
                <p className="text-[11px] text-gray-400 mt-1.5">「参加可」にすると通常カレンダーの参加予定コーチに反映されます。</p>
              </div>

              {/* 回答状況 */}
              <div className="space-y-3 border-t border-[#EAE0A8] pt-4">
                <div>
                  <p className="text-xs font-semibold text-green-700 mb-1">参加可（{selected.availableIds.length}名）</p>
                  <p className="text-sm text-[#1A3666]">
                    {selected.availableIds.length > 0 ? selected.availableIds.map(coachName).join('・') : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-red-500 mb-1">参加不可（{selected.unavailableIds.length}名）</p>
                  <p className="text-sm text-gray-500">
                    {selected.unavailableIds.length > 0 ? selected.unavailableIds.map(coachName).join('・') : '—'}
                  </p>
                </div>
                <div>
                  {(() => {
                    const answered = new Set([...selected.availableIds, ...selected.unavailableIds])
                    const pendingCoaches = coaches.filter(c => !answered.has(c.id))
                    return (
                      <>
                        <p className="text-xs font-semibold text-gray-400 mb-1">未回答（{pendingCoaches.length}名）</p>
                        <p className="text-sm text-gray-400">
                          {pendingCoaches.length > 0 ? pendingCoaches.map(c => c.name).join('・') : '—'}
                        </p>
                      </>
                    )
                  })()}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
