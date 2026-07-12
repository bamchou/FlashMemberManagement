'use client'

import { useTransition } from 'react'
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

  function toggle() {
    startTransition(async () => {
      if (isJoining) {
        await removeParticipant(event.id, memberId)
      } else {
        await addParticipant(event.id, memberId)
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
    <div className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
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

  return (
    <div className="space-y-2">
      {events.map(e => (
        <EventRow
          key={e.id}
          event={e}
          memberId={memberId}
          approvalStatus={participationStatusMap.get(e.id) ?? null}
        />
      ))}
    </div>
  )
}
