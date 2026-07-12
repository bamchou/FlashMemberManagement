import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Role, CalendarEvent } from '@/lib/types'
import { EVENT_TYPE_STYLE } from '../_utils/eventTypeStyle'
import DeleteEventButton from './_components/DeleteEventButton'
import ToggleEventVisibilityButton from './_components/ToggleEventVisibilityButton'
import ParticipantSection from './_components/ParticipantSection'

const TARGET_LABEL: Record<string, string> = {
  all:    '全員',
  coach:  '指導者のみ',
  member: '保護者のみ',
}

function formatDateTime(isoStr: string): string {
  return new Date(isoStr).toLocaleString('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric', month: 'long', day: 'numeric',
    weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false,
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

  const [{ data: profile }, { data: event }] = await Promise.all([
    supabase.from('profiles').select('role').eq('id', user!.id).single(),
    supabase.from('events').select('*').eq('id', id).single(),
  ])

  if (!event) notFound()

  const role = (profile?.role ?? 'member') as Role
  const isAdmin = role === 'admin'
  const isAdminOrCoach = role === 'admin' || role === 'coach'
  const isGuardian = role === 'member'
  const isOwner = event.created_by === user!.id
  const canEdit = isOwner || isAdminOrCoach
  const e = event as CalendarEvent
  const { bg, label } = EVENT_TYPE_STYLE[e.event_type] ?? EVENT_TYPE_STYLE.other

  const adminSupabase = createAdminClient()

  // 参加者 member_id + approval_status + participation_category 一覧を取得
  const { data: participantRows } = await adminSupabase
    .from('event_participants')
    .select('member_id, approval_status, participation_category')
    .eq('event_id', id)
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
        .select('id, full_name, photo_url')
        .in('id', participantMemberIds)
    : { data: [] }

  const memberDetailMap = Object.fromEntries(
    (participantMemberDetails ?? []).map((m: { id: string; full_name: string; photo_url: string | null }) => [
      m.id, { full_name: m.full_name, photo_url: m.photo_url }
    ])
  )

  const participants = participantMemberIds.map(memberId => ({
    member_id: memberId,
    members: memberDetailMap[memberId] ?? null,
    approval_status: (participantStatusMap[memberId] ?? 'approved') as 'approved' | 'pending',
    participation_category: (participantCategoryMap[memberId] ?? null) as string | null,
  }))

  // 参加登録できるメンバー取得（保護者のみ）
  let myMembers: { id: string; full_name: string; photo_url: string | null }[] = []
  if (isGuardian) {
    const { data } = await adminSupabase
      .from('members')
      .select('id, full_name, photo_url')
      .eq('guardian_id', user!.id)
      .eq('approval_status', 'approved')
    myMembers = (data ?? []) as typeof myMembers
  }

  // 大会の帯同費を取得（保護者向け参加費表示用）
  let accompFeePerPerson = 0
  if (e.event_type === 'tournament' && e.accompaniment_type) {
    const { data: feeSettings } = await adminSupabase
      .from('accompaniment_fee_settings')
      .select('amount_per_person')
      .eq('area_type', e.accompaniment_type)
      .single()
    if (feeSettings) accompFeePerPerson = feeSettings.amount_per_person
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
            <span className="text-xs font-semibold text-gray-400 border border-gray-200 px-2.5 py-1 rounded-full">
              {TARGET_LABEL[e.target] ?? e.target}
            </span>
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
            <div className="text-sm text-[#1A3666]">
              <p>{formatDateTime(e.start_at)}</p>
              <p className="text-gray-400 text-xs mt-0.5">〜 {formatDateTime(e.end_at)}</p>
            </div>
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
          {e.event_type === 'tournament' && (e.singles_fee != null || e.doubles_fee != null) && (
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
          {e.payment_method && (
            <div className="flex items-start gap-3">
              <span className="text-gray-400 w-5 mt-0.5 shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </span>
              <div className="text-sm text-[#1A3666]">
                <p>{e.payment_method}</p>
                {e.payment_amount != null && (
                  <p className="text-gray-500 text-xs mt-0.5">{e.payment_amount.toLocaleString()} 円</p>
                )}
              </div>
            </div>
          )}
        </div>

        {canEdit && (
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href={`/calendar/${id}/edit`}
              className="text-sm font-semibold text-[#1A3666] border border-[#1A3666] px-4 py-2 rounded-lg hover:bg-[#1A3666] hover:text-white transition-colors"
            >
              編集
            </Link>
            <DeleteEventButton id={id} />
            {isAdminOrCoach && (
              <ToggleEventVisibilityButton id={id} isVisible={e.is_visible} />
            )}
          </div>
        )}
      </div>

      {/* 参加メンバーセクション */}
      <ParticipantSection
        eventId={id}
        eventType={e.event_type}
        participants={participants}
        myMembers={myMembers}
        role={role}
        singlesFee={e.singles_fee}
        doublesFee={e.doubles_fee}
        accompFeePerPerson={accompFeePerPerson}
      />
    </div>
  )
}
