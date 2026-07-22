import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import ExtraPracticeClient from './_components/ExtraPracticeClient'

function monthHref(year: number, month: number) {
  return `/accounting/extra-practice?year=${year}&month=${month}`
}

function prevMonth(year: number, month: number) {
  return month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 }
}

function nextMonth(year: number, month: number) {
  return month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 }
}

export default async function ExtraPracticePage({
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

  const [{ data: members }, { data: counts }, { data: settings }] = await Promise.all([
    admin
      .from('members')
      .select('id, full_name')
      .eq('is_visible', true)
      .eq('approval_status', 'approved')
      .order('birth_date', { ascending: true })
      .order('join_date', { ascending: true }),
    admin
      .from('extra_practice_counts')
      .select('member_id, count')
      .eq('year', year)
      .eq('month', month),
    admin
      .from('extra_practice_settings')
      .select('fee_per_session')
      .eq('id', 1)
      .single(),
  ])

  const countMap: Record<string, number> = Object.fromEntries(
    (counts ?? []).map(c => [c.member_id, c.count])
  )

  const memberRows = (members ?? []).map(m => ({
    id: m.id,
    fullName: m.full_name,
    count: countMap[m.id] ?? 0,
  }))

  const prev = prevMonth(year, month)
  const next = nextMonth(year, month)

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <Link href="/accounting" className="text-sm text-[#1A3666] hover:underline">
          ← 経理管理
        </Link>
        <h1 className="text-xl font-bold text-[#1A3666] mt-2">追加練習管理</h1>
        <p className="text-sm text-gray-500 mt-1">追加で練習に参加したメンバーの回数を記録します</p>
      </div>

      <ExtraPracticeClient
        year={year}
        month={month}
        members={memberRows}
        feePerSession={settings?.fee_per_session ?? 0}
        prevHref={monthHref(prev.year, prev.month)}
        nextHref={monthHref(next.year, next.month)}
      />
    </div>
  )
}
