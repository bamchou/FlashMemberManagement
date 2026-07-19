import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import CoachPayClient from './_components/CoachPayClient'
import type { CoachSummary } from './_components/CoachPayClient'

function getMonthBounds(year: number, month: number) {
  const start = new Date(`${year}-${String(month).padStart(2, '0')}-01T00:00:00+09:00`)
  const end = new Date(start)
  end.setMonth(end.getMonth() + 1)
  return { start: start.toISOString(), end: end.toISOString() }
}

function monthHref(year: number, month: number) {
  return `/accounting/coach-pay?year=${year}&month=${month}`
}

function prevMonth(year: number, month: number) {
  return month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 }
}

function nextMonth(year: number, month: number) {
  return month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 }
}

export default async function CoachPayPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>
}) {
  const { year: yearStr, month: monthStr } = await searchParams

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user!.id).single()
  if (profile?.role !== 'admin') redirect('/accounting')

  // デフォルト：今月（JST）
  const nowJST = new Date(new Date().getTime() + 9 * 60 * 60 * 1000)
  const year = parseInt(yearStr ?? nowJST.getUTCFullYear().toString())
  const month = parseInt(monthStr ?? (nowJST.getUTCMonth() + 1).toString())

  const admin = createAdminClient()

  // コーチ一覧
  const { data: coaches } = await admin
    .from('profiles')
    .select('id, display_name, username, coach_rate_practice, coach_rate_tournament')
    .eq('role', 'coach')
    .order('display_name', { ascending: true })

  // 対象月のイベント（JST基準）
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

  // コーチ参加実績
  const { data: attendances } = eventIds.length > 0
    ? await admin
        .from('event_coach_attendances')
        .select('coach_id, event_id')
        .in('event_id', eventIds)
    : { data: [] }

  // 支払い記録
  const { data: payments } = await admin
    .from('coach_monthly_payments')
    .select('coach_id, amount, paid_at, paid_by')
    .eq('year', year)
    .eq('month', month)

  // 支払い担当者名を取得
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

  // 各コーチのサマリーを計算
  const summaries: CoachSummary[] = (coaches ?? []).map(coach => {
    const myAttendances = (attendances ?? []).filter(a => a.coach_id === coach.id)
    const practiceCount = myAttendances.filter(a => eventTypeMap[a.event_id] === 'practice').length
    const tournamentCount = myAttendances.filter(a => eventTypeMap[a.event_id] === 'tournament').length

    const missingPractice = practiceCount > 0 && coach.coach_rate_practice == null
    const missingTournament = tournamentCount > 0 && coach.coach_rate_tournament == null
    const hasMissingRate = missingPractice || missingTournament

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

  const prev = prevMonth(year, month)
  const next = nextMonth(year, month)

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <Link href="/accounting" className="text-sm text-[#1A3666] hover:underline">
          ← 経理管理
        </Link>
        <h1 className="text-xl font-bold text-[#1A3666] mt-2">指導者バイト代管理</h1>
      </div>

      <CoachPayClient
        year={year}
        month={month}
        summaries={summaries}
        prevHref={monthHref(prev.year, prev.month)}
        nextHref={monthHref(next.year, next.month)}
      />
    </div>
  )
}
