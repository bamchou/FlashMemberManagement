import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import DuesClient from './_components/DuesClient'
import type { MemberDuesSummary } from './_components/DuesClient'

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
  const currentYear = nowJST.getUTCFullYear()
  const currentMonth = nowJST.getUTCMonth() + 1
  // デフォルトは翌月（当月中旬〜下旬に翌月分を確定する運用）
  const defaultNext = nextMonth(currentYear, currentMonth)
  const year = parseInt(sp.year ?? defaultNext.year.toString())
  const month = parseInt(sp.month ?? defaultNext.month.toString())

  const admin = createAdminClient()

  const [
    { data: members },
    { data: feeSettings },
    { data: snapshots },
    { data: payments },
  ] = await Promise.all([
    admin
      .from('members')
      .select('id, full_name, photo_url, practice_days, practice_frequency')
      .eq('is_visible', true)
      .order('birth_date', { ascending: true })
      .order('join_date', { ascending: true }),
    admin.from('practice_fee_settings').select('frequency, monthly_fee'),
    admin
      .from('dues_snapshots')
      .select('member_id, base_fee, total_fee, confirmed_at')
      .eq('year', year)
      .eq('month', month),
    admin
      .from('dues_payments')
      .select('member_id, amount, paid_at')
      .eq('year', year)
      .eq('month', month),
  ])

  const feeByFrequency = new Map((feeSettings ?? []).map(s => [s.frequency, s.monthly_fee]))
  const snapshotByMember = new Map((snapshots ?? []).map(s => [s.member_id, s]))
  const paymentByMember = new Map((payments ?? []).map(p => [p.member_id, { amount: p.amount, paidAt: p.paid_at }]))

  const summaries: MemberDuesSummary[] = (members ?? []).map(m => {
    const practiceDays: string[] = m.practice_days ?? []
    const frequency: number | null =
      m.practice_frequency ?? (practiceDays.length > 0 ? practiceDays.length : null)
    const baseFee = frequency != null ? (feeByFrequency.get(frequency) ?? null) : null
    const liveTotalFee = baseFee

    const snap = snapshotByMember.get(m.id)
    const snapshot = snap
      ? {
          totalFee: snap.total_fee,
          baseFee: snap.base_fee,
          confirmedAt: snap.confirmed_at,
        }
      : null

    return {
      id: m.id,
      name: m.full_name,
      photoUrl: m.photo_url,
      practiceDays,
      frequency,
      baseFee,
      liveTotalFee,
      snapshot,
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
        <div className="mt-2">
          <h1 className="text-xl font-bold text-[#1A3666]">月謝管理</h1>
          <p className="text-sm text-gray-500 mt-0.5">月ごとの月謝収納状況を管理します</p>
        </div>
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
