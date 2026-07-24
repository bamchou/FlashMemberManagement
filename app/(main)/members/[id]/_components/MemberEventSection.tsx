'use client'

import { useTransition, useState } from 'react'
import Link from 'next/link'
import { addParticipant, removeParticipant } from '@/app/(main)/calendar/actions'
import { EVENT_TYPE_STYLE } from '@/app/(main)/calendar/_utils/eventTypeStyle'

type EventRow = {
  id: string
  title: string
  event_type: string
  start_at: string
  end_at: string
  status: string
  singles_fee: number | null
  doubles_fee: number | null
}

type Category = 'singles' | 'doubles' | 'both'

const CATEGORY_OPTIONS: { value: Category; label: string }[] = [
  { value: 'singles', label: 'シングルス' },
  { value: 'doubles', label: 'ダブルス' },
  { value: 'both',    label: '両方' },
]

function getDefaultCategory(singlesFee: number | null, doublesFee: number | null): Category {
  if (doublesFee != null && singlesFee == null) return 'doubles'
  return 'singles'
}

function getAvailableOptions(singlesFee: number | null, doublesFee: number | null) {
  const hasSingles = singlesFee != null
  const hasDoubles = doublesFee != null
  if (!hasSingles && !hasDoubles) return CATEGORY_OPTIONS
  return CATEGORY_OPTIONS.filter(opt => {
    if (opt.value === 'singles') return hasSingles
    if (opt.value === 'doubles') return hasDoubles
    if (opt.value === 'both')    return hasSingles && hasDoubles
    return false
  })
}

function formatDate(isoStr: string): string {
  return new Date(isoStr).toLocaleString('ja-JP', {
    timeZone: 'Asia/Tokyo',
    month: 'long', day: 'numeric', weekday: 'short',
    hour: '2-digit', minute: '2-digit', hour12: false,
  })
}

function EventRow({
  event,
  memberId,
  approvalStatus,
}: {
  event: EventRow
  memberId: string
  approvalStatus: 'approved' | 'pending' | null
}) {
  const [isPending, startTransition] = useTransition()
  const { bg, label } = EVENT_TYPE_STYLE[event.event_type] ?? EVENT_TYPE_STYLE.other
  const isProvisional = event.event_type === 'practice' && event.status === 'provisional'
  const isTournament = event.event_type === 'tournament'
  const isJoining = approvalStatus !== null

  const availableOptions = getAvailableOptions(event.singles_fee, event.doubles_fee)
  const [selectedCategory, setSelectedCategory] = useState<Category>(
    () => getDefaultCategory(event.singles_fee, event.doubles_fee)
  )

  function toggle() {
    startTransition(async () => {
      if (isJoining) {
        await removeParticipant(event.id, memberId)
      } else {
        await addParticipant(event.id, memberId, isTournament ? selectedCategory : undefined)
      }
    })
  }

  const buttonLabel = isPending
    ? '...'
    : isJoining
      ? isTournament && approvalStatus === 'pending' ? '承認待ち（取消）' : '参加予定（取消）'
      : '参加登録'

  const buttonClass = isJoining
    ? isTournament && approvalStatus === 'pending'
      ? 'bg-orange-500 text-white hover:bg-orange-600'
      : 'bg-green-600 text-white hover:bg-green-700'
    : 'bg-gray-100 text-gray-600 hover:bg-[#1A3666] hover:text-white'

  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
      isJoining
        ? isTournament && approvalStatus === 'pending' ? 'bg-orange-50 border-orange-200' : 'bg-green-50 border-green-200'
        : 'bg-white border-gray-200'
    }`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${bg}`}>{label}</span>
          {isProvisional && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-600">仮</span>
          )}
        </div>
        <Link href={`/calendar/${event.id}`} className="font-semibold text-sm text-[#1A3666] hover:underline truncate block">
          {event.title}
        </Link>
        <p className="text-xs text-gray-500 mt-0.5">{formatDate(event.start_at)}</p>

        {/* 大会：未登録時のみカテゴリ選択を表示 */}
        {isTournament && !isJoining && availableOptions.length > 1 && (
          <div className="flex items-center gap-1 mt-2 flex-wrap">
            {availableOptions.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setSelectedCategory(opt.value)}
                className={`text-xs font-semibold px-2 py-1 rounded-lg border-2 transition-colors ${
                  selectedCategory === opt.value
                    ? 'bg-[#1A3666] border-[#1A3666] text-white'
                    : 'bg-white border-gray-200 text-gray-500'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
        {isTournament && !isJoining && availableOptions.length === 1 && (
          <p className="text-xs text-gray-500 mt-1">種目: {availableOptions[0].label}</p>
        )}
      </div>
      <button
        type="button"
        disabled={isPending}
        onClick={toggle}
        className={`shrink-0 text-xs font-bold px-3 py-1.5 rounded-full transition-colors disabled:opacity-50 ${buttonClass}`}
      >
        {buttonLabel}
      </button>
    </div>
  )
}

function getMonthKey(isoStr: string): string {
  const d = new Date(new Date(isoStr).toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }))
  return `${d.getFullYear()}年${d.getMonth() + 1}月`
}

function groupByMonth(events: EventRow[]): [string, EventRow[]][] {
  const map = new Map<string, EventRow[]>()
  for (const e of events) {
    const key = getMonthKey(e.start_at)
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(e)
  }
  return Array.from(map.entries())
}

export default function MemberEventSection({
  memberId,
  events,
  participationStatusMap,
}: {
  memberId: string
  events: EventRow[]
  participationStatusMap: Map<string, 'approved' | 'pending'>
}) {
  if (events.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-gray-400 text-sm">今後の予定はありません</p>
      </div>
    )
  }

  const groups = groupByMonth(events)
  const [index, setIndex] = useState(0)
  const [month, monthEvents] = groups[index]

  return (
    <div>
      {/* 月ナビゲーション */}
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={() => setIndex(i => i - 1)}
          disabled={index === 0}
          className="w-8 h-8 flex items-center justify-center rounded-full border border-[#1A3666] text-[#1A3666] hover:bg-[#1A3666] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          ‹
        </button>
        <p className="text-sm font-bold text-[#1A3666]">{month}</p>
        <button
          type="button"
          onClick={() => setIndex(i => i + 1)}
          disabled={index === groups.length - 1}
          className="w-8 h-8 flex items-center justify-center rounded-full border border-[#1A3666] text-[#1A3666] hover:bg-[#1A3666] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          ›
        </button>
      </div>

      {/* 当月の予定 */}
      <div className="space-y-2">
        {monthEvents.map(e => (
          <EventRow
            key={e.id}
            event={e}
            memberId={memberId}
            approvalStatus={participationStatusMap.get(e.id) ?? null}
          />
        ))}
      </div>

      {/* ページ表示 */}
      <p className="text-center text-xs text-gray-400 mt-3">{index + 1} / {groups.length} ヶ月</p>
    </div>
  )
}
