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
  const { data: assignRows } = await admin
    .from('gym_reservation_assignments')
    .select('slot, assignee_id, gym_candidate_id')
    .eq('target_date', date)
    .order('slot')
  const assignments = (assignRows ?? []) as { slot: number; assignee_id: string; gym_candidate_id: string | null }[]

  const [y, m, d] = date.split('-').map(Number)
  const calendarUrl = `/calendar?year=${y}&month=${m}`
  const mineCount = assignments.filter(a => a.assignee_id === user!.id).length
  if (assignments.length === 0 || (!isAdmin && mineCount === 0)) redirect(calendarUrl)

  const wd = weekdayOf(date)
  const assigneeIds = [...new Set(assignments.map(a => a.assignee_id))]
  const [{ data: assigneeRows }, { data: candRows }] = await Promise.all([
    admin.from('profiles').select('id, display_name, username').in('id', assigneeIds),
    admin.from('gym_candidates').select('*').eq('weekday', wd).order('priority'),
  ])
  const nameMap: Record<string, string> = Object.fromEntries(
    ((assigneeRows ?? []) as { id: string; display_name: string | null; username: string | null }[])
      .map(p => [p.id, p.display_name ?? p.username ?? '不明']),
  )
  const candidates = (candRows ?? []) as GymCandidate[]
  const candidateMap = new Map(candidates.map(c => [c.id, c]))
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
          {mineCount > 1 && (
            <p className="text-xs text-sky-800 mt-1">あなたは{mineCount}アカウントで予約を担当します</p>
          )}
        </div>

        <div className="px-5 py-4 border-b border-gray-200">
          <p className="text-xs font-bold text-gray-400 mb-2">予約担当</p>
          <ol className="divide-y divide-gray-200">
            {assignments.map(a => {
              const cand = a.gym_candidate_id ? candidateMap.get(a.gym_candidate_id) : undefined
              const isMine = a.assignee_id === user!.id
              return (
                <li key={a.slot} className={`py-2 grid grid-cols-[1rem_1fr] gap-x-2 ${isMine ? 'bg-sky-50 -mx-2 px-2 rounded-md' : ''}`}>
                  <span className="text-xs font-bold text-gray-400 pt-0.5">{a.slot}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[#1A3666]">
                      {nameMap[a.assignee_id] ?? '不明'}
                      {isMine && <span className="text-xs text-sky-700 ml-1">（あなた）</span>}
                    </p>
                    <p className="text-sm text-gray-700">
                      {cand
                        ? <>第{cand.priority}候補　{formatCandidate(cand)}</>
                        : <span className="text-gray-400">体育館は未指定</span>}
                    </p>
                  </div>
                </li>
              )
            })}
          </ol>
        </div>

        <div className="px-5 py-4">
          <p className="text-xs font-bold text-gray-400 mb-2">この曜日の予約候補</p>
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
