import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import PrintView from './_components/PrintView'
import type { CoachSummary } from '../_components/CoachPayClient'

function getMonthBounds(year: number, month: number) {
  const start = new Date(`${year}-${String(month).padStart(2, '0')}-01T00:00:00+09:00`)
  const end = new Date(start)
  end.setMonth(end.getMonth() + 1)
  return { start: start.toISOString(), end: end.toISOString() }
}

export default async function CoachPayPrintPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>
}) {
  const { year: yearStr, month: monthStr } = await searchParams

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user!.id).single()
  if (profile?.role !== 'admin') redirect('/accounting')

  const nowJST = new Date(new Date().getTime() + 9 * 60 * 60 * 1000)
  const year = parseInt(yearStr ?? nowJST.getUTCFullYear().toString())
  const month = parseInt(monthStr ?? (nowJST.getUTCMonth() + 1).toString())

  const admin = createAdminClient()

  const { data: coaches } = await admin
    .from('profiles')
    .select('id, display_name, username, coach_rate_practice, coach_rate_tournament')
    .eq('role', 'coach')
    .order('display_name', { ascending: true })

  const { start, end } = getMonthBounds(year, month)
  const { data: events } = await admin
    .from('events')
    .select('id, event_type')
    .gte('start_at', start)
    .lt('start_at', end)

  const eventIds = (events ?? []).map(e => e.id)
  const eventTypeMap: Record<string, string> = Object.fromEntries(
    (events ?? []).map(e => [e.id, e.event_type])
  )

  const { data: attendances } = eventIds.length > 0
    ? await admin
        .from('event_coach_attendances')
        .select('coach_id, event_id')
        .in('event_id', eventIds)
    : { data: [] }

  const { data: payments } = await admin
    .from('coach_monthly_payments')
    .select('coach_id, amount, paid_at, paid_by')
    .eq('year', year)
    .eq('month', month)

  const payerIds = [...new Set((payments ?? []).map(p => p.paid_by).filter(Boolean))]
  const { data: payers } = payerIds.length > 0
    ? await admin.from('profiles').select('id, display_name, username').in('id', payerIds)
    : { data: [] }
  const payerMap: Record<string, string> = Object.fromEntries(
    (payers ?? []).map(p => [p.id, p.display_name ?? p.username ?? '不明'])
  )

  const paymentMap: Record<string, { amount: number; paidAt: string; paidBy: string }> = {}
  for (const p of payments ?? []) {
    paymentMap[p.coach_id] = {
      amount: p.amount,
      paidAt: p.paid_at,
      paidBy: p.paid_by ? (payerMap[p.paid_by] ?? '不明') : '不明',
    }
  }

  const summaries: CoachSummary[] = (coaches ?? []).map(coach => {
    const myAttendances = (attendances ?? []).filter(a => a.coach_id === coach.id)
    const practiceCount = myAttendances.filter(a => eventTypeMap[a.event_id] === 'practice').length
    const tournamentCount = myAttendances.filter(a => eventTypeMap[a.event_id] === 'tournament').length
    const hasMissingRate =
      (practiceCount > 0 && coach.coach_rate_practice == null) ||
      (tournamentCount > 0 && coach.coach_rate_tournament == null)
    const totalAmount =
      practiceCount * (coach.coach_rate_practice ?? 0) +
      tournamentCount * (coach.coach_rate_tournament ?? 0)

    return {
      id: coach.id,
      name: coach.display_name ?? coach.username ?? '不明',
      ratePractice: coach.coach_rate_practice,
      rateTournament: coach.coach_rate_tournament,
      practiceCount,
      tournamentCount,
      totalAmount,
      hasMissingRate,
      payment: paymentMap[coach.id] ?? null,
    }
  })

  const generatedAt = nowJST.toLocaleDateString('ja-JP', {
    year: 'numeric', month: 'long', day: 'numeric',
  })

  return (
    <PrintView
      year={year}
      month={month}
      summaries={summaries}
      generatedAt={generatedAt}
    />
  )
}
