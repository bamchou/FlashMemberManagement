'use client'

import { useTransition } from 'react'
import { addParticipant, removeParticipant, approveParticipant } from '../../actions'
import type { Role } from '@/lib/types'

type Participant = {
  member_id: string
  approval_status: 'approved' | 'pending'
  members: { full_name: string; photo_url: string | null } | null
}

type MyMember = {
  id: string
  full_name: string
  photo_url: string | null
}

function MemberAvatar({ photoUrl, name }: { photoUrl: string | null; name: string }) {
  return (
    <div className="w-8 h-8 rounded-full bg-[#F5C800]/20 border border-[#F5C800] flex items-center justify-center shrink-0 overflow-hidden">
      {photoUrl
        ? <img src={photoUrl} alt={name} className="w-full h-full object-cover" />
        : <span className="text-sm">👤</span>}
    </div>
  )
}

function ToggleButton({
  eventId, memberId, isTournament, isJoining, isPending: isApprovalPending, name, photoUrl,
}: {
  eventId: string; memberId: string; isTournament: boolean
  isJoining: boolean; isPending: boolean; name: string; photoUrl: string | null
}) {
  const [isTransitioning, startTransition] = useTransition()

  function toggle() {
    startTransition(async () => {
      if (isJoining) {
        await removeParticipant(eventId, memberId)
      } else {
        await addParticipant(eventId, memberId)
      }
    })
  }

  const buttonLabel = isTransitioning
    ? '...'
    : isJoining
      ? isTournament && isApprovalPending ? '承認待ち（取消）' : '参加予定（取消）'
      : '参加登録'

  const buttonClass = isJoining
    ? isTournament && isApprovalPending
      ? 'bg-orange-500 text-white hover:bg-orange-600'
      : 'bg-green-600 text-white hover:bg-green-700'
    : 'bg-gray-100 text-gray-600 hover:bg-[#1A3666] hover:text-white'

  return (
    <div className={`flex items-center justify-between p-2.5 rounded-lg border transition-colors ${
      isJoining
        ? isTournament && isApprovalPending ? 'bg-orange-50 border-orange-300' : 'bg-green-50 border-green-300'
        : 'bg-white border-gray-200'
    }`}>
      <div className="flex items-center gap-2.5">
        <MemberAvatar photoUrl={photoUrl} name={name} />
        <span className="text-sm font-semibold text-[#1A3666]">{name}</span>
      </div>
      <button
        type="button"
        disabled={isTransitioning}
        onClick={toggle}
        className={`text-xs font-bold px-3 py-1 rounded-full transition-colors disabled:opacity-50 ${buttonClass}`}
      >
        {buttonLabel}
      </button>
    </div>
  )
}

function ApproveButton({ eventId, memberId }: { eventId: string; memberId: string }) {
  const [isPending, startTransition] = useTransition()

  function approve() {
    startTransition(async () => {
      await approveParticipant(eventId, memberId)
    })
  }

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={approve}
      className="text-xs font-bold px-3 py-1 rounded-full bg-[#1A3666] text-white hover:bg-[#2A52A0] transition-colors disabled:opacity-50 shrink-0"
    >
      {isPending ? '...' : '承認する'}
    </button>
  )
}

export default function ParticipantSection({
  eventId,
  eventType,
  participants,
  myMembers,
  role,
}: {
  eventId: string
  eventType: string
  participants: Participant[]
  myMembers: MyMember[]
  role: Role
}) {
  const participantMap = new Map(participants.map(p => [p.member_id, p.approval_status]))
  const canRegister = role === 'member'
  const isAdminOrCoach = role === 'admin' || role === 'coach'
  const isTournament = eventType === 'tournament'

  const approvedCount = participants.filter(p => p.approval_status === 'approved').length
  const pendingCount = participants.filter(p => p.approval_status === 'pending').length

  return (
    <div className="bg-white rounded-xl border border-[#EAE0A8] p-6">
      <h2 className="text-base font-bold text-[#1A3666] mb-4">
        参加メンバー
        <span className="ml-2 text-sm font-semibold text-gray-400">（{approvedCount}名確定</span>
        {pendingCount > 0 && (
          <span className="ml-1 text-sm font-semibold text-orange-500">・{pendingCount}名承認待ち</span>
        )}
        <span className="text-sm font-semibold text-gray-400">）</span>
      </h2>

      {/* 参加登録セクション（保護者のみ） */}
      {canRegister && (
        <div className="mb-5">
          <p className="text-xs font-semibold text-gray-500 mb-2">参加するお子様を選択</p>
          {myMembers.length > 0 ? (
            <div className="space-y-2">
              {myMembers.map(m => (
                <ToggleButton
                  key={m.id}
                  eventId={eventId}
                  memberId={m.id}
                  isTournament={isTournament}
                  isJoining={participantMap.has(m.id)}
                  isPending={participantMap.get(m.id) === 'pending'}
                  name={m.full_name}
                  photoUrl={m.photo_url}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 bg-gray-50 rounded-lg px-4 py-3">
              メンバーを登録して管理者に承認されると、参加登録ができます。
            </p>
          )}
          {isTournament && myMembers.length > 0 && (
            <p className="text-xs text-orange-500 mt-2">※ 大会参加は管理者・指導者の承認後に確定します</p>
          )}
        </div>
      )}

      {/* 参加者一覧 */}
      {participants.length > 0 ? (
        <div>
          {canRegister && myMembers.length > 0 && (
            <p className="text-xs font-semibold text-gray-500 mb-2">参加予定者</p>
          )}
          <div className="space-y-2">
            {participants.map(p => (
              <div key={p.member_id} className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${
                p.approval_status === 'pending'
                  ? 'bg-orange-50 border-orange-200'
                  : 'bg-[#F5F8FF] border-[#D0DCF5]'
              }`}>
                <MemberAvatar photoUrl={p.members?.photo_url ?? null} name={p.members?.full_name ?? ''} />
                <span className="text-xs font-semibold text-[#1A3666] flex-1">{p.members?.full_name ?? '不明'}</span>
                {p.approval_status === 'pending' ? (
                  <>
                    <span className="text-[10px] font-bold text-orange-500 border border-orange-300 px-2 py-0.5 rounded-full shrink-0">
                      承認待ち
                    </span>
                    {isAdminOrCoach && (
                      <ApproveButton eventId={eventId} memberId={p.member_id} />
                    )}
                  </>
                ) : (
                  <span className="text-[10px] font-bold text-green-600 border border-green-300 px-2 py-0.5 rounded-full shrink-0">
                    参加確定
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-sm text-gray-400 text-center py-4">まだ参加登録がありません</p>
      )}
    </div>
  )
}
