import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import DuesClient from './_components/DuesClient'
import type { MemberDuesSummary } from './_components/DuesClient'

const WEEKDAYS_JP = ['日', '月', '火', '水', '木', '金', '土']

function getJSTWeekday(isoStr: string): string {
  const jst = new Date(new Date(isoStr).getTime() + 9 * 60 * 60 * 1000)
  return WEEKDAYS_JP[jst.getUTCDay()]
}

function getMonthBounds(year: number, month: number) {
  const start = new Date(`${year}-${String(month).padStart(2, '0')}-01T00:00:00+09:00`)
  const end = new Date(start)
  end.setMonth(end.getMonth() + 1)
  return { start: start.toISOString(), end: end.toISOString() }
}

function prevMonth(year: number, month: number) {
  return month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 }
}

function nextMonth(year: number, month: number) {
  return month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 }
}

function monthHref(year: number, month: number) {
  return `/accounting/dues?year=${year}&month=${month}`
}

export default async function DuesPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>
}) {
  const sp = await searchParams

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user!.id).single()
  if (profile?.role !== 'admin') redirect('/accounting')

  const nowJST = new Date(new Date().getTime() + 9 * 60 * 60 * 1000)
  const year = parseInt(sp.year ?? nowJST.getUTCFullYear().toString())
  const month = parseInt(sp.month ?? (nowJST.getUTCMonth() + 1).toString())

  const admin = createAdminClient()
  const { start, end } = getMonthBounds(year, month)

  const [
    { data: members },
    { data: feeSettings },
    { data: extraFeeSetting },
    { data: practiceEvents },
    { data: payments },
  ] = await Promise.all([
    admin
      .from('members')
      .select('id, full_name, photo_url, practice_days, practice_frequency')
      .eq('is_visible', true)
      .order('full_name', { ascending: true }),
    admin.from('practice_fee_settings').select('frequency, monthly_fee'),
    admin.from('extra_practice_fee_settings').select('fee_per_session').limit(1).single(),
    admin
      .from('events')
      .select('id, start_at')
      .eq('event_type', 'practice')
      .eq('is_visible', true)
      .gte('start_at', start)
      .lt('start_at', end),
    admin
      .from('dues_payments')
      .select('member_id, amount, paid_at')
      .eq('year', year)
      .eq('month', month),
  ])

  const practiceEventIds = (practiceEvents ?? []).map(e => e.id)

  const { data: participants } = practiceEventIds.length > 0
    ? await admin
        .from('event_participants')
        .select('event_id, member_id')
        .in('event_id', practiceEventIds)
        .eq('approval_status', 'approved')
    : { data: [] }

  const feeByFrequency = new Map((feeSettings ?? []).map(s => [s.frequency, s.monthly_fee]))
  const extraFee = extraFeeSetting?.fee_per_session ?? 500

  const eventWeekday = new Map((practiceEvents ?? []).map(e => [e.id, getJSTWeekday(e.start_at)]))

  const actualByMember = new Map<string, Set<string>>()
  for (const p of participants ?? []) {
    if (!actualByMember.has(p.member_id)) actualByMember.set(p.member_id, new Set())
    actualByMember.get(p.member_id)!.add(p.event_id)
  }

  const paymentByMember = new Map(
    (payments ?? []).map(p => [p.member_id, { amount: p.amount, paidAt: p.paid_at }])
  )

  const summaries: MemberDuesSummary[] = (members ?? []).map(m => {
    const practiceDays: string[] = m.practice_days ?? []
    const frequency: number | null =
      m.practice_frequency ?? (practiceDays.length > 0 ? practiceDays.length : null)
    const baseFee = frequency != null ? (feeByFrequency.get(frequency) ?? null) : null

    const expectedCount = (practiceEvents ?? []).filter(e =>
      practiceDays.includes(eventWeekday.get(e.id) ?? '')
    ).length

    const actualCount = actualByMember.get(m.id)?.size ?? 0
    const excessCount = Math.max(0, actualCount - expectedCount)
    const totalFee = baseFee != null ? baseFee + excessCount * extraFee : null

    return {
      id: m.id,
      name: m.full_name,
      photoUrl: m.photo_url,
      practiceDays,
      frequency,
      baseFee,
      expectedCount,
      actualCount,
      excessCount,
      extraFeePerSession: extraFee,
      totalFee,
      payment: paymentByMember.get(m.id) ?? null,
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
        <h1 className="text-xl font-bold text-[#1A3666] mt-2">月謝管理</h1>
        <p className="text-sm text-gray-500 mt-1">参加予定回数と実績から月謝を自動計算します</p>
      </div>

      <DuesClient
        year={year}
        month={month}
        summaries={summaries}
        prevHref={monthHref(prev.year, prev.month)}
        nextHref={monthHref(next.year, next.month)}
      />
    </div>
  )
}
