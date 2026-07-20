import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Role, CalendarEvent } from '@/lib/types'
import CalendarContainer from './_components/CalendarContainer'
import CalendarSyncButton from './_components/CalendarSyncButton'

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

  const { data: calendarToken } = await supabase
    .from('calendar_tokens')
    .select('token')
    .eq('user_id', user!.id)
    .maybeSingle()

  const fetchStart = new Date(year, month - 2, 1)
  const fetchEnd = new Date(year, month + 1, 7)

  let query = supabase
    .from('events')
    .select('*')
    .gte('end_at', fetchStart.toISOString())
    .lte('start_at', fetchEnd.toISOString())
    .order('start_at', { ascending: true })

  if (!isAdminOrCoach) {
    query = query.in('target', ['all', 'member'])
  } else if (role === 'coach') {
    query = query.in('target', ['all', 'coach'])
  }

  const { data: events } = await query

  // 登録者名を adminClient で取得（RLS 回避）
  const creatorIds = [...new Set((events ?? []).map(e => e.created_by).filter(Boolean))]
  const adminSupabase = createAdminClient()
  const { data: creatorsData } = creatorIds.length > 0
    ? await adminSupabase
        .from('profiles')
        .select('id, display_name, username')
        .in('id', creatorIds)
    : { data: [] }

  const creatorMap: Record<string, string> = Object.fromEntries(
    (creatorsData ?? []).map(p => [
      p.id,
      p.display_name ?? p.username ?? '不明',
    ])
  )

  // 保護者：自分の子供が参加しているイベントIDを取得
  let childEventIds: string[] = []
  if (role === 'member') {
    const { data: children } = await supabase
      .from('members')
      .select('id')
      .eq('guardian_id', user!.id)
    const childIds = (children ?? []).map((c: { id: string }) => c.id)
    const eventIds = (events ?? []).map(e => e.id)
    if (childIds.length > 0 && eventIds.length > 0) {
      const { data: participations } = await adminSupabase
        .from('event_participants')
        .select('event_id')
        .in('member_id', childIds)
        .in('event_id', eventIds)
      childEventIds = [...new Set((participations ?? []).map((p: { event_id: string }) => p.event_id))]
    }
  }

  return (
    <div className="w-full">
      {/* カレンダー連携: PCのみ表示 */}
      <div className="hidden sm:flex justify-end mb-2">
        <CalendarSyncButton initialToken={calendarToken?.token ?? null} />
      </div>
      <CalendarContainer
        year={year}
        month={month}
        events={(events ?? []) as CalendarEvent[]}
        role={role}
        currentUserId={user!.id}
        creatorMap={creatorMap}
        childEventIds={childEventIds}
      />
    </div>
  )
}
