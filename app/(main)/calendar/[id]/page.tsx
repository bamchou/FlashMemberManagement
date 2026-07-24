import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Role, CalendarEvent, Attachment, EventComment } from '@/lib/types'
import { EVENT_TYPE_STYLE } from '../_utils/eventTypeStyle'
import DeleteEventButton from './_components/DeleteEventButton'
import ToggleEventVisibilityButton from './_components/ToggleEventVisibilityButton'
import ParticipantSection from './_components/ParticipantSection'
import EventCommentSection from './_components/EventCommentSection'


function formatDateTime(isoStr: string): string {
  return new Date(isoStr).toLocaleString('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric', month: 'long', day: 'numeric',
    weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false,
  })
}

function formatDateOnly(isoStr: string): string {
  return new Date(isoStr).toLocaleDateString('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'short',
  })
}

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: profile }, { data: event }, { data: attachments }, { data: rawComments }] = await Promise.all([
    supabase.from('profiles').select('role').eq('id', user!.id).single(),
    supabase.from('events').select('*').eq('id', id).single(),
    supabase.from('attachments').select('*').eq('entity_type', 'event').eq('entity_id', id).order('created_at', { ascending: true }),
    supabase.from('event_comments').select('*').eq('event_id', id).order('created_at', { ascending: true }),
  ])

  if (!event) notFound()

  const role = (profile?.role ?? 'member') as Role
  const isAdmin = role === 'admin'
  const isAdminOrCoach = role === 'admin' || role === 'coach'
  const isGuardian = role === 'member'
  const isOwner = event.created_by === user!.id
  const canEdit = isOwner || isAdminOrCoach
  const e = event as CalendarEvent

  // 予定の終了判定（JST基準・全種別共通）
  const now = new Date()
  const isPast = e.is_all_day
    ? now > new Date(`${new Date(e.end_at).toLocaleDateString('en-CA', { timeZone: 'Asia/Tokyo' })}T23:59:00+09:00`)
    : now > new Date(e.end_at)
  // 申込締切日判定（JST基準）
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Tokyo' })
  const deadlinePassed = e.event_type === 'tournament' && !!e.entry_deadline && today > e.entry_deadline
  // 終了後: 編集不可（全員）、削除は管理者・指導者のみ可
  const canEditEvent = canEdit && !isPast
  const canDeleteEvent = isPast ? isAdminOrCoach : canEdit
  const { bg, label } = EVENT_TYPE_STYLE[e.event_type] ?? EVENT_TYPE_STYLE.other

  const adminSupabase = createAdminClient()

  // コメント投稿者プロフィール取得
  const commentUserIds = [...new Set((rawComments ?? []).map((c: { user_id: string }) => c.user_id))]
  const { data: commentProfiles } = commentUserIds.length > 0
    ? await adminSupabase.from('profiles').select('id, display_name, username').in('id', commentUserIds)
    : { data: [] }
  const commentProfileMap = Object.fromEntries(
    (commentProfiles ?? []).map((p: { id: string; display_name: string | null; username: string | null }) => [p.id, p])
  )
  const comments = (rawComments ?? []).map((c: EventComment) => ({
    ...c,
    profiles: commentProfileMap[c.user_id] ?? null,
  }))

  // 参加者 member_id + approval_status + participation_category 一覧を取得
  const { data: participantRows } = await adminSupabase
    .from('event_participants')
    .select('member_id, approval_status, participation_category')
    .eq('event_id', id)
    .neq('approval_status', 'rejected')
    .order('created_at', { ascending: true })

  const participantMemberIds = (participantRows ?? []).map((p: { member_id: string }) => p.member_id)
  const participantStatusMap = Object.fromEntries(
    (participantRows ?? []).map((p: { member_id: string; approval_status: string }) => [p.member_id, p.approval_status])
  )
  const participantCategoryMap = Object.fromEntries(
    (participantRows ?? []).map((p: { member_id: string; participation_category: string | null }) => [p.member_id, p.participation_category])
  )

  // 参加者のメンバー情報を別途取得
  const { data: participantMemberDetails } = participantMemberIds.length > 0
    ? await adminSupabase
        .from('members')
        .select('id, full_name, photo_url, withdrawn_at')
        .in('id', participantMemberIds)
    : { data: [] }

  const memberDetailMap = Object.fromEntries(
    (participantMemberDetails ?? []).map((m: { id: string; full_name: string; photo_url: string | null; withdrawn_at: string | null }) => [
      m.id, { full_name: m.full_name, photo_url: m.photo_url, withdrawn_at: m.withdrawn_at }
    ])
  )

  const participants = participantMemberIds
    .map(memberId => ({
      member_id: memberId,
      members: memberDetailMap[memberId] ?? null,
      approval_status: (participantStatusMap[memberId] ?? 'approved') as 'approved' | 'pending',
      participation_category: (participantCategoryMap[memberId] ?? null) as string | null,
      isWithdrawn: !!memberDetailMap[memberId]?.withdrawn_at,
    }))

  // 参加登録できるメンバー取得（保護者のみ）
  let myMembers: { id: string; full_name: string; photo_url: string | null }[] = []
  if (isGuardian) {
    const { data } = await adminSupabase
      .from('members')
      .select('id, full_name, photo_url')
      .eq('guardian_id', user!.id)
      .eq('approval_status', 'approved')
      .is('withdrawn_at', null)
    myMembers = (data ?? []) as typeof myMembers
  }

  // コーチ参加情報取得（全イベント）
  let coachAttendances: { coachId: string; name: string }[] = []
  let isCoachAttending = false
  const { data: attendances } = await adminSupabase
    .from('event_coach_attendances')
    .select('coach_id')
    .eq('event_id', id)
  if (attendances && attendances.length > 0) {
    const coachIds = attendances.map((a: { coach_id: string }) => a.coach_id)
    const { data: coachProfiles } = await adminSupabase
      .from('profiles')
      .select('id, display_name, username')
      .in('id', coachIds)
    coachAttendances = coachIds.map((cid: string) => {
      const p = (coachProfiles ?? []).find((p: { id: string; display_name: string | null; username: string }) => p.id === cid)
      return { coachId: cid, name: p?.display_name ?? p?.username ?? '不明' }
    })
    isCoachAttending = coachIds.includes(user!.id)
  }

  // 大会の帯同費を取得
  let accompFeePerPerson = 0
  let accompFeeLabel = ''
  if (e.event_type === 'tournament' && e.accompaniment_type) {
    const { data: feeSettings } = await adminSupabase
      .from('accompaniment_fee_settings')
      .select('label, amount_per_person')
      .eq('area_type', e.accompaniment_type)
      .single()
    if (feeSettings) {
      accompFeePerPerson = feeSettings.amount_per_person
      accompFeeLabel = `${feeSettings.label} ${feeSettings.amount_per_person.toLocaleString()}円/人`
    }
  }

  return (
    <div className="max-w-2xl">
      <Link href="/calendar" className="text-sm text-[#1A3666] hover:underline mb-4 inline-block">
        ← カレンダーに戻る
      </Link>

      <div className="bg-white rounded-xl border border-[#EAE0A8] p-6 mb-4">
        <div className="mb-5">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${bg}`}>{label}</span>
            {e.event_type === 'practice' && (
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                e.status === 'provisional'
                  ? 'bg-orange-100 text-orange-600 border border-orange-300'
                  : 'bg-green-100 text-green-700 border border-green-300'
              }`}>
                {e.status === 'provisional' ? '仮登録' : '確定'}
              </span>
            )}
            {!e.is_visible && (
              <span className="text-xs font-semibold text-gray-400 border border-gray-300 px-2.5 py-1 rounded-full">
                非表示
              </span>
            )}
          </div>
          <h1 className="text-xl font-bold text-[#1A3666] leading-snug">{e.title}</h1>
        </div>

        <div className="space-y-3 py-4 border-t border-b border-[#EAE0A8]">
          <div className="flex items-start gap-3">
            <span className="text-gray-400 w-5 mt-0.5 shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </span>
            {e.is_all_day ? (
              <div className="text-sm text-[#1A3666]">
                <div className="flex items-center gap-2">
                  <p>{formatDateOnly(e.start_at)}</p>
                  <span className="text-xs font-bold bg-[#1A3666] text-white px-2 py-0.5 rounded-full">終日</span>
                </div>
                {formatDateOnly(e.start_at) !== formatDateOnly(e.end_at) && (
                  <p className="text-gray-400 text-xs mt-0.5">〜 {formatDateOnly(e.end_at)}</p>
                )}
              </div>
            ) : (
              <div className="text-sm text-[#1A3666]">
                <p>{formatDateTime(e.start_at)}</p>
                <p className="text-gray-400 text-xs mt-0.5">〜 {formatDateTime(e.end_at)}</p>
              </div>
            )}
          </div>
          {e.venue && (
            <div className="flex items-start gap-3">
              <span className="text-gray-400 w-5 mt-0.5 shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </span>
              <p className="text-sm text-[#1A3666]">{e.venue}</p>
            </div>
          )}
          {e.event_type === 'tournament' && e.entry_deadline && (
            <div className="flex items-start gap-3">
              <span className="text-gray-400 w-5 mt-0.5 shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </span>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-[#1A3666]">
                  申込締切日：{new Date(e.entry_deadline + 'T00:00:00+09:00').toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })}
                </span>
                {deadlinePassed && (
                  <span className="text-xs font-bold text-red-500 border border-red-300 px-2 py-0.5 rounded-full">締切済み</span>
                )}
              </div>
            </div>
          )}
          {e.event_type === 'tournament' && (e.singles_fee != null || e.doubles_fee != null || accompFeeLabel) && (
            <div className="flex items-start gap-3">
              <span className="text-gray-400 w-5 mt-0.5 shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </span>
              <div className="flex flex-wrap gap-1.5">
                {e.singles_fee != null && (
                  <span className="text-xs font-semibold bg-[#F5C800]/20 text-[#1A3666] px-2.5 py-1 rounded-full">
                    シングルス {e.singles_fee.toLocaleString()}円
                  </span>
                )}
                {e.doubles_fee != null && (
                  <span className="text-xs font-semibold bg-[#F5C800]/20 text-[#1A3666] px-2.5 py-1 rounded-full">
                    ダブルス {e.doubles_fee.toLocaleString()}円
                  </span>
                )}
                {accompFeeLabel && (
                  <span className="text-xs font-semibold bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full">
                    帯同費 {accompFeeLabel}
                  </span>
                )}
              </div>
            </div>
          )}
          {e.description && (
            <div className="flex items-start gap-3">
              <span className="text-gray-400 w-5 mt-0.5 shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                </svg>
              </span>
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{e.description}</p>
            </div>
          )}
          {attachments && attachments.length > 0 && (
            <div className="flex items-start gap-3">
              <span className="text-gray-400 w-5 mt-0.5 shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
              </span>
              <div className="flex-1 space-y-1.5">
                {(attachments as Attachment[]).map(att => (
                  <a
                    key={att.id}
                    href={att.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg border border-gray-200 hover:border-[#1A3666] hover:bg-[#F5F8FF] transition-colors"
                  >
                    {att.file_name.endsWith('.pdf') ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-blue-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    )}
                    <span className="text-sm text-[#1A3666] truncate">{att.file_name}</span>
                  </a>
                ))}
              </div>
            </div>
          )}
          {(e.payment_method || ((e.event_type === 'event' || e.event_type === 'social') && e.payment_amount != null)) && (
            <div className="flex items-start gap-3">
              <span className="text-gray-400 w-5 mt-0.5 shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </span>
              <div className="text-sm text-[#1A3666]">
                {e.payment_method && <p>{e.payment_method}</p>}
                {e.payment_amount != null && (
                  <p className={e.payment_method ? 'text-gray-500 text-xs mt-0.5' : ''}>
                    {e.event_type === 'practice' ? '使用料金額' : '参加費'} {e.payment_amount.toLocaleString()} 円
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {(canEditEvent || canDeleteEvent || isAdminOrCoach) && (
          <div className="mt-5 flex flex-wrap gap-3 items-center">
            {canEditEvent && (
              <Link
                href={`/calendar/${id}/edit`}
                className="text-sm font-semibold text-[#1A3666] border border-[#1A3666] px-4 py-2 rounded-lg hover:bg-[#1A3666] hover:text-white transition-colors"
              >
                編集
              </Link>
            )}
            {canDeleteEvent && <DeleteEventButton id={id} />}
            {isAdminOrCoach && (
              <ToggleEventVisibilityButton id={id} isVisible={e.is_visible} />
            )}
            {isPast && isAdminOrCoach && (
              <p className="text-xs text-gray-400 w-full mt-1">※ 終了した予定のため編集はできません</p>
            )}
          </div>
        )}
      </div>

      {/* 参加メンバーセクション */}
      <ParticipantSection
        eventId={id}
        eventType={e.event_type}
        eventStatus={e.status}
        participants={participants}
        myMembers={myMembers}
        role={role}
        singlesFee={e.singles_fee}
        doublesFee={e.doubles_fee}
        accompFeePerPerson={accompFeePerPerson}
        deadlinePassed={deadlinePassed}
        coachAttendances={coachAttendances}
        isCoachAttending={isCoachAttending}
        isPast={isPast}
      />

      {/* コメントセクション */}
      <EventCommentSection
        eventId={id}
        comments={comments as EventComment[]}
        currentUserId={user!.id}
        role={role}
      />
    </div>
  )
}
