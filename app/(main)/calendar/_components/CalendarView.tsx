'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { CalendarEvent, Role } from '@/lib/types'
import { getHolidayName } from '@/lib/utils/holidays'

import { EVENT_TYPE_STYLE } from '../_utils/eventTypeStyle'
export { EVENT_TYPE_STYLE }

const DOW = ['日', '月', '火', '水', '木', '金', '土']

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

// 複数日（開始日 ≠ 終了日）かどうか
function isMultiDay(event: CalendarEvent): boolean {
  return toDateStr(new Date(event.start_at)) !== toDateStr(new Date(event.end_at))
}

interface EventBand {
  event: CalendarEvent
  startCol: number   // 0–6
  endCol: number     // 0–6 inclusive
  isStart: boolean   // この週でイベントが始まる
  isEnd: boolean     // この週でイベントが終わる
  lane: number       // 0, 1, 2…（縦位置）
}

function computeBandsForWeek(week: (Date | null)[], events: CalendarEvent[]): EventBand[] {
  const weekDateStrs = week.map(d => (d ? toDateStr(d) : null))
  const validStrs = weekDateStrs.filter(Boolean) as string[]
  if (validStrs.length === 0) return []

  const weekStart = validStrs[0]
  const weekEnd = validStrs[validStrs.length - 1]

  const raw: Omit<EventBand, 'lane'>[] = []

  for (const event of events) {
    if (!isMultiDay(event)) continue

    const evStart = toDateStr(new Date(event.start_at))
    const evEnd = toDateStr(new Date(event.end_at))

    // この週と重ならなければスキップ
    if (evStart > weekEnd || evEnd < weekStart) continue

    // 週の範囲にクランプ
    const bandStart = evStart < weekStart ? weekStart : evStart
    const bandEnd = evEnd > weekEnd ? weekEnd : evEnd

    const startCol = weekDateStrs.indexOf(bandStart)
    const endCol = weekDateStrs.indexOf(bandEnd)
    if (startCol === -1 || endCol === -1) continue

    raw.push({
      event,
      startCol,
      endCol,
      isStart: evStart >= weekStart,
      isEnd: evEnd <= weekEnd,
    })
  }

  // 開始列でソート、同列なら長いものを先に（レーン安定化）
  raw.sort((a, b) => {
    if (a.startCol !== b.startCol) return a.startCol - b.startCol
    return (b.endCol - b.startCol) - (a.endCol - a.startCol)
  })

  // レーン割り当て（貪欲法）
  const laneEnds: number[] = []
  return raw.map(band => {
    let lane = 0
    while (laneEnds[lane] !== undefined && laneEnds[lane] >= band.startCol) lane++
    laneEnds[lane] = band.endCol
    return { ...band, lane }
  })
}

export default function CalendarView({
  year,
  month,
  events,
  role,
  currentUserId,
  creatorMap = {},
  childEventIds,
}: {
  year: number
  month: number
  events: CalendarEvent[]
  role: Role
  currentUserId: string
  creatorMap?: Record<string, string>
  childEventIds?: string[]
}) {
  const childEventSet = new Set(childEventIds ?? [])
  const router = useRouter()
  const todayStr = toDateStr(new Date())

  // カレンダーグリッド生成
  const firstDay = new Date(year, month - 1, 1)
  const lastDay = new Date(year, month, 0)
  const cells: (Date | null)[] = []
  for (let i = 0; i < firstDay.getDay(); i++) cells.push(null)
  for (let d = 1; d <= lastDay.getDate(); d++) cells.push(new Date(year, month - 1, d))
  while (cells.length % 7 !== 0) cells.push(null)

  // 週単位に分割
  const weeks: (Date | null)[][] = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))

  function goPrev() {
    const prev = month === 1 ? { y: year - 1, m: 12 } : { y: year, m: month - 1 }
    router.push(`/calendar?year=${prev.y}&month=${prev.m}`)
  }
  function goNext() {
    const next = month === 12 ? { y: year + 1, m: 1 } : { y: year, m: month + 1 }
    router.push(`/calendar?year=${next.y}&month=${next.m}`)
  }
  function goToday() { router.push('/calendar') }

  return (
    <div>
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <button
            onClick={goPrev}
            className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100 text-[#1A3666] text-xl font-bold transition-colors"
          >
            ‹
          </button>
          <h1 className="text-xl font-bold text-[#1A3666] min-w-[120px] text-center">
            {year}年{month}月
          </h1>
          <button
            onClick={goNext}
            className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100 text-[#1A3666] text-xl font-bold transition-colors"
          >
            ›
          </button>
          <button
            onClick={goToday}
            className="text-xs font-semibold text-[#1A3666] border border-[#1A3666] px-3 py-1 rounded-lg hover:bg-[#1A3666] hover:text-white transition-colors"
          >
            今月
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            {Object.entries(EVENT_TYPE_STYLE).map(([type, { bg, label }]) => (
              <span key={type} className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${bg}`}>
                {label}
              </span>
            ))}
          </div>
          <Link
            href="/calendar/new"
            className="bg-[#1A3666] text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-[#2A52A0] transition-colors shrink-0"
          >
            ＋ 予定を追加
          </Link>
        </div>
      </div>

      {/* カレンダー本体 */}
      <div className="bg-white rounded-xl border border-[#EAE0A8] overflow-hidden">
        {/* 曜日ヘッダー */}
        <div className="grid grid-cols-7 border-b border-[#EAE0A8]">
          {DOW.map((d, i) => (
            <div
              key={d}
              className={`py-2 text-center text-sm font-bold ${
                i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-[#1A3666]'
              }`}
            >
              {d}
            </div>
          ))}
        </div>

        {/* 週行 */}
        {weeks.map((week, weekIdx) => {
          const bands = computeBandsForWeek(week, events)
          const maxLane = bands.length > 0 ? Math.max(...bands.map(b => b.lane)) + 1 : 0

          return (
            <div
              key={weekIdx}
              className={weekIdx < weeks.length - 1 ? 'border-b border-[#EAE0A8]' : ''}
            >
              {/* 複数日帯エリア */}
              {bands.length > 0 && (
                <div
                  className="grid grid-cols-7"
                  style={{
                    gridTemplateRows: `repeat(${maxLane}, 20px)`,
                    gap: '2px',
                    padding: '3px 0 1px',
                  }}
                >
                  {bands.map(band => {
                    const { bg } = EVENT_TYPE_STYLE[band.event.event_type] ?? EVENT_TYPE_STYLE.other
                    const isHidden = !band.event.is_visible
                    const isProvisional = band.event.event_type === 'practice' && band.event.status === 'provisional'
                    // 角丸: 開始側は左丸、終了側は右丸
                    const radiusTL = band.isStart ? '4px' : '0'
                    const radiusTR = band.isEnd   ? '4px' : '0'
                    const radiusBR = band.isEnd   ? '4px' : '0'
                    const radiusBL = band.isStart ? '4px' : '0'
                    return (
                      <Link
                        key={`${band.event.id}-w${weekIdx}`}
                        href={`/calendar/${band.event.id}`}
                        className={`text-[10px] font-semibold flex items-center overflow-hidden ${bg} ${isHidden ? 'opacity-40' : ''}`}
                        style={{
                          gridColumn: `${band.startCol + 1} / ${band.endCol + 2}`,
                          gridRow: band.lane + 1,
                          borderRadius: `${radiusTL} ${radiusTR} ${radiusBR} ${radiusBL}`,
                          marginLeft: band.isStart ? '2px' : '0',
                          marginRight: band.isEnd ? '2px' : '0',
                          paddingLeft: '5px',
                          paddingRight: '4px',
                          height: '20px',
                        }}
                        title={band.event.title}
                      >
                        {!band.isStart && (
                          <span className="mr-0.5 opacity-50">◀</span>
                        )}
                        <span className="truncate">
                          {isHidden && '🚫 '}{isProvisional && '仮 '}{band.event.is_game_practice && '🏸 '}{childEventSet.has(band.event.id) && '★ '}{band.event.title}
                        </span>
                        {!band.isEnd && (
                          <span className="ml-0.5 opacity-50 shrink-0">▶</span>
                        )}
                      </Link>
                    )
                  })}
                </div>
              )}

              {/* 日付セル行 */}
              <div className="grid grid-cols-7">
                {week.map((day, colIdx) => {
                  if (!day) {
                    return (
                      <div
                        key={`empty-${weekIdx}-${colIdx}`}
                        className="border-r border-[#EAE0A8] min-h-[90px] bg-gray-50/40"
                      />
                    )
                  }

                  const dateStr = toDateStr(day)
                  const dow = day.getDay()
                  const holidayName = getHolidayName(dateStr)
                  const isRed = dow === 0 || holidayName !== null
                  const isSat = dow === 6
                  const isToday = dateStr === todayStr
                  const isThisMonth = day.getMonth() === month - 1
                  // 単日イベントのみセルに表示（複数日は帯エリアに表示済み）
                  const dayEvents = events.filter(e => eventCoversDay(e, day) && !isMultiDay(e))

                  return (
                    <div
                      key={dateStr}
                      className={`border-r border-[#EAE0A8] min-h-[90px] p-1 ${
                        isToday ? 'bg-white' : ''
                      } ${!isThisMonth ? 'bg-gray-50/40' : ''}`}
                    >
                      <div className="flex items-start justify-between mb-0.5">
                        <Link
                          href={`/calendar/new?date=${dateStr}`}
                          className={`text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full leading-none hover:ring-2 hover:ring-[#F5C800] transition-shadow ${
                            isToday
                              ? 'bg-[#1A3666] text-white'
                              : isRed
                              ? 'text-red-500'
                              : isSat
                              ? 'text-blue-500'
                              : 'text-[#1A3666]'
                          } ${!isThisMonth ? 'opacity-35' : ''}`}
                          title={`${year}年${month}月${day.getDate()}日の予定を追加`}
                        >
                          {day.getDate()}
                        </Link>
                        {holidayName && (
                          <span className="text-[9px] text-red-400 leading-tight text-right max-w-[56px] mt-1 pointer-events-none">
                            {holidayName}
                          </span>
                        )}
                      </div>
                      <div className="space-y-0.5">
                        {dayEvents.slice(0, 3).map(e => {
                          const { bg, label } = EVENT_TYPE_STYLE[e.event_type] ?? EVENT_TYPE_STYLE.other
                          const isHidden = !e.is_visible
                          const isProvisional = e.event_type === 'practice' && e.status === 'provisional'
                          return (
                            <Link
                              key={e.id}
                              href={`/calendar/${e.id}`}
                              className={`block text-[10px] font-semibold px-1 py-0.5 rounded truncate leading-tight ${bg} ${isHidden ? 'opacity-40' : ''}`}
                              title={`${label} ${e.is_all_day ? '終日' : formatTime(e.start_at)} ${e.title}${e.created_by && creatorMap[e.created_by] ? ` (${creatorMap[e.created_by]})` : ''}`}
                            >
                              {isHidden && '🚫 '}{isProvisional && '仮 '}{e.is_game_practice && '🏸 '}{childEventSet.has(e.id) && '★ '}<span className="hidden sm:inline">{e.is_all_day ? '終日 ' : `${formatTime(e.start_at)} `}</span>{e.title}{e.created_by && creatorMap[e.created_by] ? ` ・${creatorMap[e.created_by]}` : ''}
                            </Link>
                          )
                        })}
                        {dayEvents.length > 3 && (
                          <span className="text-[10px] text-gray-400 pl-1">+{dayEvents.length - 3}件</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
