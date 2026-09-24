import { createAdminClient } from '@/lib/supabase/admin'
import { monthBoundsJST } from './closing'

export type SummaryKind = 'income' | 'expense'

export type SummaryLine = {
  key: string
  label: string
  kind: SummaryKind
  billed: number   // 請求額（本来入金/支払すべき額）
  paid: number     // 実際に入金/支払済みの額
  unpaid: number   // 未収/未払い
  note?: string
}

export type MonthlySummary = {
  year: number
  month: number
  lines: SummaryLine[]
  expenseCategories: { category: string; amount: number }[]
  incomeBilled: number
  incomePaid: number
  expenseBilled: number
  expensePaid: number
  net: number        // 入金済み収入 - 支払済み支出
  generatedAt: string
}

function line(key: string, label: string, kind: SummaryKind, billed: number, paid: number, note?: string): SummaryLine {
  return { key, label, kind, billed, paid, unpaid: Math.max(0, billed - paid), note }
}

function tournamentFee(
  category: string | null,
  singles: number | null,
  doubles: number | null,
  accomp: number,
): number {
  if (!category) return 0
  let entry = 0
  if (category === 'singles') entry = singles ?? 0
  else if (category === 'doubles') entry = doubles ?? 0
  else if (category === 'both') entry = (singles ?? 0) + (doubles ?? 0)
  return entry + accomp
}

/**
 * 指導者バイト代の月合計（指導者バイト代管理画面と同じ計算）。
 * 練習: 参加回数 × 練習単価、大会: 帯同費×参加人数 を出席者で山分け（余りは管理者へ）。
 */
async function coachPayTotal(year: number, month: number): Promise<number> {
  const admin = createAdminClient()
  const { start, end } = monthBoundsJST(year, month)

  const [{ data: profiles }, { data: events }] = await Promise.all([
    admin.from('profiles').select('id, role, coach_rate_practice, show_on_members_page').in('role', ['coach', 'admin']),
    admin.from('events').select('id, event_type, accompaniment_fee_per_person').gte('start_at', start).lt('start_at', end),
  ])
  const coaches = (profiles ?? []).filter(c => c.role === 'coach' || (c.role === 'admin' && c.show_on_members_page))
  const adminIds = new Set((profiles ?? []).filter(p => p.role === 'admin').map(p => p.id))
  const eventIds = (events ?? []).map(e => e.id)
  if (eventIds.length === 0) return 0

  const typeMap: Record<string, string> = Object.fromEntries((events ?? []).map(e => [e.id, e.event_type]))
  const feeMap: Record<string, number> = Object.fromEntries(
    (events ?? []).filter(e => e.event_type === 'tournament').map(e => [e.id, e.accompaniment_fee_per_person ?? 0])
  )
  const tournamentIds = (events ?? []).filter(e => e.event_type === 'tournament').map(e => e.id)

  const [{ data: attendances }, { data: participants }] = await Promise.all([
    admin.from('event_coach_attendances').select('coach_id, event_id').in('event_id', eventIds).eq('status', 'available'),
    tournamentIds.length > 0
      ? admin.from('event_participants').select('event_id').in('event_id', tournamentIds).eq('approval_status', 'approved')
      : Promise.resolve({ data: [] as { event_id: string }[] }),
  ])

  const memberCount: Record<string, number> = {}
  for (const p of participants ?? []) memberCount[p.event_id] = (memberCount[p.event_id] ?? 0) + 1

  const attendeesPerTournament: Record<string, string[]> = {}
  for (const a of attendances ?? []) {
    if (typeMap[a.event_id] === 'tournament') (attendeesPerTournament[a.event_id] ??= []).push(a.coach_id)
  }
  const tournamentPay: Record<string, number> = {}
  for (const [eventId, ids] of Object.entries(attendeesPerTournament)) {
    const fee = feeMap[eventId] ?? 0
    const count = memberCount[eventId] ?? 0
    if (ids.length === 0 || count === 0 || fee === 0) continue
    const total = fee * count
    const per = Math.floor(total / ids.length)
    const remainder = total - per * ids.length
    const adminAttendee = ids.find(id => adminIds.has(id))
    for (const id of ids) {
      tournamentPay[id] = (tournamentPay[id] ?? 0) + per + (remainder > 0 && id === adminAttendee ? remainder : 0)
    }
  }

  let total = 0
  for (const c of coaches) {
    const practiceCount = (attendances ?? []).filter(a => a.coach_id === c.id && typeMap[a.event_id] === 'practice').length
    total += practiceCount * (c.coach_rate_practice ?? 0) + (tournamentPay[c.id] ?? 0)
  }
  return total
}

/** 指定月の各種お金を集計する（締め前の最新値） */
export async function computeMonthlySummary(year: number, month: number): Promise<MonthlySummary> {
  const admin = createAdminClient()
  const { start, end } = monthBoundsJST(year, month)
  const pad = (n: number) => String(n).padStart(2, '0')
  const next = month === 12 ? { y: year + 1, m: 1 } : { y: year, m: month + 1 }
  const dateFrom = `${year}-${pad(month)}-01`
  const dateTo = `${next.y}-${pad(next.m)}-01`

  const [
    { data: duesSnaps },
    { data: duesPays },
    { data: monthEvents },
    { data: coachPays },
    { data: expenseRows },
  ] = await Promise.all([
    admin.from('dues_snapshots').select('total_fee').eq('year', year).eq('month', month),
    admin.from('dues_payments').select('amount').eq('year', year).eq('month', month),
    admin.from('events')
      .select('id, event_type, status, payment_amount, payment_status, singles_fee, doubles_fee, accompaniment_fee_per_person, adult_fee, child_fee')
      .gte('start_at', start).lt('start_at', end),
    admin.from('coach_monthly_payments').select('amount').eq('year', year).eq('month', month),
    admin.from('expenses').select('category, amount').gte('expense_date', dateFrom).lt('expense_date', dateTo),
  ])

  const sum = (arr: number[]) => arr.reduce((s, v) => s + v, 0)
  const events = monthEvents ?? []

  // 月謝
  const duesBilled = sum((duesSnaps ?? []).map(r => r.total_fee ?? 0))
  const duesPaid = sum((duesPays ?? []).map(r => r.amount ?? 0))

  // 大会参加費（承認済みのみ）
  const tournaments = events.filter(e => e.event_type === 'tournament')
  let tBilled = 0, tPaid = 0
  if (tournaments.length > 0) {
    const tMap = Object.fromEntries(tournaments.map(e => [e.id, e]))
    const { data: parts } = await admin
      .from('event_participants')
      .select('event_id, participation_category, fee_snapshot, is_paid')
      .in('event_id', tournaments.map(e => e.id))
      .eq('approval_status', 'approved')
    for (const p of parts ?? []) {
      const ev = tMap[p.event_id]
      const fee = p.fee_snapshot ?? tournamentFee(p.participation_category, ev.singles_fee, ev.doubles_fee, ev.accompaniment_fee_per_person ?? 0)
      tBilled += fee
      if (p.is_paid) tPaid += fee
    }
  }

  // 懇親会・イベント参加費
  const socials = events.filter(e => e.event_type === 'social' || e.event_type === 'event')
  let sBilled = 0, sPaid = 0
  if (socials.length > 0) {
    const sMap = Object.fromEntries(socials.map(e => [e.id, e]))
    const { data: atts } = await admin
      .from('event_attendances')
      .select('event_id, adult_count, child_count, is_paid')
      .in('event_id', socials.map(e => e.id))
    for (const a of atts ?? []) {
      const ev = sMap[a.event_id]
      const amount = a.adult_count * (ev.adult_fee ?? ev.payment_amount ?? 0) + a.child_count * (ev.child_fee ?? 0)
      sBilled += amount
      if (a.is_paid) sPaid += amount
    }
  }

  // 体育館使用料（確定した練習）
  const gyms = events.filter(e => e.event_type === 'practice' && e.status === 'confirmed' && e.payment_amount != null)
  const gBilled = sum(gyms.map(e => e.payment_amount ?? 0))
  const gPaid = sum(gyms.filter(e => e.payment_status === 'paid').map(e => e.payment_amount ?? 0))

  // 指導者バイト代
  const cBilled = await coachPayTotal(year, month)
  const cPaid = sum((coachPays ?? []).map(r => r.amount ?? 0))

  // 経費
  const catMap: Record<string, number> = {}
  for (const r of expenseRows ?? []) catMap[r.category] = (catMap[r.category] ?? 0) + (r.amount ?? 0)
  const expenseCategories = Object.entries(catMap).map(([category, amount]) => ({ category, amount }))
  const eTotal = sum(Object.values(catMap))

  const lines: SummaryLine[] = [
    line('dues', '月謝', 'income', duesBilled, duesPaid, '月謝管理で確定した分'),
    line('tournament', '大会参加費', 'income', tBilled, tPaid),
    line('event_fees', '懇親会・イベント参加費', 'income', sBilled, sPaid),
    line('gym', '体育館使用料', 'expense', gBilled, gPaid),
    line('coach_pay', '指導者バイト代', 'expense', cBilled, cPaid),
    line('expenses', '経費', 'expense', eTotal, eTotal),
  ]

  const incomeLines = lines.filter(l => l.kind === 'income')
  const expenseLines = lines.filter(l => l.kind === 'expense')
  const incomePaid = sum(incomeLines.map(l => l.paid))
  const expensePaid = sum(expenseLines.map(l => l.paid))

  return {
    year,
    month,
    lines,
    expenseCategories,
    incomeBilled: sum(incomeLines.map(l => l.billed)),
    incomePaid,
    expenseBilled: sum(expenseLines.map(l => l.billed)),
    expensePaid,
    net: incomePaid - expensePaid,
    generatedAt: new Date().toISOString(),
  }
}
