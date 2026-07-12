'use client'

import { useTransition } from 'react'
import { addParticipant, removeParticipant } from '../../actions'
import type { Role } from '@/lib/types'

type Participant = {
  member_id: string
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
  eventId, memberId, isJoining, name, photoUrl,
}: {
  eventId: string; memberId: string; isJoining: boolean; name: string; photoUrl: string | null
}) {
  const [isPending, startTransition] = useTransition()

  function toggle() {
    startTransition(async () => {
      if (isJoining) {
        await removeParticipant(eventId, memberId)
      } else {
        await addParticipant(eventId, memberId)
      }
    })
  }

  return (
    <div className={`flex items-center justify-between p-2.5 rounded-lg border transition-colors ${
      isJoining ? 'bg-green-50 border-green-300' : 'bg-white border-gray-200'
    }`}>
      <div className="flex items-center gap-2.5">
        <MemberAvatar photoUrl={photoUrl} name={name} />
        <span className="text-sm font-semibold text-[#1A3666]">{name}</span>
      </div>
      <button
        type="button"
        disabled={isPending}
        onClick={toggle}
        className={`text-xs font-bold px-3 py-1 rounded-full transition-colors disabled:opacity-50 ${
          isJoining
            ? 'bg-green-600 text-white hover:bg-green-700'
            : 'bg-gray-100 text-gray-600 hover:bg-[#1A3666] hover:text-white'
        }`}
      >
        {isPending ? '...' : isJoining ? '参加予定' : '参加登録'}
      </button>
    </div>
  )
}

export default function ParticipantSection({
  eventId,
  participants,
  myMembers,
  role,
}: {
  eventId: string
  participants: Participant[]
  myMembers: MyMember[]
  role: Role
}) {
  const participantIds = new Set(participants.map(p => p.member_id))
  const canRegister = role === 'admin' || role === 'member'

  return (
    <div className="bg-white rounded-xl border border-[#EAE0A8] p-6">
      <h2 className="text-base font-bold text-[#1A3666] mb-4">
        参加メンバー
        <span className="ml-2 text-sm font-semibold text-gray-400">（{participants.length}名）</span>
      </h2>

      {/* 参加登録セクション（保護者・管理者） */}
      {canRegister && (
        <div className="mb-5">
          <p className="text-xs font-semibold text-gray-500 mb-2">
            {role === 'admin' ? '参加登録（全メンバー）' : '参加するお子様を選択'}
          </p>
          {myMembers.length > 0 ? (
            <div className="space-y-2">
              {myMembers.map(m => (
                <ToggleButton
                  key={m.id}
                  eventId={eventId}
                  memberId={m.id}
                  isJoining={participantIds.has(m.id)}
                  name={m.full_name}
                  photoUrl={m.photo_url}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 bg-gray-50 rounded-lg px-4 py-3">
              {role === 'member'
                ? 'メンバーを登録して管理者に承認されると、参加登録ができます。'
                : '承認済みメンバーがいません。'}
            </p>
          )}
        </div>
      )}

      {/* 参加者一覧 */}
      {participants.length > 0 ? (
        <div>
          {canRegister && myMembers.length > 0 && (
            <p className="text-xs font-semibold text-gray-500 mb-2">参加予定者</p>
          )}
          <div className="flex flex-wrap gap-2">
            {participants.map(p => (
              <div key={p.member_id} className="flex items-center gap-1.5 bg-[#F5F8FF] border border-[#D0DCF5] rounded-full px-3 py-1">
                <MemberAvatar photoUrl={p.members?.photo_url ?? null} name={p.members?.full_name ?? ''} />
                <span className="text-xs font-semibold text-[#1A3666]">{p.members?.full_name ?? '不明'}</span>
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
