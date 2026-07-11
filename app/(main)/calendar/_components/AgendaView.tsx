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
}: {
  year: number
  month: number
  events: CalendarEvent[]
  role: Role
  currentUserId: string
}) {
  const router = useRouter()
  const isAdminOrCoach = role === 'admin' || role === 'coach'
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

  // 当月の全日付を生成
  const daysInMonth = new Date(year, month, 0).getDate()
  const days: Date[] = Array.from({ length: daysInMonth }, (_, i) => new Date(year, month - 1, i + 1))

  // 各日付のイベントをまとめる
  const dayEntries = days
    .map(day => ({ day, events: events.filter(e => eventCoversDay(e, day)) }))
    .filter(({ events: evs }) => evs.length > 0)

  return (
    <div>
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
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
        </div>

        <Link
          href="/calendar/new"
          className="bg-[#1A3666] text-white text-sm font-semibold px-3 py-2 rounded-lg"
        >
          ＋ 追加
        </Link>
      </div>

      {/* イベント一覧 */}
      {dayEntries.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#EAE0A8] py-16 text-center">
          <p className="text-gray-400 text-sm">この月の予定はありません</p>
        </div>
      ) : (
        <div className="space-y-4">
          {dayEntries.map(({ day, events: dayEvents }) => {
            const dateStr = toDateStr(day)
            const dow = day.getDay()
            const holidayName = getHolidayName(dateStr)
            const isRed = dow === 0 || holidayName !== null
            const isSat = dow === 6
            const isToday = dateStr === todayStr

            return (
              <div key={dateStr}>
                {/* 日付ヘッダー */}
                <div className={`flex items-baseline gap-1.5 mb-2 pb-1 border-b ${isToday ? 'border-[#1A3666]' : 'border-[#EAE0A8]'}`}>
                  <span
                    className={`text-base font-bold ${
                      isToday ? 'text-[#1A3666]' : isRed ? 'text-red-500' : isSat ? 'text-blue-500' : 'text-[#1A3666]'
                    }`}
                  >
                    {month}/{day.getDate()}（{DOW_LABELS[dow]}）
                  </span>
                  {holidayName && (
                    <span className="text-xs text-red-400">{holidayName}</span>
                  )}
                  {isToday && (
                    <span className="text-xs font-bold text-white bg-[#1A3666] px-2 py-0.5 rounded-full">今日</span>
                  )}
                </div>

                <div className="space-y-2 pl-1">
                  {dayEvents.map(e => {
                    const { bg, label } = EVENT_TYPE_STYLE[e.event_type] ?? EVENT_TYPE_STYLE.other
                    const isHidden = !e.is_visible
                    return (
                      <Link
                        key={e.id}
                        href={`/calendar/${e.id}`}
                        className={`flex items-start gap-3 bg-white rounded-xl border p-3 active:bg-gray-50 ${isHidden ? 'border-gray-200 opacity-50' : 'border-[#EAE0A8]'}`}
                      >
                        <div className="shrink-0 mt-0.5">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${bg}`}>
                            {label}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-[#1A3666] text-sm leading-snug">{e.title}</p>
                            {isHidden && (
                              <span className="text-[10px] font-semibold text-gray-400 border border-gray-300 px-1.5 py-0.5 rounded-full shrink-0">非表示</span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {formatTime(e.start_at)} 〜 {formatTime(e.end_at)}
                          </p>
                          {e.description && (
                            <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{e.description}</p>
                          )}
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
