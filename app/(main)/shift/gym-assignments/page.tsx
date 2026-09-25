import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { GymCandidate } from '@/lib/types'
import { formatCandidate, weekdayOf } from '@/lib/gymCandidates'
import AssignmentList, { type AssignmentDay, type AssigneeOption } from './_components/AssignmentList'

export default async function GymAssignmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user!.id).single()
  if (profile?.role !== 'admin') redirect('/members')

  const params = await searchParams
  const nowJST = new Date(new Date().getTime() + 9 * 60 * 60 * 1000)
  const year = parseInt(params.year ?? String(nowJST.getUTCFullYear()), 10)
  const month = parseInt(params.month ?? String(nowJST.getUTCMonth() + 1), 10)

  const mm = String(month).padStart(2, '0')
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const monthStart = `${year}-${mm}-01`
  const monthEnd = `${year}-${mm}-${String(daysInMonth).padStart(2, '0')}`

  const admin = createAdminClient()
  const [{ data: candRows }, { data: assignRows }] = await Promise.all([
    admin.from('gym_candidates').select('*').order('weekday').order('priority'),
    admin
      .from('gym_reservation_assignments')
      .select('target_date, slot, assignee_id')
      .gte('target_date', monthStart)
      .lte('target_date', monthEnd),
  ])
  const assignments = (assignRows ?? []) as { target_date: string; slot: number; assignee_id: string }[]

  // 選べる人：予約アカウントを持っている人（＋この月にすでに割り当てられている人）
  const assignedIds = [...new Set(assignments.map(a => a.assignee_id))]
  const { data: profileRows } = await admin
    .from('profiles')
    .select('id, display_name, username, gym_account_count')
    .or(assignedIds.length > 0 ? `gym_account_count.gt.0,id.in.(${assignedIds.join(',')})` : 'gym_account_count.gt.0')
  const people: AssigneeOption[] = ((profileRows ?? []) as { id: string; display_name: string | null; username: string | null; gym_account_count: number | null }[])
    .map(p => ({ id: p.id, name: p.display_name ?? p.username ?? '不明', accounts: p.gym_account_count ?? 0 }))
    .sort((a, b) => a.name.localeCompare(b.name, 'ja'))

  const candidates = (candRows ?? []) as GymCandidate[]
  const byWeekday: Record<number, string[]> = {}
  for (const c of candidates) (byWeekday[c.weekday] ??= []).push(formatCandidate(c))

  const slotsByDate: Record<string, string[]> = {}
  for (const a of assignments) {
    const s = (slotsByDate[a.target_date] ??= ['', '', ''])
    if (a.slot >= 1 && a.slot <= 3) s[a.slot - 1] = a.assignee_id
  }

  // 候補のある曜日の日付と、割当済みの日付を並べる
  const days: AssignmentDay[] = []
  for (let d = 1; d <= daysInMonth; d++) {
    const date = `${year}-${mm}-${String(d).padStart(2, '0')}`
    const wd = weekdayOf(date)
    const cands = byWeekday[wd] ?? []
    if (cands.length === 0 && !slotsByDate[date]) continue
    days.push({ date, weekday: wd, candidates: cands, slots: slotsByDate[date] ?? ['', '', ''] })
  }

  return (
    <div className="max-w-3xl">
      <Link href="/shift" className="text-sm text-[#1A3666] hover:underline mb-4 inline-block">
        ← シフトに戻る
      </Link>
      <AssignmentList key={`${year}-${month}`} year={year} month={month} days={days} people={people} />
    </div>
  )
}
