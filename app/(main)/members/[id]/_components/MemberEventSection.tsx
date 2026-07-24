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

const REGISTER_BUTTONS: { value: Category; label: string }[] = [
  { value: 'singles', label: 'シングルスで参加' },
  { value: 'doubles', label: 'ダブルスで参加' },
  { value: 'both',    label: 'シングルス＋ダブルスで参加' },
]

function getAvailableButtons(singlesFee: number | null, doublesFee: number | null) {
  const hasSingles = singlesFee != null
  const hasDoubles = doublesFee != null
  if (!hasSingles && !hasDoubles) return REGISTER_BUTTONS
  return REGISTER_BUTTONS.filter(b => {
    if (b.value === 'singles') return hasSingles
    if (b.value === 'doubles') return hasDoubles
    if (b.value === 'both')    return hasSingles && hasDoubles
    return false
  })
}

function formatDate(isoStr: string): string {
  return new Date(isoStr).toLocaleString('ja-JP', {
    timeZone: 'Asia/Tokyo',
    month: 'numeric', day: 'numeric', weekday: 'short',
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
  approvalStatus: 'approved' | 'pending' | 'rejected' | null
}) {
  const [isPending, startTransition] = useTransition()
  const [pendingCategory, setPendingCategory] = useState<Category | 'cancel' | 'practice' | null>(null)
  const { bg, label } = EVENT_TYPE_STYLE[event.event_type] ?? EVENT_TYPE_STYLE.other
  const isProvisional = event.event_type === 'practice' && event.status === 'provisional'
  const isTournament = event.event_type === 'tournament'
  const isRejected = approvalStatus === 'rejected'
  const isJoining = approvalStatus !== null && !isRejected
  const availableButtons = getAvailableButtons(event.singles_fee, event.doubles_fee)

  function register(category: Category) {
    setPendingCategory(category)
    startTransition(async () => {
      await addParticipant(event.id, memberId, category)
      setPendingCategory(null)
    })
  }

  function cancel() {
    setPendingCategory('cancel')
    startTransition(async () => {
      await removeParticipant(event.id, memberId)
      setPendingCategory(null)
    })
  }

  function togglePractice() {
    setPendingCategory('practice')
    startTransition(async () => {
      if (isJoining) {
        await removeParticipant(event.id, memberId)
      } else {
        await addParticipant(event.id, memberId)
      }
      setPendingCategory(null)
    })
  }

  return (
    <div className={`px-3 py-2.5 rounded-lg border transition-colors ${
      isRejected
        ? 'bg-red-50 border-red-200'
        : isJoining
          ? isTournament && approvalStatus === 'pending' ? 'bg-orange-50 border-orange-200' : 'bg-green-50 border-green-200'
          : 'bg-white border-gray-200'
    }`}>
      {/* 1行目: バッジ + タイトル(+ゴメンナサイ注記) + 日時 */}
      <div className="flex items-center gap-1.5 min-w-0">
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${bg}`}>{label}</span>
        {isProvisional && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-600 shrink-0">仮</span>
        )}
        <div className="flex items-baseline gap-1.5 flex-1 min-w-0">
          <Link
            href={`/calendar/${event.id}`}
            className="font-semibold text-sm text-[#1A3666] hover:underline truncate shrink"
          >
            {event.title}
          </Link>
          {isTournament && isRejected && (
            <span className="text-xs text-red-500 font-medium whitespace-nowrap shrink-0">
              ※参加希望がゴメンナサイされました
            </span>
          )}
        </div>
        <span className="text-xs text-gray-500 shrink-0 whitespace-nowrap">{formatDate(event.start_at)}</span>
      </div>

      {/* 2行目: ボタン */}
      <div className="flex flex-wrap gap-1.5 mt-1.5 items-center">
        {/* 大会：ゴメンナサイ済み → 再申請ボタン */}
        {isTournament && isRejected && availableButtons.map(btn => (
          <button
            key={btn.value}
            type="button"
            disabled={isPending}
            onClick={() => register(btn.value)}
            className={`text-xs font-bold px-3 py-1 rounded-full border border-gray-400 text-gray-600 hover:border-[#1A3666] hover:text-[#1A3666] transition-colors disabled:opacity-50 ${
              pendingCategory === btn.value ? 'opacity-70' : ''
            }`}
          >
            {pendingCategory === btn.value ? '登録中...' : btn.label}
          </button>
        ))}

        {!isTournament && (
          <button
            type="button"
            disabled={isPending}
            onClick={togglePractice}
            className={`text-xs font-bold px-3 py-1 rounded-full transition-colors disabled:opacity-50 ${
              isJoining
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-gray-100 text-gray-600 hover:bg-[#1A3666] hover:text-white'
            }`}
          >
            {pendingCategory === 'practice' ? '...' : isJoining ? '参加予定（取消）' : '参加登録'}
          </button>
        )}

        {isTournament && isJoining && (
          <button
            type="button"
            disabled={isPending}
            onClick={cancel}
            className={`text-xs font-bold px-3 py-1 rounded-full transition-colors disabled:opacity-50 ${
              approvalStatus === 'pending'
                ? 'bg-orange-500 text-white hover:bg-orange-600'
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            {pendingCategory === 'cancel' ? '...' : approvalStatus === 'pending' ? '承認待ち（取消）' : '参加予定（取消）'}
          </button>
        )}

        {isTournament && !isJoining && !isRejected && availableButtons.map(btn => (
          <button
            key={btn.value}
            type="button"
            disabled={isPending}
            onClick={() => register(btn.value)}
            className={`text-xs font-bold px-3 py-1 rounded-full border border-[#1A3666] transition-colors disabled:opacity-50 ${
              pendingCategory === btn.value
                ? 'bg-[#1A3666] text-white opacity-70'
                : 'text-[#1A3666] hover:bg-[#1A3666] hover:text-white'
            }`}
          >
            {pendingCategory === btn.value ? '登録中...' : btn.label}
          </button>
        ))}
      </div>
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
  participationStatusMap: Map<string, 'approved' | 'pending' | 'rejected'>
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

      <p className="text-center text-xs text-gray-400 mt-3">{index + 1} / {groups.length} ヶ月</p>
    </div>
  )
}
