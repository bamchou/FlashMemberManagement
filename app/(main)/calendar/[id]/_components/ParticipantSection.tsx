'use client'

import { useState, useTransition } from 'react'
import { addParticipant, removeParticipant, approveParticipant, toggleCoachAttendance } from '../../actions'
import type { Role } from '@/lib/types'

type Participant = {
  member_id: string
  approval_status: 'approved' | 'pending'
  participation_category: string | null
  members: { full_name: string; photo_url: string | null } | null
}

type MyMember = {
  id: string
  full_name: string
  photo_url: string | null
}

type Category = 'singles' | 'doubles' | 'both'

function calcFee(
  category: string | null,
  singlesFee: number | null | undefined,
  doublesFee: number | null | undefined,
  accompFeePerPerson: number,
): number | null {
  if (!category) return null
  let entryFee = 0
  if (category === 'singles') entryFee = singlesFee ?? 0
  else if (category === 'doubles') entryFee = doublesFee ?? 0
  else if (category === 'both') entryFee = (singlesFee ?? 0) + (doublesFee ?? 0)
  return entryFee + accompFeePerPerson
}

const CATEGORY_OPTIONS: { value: Category; label: string }[] = [
  { value: 'singles', label: 'シングルス' },
  { value: 'doubles', label: 'ダブルス' },
  { value: 'both',    label: '両方' },
]

const CATEGORY_LABEL: Record<string, string> = {
  singles: 'シングルス',
  doubles: 'ダブルス',
  both:    'シングルス+ダブルス',
}

function MemberAvatar({ photoUrl, name }: { photoUrl: string | null; name: string }) {
  return (
    <div className="w-8 h-10 rounded-lg bg-[#F5C800]/20 border border-[#F5C800] flex items-center justify-center shrink-0 overflow-hidden">
      {photoUrl
        ? <img src={photoUrl} alt={name} className="w-full h-full object-cover object-top" />
        : <span className="text-sm">👤</span>}
    </div>
  )
}

function getDefaultCategory(singlesFee?: number | null, doublesFee?: number | null): Category {
  if (doublesFee != null && singlesFee == null) return 'doubles'
  return 'singles'
}

function getAvailableOptions(
  singlesFee?: number | null,
  doublesFee?: number | null,
): typeof CATEGORY_OPTIONS {
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

function RegisterBlock({
  eventId, memberId, isTournament, isJoining, isPending: isApprovalPending,
  name, photoUrl, category, singlesFee, doublesFee, accompFeePerPerson,
}: {
  eventId: string; memberId: string; isTournament: boolean
  isJoining: boolean; isPending: boolean; name: string; photoUrl: string | null
  category: string | null
  singlesFee?: number | null; doublesFee?: number | null; accompFeePerPerson?: number
}) {
  const [isTransitioning, startTransition] = useTransition()
  const [selectedCategory, setSelectedCategory] = useState<Category>(
    () => getDefaultCategory(singlesFee, doublesFee)
  )
  const availableOptions = getAvailableOptions(singlesFee, doublesFee)

  function register() {
    startTransition(async () => {
      await addParticipant(eventId, memberId, isTournament ? selectedCategory : undefined)
    })
  }

  function cancel() {
    startTransition(async () => {
      await removeParticipant(eventId, memberId)
    })
  }

  if (isJoining) {
    const isPending = isTournament && isApprovalPending
    return (
      <div className={`flex items-center justify-between p-2.5 rounded-lg border transition-colors ${
        isPending ? 'bg-orange-50 border-orange-300' : 'bg-green-50 border-green-300'
      }`}>
        <div className="flex items-center gap-2.5">
          <MemberAvatar photoUrl={photoUrl} name={name} />
          <div>
            <p className="text-sm font-semibold text-[#1A3666]">{name}</p>
            {isTournament && category && (() => {
              const catLabel = CATEGORY_OPTIONS.find(o => o.value === category)?.label
              const fee = !isPending
                ? calcFee(category, singlesFee, doublesFee, accompFeePerPerson ?? 0)
                : null
              return (
                <p className="text-[10px] text-gray-500">
                  {catLabel}
                  {fee != null && (
                    <span className="ml-1.5 font-semibold text-green-700">参加費 ¥{fee.toLocaleString()}</span>
                  )}
                </p>
              )
            })()}
          </div>
        </div>
        <button
          type="button"
          disabled={isTransitioning}
          onClick={cancel}
          className={`text-xs font-bold px-3 py-1 rounded-full transition-colors disabled:opacity-50 ${
            isPending
              ? 'bg-orange-500 text-white hover:bg-orange-600'
              : 'bg-green-600 text-white hover:bg-green-700'
          }`}
        >
          {isTransitioning ? '...' : isPending ? '承認待ち（取消）' : '参加予定（取消）'}
        </button>
      </div>
    )
  }

  // 未登録
  return (
    <div className="p-2.5 rounded-lg border border-gray-200 bg-white space-y-2">
      <div className="flex items-center gap-2.5">
        <MemberAvatar photoUrl={photoUrl} name={name} />
        <span className="text-sm font-semibold text-[#1A3666]">{name}</span>
      </div>
      {isTournament && availableOptions.length > 1 && (
        <div className="flex items-center gap-1.5 pl-10">
          {availableOptions.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setSelectedCategory(opt.value)}
              className={`text-xs font-semibold px-2.5 py-1 rounded-lg border-2 transition-colors ${
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
      <div className="flex justify-end">
        <button
          type="button"
          disabled={isTransitioning}
          onClick={register}
          className="text-xs font-bold px-3 py-1 rounded-full bg-gray-100 text-gray-600 hover:bg-[#1A3666] hover:text-white transition-colors disabled:opacity-50"
        >
          {isTransitioning ? '...' : '参加登録'}
        </button>
      </div>
    </div>
  )
}

function CoachToggleButton({ eventId, isAttending, isPractice }: { eventId: string; isAttending: boolean; isPractice: boolean }) {
  const [isPending, startTransition] = useTransition()
  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => startTransition(async () => { await toggleCoachAttendance(eventId) })}
      className={`text-sm font-bold px-4 py-2 rounded-lg border-2 transition-colors disabled:opacity-50 ${
        isAttending
          ? 'bg-[#1A3666] border-[#1A3666] text-white hover:bg-red-600 hover:border-red-600'
          : 'bg-white border-[#1A3666] text-[#1A3666] hover:bg-[#1A3666] hover:text-white'
      }`}
    >
      {isPending ? '...' : isAttending ? '参加予定（取消）' : isPractice ? '練習に参加する' : '参加する'}
    </button>
  )
}

function ApproveButton({ eventId, memberId }: { eventId: string; memberId: string }) {
  const [isPending, startTransition] = useTransition()

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => startTransition(async () => { await approveParticipant(eventId, memberId) })}
      className="text-xs font-bold px-3 py-1 rounded-full bg-[#1A3666] text-white hover:bg-[#2A52A0] transition-colors disabled:opacity-50 shrink-0"
    >
      {isPending ? '...' : '承認する'}
    </button>
  )
}

export default function ParticipantSection({
  eventId, eventType, participants, myMembers, role,
  singlesFee, doublesFee, accompFeePerPerson, deadlinePassed = false,
  coachAttendances = [], isCoachAttending = false,
}: {
  eventId: string
  eventType: string
  participants: Participant[]
  myMembers: MyMember[]
  role: Role
  singlesFee?: number | null
  doublesFee?: number | null
  accompFeePerPerson?: number
  deadlinePassed?: boolean
  coachAttendances?: { coachId: string; name: string }[]
  isCoachAttending?: boolean
}) {
  const participantMap = new Map(participants.map(p => [p.member_id, p]))
  const canRegister = role === 'member'
  const isPractice = eventType === 'practice'
  const isAdminOrCoach = role === 'admin' || role === 'coach'
  const isTournament = eventType === 'tournament'

  const approvedCount = participants.filter(p => p.approval_status === 'approved').length
  const pendingCount  = participants.filter(p => p.approval_status === 'pending').length

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

      {/* コーチ参加セクション（全イベント） */}
      {(role === 'coach' || coachAttendances.length > 0) && (
        <div className="mb-5 space-y-3">
          {role === 'coach' && (
            <CoachToggleButton eventId={eventId} isAttending={isCoachAttending} isPractice={isPractice} />
          )}
          {coachAttendances.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-2">参加予定コーチ</p>
              <div className="flex flex-wrap gap-2">
                {coachAttendances.map(c => (
                  <span
                    key={c.coachId}
                    className="text-xs font-semibold bg-[#1A3666]/10 text-[#1A3666] border border-[#1A3666]/20 px-3 py-1 rounded-full"
                  >
                    {c.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 参加登録セクション（保護者のみ） */}
      {canRegister && (
        <div className="mb-5">
          <p className="text-xs font-semibold text-gray-500 mb-2">参加するメンバーを選択</p>
          {isTournament && deadlinePassed ? (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-600 font-semibold">
              申込締切日を過ぎているため、参加登録できません
            </div>
          ) : myMembers.length > 0 ? (
            <div className="space-y-2">
              {myMembers.map(m => {
                const entry = participantMap.get(m.id)
                return (
                  <RegisterBlock
                    key={m.id}
                    eventId={eventId}
                    memberId={m.id}
                    isTournament={isTournament}
                    isJoining={!!entry}
                    isPending={entry?.approval_status === 'pending'}
                    name={m.full_name}
                    photoUrl={m.photo_url}
                    category={entry?.participation_category ?? null}
                    singlesFee={singlesFee}
                    doublesFee={doublesFee}
                    accompFeePerPerson={accompFeePerPerson}
                  />
                )
              })}
            </div>
          ) : (
            <p className="text-sm text-gray-400 bg-gray-50 rounded-lg px-4 py-3">
              メンバーを登録して管理者に承認されると、参加登録ができます。
            </p>
          )}
          {isTournament && !deadlinePassed && myMembers.length > 0 && (
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
                {isTournament && p.participation_category && (
                  <span className="text-[10px] font-bold text-[#1A3666] bg-[#F5C800]/30 border border-[#F5C800]/50 px-1.5 py-0.5 rounded shrink-0">
                    {CATEGORY_LABEL[p.participation_category] ?? p.participation_category}
                  </span>
                )}
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
