'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { CalendarEvent, Role } from '@/lib/types'
import { getHolidayName } from '@/lib/utils/holidays'
import { EVENT_TYPE_STYLE } from '../_utils/eventTypeStyle'

const DOW_LABELS = ['日', '月', '火', '水', '木', '金', '土']

function toDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function formatTime(isoStr: string): string {
  return new Date(isoStr).toLocaleTimeString('ja-JP', {
    timeZone: 'Asia/Tokyo',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

function eventCoversDay(event: CalendarEvent, day: Date): boolean {
  const dayStart = new Date(day)
  dayStart.setHours(0, 0, 0, 0)
  const dayEnd = new Date(day)
  dayEnd.setHours(23, 59, 59, 999)
  const s = new Date(event.start_at)
  const e = new Date(event.end_at)
  return s <= dayEnd && e >= dayStart
}

export default function AgendaView({
  year,
  month,
  events,
  role,
  currentUserId,
  creatorMap = {},
  childEventIds,
  viewToggle,
}: {
  year: number
  month: number
  events: CalendarEvent[]
  role: Role
  currentUserId: string
  creatorMap?: Record<string, string>
  childEventIds?: string[]
  viewToggle?: React.ReactNode
}) {
  const childEventSet = new Set(childEventIds ?? [])
  const router = useRouter()
  const todayStr = toDateStr(new Date())

  function goPrev() {
    const prev = month === 1 ? { y: year - 1, m: 12 } : { y: year, m: month - 1 }
    router.push(`/calendar?year=${prev.y}&month=${prev.m}`)
  }
  function goNext() {
    const next = month === 12 ? { y: year + 1, m: 1 } : { y: year, m: month + 1 }
    router.push(`/calendar?year=${next.y}&month=${next.m}`)
  }
  function goToday() {
    router.push('/calendar')
  }

  // 当月の全日付
  const daysInMonth = new Date(year, month, 0).getDate()
  const days: Date[] = Array.from({ length: daysInMonth }, (_, i) => new Date(year, month - 1, i + 1))

  return (
    <div>
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1">
          <button
            onClick={goPrev}
            className="w-9 h-9 flex items-center justify-center rounded-lg text-[#1A3666] text-xl font-bold"
          >
            ‹
          </button>
          <h1 className="text-lg font-bold text-[#1A3666] min-w-[110px] text-center">
            {year}年{month}月
          </h1>
          <button
            onClick={goNext}
            className="w-9 h-9 flex items-center justify-center rounded-lg text-[#1A3666] text-xl font-bold"
          >
            ›
          </button>
          <button
            onClick={goToday}
            className="text-xs font-semibold text-[#1A3666] border border-[#1A3666] px-2.5 py-1 rounded-lg"
          >
            今月
          </button>
          {viewToggle}
        </div>
      </div>

      {/* 全日付リスト */}
      <div className="space-y-1">
        {days.map(day => {
          const dateStr = toDateStr(day)
          const dow = day.getDay()
          const holidayName = getHolidayName(dateStr)
          const isRed = dow === 0 || holidayName !== null
          const isSat = dow === 6
          const isToday = dateStr === todayStr
          const dayEvents = events.filter(e => eventCoversDay(e, day))

          return (
            <div key={dateStr}>
              {/* 日付行: タップで予定登録 */}
              <Link
                href={`/calendar/new?date=${dateStr}`}
                className={`flex items-center justify-between px-3 py-2 rounded-lg active:bg-[#F5C800]/20 transition-colors ${
                  isToday ? 'bg-[#1A3666]/5' : 'bg-transparent'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`text-sm font-bold w-6 h-6 flex items-center justify-center rounded-full shrink-0 ${
                      isToday
                        ? 'bg-[#1A3666] text-white'
                        : isRed
                        ? 'text-red-500'
                        : isSat
                        ? 'text-blue-500'
                        : 'text-[#1A3666]'
                    }`}
                  >
                    {day.getDate()}
                  </span>
                  <span
                    className={`text-sm font-semibold ${
                      isRed ? 'text-red-500' : isSat ? 'text-blue-500' : 'text-[#1A3666]'
                    }`}
                  >
                    {DOW_LABELS[dow]}
                  </span>
                  {holidayName && (
                    <span className="text-[11px] text-red-400">{holidayName}</span>
                  )}
                  {isToday && (
                    <span className="text-[10px] font-bold text-white bg-[#1A3666] px-1.5 py-0.5 rounded-full">今日</span>
                  )}
                </div>
                <span className="text-gray-300 text-base font-bold">＋</span>
              </Link>

              {/* その日のイベント */}
              {dayEvents.length > 0 && (
                <div className="space-y-1.5 pl-3 pr-1 pb-2">
                  {dayEvents.map(e => {
                    const { bg, label } = EVENT_TYPE_STYLE[e.event_type] ?? EVENT_TYPE_STYLE.other
                    const isHidden = !e.is_visible
                    const isProvisional = e.event_type === 'practice' && e.status === 'provisional'
                    return (
                      <Link
                        key={e.id}
                        href={`/calendar/${e.id}`}
                        className={`flex items-start gap-2.5 bg-white rounded-xl border p-3 active:bg-gray-50 ${
                          isHidden ? 'border-gray-200 opacity-50' : 'border-[#EAE0A8]'
                        }`}
                      >
                        <div className="shrink-0 mt-0.5 flex flex-col gap-1 items-start">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${bg}`}>
                            {label}
                          </span>
                          {isProvisional && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-600">仮</span>
                          )}
                          {e.is_game_practice && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">🏸 ゲーム</span>
                          )}
                          {childEventSet.has(e.id) && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-600">★ 参加</span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-[#1A3666] text-sm leading-snug">{e.title}</p>
                            {isHidden && (
                              <span className="text-[10px] text-gray-400 border border-gray-300 px-1.5 py-0.5 rounded-full shrink-0">非表示</span>
                            )}
                          </div>
                          <p className="text-xs text-black mt-0.5">
                            {e.is_all_day
                              ? '終日'
                              : `${formatTime(e.start_at)} 〜 ${formatTime(e.end_at)}`}
                            {e.created_by && creatorMap[e.created_by] && (
                              <span className="ml-2">({creatorMap[e.created_by]})</span>
                            )}
                          </p>
                          {e.description && (
                            <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{e.description}</p>
                          )}
                        </div>
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
