import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { MonthlySummary } from '@/lib/accounting/monthlySummary'
import CsvDownloadButton from './_components/CsvDownloadButton'

const yen = (n: number) => `${n < 0 ? '-' : ''}¥${Math.abs(n).toLocaleString()}`

export default async function AnnualReportPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user!.id).single()
  if (profile?.role !== 'admin') redirect('/members')

  const params = await searchParams
  const nowJST = new Date(new Date().getTime() + 9 * 60 * 60 * 1000)
  const curYear = nowJST.getUTCFullYear()
  const curMonth = nowJST.getUTCMonth() + 1
  const year = parseInt(params.year ?? String(curYear), 10)

  const admin = createAdminClient()
  const { data } = await admin
    .from('monthly_closings')
    .select('month, summary')
    .eq('year', year)
  const byMonth = new Map<number, MonthlySummary>(
    (data ?? []).map((r: { month: number; summary: MonthlySummary }) => [r.month, r.summary])
  )
  const closed = [...byMonth.values()]

  // 年間合計（締めた月のみ）
  const incomePaid = closed.reduce((s, m) => s + m.incomePaid, 0)
  const expensePaid = closed.reduce((s, m) => s + m.expensePaid, 0)
  const net = incomePaid - expensePaid

  // 項目別の年間合計（表示順は月次の並びに合わせる）
  const lineTotals = new Map<string, { label: string; kind: 'income' | 'expense'; billed: number; paid: number }>()
  for (const m of closed) {
    for (const l of m.lines) {
      const t = lineTotals.get(l.key) ?? { label: l.label, kind: l.kind, billed: 0, paid: 0 }
      t.billed += l.billed
      t.paid += l.paid
      lineTotals.set(l.key, t)
    }
  }
  const catTotals = new Map<string, number>()
  for (const m of closed) {
    for (const c of m.expenseCategories) catTotals.set(c.category, (catTotals.get(c.category) ?? 0) + c.amount)
  }

  // 締め忘れ（すでに終わった月で未締め）
  const lastMonthToCheck = year < curYear ? 12 : year === curYear ? curMonth - 1 : 0
  const unclosedPast = Array.from({ length: Math.max(0, lastMonthToCheck) }, (_, i) => i + 1).filter(m => !byMonth.has(m))

  // CSV
  const csvRows: (string | number)[][] = [
    [`${year}年 年間集計（締め済みの月のみ）`],
    [],
    ['月', '状態', '収入（入金済み）', '支出（支払済み）', '差額'],
    ...Array.from({ length: 12 }, (_, i) => {
      const m = byMonth.get(i + 1)
      return m
        ? [`${i + 1}月`, '締め済み', m.incomePaid, m.expensePaid, m.net]
        : [`${i + 1}月`, '未締め', '', '', '']
    }),
    ['合計', '', incomePaid, expensePaid, net],
    [],
    ['区分', '項目', '請求額', '入金済み/支払済み'],
    ...[...lineTotals.values()].map(t => [t.kind === 'income' ? '収入' : '支出', t.label, t.billed, t.paid]),
    [],
    ['経費の内訳', '金額'],
    ...[...catTotals.entries()].map(([c, a]) => [c, a]),
  ]

  return (
    <div className="max-w-3xl">
      <Link href="/accounting" className="text-sm text-[#1A3666] hover:underline mb-4 inline-block">
        ← 経理管理に戻る
      </Link>

      <div className="flex items-center justify-between mb-2 gap-3 flex-wrap">
        <h1 className="text-xl font-bold text-[#1A3666]">年間集計（確定申告）</h1>
        <div className="flex items-center gap-2">
          <Link href={`/accounting/report?year=${year - 1}`} className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 text-[#1A3666]">‹</Link>
          <span className="text-sm font-bold text-[#1A3666] w-16 text-center">{year}年</span>
          <Link href={`/accounting/report?year=${year + 1}`} className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 text-[#1A3666]">›</Link>
        </div>
      </div>
      <p className="text-xs text-gray-500 mb-5">
        月次締めで<strong>締めた月の金額だけ</strong>を合計しています（1月〜12月）。未締めの月は含まれません。
      </p>

      {unclosedPast.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl px-5 py-3 mb-5 text-xs text-orange-600">
          まだ締めていない月があります：
          {unclosedPast.map(m => (
            <Link key={m} href={`/accounting/closing?year=${year}&month=${m}`} className="underline font-bold mx-1">{m}月</Link>
          ))}
        </div>
      )}

      {/* 年間収支 */}
      <div className="bg-white rounded-xl border-2 border-[#1A3666] p-5 mb-5">
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-xs font-semibold text-gray-400 mb-1">収入（入金済み）</p>
            <p className="text-lg font-bold text-[#1A3666]">{yen(incomePaid)}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 mb-1">支出（支払済み）</p>
            <p className="text-lg font-bold text-[#1A3666]">{yen(expensePaid)}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 mb-1">差額（収支）</p>
            <p className={`text-lg font-bold ${net >= 0 ? 'text-green-700' : 'text-red-600'}`}>{yen(net)}</p>
          </div>
        </div>
      </div>

      {/* 月別 */}
      <div className="bg-white rounded-xl border border-[#EAE0A8] overflow-hidden mb-5">
        <div className="px-5 py-2.5 bg-[#F5C800]/10 border-b border-[#EAE0A8]">
          <h2 className="text-sm font-bold text-[#1A3666]">月別の収支</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-[#EAE0A8]">
              <tr>
                <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500">月</th>
                <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500">状態</th>
                <th className="text-right px-4 py-2 text-xs font-semibold text-gray-500 whitespace-nowrap">収入</th>
                <th className="text-right px-4 py-2 text-xs font-semibold text-gray-500 whitespace-nowrap">支出</th>
                <th className="text-right px-4 py-2 text-xs font-semibold text-gray-500 whitespace-nowrap">差額</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAE0A8]">
              {Array.from({ length: 12 }, (_, i) => i + 1).map(m => {
                const s = byMonth.get(m)
                return (
                  <tr key={m} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5">
                      <Link href={`/accounting/closing?year=${year}&month=${m}`} className="font-semibold text-[#1A3666] hover:underline">{m}月</Link>
                    </td>
                    <td className="px-4 py-2.5">
                      {s
                        ? <span className="text-xs font-bold text-green-700">🔒 締め済み</span>
                        : <span className="text-xs text-gray-400">未締め</span>}
                    </td>
                    <td className="px-4 py-2.5 text-right whitespace-nowrap">{s ? yen(s.incomePaid) : '—'}</td>
                    <td className="px-4 py-2.5 text-right whitespace-nowrap">{s ? yen(s.expensePaid) : '—'}</td>
                    <td className={`px-4 py-2.5 text-right whitespace-nowrap font-semibold ${s ? (s.net >= 0 ? 'text-green-700' : 'text-red-600') : 'text-gray-300'}`}>
                      {s ? yen(s.net) : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 項目別 */}
      {lineTotals.size > 0 && (
        <div className="bg-white rounded-xl border border-[#EAE0A8] overflow-hidden mb-5">
          <div className="px-5 py-2.5 bg-[#F5C800]/10 border-b border-[#EAE0A8]">
            <h2 className="text-sm font-bold text-[#1A3666]">項目別の年間合計</h2>
          </div>
          <div className="divide-y divide-[#EAE0A8]">
            {[...lineTotals.entries()].map(([key, t]) => (
              <div key={key} className="flex items-center justify-between px-5 py-2.5 text-sm">
                <span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded mr-2 ${t.kind === 'income' ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-500'}`}>
                    {t.kind === 'income' ? '収入' : '支出'}
                  </span>
                  <span className="font-semibold text-[#1A3666]">{t.label}</span>
                </span>
                <span className="font-bold text-[#1A3666]">{yen(t.paid)}</span>
              </div>
            ))}
          </div>
          {catTotals.size > 0 && (
            <div className="px-5 py-3 border-t border-[#EAE0A8] flex flex-wrap gap-2">
              <span className="text-xs font-semibold text-gray-500">経費の内訳:</span>
              {[...catTotals.entries()].map(([c, a]) => (
                <span key={c} className="text-xs font-semibold bg-gray-100 text-gray-600 px-2.5 py-0.5 rounded-full">{c} {yen(a)}</span>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex justify-end">
        <CsvDownloadButton filename={`BC_FLASH_年間集計_${year}.csv`} rows={csvRows} />
      </div>
    </div>
  )
}
