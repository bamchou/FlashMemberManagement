import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Role } from '@/lib/types'
import ShiftCalendar, { type ShiftPractice, type ShiftCoach } from './_components/ShiftCalendar'

export default async function ShiftPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>
}) {
  const { year: yearStr, month: monthStr } = await searchParams
  const now = new Date()
  const year = parseInt(yearStr ?? String(now.getFullYear()), 10)
  const month = parseInt(monthStr ?? String(now.getMonth() + 1), 10)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user!.id).single()
  const role = (profile?.role ?? 'member') as Role
  if (role !== 'admin' && role !== 'coach') redirect('/members')

  const admin = createAdminClient()

  // その月の練習予定
  const monthStart = new Date(year, month - 1, 1).toISOString()
  const monthEnd = new Date(year, month, 1).toISOString()
  const { data: events } = await admin
    .from('events')
    .select('id, title, start_at, end_at, is_all_day, status, needs_coach')
    .eq('event_type', 'practice')
    .gte('start_at', monthStart)
    .lt('start_at', monthEnd)
    .order('start_at', { ascending: true })
  const rows = (events ?? []) as {
    id: string; title: string; start_at: string; end_at: string
    is_all_day: boolean; status: string; needs_coach: boolean
  }[]
  const eventIds = rows.map(e => e.id)

  // コーチ一覧
  const { data: coachRows } = await admin
    .from('profiles')
    .select('id, display_name, username')
    .eq('role', 'coach')
    .order('created_at', { ascending: true })
  const coaches: ShiftCoach[] = (coachRows ?? []).map(
    (c: { id: string; display_name: string | null; username: string | null }) => ({
      id: c.id, name: c.display_name ?? c.username ?? '不明',
    })
  )

  // 参加可否
  const byEvent: Record<string, { available: string[]; unavailable: string[] }> = {}
  if (eventIds.length > 0) {
    const { data: attRows } = await admin
      .from('event_coach_attendances')
      .select('event_id, coach_id, status')
      .in('event_id', eventIds)
    for (const a of (attRows ?? []) as { event_id: string; coach_id: string; status: string }[]) {
      const b = (byEvent[a.event_id] ??= { available: [], unavailable: [] })
      if (a.status === 'unavailable') b.unavailable.push(a.coach_id)
      else b.available.push(a.coach_id)
    }
  }

  const practices: ShiftPractice[] = rows.map(e => {
    const b = byEvent[e.id] ?? { available: [], unavailable: [] }
    const myStatus: 'available' | 'unavailable' | null =
      b.available.includes(user!.id) ? 'available'
      : b.unavailable.includes(user!.id) ? 'unavailable'
      : null
    return {
      id: e.id,
      title: e.title,
      start_at: e.start_at,
      end_at: e.end_at,
      is_all_day: e.is_all_day,
      status: e.status,
      needs_coach: e.needs_coach,
      availableIds: b.available,
      unavailableIds: b.unavailable,
      myStatus,
    }
  })

  return (
    <div className="w-full">
      <ShiftCalendar
        year={year}
        month={month}
        role={role}
        currentUserId={user!.id}
        coaches={coaches}
        practices={practices}
      />
    </div>
  )
}
