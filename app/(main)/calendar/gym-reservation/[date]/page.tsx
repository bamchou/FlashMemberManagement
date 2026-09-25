import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { GymCandidate } from '@/lib/types'
import { WEEKDAY_LABELS, formatCandidate, weekdayOf } from '@/lib/gymCandidates'
import { getHolidayName } from '@/lib/utils/holidays'
import { BackToListLink } from '@/app/(main)/_components/ListReturn'

/** 体育館予約の担当日の詳細（担当者本人と管理者のみ） */
export default async function GymReservationDutyPage({
  params,
}: {
  params: Promise<{ date: string }>
}) {
  const { date } = await params
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) notFound()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user!.id).single()
  const isAdmin = profile?.role === 'admin'

  const admin = createAdminClient()
  const { data: assignment } = await admin
    .from('gym_reservation_assignments')
    .select('assignee_id')
    .eq('target_date', date)
    .maybeSingle()

  const [y, m, d] = date.split('-').map(Number)
  const calendarUrl = `/calendar?year=${y}&month=${m}`
  if (!assignment || (!isAdmin && assignment.assignee_id !== user!.id)) redirect(calendarUrl)

  const wd = weekdayOf(date)
  const [{ data: assignee }, { data: candRows }] = await Promise.all([
    admin.from('profiles').select('display_name, username').eq('id', assignment.assignee_id).single(),
    admin.from('gym_candidates').select('*').eq('weekday', wd).order('priority'),
  ])
  const candidates = (candRows ?? []) as GymCandidate[]
  const isMine = assignment.assignee_id === user!.id
  const holiday = getHolidayName(date)

  return (
    <div className="max-w-2xl">
      <BackToListLink section="calendar" fallback={calendarUrl} className="text-sm text-[#1A3666] hover:underline mb-4 inline-block">
        ← カレンダーに戻る
      </BackToListLink>

      <div className="bg-white rounded-xl border border-[#EAE0A8] overflow-hidden">
        <div className="px-5 py-3 bg-sky-50 border-b border-sky-200">
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-sky-100 text-sky-800">🏢 体育館予約</span>
          <h1 className="text-lg font-bold text-[#1A3666] mt-1.5">
            {y}年{m}月{d}日（{WEEKDAY_LABELS[wd]}）
            {holiday && <span className="text-sm text-red-400 ml-2">{holiday}</span>}
          </h1>
          <p className="text-sm text-gray-700 mt-1">
            予約担当：<span className="font-bold">{assignee?.display_name ?? assignee?.username ?? '不明'}</span>
            {isMine && <span className="ml-2 text-xs font-bold text-sky-700">（あなた）</span>}
          </p>
        </div>

        <div className="px-5 py-4">
          <p className="text-xs font-bold text-gray-400 mb-2">予約候補</p>
          {candidates.length === 0 ? (
            <p className="text-sm text-gray-400">この曜日の候補は登録されていません</p>
          ) : (
            <ol className="divide-y divide-gray-200">
              {candidates.map(c => (
                <li key={c.id} className="py-2 flex items-baseline gap-3">
                  <span className="text-xs font-bold text-gray-500 shrink-0">第{c.priority}候補</span>
                  <span className="text-sm text-[#1A3666] font-semibold">{formatCandidate(c)}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>

      {isAdmin && (
        <Link href={`/shift/gym-assignments?year=${y}&month=${m}`} className="text-sm text-[#1A3666] underline hover:no-underline mt-4 inline-block">
          担当者を変更する（体育館予約割当）
        </Link>
      )}
    </div>
  )
}
