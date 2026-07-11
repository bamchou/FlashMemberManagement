import { createClient } from '@/lib/supabase/server'
import type { Role, CalendarEvent } from '@/lib/types'
import CalendarView from './_components/CalendarView'
import AgendaView from './_components/AgendaView'

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>
}) {
  const { year: yearStr, month: monthStr } = await searchParams
  const now = new Date()
  const year = parseInt(yearStr ?? now.getFullYear().toString())
  const month = parseInt(monthStr ?? (now.getMonth() + 1).toString())

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user!.id)
    .single()

  const role = (profile?.role ?? 'member') as Role
  const isAdminOrCoach = role === 'admin' || role === 'coach'

  const fetchStart = new Date(year, month - 2, 1)
  const fetchEnd = new Date(year, month + 1, 7)

  let query = supabase
    .from('events')
    .select('*')
    .gte('end_at', fetchStart.toISOString())
    .lte('start_at', fetchEnd.toISOString())
    .order('start_at', { ascending: true })

  // 保護者は対象フィルタ（RLSでも制御しているが二重チェック）
  if (!isAdminOrCoach) {
    query = query.in('target', ['all', 'member'])
  } else if (role === 'coach') {
    query = query.in('target', ['all', 'coach'])
  }

  const { data: events } = await query

  return (
    <div className="w-full">
      <div className="hidden sm:block">
        <CalendarView
          year={year}
          month={month}
          events={(events ?? []) as CalendarEvent[]}
          role={role}
          currentUserId={user!.id}
        />
      </div>
      <div className="sm:hidden">
        <AgendaView
          year={year}
          month={month}
          events={(events ?? []) as CalendarEvent[]}
          role={role}
          currentUserId={user!.id}
        />
      </div>
    </div>
  )
}
